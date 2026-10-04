/**
 * 一括起動スクリプト（本番構成）。
 *
 *   bun run scripts/execute.ts   （または `bun run start`）
 *
 * 次を順に実行する:
 *   1. `bun install`。失敗したらそこで停止。
 *   2. DB スキーマ反映: `bun run db:push`（組み込み SQLite ファイルを作成/更新。
 *      サーバ・Docker 不要。失敗しても警告のみで続行 — 初回アクセス時にも自動作成される）。
 *   3. `bun run build`（packages + gameserver + next build）。失敗したらそこで停止してサーバは起動しない。
 *   4. ビルド成功後、次の 2 プロセスを並列起動する:
 *        - game server : `bun run server` （権威ゲームサーバ・:8080）
 *        - web client  : `bun run preview`（next start・:4173）
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

// ── DB スキーマ反映（組み込み SQLite） ──────────────────────────────────

/** スキーマを反映する（drizzle-kit push → SQLite ファイル作成/更新。失敗しても続行）。 */
async function applySchema(): Promise<void> {
  logLine('db', 'Applying schema... (bun run db:push / SQLite)')
  const push = spawn('db', ['bun', 'run', 'db:push'])
  const pushExit = await push.exited
  if (pushExit !== 0) {
    logLine('db', `! Schema push failed (exit ${pushExit}). The server will still start;`)
    logLine('db', '  the table is also auto-created on first /api/loadouts access.')
    return
  }
  logLine('db', 'OK Schema is up to date.')
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

// ── 依存の実体検証 ───────────────────────────────────────────────────────
// bun は node_modules の状態ファイルだけを見て「no changes」と報告することがあり、
// 実体のパッケージが欠けていても気付かない(部分削除・pull 直後・proot 環境等)。
// ビルドが `next: command not found` で落ちる前にここで検出して自動修復する。
const CRITICAL_MODULES = ['next', '@libsql/client', 'dexie', 'drizzle-kit', 'typescript']

/** 重要パッケージの実体が node_modules に存在するか確認し、欠けている名前を返す。 */
async function missingCriticalModules(): Promise<string[]> {
  const missing: string[] = []
  for (const name of CRITICAL_MODULES) {
    const candidates = [
      `node_modules/${name}/package.json`,
      `apps/web/node_modules/${name}/package.json`,
    ]
    let found = false
    for (const path of candidates) {
      if (await Bun.file(path).exists()) {
        found = true
        break
      }
    }
    if (!found) missing.push(name)
  }
  return missing
}

/**
 * インストール後の実体検証。欠けがあれば `bun install --force` で一度だけ修復を試み、
 * それでも直らなければ手動復旧手順を表示して false を返す。
 */
async function verifyAndRepairInstall(): Promise<boolean> {
  let missing = await missingCriticalModules()
  if (missing.length === 0) return true
  logLine('install', `! node_modules に実体が欠けています: ${missing.join(', ')}`)
  logLine('install', '  (bun のインストール状態と実体がずれています。--force で再取得します)')
  const force = await runInstallWithLogs(['install', '--force'], 'install')
  if (force.exit !== 0) {
    logLine('install', `X bun install --force failed (exit ${force.exit}).`)
  }
  missing = await missingCriticalModules()
  if (missing.length === 0) {
    logLine('install', 'OK 依存の実体を修復しました。')
    return true
  }
  logLine('install', `X 依然として欠けています: ${missing.join(', ')}`)
  logLine('install', '  手動復旧:')
  logLine('install', '    rm -rf node_modules apps/*/node_modules packages/*/node_modules')
  logLine('install', '    bun install')
  return false
}

async function main(): Promise<number> {
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

  // ── 1b. 依存の実体検証(bun が no changes と言っても欠けていることがある)──
  if (!(await verifyAndRepairInstall())) return 1

  // ── 2. DB スキーマ反映（組み込み SQLite・失敗しても続行） ──────────────
  await applySchema()

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
  const server = spawn('server', ['bun', 'run', 'server'])
  const client = spawn('client', ['bun', 'run', 'preview'])

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
