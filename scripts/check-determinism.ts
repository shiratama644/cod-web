/**
 * Determinism & architecture guard.
 * Checks for forbidden patterns that biome cannot enforce:
 * - SimProfile.step に Math.random / Date.now / performance.now / setTimeout / setInterval / I/O
 * - L1 (engine-core) に if (type === 'voxel' | 'fps') のような type 分岐
 * - hub/store/components での Babylon 直接参照は biome で強制済みだが、ここでも二重チェック
 *
 * Usage: pnpm run check:determinism (tsx 実行・Node)
 * Exit 0 = OK, Exit 1 = violations found
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/** dir 以下の .ts/.tsx を再帰列挙する(bun Glob の置き換え・2026-10-03 pnpm移行)。 */
function walkTsFiles(dir: string): string[] {
  const result: string[] = []
  if (!existsSync(dir)) return result
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isDirectory()) {
      result.push(...walkTsFiles(fullPath))
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      result.push(relative(process.cwd(), fullPath))
    }
  }
  return result
}

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
  const simProfileDirs = [
    'packages/engine-core/src/profile',
    'packages/profile-fps/src/profile',
    'packages/profile-fps/src/sim',
    'packages/profile-voxel/src',
  ]

  for (const dir of simProfileDirs) {
    for (const file of walkTsFiles(dir)) {
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
  for (const file of walkTsFiles('packages/engine-core/src')) {
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
