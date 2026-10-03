/**
 * 環境ドクタースクリプト(cod-web版)。
 * TEMPLATE_REPO の check-env.ts(Termux/キャッシュ診断)を、本リポジトリで実際に
 * 起きた環境事故(tsgo 混入・@types/react 二重化・PATH 消失)の検出器として書き直したもの。
 *
 * 検証内容:
 *   (1) bun が利用可能か(サンドボックスでは PATH 復元が必要)
 *   (2) TypeScript が標準 tsc 6.x か(tsgo 7.x = @typescript/native-preview 禁止)
 *   (3) @types/react の二重インストール検出(root と apps/web でメジャー不一致を警告)
 *   (4) Biome のスキーマバージョンと CLI バージョンの乖離(警告のみ)
 *   (5) bun.lock / husky フックの存在
 *
 * 実行: bun run check:env
 * 終了コード: 0 = OK(警告含む) / 1 = 致命的な問題あり
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const RESET = '\x1b[0m'
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'

let fatal = false
let warnings = 0

function ok(msg: string) {
  console.log(`${GREEN}✓${RESET} ${msg}`)
}
function warn(msg: string) {
  warnings++
  console.log(`${YELLOW}⚠${RESET} ${msg}`)
}
function fail(msg: string) {
  fatal = true
  console.error(`${RED}✗${RESET} ${msg}`)
}

function readJson(path: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>
  } catch {
    return null
  }
}

function pkgVersion(dir: string): string | null {
  const pkg = readJson(join(dir, 'package.json'))
  return typeof pkg?.version === 'string' ? pkg.version : null
}

export function runCheckEnv(root = process.cwd()): boolean {
  console.log(`${CYAN}=== check:env — cod-web 環境ドクター ===${RESET}\n`)

  // (1) ランタイム
  const bunVersion = typeof Bun !== 'undefined' ? Bun.version : null
  if (bunVersion) {
    ok(`bun ${bunVersion} で実行中`)
  } else {
    fail(
      'bun 以外で実行されています。`bash .agent/hooks/restore-sandbox-env.sh` で復元し、`export PATH=$PATH:/usr/local/bin` を確認してください',
    )
  }

  // (2) TypeScript: 標準 tsc 6.x 必須、tsgo(7.x / native-preview)禁止
  const tsVersion = pkgVersion(join(root, 'node_modules', 'typescript'))
  if (!tsVersion) {
    warn('node_modules/typescript が見つかりません(bun install 未実行?)')
  } else if (tsVersion.startsWith('6.')) {
    ok(`TypeScript ${tsVersion}(標準 tsc)`)
  } else if (tsVersion.startsWith('7.')) {
    fail(
      `TypeScript ${tsVersion} = tsgo 系です。標準 tsc 6.x を使用してください(root package.json は ^6 に固定)`,
    )
  } else {
    warn(`TypeScript ${tsVersion}(想定は 6.x — AGENTS.md §6 参照)`)
  }
  if (existsSync(join(root, 'node_modules', '@typescript', 'native-preview'))) {
    fail('@typescript/native-preview(tsgo)がインストールされています。削除してください')
  } else {
    ok('tsgo(@typescript/native-preview)混入なし')
  }

  // (3) @types/react の二重化検出
  const rootTypes = pkgVersion(join(root, 'node_modules', '@types', 'react'))
  const webTypes = pkgVersion(join(root, 'apps', 'web', 'node_modules', '@types', 'react'))
  if (rootTypes && webTypes) {
    const major = (v: string) => v.split('.')[0]
    if (major(rootTypes) === major(webTypes)) {
      ok(`@types/react: root ${rootTypes} / apps/web ${webTypes}(メジャー一致)`)
    } else {
      warn(
        `@types/react のメジャーが不一致: root ${rootTypes} / apps/web ${webTypes} — 型エラーの温床`,
      )
    }
  } else if (rootTypes) {
    ok(`@types/react: ${rootTypes}(単一)`)
  } else {
    warn('@types/react が見つかりません(bun install 未実行?)')
  }

  // (4) Biome スキーマと CLI の乖離
  const biomeCli = pkgVersion(join(root, 'node_modules', '@biomejs', 'biome'))
  const biomeJson = readJson(join(root, 'biome.json'))
  const schema = typeof biomeJson?.$schema === 'string' ? biomeJson.$schema : ''
  const schemaVersion = schema.match(/schemas\/([\d.]+)\//)?.[1] ?? null
  if (biomeCli && schemaVersion && biomeCli !== schemaVersion) {
    warn(`biome.json スキーマ ${schemaVersion} と CLI ${biomeCli} が不一致(動作には支障なし)`)
  } else if (biomeCli) {
    ok(`Biome ${biomeCli}(スキーマ整合)`)
  } else {
    warn('@biomejs/biome が見つかりません(bun install 未実行?)')
  }

  // (5) ロックファイル・フック
  if (existsSync(join(root, 'bun.lock')) || existsSync(join(root, 'bun.lockb'))) {
    ok('bun.lock あり')
  } else {
    fail('bun.lock がありません')
  }
  if (existsSync(join(root, '.husky', 'pre-commit'))) {
    ok('.husky/pre-commit あり(4 検証 + 決定論ガード)')
  } else {
    warn('.husky/pre-commit がありません(`bun install` で prepare が走ります)')
  }

  console.log('')
  if (fatal) {
    console.error(`${RED}check:env — FAIL(致命的な問題あり)${RESET}`)
  } else if (warnings > 0) {
    console.log(`${YELLOW}check:env — PASS(警告 ${warnings} 件)${RESET}`)
  } else {
    console.log(`${GREEN}check:env — PASS${RESET}`)
  }
  return !fatal
}

if (!process.env.VITEST && !process.env.VITEST_WORKER_ID) {
  process.exit(runCheckEnv() ? 0 : 1)
}
