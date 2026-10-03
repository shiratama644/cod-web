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
 *          （/etc/apt/keyrings/docker.asc + sources.list.d/docker.list、公式手順準拠。
 *           非 root なら docker グループへ追加。グループは再ログインまで反映されないため、
 *           導入直後の daemon 確認と compose pull は sudo 経由で行う）。`--no-docker` でスキップ可
 *        - docker が使える（daemon 起動確認済み）→ PostgreSQL は compose が提供する
 *          ため apt では入れない（ホスト postgres と :5432 の衝突を避ける）
 *        - docker が使えない（導入失敗 / proot 等で daemon 不可）→ フォールバックとして
 *          apt install postgresql → サービス起動 → パスワード設定 + app_db 作成 +
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

/** コマンドを静かに実行して { 成功, stdout } を返す（存在チェック・短い問い合わせ用）。 */
function runQuiet(cmd: string[]): { ok: boolean; out: string } {
  const r = Bun.spawnSync(cmd, { stdout: 'pipe', stderr: 'pipe' })
  return { ok: r.exitCode === 0, out: new TextDecoder().decode(r.stdout).trim() }
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

  // daemon 起動（systemd 環境は自動起動。非 systemd は service を試す。失敗しても続行）
  const svc = privileged(['service', 'docker', 'start'])
  if (svc) await run('sys', svc)

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

  // パスワード設定 + app_db 作成（compose.yaml / .env.example のデフォルトに一致させる）
  const alter = asPostgres(['psql', '-c', "ALTER USER postgres PASSWORD 'postgres'"])
  if (!alter || (await run('db', alter)) !== 0) {
    logLine('db', '! postgres ユーザーのパスワード設定に失敗しました。')
    logLine('db', '  手動: sudo -u postgres psql -c "ALTER USER postgres PASSWORD \'postgres\'"')
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
  const envFile = Bun.file('apps/web/.env')
  if (!(await envFile.exists())) {
    await Bun.write(envFile, await Bun.file('apps/web/.env.example').text())
    logLine('db', 'apps/web/.env を .env.example から生成しました。')
  }
  if ((await run('db', ['bun', 'run', 'db:push'])) === 0) {
    logLine('db', 'OK PostgreSQL(apt)の準備が完了しました(service は起動したままです)。')
    record('PostgreSQL (apt)', 'OK', 'service 起動済み + app_db + スキーマ反映')
  } else {
    record('PostgreSQL (apt)', 'WARN', 'db:push 失敗(後で `bun run db:push` を再実行)')
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

    // ── 2a. Docker(公式 apt リポジトリ経由)──────────────────────────
    if (hasDockerCli) {
      record('Docker (公式リポジトリ)', 'SKIP', '導入済み')
    } else if (noDocker) {
      logLine('sys', 'Skipping Docker install (--no-docker).')
      record('Docker (公式リポジトリ)', 'SKIP', '--no-docker')
    } else {
      const installed = await installDockerOfficialRepo()
      if (installed) {
        // グループ未反映のシェルでは sudo 経由で再評価する。
        // service 直後は socket 準備中のことがあるため最大 15 秒待つ。
        docker = waitForDockerDaemon(15)
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

    // ── 2b. PostgreSQL(docker 可用なら compose 任せ、不可なら apt)────
    if (docker.up) {
      logLine('sys', 'docker が使えるため PostgreSQL は compose が提供します(apt では入れません)。')
      record('システム依存 (apt)', 'OK', 'docker 可用 → apt postgresql 不要')
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
  if (docker.up) {
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
