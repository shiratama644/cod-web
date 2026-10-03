/**
 * 一括起動スクリプト（本番構成）。
 *
 *   bun run scripts/execute.ts   （または `bun run start`）
 *   bun run start --no-db        （PostgreSQL を起動せずに実行）
 *
 * 次を順に実行する:
 *   1. `bun install`。失敗したらそこで停止。
 *   2. PostgreSQL（Docker）起動: `docker compose up -d --wait postgres` → `bun run db:push`。
 *      `--no-db` 指定時はスキップ。docker が無い/起動失敗の場合は警告して **DB なしで続行**
 *      （/api/loadouts はインメモリフォールバック）。起動を止めない。
 *   3. `bun run build`（packages + gameserver + next build）。失敗したらそこで停止してサーバは起動しない。
 *   4. ビルド成功後、次の 2 プロセスを並列起動する:
 *        - game server : `bun run server` （権威ゲームサーバ・:8080）
 *        - web client  : `bun run preview`（next start・:4173、DB 起動時は DATABASE_URL を注入）
 *
 * 各プロセスの stdout/stderr は **プロセスごとに色分けしてタグ付け**して
 * 自プロセスの stdout へ流す。Ctrl+C 等で終了したら子プロセスをすべて後始末する。
 *
 * 補助: 色やタグ付けのために外部依存は使わず ANSI エスケープを直接使う。
 */

// ── ANSI 色（ログの色分け） ──────────────────────────────────────────────
const RESET = '\x1b[0m'
const DIM = '\x1b[2m'
const colors = {
  // インストール: 黄
  install: { tag: 'INSTALL', fg: '\x1b[33m' },
  // データベース: 青
  db: { tag: 'DB', fg: '\x1b[34m' },
  // ビルド: シアン
  build: { tag: 'BUILD', fg: '\x1b[36m' },
  // ゲームサーバ: 緑
  server: { tag: 'SERVER', fg: '\x1b[32m' },
  // Web クライアント（next start）: マゼンタ
  client: { tag: 'CLIENT', fg: '\x1b[35m' },
} as const

type Kind = keyof typeof colors

// 各タグの右側に入れる空白を計算するための最長タグ文字数（7）
const MAX_TAG_LEN = Math.max(...Object.values(colors).map((c) => c.tag.length))

/** 1 行に色付きタグを付けて出力する。 */
function logLine(kind: Kind, line: string): void {
  const { tag, fg } = colors[kind]
  const text = line.replace(/\s+$/, '')
  if (text.length === 0) return
  // タグ内の空白はなくし、[TAG] の右側に空白を補填してメッセージ開始位置を揃える
  const pad = ' '.repeat(MAX_TAG_LEN - tag.length)
  process.stdout.write(`${fg}${DIM}[${tag}]${RESET}${pad} ${fg}${text}${RESET}\n`)
}

/** 子プロセスの stdout/stderr を行単位で色付けして転送する。 */
function pipeOutput(
  kind: Kind,
  proc: {
    stdout?: ReadableStream<Uint8Array> | null
    stderr?: ReadableStream<Uint8Array> | null
  },
): void {
  const decoder = new TextDecoder()
  let buffer = ''
  const pump = (stream: ReadableStream<Uint8Array> | null | undefined) => {
    if (!stream) return
    void (async () => {
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
    })()
  }
  pump(proc.stdout)
  pump(proc.stderr)
}

/** bun のサブコマンドを実行する（npm script を経由せず直接バイナリへ）。 */
function spawn(kind: Kind, cmd: string[], cwd = process.cwd(), env?: Record<string, string>) {
  const proc = Bun.spawn(cmd, {
    cwd,
    env: env ? { ...process.env, ...env } : undefined,
    // 出力は親にパイプして色分けする。
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'inherit',
  })
  pipeOutput(kind, proc)
  return proc
}

// ── PostgreSQL（Docker）起動 ─────────────────────────────────────────────

/** compose.yaml のデフォルトと一致する接続文字列（環境変数があれば尊重する）。 */
const DEFAULT_DATABASE_URL = [
  'postgresql://',
  process.env.POSTGRES_USER ?? 'postgres',
  ':',
  process.env.POSTGRES_PASSWORD ?? 'postgres',
  '@127.0.0.1:',
  process.env.POSTGRES_PORT ?? '5432',
  '/',
  process.env.POSTGRES_DB ?? 'app_db',
].join('')

/** TCP ポートに接続できるか（ローカル PostgreSQL の稼働確認用。1 秒でタイムアウト）。 */
async function tcpOpen(hostname: string, port: number): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), 1000)
    const done = (ok: boolean) => {
      clearTimeout(timer)
      resolve(ok)
    }
    Bun.connect({
      hostname,
      port,
      socket: {
        open(socket) {
          socket.end()
          done(true)
        },
        data() {},
        close() {},
        error() {
          done(false)
        },
        connectError() {
          done(false)
        },
      },
    }).catch(() => done(false))
  })
}

/** スキーマを反映する（DB 起動後に呼ぶ。失敗しても DB ありとして続行）。 */
async function applySchema(): Promise<void> {
  logLine('db', 'Applying schema... (bun run db:push)')
  const push = spawn('db', ['bun', 'run', 'db:push'])
  const pushExit = await push.exited
  if (pushExit !== 0) {
    logLine('db', `! Schema push failed (exit ${pushExit}). The server will still start;`)
    logLine('db', '  /api/loadouts may fall back until `bun run db:push` succeeds.')
    return
  }
  logLine('db', 'OK Schema is up to date.')
}

/**
 * PostgreSQL を用意してスキーマを反映する。
 *   1. 既にローカルで PostgreSQL が動いていれば（apt 版 / Termux proot 等）それを使う
 *   2. なければ docker compose で起動する
 * 失敗しても全体を止めず false を返す（/api/loadouts はインメモリへフォールバック）。
 */
async function startDatabase(): Promise<boolean> {
  // 1. ローカル PostgreSQL（apt 版・proot 環境など Docker を使わない構成）を優先
  const pgPort = Number(process.env.POSTGRES_PORT ?? '5432')
  if (await tcpOpen('127.0.0.1', pgPort)) {
    logLine('db', `PostgreSQL is already listening on 127.0.0.1:${pgPort}; skipping Docker.`)
    await applySchema()
    return true
  }

  if (!Bun.which('docker')) {
    logLine('db', '! docker not found. Starting WITHOUT a database (in-memory fallback).')
    logLine('db', '  Install Docker, or use `bun run start --no-db` to silence this message.')
    return false
  }

  // docker グループ追加が未反映のシェル（セットアップ直後など）では、
  // 直接の docker 呼び出しは権限エラーになるが sudo 経由なら daemon に到達できる。
  const direct = Bun.spawnSync(['docker', 'info', '--format', '{{.ServerVersion}}'], {
    stdout: 'pipe',
    stderr: 'pipe',
  })
  let composeCmd = ['docker', 'compose', 'up', '-d', '--wait', 'postgres']
  if (direct.exitCode !== 0 && Bun.which('sudo')) {
    const viaSudo = Bun.spawnSync(
      ['sudo', '-n', 'docker', 'info', '--format', '{{.ServerVersion}}'],
      {
        stdout: 'pipe',
        stderr: 'pipe',
      },
    )
    if (viaSudo.exitCode === 0) {
      logLine('db', 'docker group not active in this shell yet; using sudo for docker compose.')
      logLine('db', '  (Re-login or `newgrp docker` to drop the sudo requirement.)')
      composeCmd = ['sudo', '-n', ...composeCmd]
    }
  }

  logLine('db', `Starting PostgreSQL... (${composeCmd.join(' ')})`)
  const up = spawn('db', composeCmd)
  const upExit = await up.exited
  if (upExit !== 0) {
    logLine('db', `! PostgreSQL startup failed (exit ${upExit}). Continuing WITHOUT a database.`)
    logLine('db', '  Check: docker daemon running? port in use? -> `bun run db:logs`')
    return false
  }

  logLine('db', 'OK PostgreSQL is healthy.')
  await applySchema()
  return true
}

async function runInstallWithLogs(
  args: string[],
  kind: Kind,
): Promise<{ exit: number; output: string }> {
  // インストールの出力をキャプチャしつつ、色付きで流す。失敗時に詳細を返す。
  let captured = ''
  const proc = Bun.spawn(['bun', ...args], {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'inherit',
  })
  // pipeOutput と同時にキャプチャ
  const decoder = new TextDecoder()
  let buffer = ''
  const pumpCapture = (stream: ReadableStream<Uint8Array> | null | undefined) => {
    if (!stream) return
    void (async () => {
      const reader = stream.getReader()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        captured += chunk
        buffer += chunk
        let nl = buffer.indexOf('\n')
        while (nl >= 0) {
          logLine(kind, buffer.slice(0, nl))
          buffer = buffer.slice(nl + 1)
          nl = buffer.indexOf('\n')
        }
      }
      if (buffer.length > 0) {
        logLine(kind, buffer)
        buffer = ''
      }
    })()
  }
  pumpCapture(proc.stdout)
  pumpCapture(proc.stderr)
  const exit = await proc.exited
  return { exit: exit ?? 1, output: captured }
}

async function main(): Promise<number> {
  // `bun run start --no-db` / `bun run scripts/execute.ts --no-db` で DB 起動をスキップ
  const noDb = process.argv.includes('--no-db')

  // ── 1. 依存関係のインストール ──────────────────────────────────────────
  // まずは frozen-lockfile で決定的に。失敗したら verbose で原因を出す。
  logLine('install', 'Installing dependencies... (bun install --frozen-lockfile)')
  const result = await runInstallWithLogs(['install', '--frozen-lockfile'], 'install')
  if (result.exit !== 0) {
    logLine(
      'install',
      `! First install failed (exit ${result.exit}). Retrying with --verbose to diagnose...`,
    )
    const verbose = await runInstallWithLogs(['install', '--verbose'], 'install')
    logLine(
      'install',
      `X Install failed (exit ${verbose.exit}). Build and servers will not be started.`,
    )
    logLine('install', `--- Troubleshooting ---`)
    logLine('install', `1) Bun cache clear: bun pm cache rm`)
    logLine('install', `2) Force reinstall: bun install --force`)
    logLine(
      'install',
      `3) If @biomejs or optional deps fail: bun install --ignore-scripts then bun run prepare`,
    )
    logLine('install', `4) Check network / proxy, then retry: bun run start`)
    logLine('install', `Last output tail:`)
    const tail = verbose.output.split('\n').slice(-30).join('\n')
    for (const line of tail.split('\n')) {
      if (line.trim().length > 0) logLine('install', `  ${line}`)
    }
    return verbose.exit ?? 1
  }
  logLine('install', 'OK Install succeeded.')

  // ── 2. PostgreSQL（Docker）起動（任意・失敗しても続行） ────────────────
  let dbReady = false
  if (noDb) {
    logLine('db', 'Skipping PostgreSQL startup (--no-db). /api/loadouts uses in-memory fallback.')
  } else {
    dbReady = await startDatabase()
  }

  // ── 3. ビルド ─────────────────────────────────────────────────────────
  logLine('build', 'Starting production build... (packages + gameserver + next build)')
  const build = Bun.spawn(['bun', 'run', 'build'], {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'inherit',
  })
  pipeOutput('build', build)
  const buildExit = await build.exited
  if (buildExit !== 0) {
    logLine('build', `X Build failed (exit ${buildExit}). Servers will not be started.`)
    return buildExit ?? 1
  }
  logLine('build', 'OK Build succeeded. Starting game server and client...')

  // ── 4. game server と next preview を並列起動 ──────────────────────────
  // DB が起動できた場合、未設定なら DATABASE_URL を注入して永続化を有効にする
  // （apps/web/.env 等で明示設定済みならそちらを優先する）。
  const clientEnv: Record<string, string> = {}
  if (dbReady && !process.env.DATABASE_URL) {
    clientEnv.DATABASE_URL = DEFAULT_DATABASE_URL
    logLine('db', 'DATABASE_URL injected into web client (compose defaults).')
  }
  const server = spawn('server', ['bun', 'run', 'server'])
  const client = spawn('client', ['bun', 'run', 'preview'], process.cwd(), clientEnv)

  // どちらかが落ちたら全体を終扱いにする。
  const children = [
    { name: 'SERVER' as const, proc: server },
    { name: 'CLIENT' as const, proc: client },
  ]

  const shutdown = (signal: string) => {
    logLine('build', `Received ${signal}. Terminating child processes...`)
    for (const c of children) {
      try {
        c.proc.kill('SIGTERM')
      } catch {
        /* 既に終了済み */
      }
    }
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  // 各プロセスの終了を待つ。
  const exits = await Promise.all(
    children.map(async (c) => {
      const code = await c.proc.exited
      return { name: c.name, code }
    }),
  )

  for (const e of exits) {
    logLine('build', `${e.name} exited (exit ${e.code}).`)
  }
  // どちらかが非ゼロで落ちたら、もう片方も畳む。
  const failed = exits.find((e) => e.code !== 0)
  if (failed) {
    shutdown('CHILD-EXIT')
    return failed.code ?? 1
  }
  return 0
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    logLine(
      'build',
      `X Unexpected error: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`,
    )
    process.exit(1)
  })
