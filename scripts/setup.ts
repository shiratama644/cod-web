/**
 * 一括セットアップスクリプト。環境を準備するだけで、アプリ・ビルドは実行しない。
 *
 *   bun run setup              （= bun run scripts/setup.ts）
 *   bun run setup --no-apt     （apt によるシステム依存インストールをスキップ）
 *   bun run setup --no-docker  （Docker のインストールを試みない。proot 等 daemon 不可環境向け）
 *   bun run setup --e2e        （Playwright ブラウザ(chromium)も取得する）
 *
 * 実行内容（各ステップは冪等。失敗しても可能な限り続行するフェイルソフト設計）:
 *   1. 環境診断     : bun / node / docker / apt の有無とバージョンを表示
 *   2. システム依存 : apt が使える環境でのみ実行（nala があれば apt-get より優先して使う）
 *        - docker なし → **Docker 公式 apt リポジトリを設定して docker-ce 一式を導入**
 *          （任意。フルスタック compose 用。DB は組み込み SQLite のため Docker 不要）。
 *          `--no-docker` でスキップ可
 *        - Termux/proot-distro(Android)を検出 → daemon は動作しないため Docker は飛ばす
 *        - docker CLI はあるが daemon 停止 → systemctl / service → dockerd 直接起動を試みる
 *   3. bun install  : --frozen-lockfile（唯一の必須ステップ。失敗時はここで終了）。
 *        直後に重要パッケージ(next 等)の実体を検証し、欠けていれば --force で自動修復
 *   4. DB (SQLite)  : `bun run db:push` でスキーマ反映（ファイル DB を作成。サーバ不要）
 *   5. git hooks    : husky（bun install の prepare で入るため確認のみ）
 *   6. --e2e 指定時 : bunx playwright install chromium
 *   7. 仕上げ検証   : bun run check:env（環境診断。品質ゲートは回さない）
 *
 * 終了後に「次の手順」（bun run start 等）を表示する。
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
 * 代替: udocker(daemon 不要) / QEMU VM / リモート DOCKER_HOST。DB は SQLite なので不要。
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
    logLine('sys', '    `bun run setup --no-docker` で Docker を飛ばしてください。')
    logLine('sys', '    (DB は組み込み SQLite のため Docker がなくても動きます)')
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
        record('Docker (公式リポジトリ)', 'WARN', '導入失敗(DB は SQLite のため影響なし)')
      }
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

  // ── 3b. 依存の実体検証 ────────────────────────────────────────────────
  // bun は node_modules の状態ファイルだけを見て「no changes」と報告することがあり、
  // 実体が欠けていても気付かない。欠けを検出したら --force で一度だけ修復する。
  const criticalModules = ['next', '@libsql/client', 'dexie', 'drizzle-kit', 'typescript']
  const findMissing = async () => {
    const missing: string[] = []
    for (const name of criticalModules) {
      const inRoot = await Bun.file(`node_modules/${name}/package.json`).exists()
      const inWeb = await Bun.file(`apps/web/node_modules/${name}/package.json`).exists()
      if (!inRoot && !inWeb) missing.push(name)
    }
    return missing
  }
  let missingDeps = await findMissing()
  if (missingDeps.length > 0) {
    logLine('deps', `! node_modules に実体が欠けています: ${missingDeps.join(', ')}`)
    logLine('deps', '  bun install --force で再取得します...')
    await run('deps', ['bun', 'install', '--force'])
    missingDeps = await findMissing()
  }
  if (missingDeps.length === 0) {
    record('依存の実体検証', 'OK')
  } else {
    logLine('deps', '  手動復旧: rm -rf node_modules apps/*/node_modules && bun install')
    record('依存の実体検証', 'FAIL', `欠落: ${missingDeps.join(', ')}`)
    printSummary()
    return 1
  }

  // ── 4. DB スキーマ反映(組み込み SQLite。サーバ不要・即終了)──────────
  if ((await run('db', ['bun', 'run', 'db:push'])) === 0) {
    record('DB (SQLite)', 'OK', 'スキーマ反映済み(apps/web/.data/cod.sqlite)')
  } else {
    record('DB (SQLite)', 'WARN', 'db:push 失敗(初回アクセス時に自動作成されます)')
  }

  // ── 5. git hooks(husky は bun install の prepare で導入済みのはず)───
  const hooks = await Bun.file('.husky/_/husky.sh')
    .exists()
    .catch(() => false)
  if (hooks) {
    record('git hooks (husky)', 'OK')
  } else {
    const code = await run('deps', ['bunx', 'husky'])
    record('git hooks (husky)', code === 0 ? 'OK' : 'WARN', code === 0 ? '再導入' : '失敗')
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
  logLine('setup', '  bun run start          # build + サーバ一括起動(DB は組み込み SQLite)')
  logLine('setup', '  bun run dev            # Next.js 開発サーバのみ')
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
