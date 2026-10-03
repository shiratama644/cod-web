/**
 * 一括セットアップスクリプト。環境を準備するだけで、アプリ・ビルドは実行しない。
 *
 *   bun run setup            （= bun run scripts/setup.ts）
 *   bun run setup --no-apt   （apt によるシステム依存インストールをスキップ）
 *   bun run setup --e2e      （Playwright ブラウザ(chromium)も取得する）
 *
 * 実行内容（各ステップは冪等。失敗しても可能な限り続行するフェイルソフト設計）:
 *   1. 環境診断     : bun / node / docker / apt の有無とバージョンを表示
 *   2. システム依存 : apt が使える環境でのみ実行
 *        - docker あり → PostgreSQL は compose が提供するため apt では入れない
 *                        （ホスト postgres と :5432 が衝突するのを避ける）
 *        - docker なし（Termux proot 等）→ apt install postgresql → サービス起動 →
 *          パスワード設定 + app_db 作成 + apps/web/.env 生成 + スキーマ反映
 *   3. bun install  : --frozen-lockfile（唯一の必須ステップ。失敗時はここで終了）
 *   4. git hooks    : husky（bun install の prepare で入るため確認のみ）
 *   5. docker あり  : docker compose pull postgres（イメージ取得のみ。起動はしない）
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

type Status = 'OK' | 'SKIP' | 'WARN' | 'FAIL'
const summary: { step: string; status: Status; note: string }[] = []
function record(step: string, status: Status, note = ''): void {
  summary.push({ step, status, note })
}

/** apt 環境で PostgreSQL をインストールし、ユーザー/DB/.env/スキーマまで整える。 */
async function setupAptPostgres(): Promise<void> {
  logLine('db', 'docker が見つからないため、PostgreSQL を apt でセットアップします。')
  const install = privileged(['apt-get', 'install', '-y', 'postgresql', 'postgresql-client'])
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
  const withE2e = args.includes('--e2e')

  // ── 1. 環境診断 ───────────────────────────────────────────────────────
  const bunVer = runQuiet(['bun', '--version'])
  const nodeVer = runQuiet(['node', '--version'])
  const hasApt = Boolean(Bun.which('apt-get'))
  const hasDocker = Boolean(Bun.which('docker'))
  logLine('setup', `bun ${bunVer.out || '不明'} / node ${nodeVer.out || 'なし'}`)
  logLine('setup', `docker: ${hasDocker ? 'あり' : 'なし'} / apt: ${hasApt ? 'あり' : 'なし'}`)
  record('環境診断', 'OK', `bun ${bunVer.out}, docker ${hasDocker ? 'あり' : 'なし'}`)

  // ── 2. システム依存(apt)─────────────────────────────────────────────
  if (noApt) {
    logLine('sys', 'Skipping apt (--no-apt).')
    record('システム依存 (apt)', 'SKIP', '--no-apt')
  } else if (!hasApt) {
    logLine('sys', 'apt-get が無い環境のためスキップします(macOS は Docker Desktop を推奨)。')
    record('システム依存 (apt)', 'SKIP', 'apt なし')
  } else {
    const update = privileged(['apt-get', 'update'])
    if (update && (await run('sys', update)) !== 0) {
      logLine('sys', '! apt-get update に失敗しました(ネットワーク?)。続行します。')
    }
    if (hasDocker) {
      logLine('sys', 'docker があるため PostgreSQL は compose が提供します(apt では入れません)。')
      record('システム依存 (apt)', 'OK', 'docker あり → apt postgresql 不要')
    } else {
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
  if (hasDocker) {
    logLine('db', 'Pulling PostgreSQL image... (docker compose pull postgres)')
    const code = await run('db', ['docker', 'compose', 'pull', 'postgres'])
    record('postgres イメージ取得', code === 0 ? 'OK' : 'WARN', code === 0 ? '' : 'pull 失敗')
  } else {
    record('postgres イメージ取得', 'SKIP', 'docker なし')
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
