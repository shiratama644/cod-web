/**
 * 一括起動スクリプト（本番構成）。
 *
 *   pnpm run start   （tsx 実行・Node。2026-10-03 bun→pnpm 移行で child_process に移植）
 *
 * 次を順に実行する:
 *   1. `pnpm install --frozen-lockfile`。失敗したらそこで停止。
 *   2. `pnpm run build`（packages + gameserver + next build）。失敗したらそこで停止してサーバは起動しない。
 *   3. ビルド成功後、次の 2 プロセスを並列起動する:
 *        - game server : `pnpm run server` （権威ゲームサーバ・:8080、bun ランタイムで実行）
 *        - web client  : `pnpm run preview`（next start・:4173）
 *
 * 各プロセスの stdout/stderr は **プロセスごとに色分けしてタグ付け**して
 * 自プロセスの stdout へ流す。Ctrl+C 等で終了したら子プロセスをすべて後始末する。
 *
 * 補助: 色やタグ付けのために外部依存は使わず ANSI エスケープを直接使う。
 */

import { type ChildProcess, spawn as nodeSpawn } from 'node:child_process'

// ── ANSI 色（ログの色分け） ──────────────────────────────────────────────
const RESET = '\x1b[0m'
const DIM = '\x1b[2m'
const colors = {
  // インストール: 黄
  install: { tag: 'INSTALL', fg: '\x1b[33m' },
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

/** 子プロセスの stdout/stderr を行単位で色付けして転送する。capture=true なら全文も返す。 */
function pipeOutput(
  kind: Kind,
  proc: ChildProcess,
  onChunk?: (chunk: string) => void,
): void {
  let buffer = ''
  const pump = (stream: NodeJS.ReadableStream | null) => {
    if (!stream) return
    stream.on('data', (data: Buffer) => {
      const chunk = data.toString('utf8')
      onChunk?.(chunk)
      buffer += chunk
      let nl = buffer.indexOf('\n')
      while (nl >= 0) {
        logLine(kind, buffer.slice(0, nl))
        buffer = buffer.slice(nl + 1)
        nl = buffer.indexOf('\n')
      }
    })
    stream.on('end', () => {
      if (buffer.length > 0) {
        logLine(kind, buffer)
        buffer = ''
      }
    })
  }
  pump(proc.stdout)
  pump(proc.stderr)
}

/** 子プロセスの終了コードを Promise で待つ。 */
function waitExit(proc: ChildProcess): Promise<number> {
  return new Promise((resolve) => {
    proc.on('close', (code, sig) => resolve(code ?? (sig ? 143 : 1)))
    proc.on('error', () => resolve(1))
  })
}

/** コマンドを起動して出力を色分け転送する（npm script を経由せず直接バイナリへ）。 */
function spawnTagged(kind: Kind, cmd: string[], cwd = process.cwd()): ChildProcess {
  const proc = nodeSpawn(cmd[0] as string, cmd.slice(1), {
    cwd,
    // 出力は親にパイプして色分けする。
    stdio: ['inherit', 'pipe', 'pipe'],
  })
  pipeOutput(kind, proc)
  return proc
}

async function runInstallWithLogs(
  args: string[],
  kind: Kind,
): Promise<{ exit: number; output: string }> {
  // インストールの出力をキャプチャしつつ、色付きで流す。失敗時に詳細を返す。
  let captured = ''
  const proc = nodeSpawn('pnpm', args, {
    cwd: process.cwd(),
    stdio: ['inherit', 'pipe', 'pipe'],
  })
  pipeOutput(kind, proc, (chunk) => {
    captured += chunk
  })
  const exit = await waitExit(proc)
  return { exit, output: captured }
}

async function main(): Promise<number> {
  // ── 1. 依存関係のインストール ──────────────────────────────────────────
  // まずは frozen-lockfile で決定的に。失敗したら verbose で原因を出す。
  logLine('install', 'Installing dependencies... (pnpm install --frozen-lockfile)')
  const result = await runInstallWithLogs(['install', '--frozen-lockfile'], 'install')
  if (result.exit !== 0) {
    logLine('install', `! First install failed (exit ${result.exit}). Retrying with --loglevel=debug to diagnose...`)
    const verbose = await runInstallWithLogs(['install', '--loglevel=debug'], 'install')
    logLine('install', `X Install failed (exit ${verbose.exit}). Build and servers will not be started.`)
    logLine('install', `--- Troubleshooting ---`)
    logLine('install', `1) pnpm store prune`)
    logLine('install', `2) Force reinstall: pnpm install --force`)
    logLine('install', `3) If @biomejs or optional deps fail: pnpm install --ignore-scripts then pnpm run prepare`)
    logLine('install', `4) Check network / proxy, then retry: pnpm run start`)
    logLine('install', `Last output tail:`)
    const tail = verbose.output.split('\n').slice(-30).join('\n')
    for (const line of tail.split('\n')) {
      if (line.trim().length > 0) logLine('install', `  ${line}`)
    }
    return verbose.exit ?? 1
  }
  logLine('install', 'OK Install succeeded.')

  // ── 2. ビルド ─────────────────────────────────────────────────────────
  logLine('build', 'Starting production build... (packages + gameserver + next build)')
  const build = spawnTagged('build', ['pnpm', 'run', 'build'])
  const buildExit = await waitExit(build)
  if (buildExit !== 0) {
    logLine('build', `X Build failed (exit ${buildExit}). Servers will not be started.`)
    return buildExit ?? 1
  }
  logLine('build', 'OK Build succeeded. Starting game server and client...')

  // ── 3. game server と next preview を並列起動 ──────────────────────────
  const server = spawnTagged('server', ['pnpm', 'run', 'server'])
  const client = spawnTagged('client', ['pnpm', 'run', 'preview'])

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
      const code = await waitExit(c.proc)
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
    logLine('build', `X Unexpected error: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`)
    process.exit(1)
  })
