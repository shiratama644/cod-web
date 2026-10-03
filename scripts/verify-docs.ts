/**
 * ドキュメント整合性検証スクリプト(cod-web版)。
 * TEMPLATE_REPO の verify-docs.ts を pnpm + 本リポジトリ構成向けに書き直したもの。
 *
 * 検証内容:
 *   (A) Markdown 内部リンク切れ検出(docs/ + .agent/ + ルート *.md、コードスパン除外)
 *       - .agent/logs/ は追記専用の履歴のため対象外(過去リンクの陳腐化は許容)
 *   (B) .env 系ファイルが git 追跡されていないこと
 *   (C) パッケージマネージャ整合(bun.lock が存在し、他 PM のロックファイルが無いこと)
 *
 * 実行: pnpm run verify:docs
 */

import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

const RESET = '\x1b[0m'
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const CYAN = '\x1b[36m'

/** リンク検査の対象外ディレクトリ(追記専用ログ・生成物)。 */
const EXCLUDED_DIRS = new Set(['node_modules', '.git', '.next', 'logs', 'reports', 'coverage'])

function log(msg: string) {
  console.log(`${CYAN}[verify-docs]${RESET} ${msg}`)
}

export function getMdFiles(dir: string): string[] {
  const result: string[] = []
  if (!existsSync(dir)) return result
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry)) continue
      result.push(...getMdFiles(fullPath))
    } else if (entry.endsWith('.md')) {
      result.push(fullPath)
    }
  }
  return result
}

/** 検査対象の Markdown 一覧(docs/ + .agent/(logs除く) + ルート直下の .md)。 */
export function collectTargets(root = process.cwd()): string[] {
  const targets: string[] = []
  targets.push(...getMdFiles(join(root, 'docs')))
  targets.push(...getMdFiles(join(root, '.agent')))
  for (const entry of readdirSync(root)) {
    if (entry.endsWith('.md')) targets.push(join(root, entry))
  }
  return targets
}

export function checkInternalLinks(root = process.cwd()): { broken: string[] } {
  const broken: string[] = []
  for (const file of collectTargets(root)) {
    const content = readFileSync(file, 'utf-8')
    // コードブロックとインラインコードを除外してからリンクを抽出
    const stripped = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')
    const linkRegex = /\[[^\]]*\]\(([^)]*)\)/g
    let match: RegExpExecArray | null = linkRegex.exec(stripped)
    while (match !== null) {
      const rawLink = match[1]
      match = linkRegex.exec(stripped)
      if (!rawLink) continue
      if (rawLink.startsWith('#')) continue
      if (/^(?:https?:|mailto:|data:)/.test(rawLink)) continue
      const linkPath = rawLink.split('#')[0]?.split('?')[0]
      if (!linkPath) continue
      const fullPath = join(dirname(file), decodeURI(linkPath))
      const exists =
        existsSync(fullPath) ||
        existsSync(`${fullPath}.md`) ||
        existsSync(join(fullPath, 'README.md'))
      if (!exists) broken.push(`${relative(root, file)} -> ${rawLink}`)
    }
  }
  return { broken }
}

export function checkTrackedEnvFiles(): { envFiles: string[] } {
  try {
    const tracked = execSync('git ls-files', { encoding: 'utf-8' }).split('\n').filter(Boolean)
    const envFiles = tracked.filter((f) => {
      const base = f.split('/').pop() ?? f
      return (base === '.env' || base.startsWith('.env.')) && !base.endsWith('.example')
    })
    return { envFiles }
  } catch {
    return { envFiles: [] }
  }
}

export function checkPackageManager(root = process.cwd()): { ok: boolean; message: string } {
  // 2026-10-03 bun→pnpm 移行: pnpm-lock.yaml が唯一の正
  if (!existsSync(join(root, 'pnpm-lock.yaml'))) {
    return { ok: false, message: 'pnpm-lock.yaml がありません(本リポジトリは pnpm が唯一の PM)' }
  }
  const foreign = ['bun.lock', 'bun.lockb', 'package-lock.json', 'yarn.lock'].filter((f) =>
    existsSync(join(root, f)),
  )
  if (foreign.length > 0) {
    return { ok: false, message: `pnpm 以外のロックファイルが存在: ${foreign.join(', ')}` }
  }
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8')) as {
      packageManager?: string
    }
    if (!pkg.packageManager?.startsWith('pnpm@')) {
      return { ok: false, message: `packageManager が pnpm ではありません: ${pkg.packageManager}` }
    }
  } catch {
    return { ok: false, message: 'package.json を読めません' }
  }
  return { ok: true, message: 'pnpm-lock.yaml のみ + packageManager=pnpm(OK)' }
}

export function runVerifyDocs(): boolean {
  let fail = false
  log('=== verify-docs(docs/ + .agent/ + ルート *.md)===')

  log('(A) 内部リンク検査...')
  const { broken } = checkInternalLinks()
  if (broken.length > 0) {
    fail = true
    console.error(`${RED}✗ リンク切れ ${broken.length} 件:${RESET}`)
    for (const b of broken) console.error(`  - ${b}`)
  } else {
    log(`${GREEN}✓ リンク切れなし${RESET}`)
  }

  log('(B) .env 追跡チェック...')
  const { envFiles } = checkTrackedEnvFiles()
  if (envFiles.length > 0) {
    fail = true
    console.error(`${RED}✗ .env 系ファイルが git 追跡されています: ${envFiles.join(', ')}${RESET}`)
  } else {
    log(`${GREEN}✓ .env 系ファイルは未追跡${RESET}`)
  }

  log('(C) パッケージマネージャ整合...')
  const pm = checkPackageManager()
  if (!pm.ok) {
    fail = true
    console.error(`${RED}✗ ${pm.message}${RESET}`)
  } else {
    log(`${GREEN}✓ ${pm.message}${RESET}`)
  }

  if (fail) {
    console.error(`${RED}verify-docs: FAIL${RESET}`)
  } else {
    log(`${GREEN}verify-docs: PASS${RESET}`)
  }
  return !fail
}

if (!process.env.VITEST && !process.env.VITEST_WORKER_ID) {
  process.exit(runVerifyDocs() ? 0 : 1)
}
