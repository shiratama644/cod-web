/**
 * 一括品質ゲート + ログ保存スクリプト（並列版）
 *
 *   bun run check:all
 *   bun run scripts/check-all.ts
 *
 * build / e2e 以外の主要ゲートを async 並列で実行し、
 * 各出力を logs/<name>.log に保存。
 * 1つでも失敗したら残りを abort して即停止。
 *
 * 対象:
 *   - install (bun install --frozen-lockfile)
 *   - typecheck (tsc x2)
 *   - lint (biome lint .)
 *   - test:unit (vitest run)
 *   - test:coverage (vitest run --coverage)
 *   - check:determinism (scripts/check-determinism.ts)
 *   - check:determinism:heavy (scripts/determinism-heavy.ts)
 *
 * 出力:
 *   logs/
 *     01-install.log
 *     02-typecheck.log
 *     03-lint.log
 *     04-test-unit.log
 *     05-test-coverage.log
 *     06-check-determinism.log
 *     07-check-determinism-heavy.log
 *     summary.log
 *     summary.json
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

type Task = {
  id: string
  label: string
  cmd: string[]
  logFile: string
}

const RESET = '\x1b[0m'
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const CYAN = '\x1b[36m'
const YELLOW = '\x1b[33m'
const DIM = '\x1b[2m'

function nowJst(): string {
  return new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', hour12: false })
}

function log(msg: string) {
  console.log(`${CYAN}[check:all]${RESET} ${msg}`)
}

const LOG_DIR = join(process.cwd(), 'logs')
mkdirSync(LOG_DIR, { recursive: true })

const tasks: Task[] = [
  {
    id: 'install',
    label: 'bun install --frozen-lockfile',
    cmd: ['bun', 'install', '--frozen-lockfile'],
    logFile: '01-install.log',
  },
  {
    id: 'typecheck',
    label: 'typecheck (tsc x2)',
    cmd: ['bun', 'run', 'typecheck'],
    logFile: '02-typecheck.log',
  },
  {
    id: 'lint',
    label: 'biome lint',
    cmd: ['bun', 'run', 'lint'],
    logFile: '03-lint.log',
  },
  {
    id: 'test:unit',
    label: 'vitest run',
    cmd: ['bun', 'run', 'test:unit'],
    logFile: '04-test-unit.log',
  },
  {
    id: 'test:coverage',
    label: 'vitest coverage',
    cmd: ['bun', 'run', 'test:coverage'],
    logFile: '05-test-coverage.log',
  },
  {
    id: 'check:determinism',
    label: 'determinism guard',
    cmd: ['bun', 'run', 'check:determinism'],
    logFile: '06-check-determinism.log',
  },
  {
    id: 'check:determinism:heavy',
    label: 'determinism heavy 100x1000',
    cmd: ['bun', 'run', 'check:determinism:heavy'],
    logFile: '07-check-determinism-heavy.log',
  },
]

type Result = {
  id: string
  label: string
  cmd: string[]
  logFile: string
  exit: number
  durationMs: number
  startedAt: string
  finishedAt: string
  ok: boolean
  aborted?: boolean
}

async function runTask(task: Task, signal: AbortSignal): Promise<Result> {
  const startedAt = nowJst()
  const startedMs = Date.now()
  log(`${YELLOW}▶ ${task.id}${RESET} ${DIM}${task.label}${RESET} -> logs/${task.logFile}`)

  let captured = `> ${task.cmd.join(' ')}\n`
  captured += `> started: ${startedAt} (JST)\n`
  captured += `> log: logs/${task.logFile}\n`
  captured += `${'-'.repeat(60)}\n`

  const proc = Bun.spawn(task.cmd, {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
  })

  let aborted = false
  const onAbort = () => {
    aborted = true
    try {
      proc.kill('SIGTERM')
      setTimeout(() => {
        try {
          proc.kill('SIGKILL')
        } catch {}
      }, 1000)
    } catch {}
  }
  if (signal.aborted) {
    onAbort()
  } else {
    signal.addEventListener('abort', onAbort, { once: true })
  }

  const decoder = new TextDecoder()
  const readStream = async (stream: ReadableStream<Uint8Array> | null | undefined) => {
    if (!stream) return
    const reader = stream.getReader()
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        captured += decoder.decode(value)
      }
    } catch {
      // aborted stream
    }
  }

  await Promise.all([readStream(proc.stdout), readStream(proc.stderr)])
  const exit = await proc.exited
  signal.removeEventListener('abort', onAbort)

  const durationMs = Date.now() - startedMs
  const finishedAt = nowJst()
  // abort された場合は exit が 0 でも失敗扱い
  const ok = !aborted && exit === 0 && !signal.aborted

  captured += `${'-'.repeat(60)}\n`
  captured += `> finished: ${finishedAt} (JST)\n`
  captured += `> duration: ${durationMs}ms\n`
  captured += `> exit: ${exit} ${aborted ? '(ABORTED)' : ''} ${ok ? 'OK' : 'FAILED'}\n`

  const logPath = join(LOG_DIR, task.logFile)
  writeFileSync(logPath, captured, 'utf8')

  const icon = ok ? `${GREEN}✔${RESET}` : `${RED}✘${RESET}`
  const status = aborted
    ? `${RED}ABORTED${RESET}`
    : ok
      ? `${GREEN}OK${RESET}`
      : `${RED}FAILED (exit ${exit})${RESET}`
  log(`${icon} ${task.id} ${status} ${DIM}${durationMs}ms -> ${task.logFile}${RESET}`)

  return {
    id: task.id,
    label: task.label,
    cmd: task.cmd,
    logFile: task.logFile,
    exit: exit ?? 1,
    durationMs,
    startedAt,
    finishedAt,
    ok,
    aborted,
  }
}

async function main() {
  log(`Starting all checks in PARALLEL (excluding build/e2e). Logs -> ${LOG_DIR}`)
  log(`Tasks: ${tasks.map((t) => t.id).join(', ')}`)
  log(`Mode: async parallel + await all, abort on first failure`)
  console.log('')

  const controller = new AbortController()
  const { signal } = controller

  // 並列起動: それぞれ async で実行
  const promises = tasks.map((task) => runTask(task, signal))

  // 1つでも失敗したら即停止: 各 promise が resolve した時点でチェック
  const results: Result[] = []
  let failed = false

  // Promise.all ではなく、完了順に監視して失敗時に abort
  const wrapped = promises.map(async (p) => {
    const r = await p
    results.push(r)
    if (!r.ok && !failed) {
      failed = true
      log(`${RED}✘ ${r.id} failed -> aborting remaining tasks...${RESET}`)
      controller.abort()
    }
    return r
  })

  // await でまとめる（ユーザー要望: async並列 + await）
  const allResults = await Promise.all(wrapped)

  // summary
  const totalMs = allResults.reduce((s, r) => s + r.durationMs, 0)
  const passed = allResults.filter((r) => r.ok).length
  const failedResults = allResults.filter((r) => !r.ok)

  let summaryText = `check:all summary (PARALLEL)\n`
  summaryText += `date: ${nowJst()} (JST)\n`
  summaryText += `mode: parallel async + abort on failure\n`
  summaryText += `total: ${allResults.length} tasks, ${passed} passed, ${failedResults.length} failed, ${totalMs}ms\n`
  summaryText += `${'-'.repeat(60)}\n`
  for (const r of allResults) {
    const st = r.aborted ? 'ABORTED' : r.ok ? 'OK' : `FAILED exit=${r.exit}`
    summaryText += `${r.ok ? '✔' : '✘'} ${r.id.padEnd(28)} ${st.padEnd(18)} ${r.durationMs}ms -> ${r.logFile}\n`
  }
  summaryText += `${'-'.repeat(60)}\n`
  if (failedResults.length > 0) {
    summaryText += `FAILED tasks:\n`
    for (const f of failedResults) {
      summaryText += `  - ${f.id}: logs/${f.logFile} ${f.aborted ? '(aborted)' : ''}\n`
    }
  } else {
    summaryText += `All checks passed.\n`
  }

  writeFileSync(join(LOG_DIR, 'summary.log'), summaryText, 'utf8')
  writeFileSync(
    join(LOG_DIR, 'summary.json'),
    JSON.stringify(
      {
        date: nowJst(),
        mode: 'parallel',
        total: allResults.length,
        passed,
        failed: failedResults.length,
        totalMs,
        results: allResults,
      },
      null,
      2,
    ),
    'utf8',
  )

  console.log('')
  console.log(summaryText)
  if (failedResults.length > 0) {
    log(`${RED}✘ ${failedResults.length} task(s) failed. See logs/ for details.${RESET}`)
    process.exit(1)
  } else {
    log(`${GREEN}✔ All ${allResults.length} tasks passed. Logs in ${LOG_DIR}${RESET}`)
    process.exit(0)
  }
}

main().catch((err) => {
  console.error(`Unexpected error: ${err instanceof Error ? err.stack ?? err.message : String(err)}`)
  process.exit(1)
})
