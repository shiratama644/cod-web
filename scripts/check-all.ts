/**
 * 一括品質ゲート + ログ保存スクリプト（install先行 + 並列版・abort対応・hang修正）
 *
 *   bun run check:all
 *
 * 1. install を最初に単独実行（依存解決のため）
 * 2. 残り6タスクを並列実行（速い順: lint → determinism → heavy → typecheck → test:unit → coverage）
 *    1つでも失敗したら残りを abort。typecheck のように sh -c "tsc && tsc" で
 *    子プロセスを持つタスクでもハングしないよう、
 *    - setsid で新しいプロセスグループを作成
 *    - abort 時に kill -TERM/-KILL -pgid でグループ全体を kill
 *    - pkill -P で子も kill
 *    - ReadableStream reader.cancel() で読み取りループを抜ける
 *    - proc.exited に 6秒タイムアウト、全体に 10分 hard timeout
 *    で確実に Promise.all が resolve し、summary.log が書かれて exit する。
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

// 速度順に並べ替え: install(2s) → lint(1s) → determinism(0.3s) → heavy(1-2s) → typecheck(14-18s) → test:unit(11-26s) → coverage(24-30s)
// install は最初に単独実行するため、残り6つは並列だがログ番号は速度順
const tasks: Task[] = [
  {
    id: 'install',
    label: 'bun install --frozen-lockfile',
    cmd: ['bun', 'install', '--frozen-lockfile'],
    logFile: '01-install.log',
  },
  {
    id: 'lint',
    label: 'biome lint',
    cmd: ['bun', 'run', 'lint'],
    logFile: '02-lint.log',
  },
  {
    id: 'check:determinism',
    label: 'determinism guard',
    cmd: ['bun', 'run', 'check:determinism'],
    logFile: '03-check-determinism.log',
  },
  {
    id: 'check:determinism:heavy',
    label: 'determinism heavy 100x1000',
    cmd: ['bun', 'run', 'check:determinism:heavy'],
    logFile: '04-check-determinism-heavy.log',
  },
  {
    id: 'typecheck',
    label: 'typecheck (tsc x2)',
    cmd: ['bun', 'run', 'typecheck'],
    logFile: '05-typecheck.log',
  },
  {
    id: 'test:unit',
    label: 'vitest run',
    cmd: ['bun', 'run', 'test:unit'],
    logFile: '06-test-unit.log',
  },
  {
    id: 'test:coverage',
    label: 'vitest coverage',
    cmd: ['bun', 'run', 'test:coverage'],
    logFile: '07-test-coverage.log',
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

function hasSetsid(): boolean {
  try {
    const p = Bun.spawnSync(['which', 'setsid'])
    return p.exitCode === 0
  } catch {
    return false
  }
}

const USE_SETSID = hasSetsid()

async function runTask(task: Task, signal: AbortSignal): Promise<Result> {
  const startedAt = nowJst()
  const startedMs = Date.now()
  log(`${YELLOW}▶ ${task.id}${RESET} ${DIM}${task.label}${RESET} -> logs/${task.logFile}`)

  let captured = `> ${task.cmd.join(' ')}\n`
  captured += `> started: ${startedAt} (JST)\n`
  captured += `> log: logs/${task.logFile}\n`
  captured += `${'-'.repeat(60)}\n`
  captured += `> use setsid: ${USE_SETSID}\n`

  // setsid で新しい pgid を作ることで、kill -TERM -pgid で子含めて殺せる
  const spawnCmd = USE_SETSID ? ['setsid', ...task.cmd] : task.cmd

  const proc = Bun.spawn(spawnCmd, {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
  })

  let aborted = false
  let killTimer: ReturnType<typeof setTimeout> | null = null

  const killGroup = (sig: string) => {
    // pgid kill: kill -TERM -<pid>
    try {
      Bun.spawnSync(['sh', '-c', `kill -${sig} -${proc.pid} 2>/dev/null; kill -${sig} ${proc.pid} 2>/dev/null; pkill -${sig} -P ${proc.pid} 2>/dev/null`])
    } catch {}
  }

  const onAbort = () => {
    if (aborted) return
    aborted = true
    captured += `\n[check:all] ABORT signal received, killing ${task.id} (pid ${proc.pid} pgid ${proc.pid})...\n`
    try {
      killGroup('TERM')
      // 子プロセスを先に kill（sh -c "sleep|tsc" のケースで orphan 化を防ぐ）
      Bun.spawn(['sh', '-c', `pkill -9 -P ${proc.pid} 2>/dev/null; echo killed children of ${proc.pid}`], {
        stdout: 'pipe',
        stderr: 'pipe',
      })
    } catch {}
    try {
      proc.kill('SIGTERM')
      killTimer = setTimeout(() => {
        try {
          killGroup('KILL')
        } catch {}
        try {
          proc.kill('SIGKILL')
        } catch {}
        try {
          Bun.spawn(['sh', '-c', `pkill -9 -P ${proc.pid} 2>/dev/null; kill -9 -${proc.pid} 2>/dev/null`], {
            stdout: 'pipe',
            stderr: 'pipe',
          })
        } catch {}
      }, 1200)
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
        if (aborted || signal.aborted) {
          try {
            await reader.cancel()
          } catch {}
          break
        }
        const { done, value } = await reader.read()
        if (done) break
        captured += decoder.decode(value, { stream: true })
      }
    } catch {
      // aborted
    } finally {
      try {
        reader.releaseLock()
      } catch {}
    }
  }

  const stdoutP = readStream(proc.stdout)
  const stderrP = readStream(proc.stderr)

  const exitPromise = proc.exited.then((c) => c ?? 1)
  const exitWithTimeout = async (): Promise<number> => {
    if (aborted || signal.aborted) {
      const timeout = new Promise<number>((res) => setTimeout(() => res(143), 6000))
      return Promise.race([exitPromise, timeout])
    }
    return exitPromise
  }

  const hardTimeoutMs = 10 * 60 * 1000
  const hardTimeout = new Promise<{ exit: number; timedOut: boolean }>((res) =>
    setTimeout(() => res({ exit: 143, timedOut: true }), hardTimeoutMs),
  )

  const tasksDone = Promise.all([stdoutP, stderrP]).then(async () => {
    const e = await exitWithTimeout()
    return { exit: e, timedOut: false }
  })

  const { exit, timedOut } = (await Promise.race([tasksDone, hardTimeout])) as {
    exit: number
    timedOut: boolean
  }

  if (timedOut) {
    captured += `\n[check:all] HARD TIMEOUT ${hardTimeoutMs}ms, force killing ${task.id}\n`
    try {
      killGroup('KILL')
    } catch {}
    try {
      proc.kill('SIGKILL')
    } catch {}
    aborted = true
  }

  if (killTimer) clearTimeout(killTimer)
  signal.removeEventListener('abort', onAbort)

  const durationMs = Date.now() - startedMs
  const finishedAt = nowJst()
  const ok = !aborted && exit === 0

  captured += `${'-'.repeat(60)}\n`
  captured += `> finished: ${finishedAt} (JST)\n`
  captured += `> duration: ${durationMs}ms\n`
  captured += `> exit: ${exit} ${aborted ? '(ABORTED)' : ''} ${timedOut ? '(HARD TIMEOUT)' : ''} ${ok ? 'OK' : 'FAILED'}\n`

  const logPath = join(LOG_DIR, task.logFile)
  writeFileSync(logPath, captured, 'utf8')

  const icon = ok ? `${GREEN}✔${RESET}` : `${RED}✘${RESET}`
  const status = aborted
    ? `${RED}${timedOut ? 'TIMEOUT' : 'ABORTED'}${RESET}`
    : ok
      ? `${GREEN}OK${RESET}`
      : `${RED}FAILED (exit ${exit})${RESET}`
  log(`${icon} ${task.id} ${status} ${DIM}${durationMs}ms -> ${task.logFile}${RESET}`)

  return {
    id: task.id,
    label: task.label,
    cmd: task.cmd,
    logFile: task.logFile,
    exit,
    durationMs,
    startedAt,
    finishedAt,
    ok,
    aborted,
  }
}

async function main() {
  log(`Starting all checks. Logs -> ${LOG_DIR}`)
  log(`Phase 1: install (sequential, must succeed first)`)
  log(`Phase 2: remaining 6 tasks in PARALLEL (fast-first order, abort on failure, setsid=${USE_SETSID})`)
  log(`Order: ${tasks.map((t) => t.id).join(' -> ')}`)
  console.log('')

  // Phase 1: install を最初に単独実行
  const installTask = tasks[0]
  const installSignal = new AbortController().signal // install は abort しない
  const installResult = await runTask(installTask, installSignal)

  if (!installResult.ok) {
    // install 失敗時は即終了、summary を書く
    const summaryText = `check:all summary (install-first)\n` +
      `date: ${nowJst()} (JST)\n` +
      `mode: install first sequential, then parallel (fast-first)\n` +
      `FAILED at install phase\n` +
      `${'-'.repeat(60)}\n` +
      `${installResult.ok ? '✔' : '✘'} ${installTask.id.padEnd(28)} FAILED exit=${installResult.exit} ${installResult.durationMs}ms -> ${installTask.logFile}\n`

    writeFileSync(join(LOG_DIR, 'summary.log'), summaryText, 'utf8')
    writeFileSync(
      join(LOG_DIR, 'summary.json'),
      JSON.stringify(
        {
          date: nowJst(),
          mode: 'install-first',
          total: 1,
          passed: 0,
          failed: 1,
          totalMs: installResult.durationMs,
          results: [installResult],
        },
        null,
        2,
      ),
      'utf8',
    )
    console.log('')
    console.log(summaryText)
    log(`${RED}✘ install failed, aborting all. See logs/ for details.${RESET}`)
    process.exit(1)
  }

  // Phase 2: 残り6タスクを並列実行
  const remainingTasks = tasks.slice(1)
  log(`✔ install OK, starting Phase 2 parallel: ${remainingTasks.map((t) => t.id).join(', ')}`)
  console.log('')

  const controller = new AbortController()
  const { signal } = controller

  const promises = remainingTasks.map((task) => runTask(task, signal))

  let failed = false
  const wrapped = promises.map(async (p) => {
    const r = await p
    if (!r.ok && !failed) {
      failed = true
      log(`${RED}✘ ${r.id} failed -> aborting remaining tasks...${RESET}`)
      controller.abort()
    }
    return r
  })

  const phase2Results = await Promise.all(wrapped)
  const allResults = [installResult, ...phase2Results]

  const totalMs = allResults.reduce((s, r) => s + r.durationMs, 0)
  const passed = allResults.filter((r) => r.ok).length
  const failedResults = allResults.filter((r) => !r.ok)

  let summaryText = `check:all summary (install-first + parallel)\n`
  summaryText += `date: ${nowJst()} (JST)\n`
  summaryText += `mode: install sequential first, then 6 tasks parallel fast-first (setsid=${USE_SETSID})\n`
  summaryText += `order: ${tasks.map((t) => t.id).join(' -> ')}\n`
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
        mode: 'install-first-parallel',
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
    log(`${RED}✘ ${failedResults.length} task(s) failed. See logs/ for details. Will exit now (no Ctrl+C needed).${RESET}`)
    setTimeout(() => process.exit(1), 200)
  } else {
    log(`${GREEN}✔ All ${allResults.length} tasks passed. Logs in ${LOG_DIR}${RESET}`)
    setTimeout(() => process.exit(0), 200)
  }
}

main().catch((err) => {
  console.error(`Unexpected error: ${err instanceof Error ? err.stack ?? err.message : String(err)}`)
  process.exit(1)
})
