/**
 * 一括品質ゲート + ログ保存スクリプト
 *
 *   bun run check:all
 *   または
 *   bun run scripts/check-all.ts
 *
 * - build と e2e 以外の主要ゲートを順に実行
 *   install / typecheck / lint / determinism / determinism:heavy / unit / coverage
 * - 各チェックの stdout/stderr を logs/<name>.log に保存
 * - 最後に logs/summary.log とコンソールにサマリを出力
 * - 1つでも失敗したら exit 1（ログは残る）
 *
 * Termux Proot-Distro でも動くように TS6 互換で記述。
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

type Check = {
  name: string
  cmd: string[]
  logFile: string
  description: string
}

const LOG_DIR = join(process.cwd(), 'logs')

// build と e2e は除外（ユーザー要望）。必要ならコメントアウトを外す。
const CHECKS: Check[] = [
  {
    name: 'install',
    cmd: ['bun', 'install', '--frozen-lockfile'],
    logFile: 'install.log',
    description: '依存インストール（frozen-lockfile）',
  },
  {
    name: 'typecheck',
    cmd: ['bun', 'run', 'typecheck'],
    logFile: 'typecheck.log',
    description: 'TypeScript 型チェック（tsc --noEmit x2）',
  },
  {
    name: 'lint',
    cmd: ['bun', 'run', 'lint'],
    logFile: 'lint.log',
    description: 'Biome lint（132 files）',
  },
  {
    name: 'determinism',
    cmd: ['bun', 'run', 'check:determinism'],
    logFile: 'determinism.log',
    description: '決定論 & アーキテクチャガード（Math.random禁止等）',
  },
  {
    name: 'determinism-heavy',
    cmd: ['bun', 'run', 'check:determinism:heavy'],
    logFile: 'determinism-heavy.log',
    description: 'Heavy決定論 100x1000 ticks',
  },
  {
    name: 'unit',
    cmd: ['bun', 'run', 'test:unit'],
    logFile: 'unit.log',
    description: 'Vitest unit（44 files 311 tests）',
  },
  {
    name: 'coverage',
    cmd: ['bun', 'run', 'test:coverage'],
    logFile: 'coverage.log',
    description: 'Vitest coverage 85%閾値',
  },
  // 除外（必要なら有効化）:
  // { name: 'build', cmd: ['bun','run','build'], logFile: 'build.log', description: 'Vite build' },
  // { name: 'e2e-list', cmd: ['bun','run','test:e2e','--','--list'], logFile: 'e2e-list.log', description: 'Playwright E2E discovery' },
]

function nowJST(): string {
  // JST でタイムスタンプ（Termux でも動くように Intl 使わず手動）
  const d = new Date()
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().replace('T', ' ').replace('Z', ' JST')
}

async function runCheck(check: Check): Promise<{ name: string; exit: number; durationMs: number; logPath: string }> {
  const logPath = join(LOG_DIR, check.logFile)
  const start = Date.now()
  console.log(`\n▶ [${check.name}] ${check.description}`)
  console.log(`  $ ${check.cmd.join(' ')}`)
  console.log(`  log: ${logPath}`)

  let output = `=== ${check.name} ===\n`
  output += `Description: ${check.description}\n`
  output += `Command: ${check.cmd.join(' ')}\n`
  output += `Started: ${nowJST()}\n`
  output += `Log: ${logPath}\n`
  output += `---\n\n`

  const proc = Bun.spawn(check.cmd, {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const decoder = new TextDecoder()
  let stdout = ''
  let stderr = ''

  const readStream = async (stream: ReadableStream<Uint8Array> | null, isErr: boolean) => {
    if (!stream) return
    const reader = stream.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value, { stream: true })
      if (isErr) {
        stderr += text
      } else {
        stdout += text
      }
      // リアルタイムでコンソールにも流す
      process.stdout.write(text)
    }
  }

  await Promise.all([readStream(proc.stdout, false), readStream(proc.stderr, true)])

  const exit = await proc.exited
  const durationMs = Date.now() - start

  output += stdout
  if (stderr) {
    output += `\n--- stderr ---\n${stderr}`
  }
  output += `\n---\nExit: ${exit}\nDuration: ${durationMs}ms\nFinished: ${nowJST()}\n`
  output += exit === 0 ? `Status: PASS\n` : `Status: FAIL\n`

  // ログ保存
  mkdirSync(LOG_DIR, { recursive: true })
  writeFileSync(logPath, output, 'utf8')

  const status = exit === 0 ? '✅ PASS' : '❌ FAIL'
  console.log(`  ${status} (${durationMs}ms) -> ${check.logFile}`)

  return { name: check.name, exit: exit ?? 1, durationMs, logPath }
}

async function main() {
  mkdirSync(LOG_DIR, { recursive: true })

  console.log(`\n=== check:all 一括品質ゲート ===`)
  console.log(`Started: ${nowJST()}`)
  console.log(`Logs dir: ${LOG_DIR}`)
  console.log(`Checks: ${CHECKS.map((c) => c.name).join(', ')} (build/e2e除外)`)
  console.log(`---`)

  const results: { name: string; exit: number; durationMs: number; logPath: string }[] = []

  for (const check of CHECKS) {
    const r = await runCheck(check)
    results.push(r)
  }

  // サマリ作成
  const summaryPath = join(LOG_DIR, 'summary.log')
  let summary = `=== check:all Summary ===\n`
  summary += `Started: ${nowJST()}\n`
  summary += `Logs dir: ${LOG_DIR}\n`
  summary += `---\n`
  let allPass = true
  let totalMs = 0
  for (const r of results) {
    const status = r.exit === 0 ? 'PASS' : 'FAIL'
    summary += `${r.name.padEnd(20)} ${status.padEnd(6)} ${r.durationMs}ms  ${r.logPath}\n`
    console.log(`${status === 'PASS' ? '✅' : '❌'} ${r.name.padEnd(20)} ${status} (${r.durationMs}ms)`)
    if (r.exit !== 0) allPass = false
    totalMs += r.durationMs
  }
  summary += `---\n`
  summary += `Total: ${totalMs}ms\n`
  summary += `Result: ${allPass ? 'ALL PASS' : 'SOME FAILED'}\n`
  summary += `Finished: ${nowJST()}\n`

  writeFileSync(summaryPath, summary, 'utf8')

  console.log(`\n=== Summary ===`)
  console.log(summary)
  console.log(`Logs saved to: ${LOG_DIR}/`)

  if (!allPass) {
    console.error(`\n❌ Some checks failed. See logs/ for details.`)
    process.exit(1)
  } else {
    console.log(`\n✅ All checks passed.`)
  }
}

main().catch((e) => {
  console.error(`Unexpected error: ${e instanceof Error ? e.stack ?? e.message : String(e)}`)
  process.exit(1)
})
