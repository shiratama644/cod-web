/**
 * 一括起動スクリプト（本番構成）。
 *
 *   bun run scripts/execute.ts   （または `bun run start`）
 *
 * 次を順に実行する:
 *   1. `bun run build`（vite build）。失敗したらそこで停止してサーバは起動しない。
 *   2. ビルド成功後、次の 2 プロセスを並列起動する:
 *        - game server : `bun run server` （権威ゲームサーバ・:8080）
 *        - web client  : `bun run preview`（vite preview・:4173、/ws を 8080 へプロキシ）
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
  // ビルド: シアン
  build: { tag: 'BUILD ', fg: '\x1b[36m' },
  // ゲームサーバ: 緑
  server: { tag: 'SERVER', fg: '\x1b[32m' },
  // Web クライアント（vite preview）: マゼンタ
  client: { tag: 'CLIENT', fg: '\x1b[35m' },
} as const

type Kind = keyof typeof colors

/** 1 行に色付きタグを付けて出力する。 */
function logLine(kind: Kind, line: string): void {
  const { tag, fg } = colors[kind]
  const text = line.replace(/\s+$/, '')
  if (text.length === 0) return
  // [TAG] を色付け、残りは通常色（サーバ/クライアント側が出す生ログはそのまま）。
  process.stdout.write(`${fg}${DIM}[${tag}]${RESET} ${fg}${text}${RESET}\n`)
}

/** 子プロセスの stdout/stderr を行単位で色付けして転送する。 */
function pipeOutput(kind: Kind, proc: {
  stdout?: ReadableStream<Uint8Array> | null
  stderr?: ReadableStream<Uint8Array> | null
}): void {
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
function spawn(kind: Kind, cmd: string[], cwd = process.cwd()) {
  const proc = Bun.spawn(cmd, {
    cwd,
    // 出力は親にパイプして色分けする。
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'inherit',
  })
  pipeOutput(kind, proc)
  return proc
}

async function main(): Promise<number> {
  logLine('build', 'production build を開始します… (vite build)')

  // ── 1. ビルド（バッファして最後にまとめて色付け出力） ──────────────────
  const build = Bun.spawn(['bun', 'run', 'build'], {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'inherit',
  })
  pipeOutput('build', build)
  const buildExit = await build.exited
  if (buildExit !== 0) {
    logLine('build', `❌ ビルドが失敗しました（exit ${buildExit}）。サーバは起動しません。`)
    return buildExit ?? 1
  }
  logLine('build', '✅ ビルド成功。ゲームサーバとクライアントを起動します。')

  // ── 2. game server と vite preview を並列起動 ──────────────────────────
  const server = spawn('server', ['bun', 'run', 'server'])
  const client = spawn('client', ['bun', 'run', 'preview'])

  // どちらかが落ちたら全体を終扱いにする。
  const children = [
    { name: 'SERVER' as const, proc: server },
    { name: 'CLIENT' as const, proc: client },
  ]

  const shutdown = (signal: string) => {
    logLine('build', `${signal} を受信しました。子プロセスを終了します…`)
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
    logLine('build', `${e.name} が終了しました（exit ${e.code}）。`)
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
    logLine('build', `❌ 予期せぬエラー: ${err instanceof Error ? err.stack ?? err.message : String(err)}`)
    process.exit(1)
  })
