/**
 * 一括セットアップスクリプト。環境を準備するだけで、アプリ・ビルドは実行しない。
 *
 *   bun run setup              （= bun run scripts/setup.ts）
 *   bun run setup --no-apt     （apt によるシステム依存インストールをスキップ）
 *   bun run setup --no-docker  （Docker のインストールを試みない。proot 等 daemon 不可環境向け）
 *   bun run setup --e2e        （Playwright ブラウザ(chromium)も取得する）
 *
 * 実行内容（各ステップは冪等。失敗しても可能な限り続行するフェイルソフト設計）:
 *   1. 環境診断     : bun / node / docker / apt の有無とバージョンを表示。
 *        DATABASE_URL(env / apps/web/.env / ルート .env = neon CLI の出力先)が
 *        リモート DB(Neon 等)を指す場合は、ローカル DB を一切構築せず
 *        apps/web/.env へ URL を配置してスキーマ反映のみ行う
 *   2. システム依存 : apt が使える環境でのみ実行（nala があれば apt-get より優先して使う）
 *        - docker なし → **Docker 公式 apt リポジトリを設定して docker-ce 一式を導入**
 *          （/etc/apt/keyrings/docker.asc + sources.list.d/docker.list、公式手順準拠。
 *           非 root なら docker グループへ追加。グループは再ログインまで反映されないため、
 *           導入直後の daemon 確認と compose pull は sudo 経由で行う）。`--no-docker` でスキップ可
 *        - Termux/proot-distro(Android)を検出 → daemon は動作しない（Android カーネルが
 *          cgroups/namespaces/overlayfs を非 root に公開しないため）。さらに proot は
 *          所有権を偽装 UID に固定するため postgres OS ユーザー方式も通らない。
 *          よって現在のユーザー所有の ~/.cod-web/pgdata に initdb したローカルクラスタを
 *          pg_ctl で起動する（bun run start も同じクラスタを自動起動する）
 *        - docker CLI はあるが daemon 停止 → systemctl / service → dockerd 直接起動を試み、
 *          それでも到達できなければ環境別ヒント（WSL systemd / proot 等）を表示する
 *        - docker が使える（daemon 起動確認済み）→ PostgreSQL は compose が提供する
 *          ため apt では入れない（ホスト postgres と :5432 の衝突を避ける）
 *        - docker が使えない（導入失敗 / proot 等で daemon 不可）→ フォールバックとして
 *          apt install postgresql → サービス起動（クラスタ未作成なら pg_createcluster で
 *          修復、pg_isready で起動待ち）→ パスワード設定 + app_db 作成 +
 *          apps/web/.env 生成 + スキーマ反映
 *   3. bun install  : --frozen-lockfile（唯一の必須ステップ。失敗時はここで終了）
 *   4. git hooks    : husky（bun install の prepare で入るため確認のみ）
 *   5. docker 可用時: docker compose pull postgres（イメージ取得のみ。起動はしない）
 *   6. --e2e 指定時 : bunx playwright install chromium
 *   7. 仕上げ検証   : bun run check:env（環境診断。品質ゲートは回さない）
 *
 * 終了後に「次の手順」（bun run start / --no-db / db:up）を表示する。
 */

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'
const colors = {
  setup: { tag: 'SETUP', fg: '\x1b[37m' },
  sys: { tag: 'SYS', fg: '\x1b[33m' },
  db: { tag: 'DB', fg: '\x1b[34m' },
  deps: { tag: 'DEPS', fg: '\x1b[36m' },
  e2e: { tag: 'E2E', fg: '\x1b[35m' },
  check: { tag: 'CHECK', fg: '\x1b[32m' },
} as const

type Kind = keyof typeof colors

const MAX_TAG_LEN = Math.max(...Object.values(colors).map((c) => c.tag.length))

function logLine(kind: Kind, line: string): void {
  const { tag, fg } = colors[kind]
  const text = line.replace(/\s+$/, '')
  if (text.length === 0) return
  const pad = ' '.repeat(MAX_TAG_LEN - tag.length)
  process.stdout.write(`${fg}${DIM}[${tag}]${RESET}${pad} ${fg}${text}${RESET}\n`)
}

/** コマンドを実行し、出力を行単位で色付きタグ転送して終了コードを返す。 */
async function run(kind: Kind, cmd: string[], cwd = process.cwd()): Promise<number> {
  const proc = Bun.spawn(cmd, { cwd, stdout: 'pipe', stderr: 'pipe', stdin: 'inherit' })
  const decoder = new TextDecoder()
  const pump = (stream: ReadableStream<Uint8Array> | null | undefined) => {
    if (!stream) return Promise.resolve()
    return (async () => {
      let buffer = ''
      const reader = stream.getReader()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let nl = buffer.indexOf('\n')
        while (nl >= 0) {
          logLine(kind, buffer.slice(0, nl))
          buffer = buffer.slice(nl + 1)
          nl = buffer.indexOf('\n')
        }
      }
      if (buffer.length > 0) logLine(kind, buffer)
    })()
  }
  const [exit] = await Promise.all([proc.exited, pump(proc.stdout), pump(proc.stderr)])
  return exit ?? 1
}

/** コマンドを静かに実行して { 成功, stdout, stderr } を返す（存在チェック・短い問い合わせ用）。 */
function runQuiet(cmd: string[]): { ok: boolean; out: string; err: string } {
  const r = Bun.spawnSync(cmd, { stdout: 'pipe', stderr: 'pipe' })
  return {
    ok: r.exitCode === 0,
    out: new TextDecoder().decode(r.stdout).trim(),
    err: new TextDecoder().decode(r.stderr).trim(),
  }
}

const isRoot = typeof process.getuid === 'function' && process.getuid() === 0
const hasSudo = Boolean(Bun.which('sudo'))

/** apt フロントエンド: nala があれば nala を優先し、無ければ apt-get を使う。 */
const aptBin = Bun.which('nala') ? 'nala' : 'apt-get'

/** root ならそのまま、非 root なら sudo を前置する（sudo も無ければ null）。 */
function privileged(cmd: string[]): string[] | null {
  if (isRoot) return cmd
  if (hasSudo) return ['sudo', ...cmd]
  return null
}

/** postgres OS ユーザーとしてコマンドを実行する形に包む。 */
function asPostgres(cmd: string[]): string[] | null {
  if (isRoot) {
    if (Bun.which('runuser')) return ['runuser', '-u', 'postgres', '--', ...cmd]
    return ['su', '-s', '/bin/sh', 'postgres', '-c', cmd.join(' ')]
  }
  if (hasSudo) return ['sudo', '-u', 'postgres', ...cmd]
  return null
}

/** /etc/os-release から distro ID と codename を読む（Docker 公式リポジトリの URL 決定用）。 */
async function readOsRelease(): Promise<{ id: string; codename: string }> {
  try {
    const text = await Bun.file('/etc/os-release').text()
    const get = (key: string) =>
      text.match(new RegExp(`^${key}=["']?([^"'\\n]+)`, 'm'))?.[1]?.toLowerCase() ?? ''
    let id = get('ID')
    // 派生ディストリ（linuxmint 等）は ID_LIKE から debian/ubuntu に寄せる
    if (id !== 'debian' && id !== 'ubuntu') {
      const like = get('ID_LIKE')
      if (like.includes('ubuntu')) id = 'ubuntu'
      else if (like.includes('debian')) id = 'debian'
    }
    const codename = get('VERSION_CODENAME') || get('UBUNTU_CODENAME')
    return { id, codename }
  } catch {
    return { id: '', codename: '' }
  }
}

/**
 * docker daemon への到達状況。
 *   up      : daemon に到達できた（直接 or sudo 経由）
 *   viaSudo : 直接は不可だが sudo 経由なら到達できた
 *             （docker グループ追加直後は再ログインまで反映されないため、
 *               インストール直後のシェルではこの状態が正常）
 */
type DockerAccess = { up: boolean; viaSudo: boolean }

/** docker daemon に到達できるか（CLI があっても proot/WSL 等では daemon が動かない）。 */
function dockerAccess(): DockerAccess {
  if (!Bun.which('docker')) return { up: false, viaSudo: false }
  if (runQuiet(['docker', 'info', '--format', '{{.ServerVersion}}']).ok) {
    return { up: true, viaSudo: false }
  }
  // 非 root で docker グループ未反映でも、sudo 経由なら daemon に到達できる
  // （-n: パスワード入力待ちでハングさせない）
  if (!isRoot && hasSudo) {
    if (runQuiet(['sudo', '-n', 'docker', 'info', '--format', '{{.ServerVersion}}']).ok) {
      return { up: true, viaSudo: true }
    }
  }
  return { up: false, viaSudo: false }
}

/** service 起動直後は socket 準備中のことがあるため、daemon 到達を最大 timeoutSec 秒待つ。 */
function waitForDockerDaemon(timeoutSec: number): DockerAccess {
  let access = dockerAccess()
  for (let i = 0; i < timeoutSec && !access.up; i++) {
    Bun.sleepSync(1000)
    access = dockerAccess()
  }
  return access
}

/** systemd が PID 1 として動いているか（WSL 旧設定・proot・コンテナでは無いことが多い）。 */
function hasSystemd(): boolean {
  return runQuiet(['test', '-d', '/run/systemd/system']).ok
}

/**
 * Termux / proot-distro(Android)環境か。
 * Android カーネルは cgroups v2 / kernel namespaces / overlayfs を非 root アプリに
 * 公開しないため、この環境では Docker daemon は動作しない（Termux 公式の既知制約）。
 * 代替: apt PostgreSQL(本スクリプトが設定) / udocker / QEMU VM / リモート DOCKER_HOST。
 */
function isAndroidProot(): boolean {
  if (process.env.TERMUX_VERSION) return true
  if (runQuiet(['uname', '-r']).out.toLowerCase().includes('android')) return true
  // proot-distro は Termux の prefix をバインドマウントする
  return runQuiet(['test', '-d', '/data/data/com.termux']).ok
}

/**
 * docker daemon の起動を試み、到達を最大 15 秒待つ。
 *   1. systemd 環境は systemctl enable --now、それ以外は service docker start
 *   2. それでも駄目なら dockerd の直接起動を試す
 *      （proot/LXC 等では /etc/init.d/docker が ulimit 設定で落ちることがあるため）
 */
async function startDockerDaemon(): Promise<DockerAccess> {
  const before = dockerAccess()
  if (before.up) return before
  const cmd = hasSystemd()
    ? privileged(['systemctl', 'enable', '--now', 'docker'])
    : privileged(['service', 'docker', 'start'])
  if (cmd) await run('sys', cmd)
  let access = waitForDockerDaemon(15)
  if (access.up) return access

  const direct = privileged([
    'sh',
    '-c',
    'nohup "$(command -v dockerd || echo /usr/sbin/dockerd)" >> /var/log/dockerd.log 2>&1 & sleep 1',
  ])
  if (direct) {
    logLine('sys', 'service 経由で起動できないため、dockerd の直接起動を試します...')
    await run('sys', direct)
    access = waitForDockerDaemon(10)
    if (!access.up) {
      logLine('sys', '  dockerd も起動しませんでした。ログ: sudo tail /var/log/dockerd.log')
    }
  }
  return access
}

/** daemon に到達できないときに、環境別の原因ヒントを表示する。 */
function printDockerDaemonHints(): void {
  logLine('sys', '! docker daemon に到達できません。考えられる原因:')
  if (!isRoot && hasSudo && !runQuiet(['sudo', '-n', 'true']).ok) {
    logLine('sys', '  - sudo がパスワード待ちのため sudo 経由の確認ができませんでした。')
    logLine('sys', '    手動確認: sudo docker info')
  }
  const status = runQuiet(['sh', '-c', 'service docker status 2>&1 | head -1'])
  if (status.out) logLine('sys', `  - service docker status: ${status.out}`)
  const kernel = runQuiet(['cat', '/proc/version'])
  if (kernel.out.toLowerCase().includes('microsoft')) {
    logLine('sys', '  - WSL: /etc/wsl.conf に [boot] systemd=true を追記し、')
    logLine('sys', '    PowerShell で `wsl --shutdown` 後に再実行してください。')
  } else if (!hasSystemd()) {
    logLine('sys', '  - systemd が無い環境です。`sudo service docker start` または')
    logLine('sys', '    `sudo dockerd &` を試してください。')
    logLine('sys', '  - `ulimit: error setting limit (Operation not permitted)` が出る場合は')
    logLine('sys', '    proot/LXC 等の権限制限環境で、Docker daemon は起動できません。')
    logLine('sys', '    `bun run setup --no-docker` で Docker を飛ばし、')
    logLine('sys', '    apt の PostgreSQL(本スクリプトが自動設定)を使ってください。')
  }
}

/**
 * Docker 公式 apt リポジトリを設定して docker-ce 一式をインストールする（公式手順準拠）。
 *   1. 前提: ca-certificates / curl
 *   2. GPG 鍵: https://download.docker.com/linux/<distro>/gpg → /etc/apt/keyrings/docker.asc
 *   3. ソース: /etc/apt/sources.list.d/docker.list（arch + signed-by + codename stable）
 *   4. apt-get update → docker-ce docker-ce-cli containerd.io buildx compose-plugin
 * 成功したら true。どこかで失敗したら警告して false（呼び出し側がフォールバック）。
 */
async function installDockerOfficialRepo(): Promise<boolean> {
  const os = await readOsRelease()
  if (os.id !== 'debian' && os.id !== 'ubuntu') {
    logLine(
      'sys',
      `! Docker 公式 apt リポジトリは debian/ubuntu 系のみ対応です(検出: ${os.id || '不明'})。`,
    )
    return false
  }
  if (!os.codename) {
    logLine('sys', '! VERSION_CODENAME が取得できないため Docker リポジトリ設定をスキップします。')
    return false
  }

  logLine('sys', `Docker 公式リポジトリを設定します... (${os.id} ${os.codename})`)
  const prereq = privileged([aptBin, 'install', '-y', 'ca-certificates', 'curl'])
  if (!prereq) {
    logLine('sys', '! root でも sudo でもないため Docker を導入できません。')
    return false
  }
  if ((await run('sys', prereq)) !== 0) return false

  // GPG 鍵（apt は armored .asc を signed-by でそのまま扱える）
  const keyDir = privileged(['install', '-m', '0755', '-d', '/etc/apt/keyrings'])
  if (!keyDir || (await run('sys', keyDir)) !== 0) return false
  const gpgUrl = `https://download.docker.com/linux/${os.id}/gpg`
  const fetchKey = privileged([
    'sh',
    '-c',
    `curl -fsSL ${gpgUrl} -o /etc/apt/keyrings/docker.asc && chmod a+r /etc/apt/keyrings/docker.asc`,
  ])
  if (!fetchKey || (await run('sys', fetchKey)) !== 0) {
    logLine('sys', '! Docker GPG 鍵の取得に失敗しました(ネットワーク?)。')
    return false
  }

  // sources.list.d へリポジトリ定義を書き込む
  const arch = runQuiet(['dpkg', '--print-architecture']).out || 'amd64'
  const repoLine =
    `deb [arch=${arch} signed-by=/etc/apt/keyrings/docker.asc] ` +
    `https://download.docker.com/linux/${os.id} ${os.codename} stable`
  const writeList = privileged([
    'sh',
    '-c',
    `echo '${repoLine}' > /etc/apt/sources.list.d/docker.list`,
  ])
  if (!writeList || (await run('sys', writeList)) !== 0) return false
  logLine('sys', `/etc/apt/sources.list.d/docker.list を設定しました: ${repoLine}`)

  const update = privileged([aptBin, 'update'])
  if (!update || (await run('sys', update)) !== 0) return false
  const install = privileged([
    aptBin,
    'install',
    '-y',
    'docker-ce',
    'docker-ce-cli',
    'containerd.io',
    'docker-buildx-plugin',
    'docker-compose-plugin',
  ])
  if (!install || (await run('sys', install)) !== 0) {
    logLine('sys', '! docker-ce のインストールに失敗しました。')
    return false
  }

  // 非 root ユーザーを docker グループへ（公式 post-install 手順。再ログインで有効）
  if (!isRoot && process.env.USER) {
    const usermod = privileged(['usermod', '-aG', 'docker', process.env.USER])
    if (usermod && (await run('sys', usermod)) === 0) {
      logLine('sys', `${process.env.USER} を docker グループに追加しました(再ログイン後に有効)。`)
      logLine('sys', '  反映されるまでの間、このセットアップは sudo 経由で docker を使います。')
    }
  }
  logLine('sys', 'OK Docker(公式リポジトリ)の導入が完了しました。')
  return true
}

type Status = 'OK' | 'SKIP' | 'WARN' | 'FAIL'
const summary: { step: string; status: Status; note: string }[] = []
function record(step: string, status: Status, note = ''): void {
  summary.push({ step, status, note })
}

/** apt 環境で PostgreSQL をインストールし、ユーザー/DB/.env/スキーマまで整える。 */
async function setupAptPostgres(): Promise<void> {
  const install = privileged([aptBin, 'install', '-y', 'postgresql', 'postgresql-client'])
  if (!install) {
    logLine('db', '! root でも sudo でもないため apt install できません。スキップします。')
    record('PostgreSQL (apt)', 'WARN', 'root/sudo なし')
    return
  }
  if ((await run('db', install)) !== 0) {
    logLine('db', '! apt install postgresql に失敗しました。手動で導入してください。')
    record('PostgreSQL (apt)', 'WARN', 'install 失敗')
    return
  }

  // サービス起動（Debian/Ubuntu/proot: service が無難。失敗しても続行）
  const svc = privileged(['service', 'postgresql', 'start'])
  if (svc) await run('db', svc)

  // クラスタ未作成（インストール時の locale 問題等）なら作成、停止中なら直接起動する
  if (Bun.which('pg_lsclusters')) {
    const clusters = runQuiet(['pg_lsclusters'])
    const rows = clusters.out
      .split('\n')
      .slice(1)
      .map((l) => l.trim().split(/\s+/))
      .filter((cols) => cols.length >= 4)
    if (rows.length === 0) {
      const ver = runQuiet(['sh', '-c', 'ls /usr/lib/postgresql 2>/dev/null | sort -V | tail -1'])
      if (ver.out) {
        logLine('db', `クラスタが無いため作成します... (pg_createcluster ${ver.out} main --start)`)
        const create = privileged(['pg_createcluster', ver.out, 'main', '--start'])
        if (create) await run('db', create)
      }
    } else {
      // service が効かない環境(proot 等)では pg_ctlcluster での直接起動が通ることがある
      for (const [ver, name, , status] of rows) {
        if (ver && name && status?.includes('down')) {
          logLine('db', `クラスタ ${ver}/${name} が停止中のため起動します... (pg_ctlcluster)`)
          const startCluster = privileged(['pg_ctlcluster', ver, name, 'start'])
          if (startCluster) await run('db', startCluster)
        }
      }
    }
  }

  // サーバが接続を受け付けるまで最大 15 秒待つ（service 直後は起動中のことがある）
  if (Bun.which('pg_isready')) {
    let ready = runQuiet(['pg_isready']).ok
    for (let i = 0; i < 15 && !ready; i++) {
      Bun.sleepSync(1000)
      ready = runQuiet(['pg_isready']).ok
    }
    if (!ready) {
      logLine('db', '! pg_isready で起動確認できませんでした(そのまま続行して試します)。')
    }
  }

  // パスワード設定 + app_db 作成（compose.yaml / .env.example のデフォルトに一致させる）
  const alter = asPostgres(['psql', '-c', "ALTER USER postgres PASSWORD 'postgres'"])
  const alterRes = alter ? runQuiet(alter) : { ok: false, out: '', err: 'root/sudo が使えません' }
  if (!alterRes.ok) {
    logLine('db', '! postgres ユーザーのパスワード設定に失敗しました。')
    if (alterRes.err) logLine('db', `  詳細: ${alterRes.err.split('\n')[0]}`)
    logLine('db', '  手動: sudo -u postgres psql -c "ALTER USER postgres PASSWORD \'postgres\'"')
    logLine('db', '  状態確認: pg_lsclusters / sudo service postgresql status')
    record('PostgreSQL (apt)', 'WARN', 'provisioning 失敗')
    return
  }
  const exists = asPostgres(['psql', '-tAc', "SELECT 1 FROM pg_database WHERE datname='app_db'"])
  const found = exists ? runQuiet(exists) : { ok: false, out: '' }
  if (!found.out.includes('1')) {
    const createdb = asPostgres(['createdb', 'app_db'])
    if (createdb) await run('db', createdb)
  }

  // .env 生成（無い場合のみ）→ スキーマ反映
  await finalizeDbEnvAndSchema('PostgreSQL (apt)', 'service 起動済み + app_db + スキーマ反映')
}

/** apps/web/.env を用意して db:push でスキーマを反映する（apt / proot 共通の仕上げ）。 */
async function finalizeDbEnvAndSchema(label: string, okNote: string): Promise<void> {
  const envFile = Bun.file('apps/web/.env')
  if (!(await envFile.exists())) {
    await Bun.write(envFile, await Bun.file('apps/web/.env.example').text())
    logLine('db', 'apps/web/.env を .env.example から生成しました。')
  }
  if ((await run('db', ['bun', 'run', 'db:push'])) === 0) {
    logLine('db', `OK ${label} の準備が完了しました。`)
    record(label, 'OK', okNote)
  } else {
    record(label, 'WARN', 'db:push 失敗(後で `bun run db:push` を再実行)')
  }
}

/** ユーザーローカルクラスタの配置先（execute.ts の自動起動と一致させること）。 */
const USER_PG_DATA_DIR = `${process.env.HOME}/.cod-web/pgdata`

/** .env から DATABASE_URL を読む（apps/web/.env 優先。ルート .env は neon CLI の出力先）。 */
async function readDatabaseUrlFromEnvFiles(): Promise<string | null> {
  for (const path of ['apps/web/.env', '.env']) {
    const text = await Bun.file(path)
      .text()
      .catch(() => '')
    const m = text.match(/^DATABASE_URL=["']?([^"'\n]+)/m)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

/** 127.0.0.1 / localhost 以外のホストを指す接続文字列か（Neon 等のリモート DB）。 */
function isRemoteDbUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host !== '127.0.0.1' && host !== 'localhost' && host !== '[::1]'
  } catch {
    return false
  }
}

/** ログ表示用のホスト名（資格情報は表示しない）。 */
function dbHostLabel(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return 'remote'
  }
}

/**
 * Neon 等のリモート DATABASE_URL を使う場合: ローカル DB は一切構築せず、
 * apps/web/.env に URL を配置(Next.js が読むのはここ)してスキーマを反映する。
 */
async function setupRemoteDb(url: string): Promise<void> {
  const label = 'PostgreSQL (remote/Neon)'
  logLine('db', `リモート DATABASE_URL を検出しました(${dbHostLabel(url)})。`)
  logLine('db', 'ローカル DB(Docker/apt/proot)は構築しません。')
  const envPath = 'apps/web/.env'
  const text = await Bun.file(envPath)
    .text()
    .catch(() => '')
  if (!/^DATABASE_URL=/m.test(text)) {
    const head = text.length > 0 && !text.endsWith('\n') ? `${text}\n` : text
    await Bun.write(envPath, `${head}DATABASE_URL=${url}\n`)
    logLine('db', `${envPath} に DATABASE_URL を書き込みました。`)
  }
  process.env.DATABASE_URL = url
  if ((await run('db', ['bun', 'run', 'db:push'])) === 0) {
    logLine('db', `OK ${label} の準備が完了しました。`)
    record(label, 'OK', `${dbHostLabel(url)} + スキーマ反映`)
  } else {
    record(label, 'WARN', 'db:push 失敗(接続/認証を確認して `bun run db:push` を再実行)')
  }
}

/**
 * Termux/proot-distro 向け: postgres OS ユーザーを使わないユーザーローカルクラスタ。
 * proot はファイル所有権をログイン時の偽装 UID に固定して見せるため、
 * `sudo -u postgres` に切り替えても initdb/サーバの所有権チェック
 * （data directory has wrong ownership）が必ず失敗する。
 * そのため現在のユーザー自身で initdb した専用クラスタを ~/.cod-web/pgdata に作り、
 * pg_ctl で起動する（bun run start も同じ場所を自動起動する）。
 */
async function setupProotPostgres(): Promise<void> {
  const label = 'PostgreSQL (proot user-local)'
  // initdb 等のバイナリが無ければ導入（既導入なら no-op）
  const install = privileged([aptBin, 'install', '-y', 'postgresql', 'postgresql-client'])
  if (install) await run('db', install)

  const ver = runQuiet(['sh', '-c', 'ls /usr/lib/postgresql 2>/dev/null | sort -V | tail -1']).out
  if (!ver) {
    logLine(
      'db',
      '! /usr/lib/postgresql にバイナリが見つかりません。apt install を確認してください。',
    )
    record(label, 'WARN', 'postgresql バイナリなし')
    return
  }
  const bin = `/usr/lib/postgresql/${ver}/bin`
  const dataDir = USER_PG_DATA_DIR

  logLine('db', 'proot では postgres OS ユーザーの所有権チェックが通らないため、')
  logLine('db', `現在のユーザーで動くローカルクラスタを使います: ${dataDir}`)

  if (!(await Bun.file(`${dataDir}/PG_VERSION`).exists())) {
    // PG_VERSION が無いのにディレクトリが残っている場合は壊れた初期化の残骸なので作り直す
    if (runQuiet(['test', '-d', dataDir]).ok) {
      logLine('db', '不完全な pgdata を検出したため作り直します。')
      await run('db', ['rm', '-rf', dataDir])
    }
    const code = await run('db', [
      `${bin}/initdb`,
      '-D',
      dataDir,
      '-U',
      'postgres',
      '--auth=trust',
      '-E',
      'UTF8',
      '--locale=C.UTF-8',
    ])
    if (code !== 0) {
      logLine('db', '! initdb に失敗しました。root でログインしている場合は一般ユーザーを')
      logLine('db', '  作成し、そのユーザーで `bun run setup` を実行してください。')
      record(label, 'WARN', 'initdb 失敗')
      return
    }
  }

  // proot/Android 向け設定を冪等に追記:
  //   - socket は権限不要な /tmp
  //   - Android カーネルは SysV IPC 非対応・/dev/shm も不安定なため共有メモリは mmap
  const confPath = `${dataDir}/postgresql.conf`
  const confText = await Bun.file(confPath)
    .text()
    .catch(() => '')
  const marker = '# cod-web proot settings'
  if (confText && !confText.includes(marker)) {
    const extra = [
      '',
      marker,
      "unix_socket_directories = '/tmp'",
      'shared_memory_type = mmap',
      'dynamic_shared_memory_type = mmap',
      '',
    ].join('\n')
    await Bun.write(confPath, confText + extra)
    logLine('db', 'postgresql.conf に proot 向け設定(socket=/tmp, shm=mmap)を追記しました。')
  }

  // 起動状態を確認。status が「起動中」でも接続できない場合は stale postmaster.pid の
  // 可能性があるため再起動する
  const status = runQuiet([`${bin}/pg_ctl`, '-D', dataDir, 'status'])
  logLine('db', `pg_ctl status: ${(status.out || status.err).split('\n')[0] || '(出力なし)'}`)
  const isReady = () => runQuiet([`${bin}/pg_isready`, '-h', '127.0.0.1']).ok
  if (status.ok && !isReady()) {
    logLine('db', 'status は起動中ですが接続できないため再起動します... (pg_ctl restart)')
    await run('db', [
      `${bin}/pg_ctl`,
      '-D',
      dataDir,
      '-l',
      `${dataDir}/log`,
      '-m',
      'fast',
      'restart',
    ])
  } else if (!status.ok) {
    const code = await run('db', [`${bin}/pg_ctl`, '-D', dataDir, '-l', `${dataDir}/log`, 'start'])
    if (code !== 0) {
      await printPgFailureDiagnostics(bin, dataDir)
      record(label, 'WARN', 'pg_ctl start 失敗')
      return
    }
  }

  // 接続確認（低速ストレージ向けに最大 30 秒）
  let ready = false
  for (let i = 0; i < 30 && !ready; i++) {
    ready = isReady()
    if (!ready) Bun.sleepSync(1000)
  }
  if (!ready) {
    await printPgFailureDiagnostics(bin, dataDir)
    record(label, 'WARN', '起動確認失敗')
    return
  }

  // .env の URL と互換にするためパスワードを設定し、app_db を作成する
  await run('db', [
    'psql',
    '-h',
    '127.0.0.1',
    '-U',
    'postgres',
    '-c',
    "ALTER USER postgres PASSWORD 'postgres'",
  ])
  const exists = runQuiet([
    'psql',
    '-h',
    '127.0.0.1',
    '-U',
    'postgres',
    '-tAc',
    "SELECT 1 FROM pg_database WHERE datname='app_db'",
  ])
  if (!exists.out.includes('1')) {
    await run('db', ['createdb', '-h', '127.0.0.1', '-U', 'postgres', 'app_db'])
  }

  await finalizeDbEnvAndSchema(
    label,
    `~/.cod-web/pgdata (PostgreSQL ${ver}) + app_db + スキーマ反映`,
  )
}

/** ユーザーローカル PostgreSQL が起動しない時に、原因をその場で表示する。 */
async function printPgFailureDiagnostics(bin: string, dataDir: string): Promise<void> {
  logLine('db', '! PostgreSQL が起動しませんでした。診断情報:')
  const status = runQuiet([`${bin}/pg_ctl`, '-D', dataDir, 'status'])
  logLine('db', `  pg_ctl status: ${(status.out || status.err).split('\n')[0] || '(出力なし)'}`)
  if (await Bun.file(`${dataDir}/log`).exists()) {
    logLine('db', `  ── サーバログ末尾 (${dataDir}/log) ──`)
    await run('db', ['tail', '-n', '15', `${dataDir}/log`])
  } else {
    logLine('db', '  サーバログ未作成のため、前景起動でエラーを採取します(最大 5 秒)...')
    const probe = Bun.spawnSync(['timeout', '5', `${bin}/postgres`, '-D', dataDir], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const out = `${new TextDecoder().decode(probe.stderr)}\n${new TextDecoder().decode(probe.stdout)}`
    const lines = out
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .slice(0, 12)
    if (lines.length === 0) {
      logLine(
        'db',
        '  (前景起動でも出力がありません。timeout/postgres の実行可否を確認してください)',
      )
    }
    for (const line of lines) logLine('db', `  ${line}`)
  }
}

async function main(): Promise<number> {
  const args = process.argv.slice(2)
  const noApt = args.includes('--no-apt')
  const noDocker = args.includes('--no-docker')
  const withE2e = args.includes('--e2e')

  // ── 1. 環境診断 ───────────────────────────────────────────────────────
  const bunVer = runQuiet(['bun', '--version'])
  const nodeVer = runQuiet(['node', '--version'])
  const hasApt = Boolean(Bun.which('apt-get'))
  const hasDockerCli = Boolean(Bun.which('docker'))
  let docker = dockerAccess()
  logLine('setup', `bun ${bunVer.out || '不明'} / node ${nodeVer.out || 'なし'}`)
  const dockerLabel = hasDockerCli
    ? docker.up
      ? docker.viaSudo
        ? 'あり(daemon 稼働中・sudo 経由)'
        : 'あり(daemon 稼働中)'
      : 'CLI のみ(daemon 停止)'
    : 'なし'
  logLine(
    'setup',
    `docker: ${dockerLabel} / apt: ${hasApt ? (aptBin === 'nala' ? 'あり(nala 使用)' : 'あり') : 'なし'}`,
  )
  record('環境診断', 'OK', `bun ${bunVer.out}, docker ${docker.up ? '可用' : 'なし/不可'}`)

  // リモート DB(Neon 等): env / apps/web/.env / ルート .env の DATABASE_URL を検出。
  // 設定されている場合、ローカル DB(Docker/apt/proot)の構築は不要になる。
  const configuredDbUrl = process.env.DATABASE_URL ?? (await readDatabaseUrlFromEnvFiles())
  const remoteDbUrl = configuredDbUrl && isRemoteDbUrl(configuredDbUrl) ? configuredDbUrl : null
  if (remoteDbUrl) {
    logLine('setup', `DATABASE_URL: リモート(${dbHostLabel(remoteDbUrl)})を使用します。`)
  }

  // ── 2. システム依存(apt)─────────────────────────────────────────────
  if (noApt) {
    logLine('sys', 'Skipping apt (--no-apt).')
    record('システム依存 (apt)', 'SKIP', '--no-apt')
    record('Docker (公式リポジトリ)', 'SKIP', '--no-apt')
  } else if (!hasApt) {
    logLine('sys', 'apt-get が無い環境のためスキップします(macOS は Docker Desktop を推奨)。')
    record('システム依存 (apt)', 'SKIP', 'apt なし')
    record('Docker (公式リポジトリ)', 'SKIP', 'apt なし')
  } else {
    const update = privileged([aptBin, 'update'])
    if (update && (await run('sys', update)) !== 0) {
      logLine('sys', `! ${aptBin} update に失敗しました(ネットワーク?)。続行します。`)
    }

    const androidProot = isAndroidProot()

    // ── 2a. Docker(公式 apt リポジトリ経由)──────────────────────────
    if (noDocker) {
      logLine('sys', 'Skipping Docker install (--no-docker).')
      record('Docker (公式リポジトリ)', 'SKIP', '--no-docker')
    } else if (!docker.up && androidProot) {
      // Termux/proot-distro: daemon は動作しないため試行せずユーザーローカル PostgreSQL へ直行する
      logLine('sys', 'Termux/proot-distro(Android)環境を検出しました。')
      logLine('sys', '  Android カーネルは cgroups/namespaces/overlayfs を非 root に公開しない')
      logLine('sys', '  ため、Docker daemon はこの環境では動作しません(Termux 公式の既知制約)。')
      logLine(
        'sys',
        '  PostgreSQL はユーザーローカルクラスタ(~/.cod-web/pgdata)を用意して使います。',
      )
      logLine('sys', '  コンテナが必要な場合の代替: udocker(daemon 不要) / QEMU VM /')
      logLine('sys', '  リモート docker(DOCKER_HOST=ssh://user@server)。')
      record(
        'Docker (公式リポジトリ)',
        'SKIP',
        'Termux/proot: daemon 動作不可 → ユーザーローカル PostgreSQL 使用',
      )
    } else if (hasDockerCli) {
      if (docker.up) {
        record('Docker (公式リポジトリ)', 'SKIP', '導入済み(daemon 稼働中)')
      } else {
        // 導入済みでも daemon が止まっているなら起動を試みる(再実行時にここへ来る)
        logLine('sys', 'docker CLI はありますが daemon が停止中のため、起動を試みます...')
        docker = await startDockerDaemon()
        if (!docker.up) printDockerDaemonHints()
        record(
          'Docker (公式リポジトリ)',
          docker.up ? 'OK' : 'WARN',
          docker.up
            ? docker.viaSudo
              ? 'daemon 起動(sudo 経由。再ログイン後は sudo 不要)'
              : 'daemon 起動'
            : '導入済み(daemon 起動失敗)',
        )
      }
    } else {
      const installed = await installDockerOfficialRepo()
      if (installed) {
        // グループ未反映のシェルでは sudo 経由で再評価する。
        // 起動直後は socket 準備中のことがあるため最大 15 秒待つ。
        docker = await startDockerDaemon()
        if (!docker.up) printDockerDaemonHints()
        record(
          'Docker (公式リポジトリ)',
          'OK',
          docker.up
            ? docker.viaSudo
              ? 'daemon 稼働確認済み(sudo 経由。再ログイン後は sudo 不要)'
              : 'daemon 稼働確認済み'
            : 'インストール済み(daemon 未稼働)',
        )
      } else {
        record('Docker (公式リポジトリ)', 'WARN', '導入失敗 → apt postgresql へフォールバック')
      }
    }

    // ── 2b. PostgreSQL(リモート優先 → compose → proot → apt)────────────
    if (remoteDbUrl) {
      record('システム依存 (apt)', 'OK', 'リモート DB 使用 → ローカル postgresql 不要')
    } else if (docker.up) {
      logLine('sys', 'docker が使えるため PostgreSQL は compose が提供します(apt では入れません)。')
      record('システム依存 (apt)', 'OK', 'docker 可用 → apt postgresql 不要')
    } else if (androidProot) {
      await setupProotPostgres()
    } else {
      logLine('sys', 'docker が使えないため PostgreSQL は apt でセットアップします。')
      await setupAptPostgres()
    }
  }

  // ── 3. bun install(唯一の必須ステップ)──────────────────────────────
  logLine('deps', 'Installing dependencies... (bun install --frozen-lockfile)')
  if ((await run('deps', ['bun', 'install', '--frozen-lockfile'])) !== 0) {
    logLine('deps', 'X bun install に失敗しました。ネットワークと bun.lock を確認してください。')
    record('bun install', 'FAIL')
    printSummary()
    return 1
  }
  record('bun install', 'OK')

  // ── 3b. リモート DB(Neon 等)の仕上げ(apt の有無に関わらず、依存導入後に実行)──
  if (remoteDbUrl) {
    await setupRemoteDb(remoteDbUrl)
  }

  // ── 4. git hooks(husky は bun install の prepare で導入済みのはず)───
  const hooks = await Bun.file('.husky/_/husky.sh')
    .exists()
    .catch(() => false)
  if (hooks) {
    record('git hooks (husky)', 'OK')
  } else {
    const code = await run('deps', ['bunx', 'husky'])
    record('git hooks (husky)', code === 0 ? 'OK' : 'WARN', code === 0 ? '再導入' : '失敗')
  }

  // ── 5. docker compose イメージ取得(起動はしない)─────────────────────
  if (remoteDbUrl) {
    record('postgres イメージ取得', 'SKIP', 'リモート DB 使用')
  } else if (docker.up) {
    logLine('db', 'Pulling PostgreSQL image... (docker compose pull postgres)')
    const pull = ['docker', 'compose', 'pull', 'postgres']
    const code = await run('db', docker.viaSudo ? ['sudo', '-n', ...pull] : pull)
    record('postgres イメージ取得', code === 0 ? 'OK' : 'WARN', code === 0 ? '' : 'pull 失敗')
  } else {
    record('postgres イメージ取得', 'SKIP', 'docker 不可用')
  }

  // ── 6. Playwright ブラウザ(任意)─────────────────────────────────────
  if (withE2e) {
    const code = await run('e2e', ['bunx', 'playwright', 'install', 'chromium'])
    record('Playwright (chromium)', code === 0 ? 'OK' : 'WARN', code === 0 ? '' : '取得失敗')
  } else {
    record('Playwright (chromium)', 'SKIP', '--e2e 指定時のみ')
  }

  // ── 7. 仕上げ検証(軽量診断のみ。品質ゲートは回さない)────────────────
  const check = await run('check', ['bun', 'run', 'check:env'])
  record('check:env', check === 0 ? 'OK' : 'WARN', check === 0 ? '' : '診断で警告あり')

  printSummary()
  if (docker.viaSudo) {
    logLine(
      'setup',
      '注意: docker グループは再ログイン(または `newgrp docker`)まで反映されません。',
    )
    logLine('setup', '      それまで docker コマンドを直接使う場合は sudo を付けてください。')
  }
  logLine('setup', '次の手順:')
  logLine('setup', '  bun run start          # DB(Docker) + build + サーバ一括起動')
  logLine('setup', '  bun run start --no-db  # DB なしで起動(インメモリ保存)')
  logLine('setup', '  bun run db:up          # PostgreSQL だけ起動(通常開発)')
  logLine('setup', '  bun run check:all      # 品質ゲート 7 種(コミット前)')
  return 0
}

function printSummary(): void {
  logLine('setup', '── セットアップ結果 ──')
  for (const s of summary) {
    const mark = { OK: '✔', SKIP: '−', WARN: '!', FAIL: '✖' }[s.status]
    logLine('setup', `  ${mark} ${s.step}${s.note ? ` — ${s.note}` : ''}`)
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    logLine('setup', `X Unexpected error: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  })
