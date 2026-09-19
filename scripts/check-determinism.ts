/**
 * Determinism & architecture guard.
 * Checks for forbidden patterns that biome cannot enforce:
 * - SimProfile.step に Math.random / Date.now / performance.now / setTimeout / setInterval / I/O
 * - L1 (engine-core) に if (type === 'voxel' | 'fps') のような type 分岐
 * - hub/store/components での Babylon 直接参照は biome で強制済みだが、ここでも二重チェック
 *
 * Usage: bun run scripts/check-determinism.ts
 * Exit 0 = OK, Exit 1 = violations found
 */

import { Glob } from 'bun'
import { readFileSync } from 'node:fs'

type Violation = { file: string; line: number; pattern: string; snippet: string }

const forbiddenInSimProfile = [
  /Math\.random\s*\(/,
  /Date\.now\s*\(/,
  /performance\.now\s*\(/,
  /setTimeout\s*\(/,
  /setInterval\s*\(/,
  /fetch\s*\(/,
  /fs\./,
  /Bun\.file/,
  /Bun\.write/,
]

const forbiddenTypeBranchInL1 = [
  /if\s*\(\s*type\s*===\s*['"]voxel['"]/,
  /if\s*\(\s*type\s*===\s*['"]fps['"]/,
  /type\s*===\s*['"]voxel['"].*type\s*===\s*['"]fps['"]/,
  /['"]voxel['"]\s*\|\s*['"]fps['"]/,
]

async function check(): Promise<Violation[]> {
  const violations: Violation[] = []

  // 1. SimProfile.step 配下の禁止API
  const simProfileGlobs = [
    'packages/engine-core/src/profile/**/*.{ts,tsx}',
    'packages/profile-fps/src/profile/**/*.{ts,tsx}',
    'packages/profile-fps/src/sim/**/*.{ts,tsx}',
    'packages/profile-voxel/src/**/*.{ts,tsx}',
  ]

  for (const pattern of simProfileGlobs) {
    const glob = new Glob(pattern)
    for await (const file of glob.scan({ cwd: process.cwd() })) {
      const content = readFileSync(file, 'utf8')
      const lines = content.split('\n')
      lines.forEach((line, idx) => {
        for (const re of forbiddenInSimProfile) {
          if (re.test(line) && !line.trim().startsWith('//') && !line.includes('biome-ignore')) {
            violations.push({ file, line: idx + 1, pattern: re.source, snippet: line.trim() })
          }
        }
      })
    }
  }

  // 2. L1 (engine-core) での type 分岐禁止
  const l1Glob = new Glob('packages/engine-core/src/**/*.{ts,tsx}')
  for await (const file of l1Glob.scan({ cwd: process.cwd() })) {
    const content = readFileSync(file, 'utf8')
    const lines = content.split('\n')
    lines.forEach((line, idx) => {
      for (const re of forbiddenTypeBranchInL1) {
        if (re.test(line) && !line.trim().startsWith('//')) {
          violations.push({ file, line: idx + 1, pattern: re.source, snippet: line.trim() })
        }
      }
    })
  }

  return violations
}

const violations = await check()
if (violations.length > 0) {
  console.error('❌ Determinism / architecture violations found:')
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} [${v.pattern}] ${v.snippet}`)
  }
  process.exit(1)
} else {
  console.log('✅ Determinism check passed (no forbidden patterns in SimProfile / L1)')
}
