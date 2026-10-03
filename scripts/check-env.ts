/**
 * 環境ドクタースクリプト(cod-web版)。
 * 本リポジトリで実際に起きた環境事故(tsgo 混入・@types/react 二重化・PATH 消失)の検出器。
 * 2026-10-03 bun→pnpm 移行: パッケージマネージャ検査を pnpm に変更。
 *
 * 検証内容:
 *   (1) Node / pnpm が利用可能で packageManager 宣言と整合するか
 *   (2) TypeScript が標準 tsc 6.x か(tsgo 7.x = @typescript/native-preview 禁止)
 *   (3) @types/react の二重インストール検出(root と apps/web でメジャー不一致を警告)
 *   (4) Biome のスキーマバージョンと CLI バージョンの乖離(警告のみ)
 *   (5) pnpm-lock.yaml / husky フック / bun ランタイム(gameserver 用)の存在
 *
 * 実行: pnpm run check:env
 * 終了コード: 0 = OK(警告含む) / 1 = 致命的な問題あり
 */

import { spawnSync } from 'node:child_process'
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

  // (1) ランタイム / パッケージマネージャ
  ok(`Node ${process.version} で実行中`)
  const nvmrc = existsSync(join(root, '.nvmrc'))
    ? readFileSync(join(root, '.nvmrc'), 'utf-8').trim()
    : null
  if (nvmrc && !process.version.startsWith(`v${nvmrc}.`)) {
    warn(`.nvmrc は v${nvmrc} だが実行中は ${process.version}`)
  }
  const rootPkg = readJson(join(root, 'package.json'))
  const declaredPm = typeof rootPkg?.packageManager === 'string' ? rootPkg.packageManager : null
  const pnpmResult = spawnSync('pnpm', ['--version'], { encoding: 'utf-8' })
  const pnpmVersion = pnpmResult.status === 0 ? pnpmResult.stdout.trim() : null
  if (!pnpmVersion) {
    fail('pnpm が見つかりません。`npm install -g pnpm` または corepack で導入してください')
  } else if (declaredPm && declaredPm !== `pnpm@${pnpmVersion}`) {
    warn(`packageManager 宣言 ${declaredPm} と実行中の pnpm ${pnpmVersion} が不一致`)
  } else {
    ok(`pnpm ${pnpmVersion}(packageManager 宣言と整合)`)
  }

  // (2) TypeScript: 標準 tsc 6.x 必須、tsgo(7.x / native-preview)禁止
  const tsVersion = pkgVersion(join(root, 'node_modules', 'typescript'))
  if (!tsVersion) {
    warn('node_modules/typescript が見つかりません(pnpm install 未実行?)')
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
    warn('@types/react が見つかりません(pnpm install 未実行?)')
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
    warn('@biomejs/biome が見つかりません(pnpm install 未実行?)')
  }

  // (5) ロックファイル・フック・gameserver ランタイム
  if (existsSync(join(root, 'pnpm-lock.yaml'))) {
    ok('pnpm-lock.yaml あり')
  } else {
    fail('pnpm-lock.yaml がありません')
  }
  for (const foreign of ['bun.lock', 'bun.lockb', 'package-lock.json', 'yarn.lock']) {
    if (existsSync(join(root, foreign))) {
      fail(`pnpm 以外のロックファイルが残存: ${foreign}`)
    }
  }
  if (existsSync(join(root, '.husky', 'pre-commit'))) {
    ok('.husky/pre-commit あり(4 検証 + 決定論ガード)')
  } else {
    warn('.husky/pre-commit がありません(`pnpm install` で prepare が走ります)')
  }
  // gameserver は Bun.serve を使うため bun バイナリ(devDep)が必要
  if (existsSync(join(root, 'node_modules', '.bin', 'bun'))) {
    ok('bun バイナリあり(gameserver ランタイム用 devDep)')
  } else {
    warn('node_modules/.bin/bun がありません(gameserver 起動に必要。pnpm install を確認)')
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
