/**
 * セキュリティ検査スクリプト(cod-web版)。
 * TEMPLATE_REPO の check-security.ts(pnpm audit + SBOM + ライセンス)を
 * pnpm 前提に縮約・書き直したもの(2026-10-03 bun→pnpm 移行)。
 *
 * 検査内容:
 *   (1) シークレットスキャン: git 追跡ファイルを正規表現で走査
 *       - 誤検知は行内に `secret-scan:allow` コメントを書くと除外
 *   (2) 依存脆弱性: `pnpm audit`(無視リストは package.json の pnpm.auditConfig.ignoreGhsas)
 *
 * 実行: pnpm run security:check [--no-secrets] [--no-audit]
 * 終了コード: 0 = OK / 1 = 検出あり
 */

import { execSync, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const RESET = '\x1b[0m'
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const CYAN = '\x1b[36m'

function log(msg: string) {
  console.log(`${CYAN}[security]${RESET} ${msg}`)
}

const ALLOW_MARKER = 'secret-scan:allow'

/** スキャン対象外(バイナリ・ロック・生成物・本スクリプト自身のパターン定義)。 */
const SKIP_PATTERNS = [
  /^bun\.lockb?$/,
  /\.(png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|glb|gltf|mp3|wav|ogg)$/i,
  /^scripts\/check-security\.ts$/,
  /^logs\//,
  /^\.agent\/logs\//,
]

export const SECRET_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'GitHub Token (classic)', pattern: /ghp_[A-Za-z0-9_]{36,}/ },
  { name: 'GitHub Token (fine-grained)', pattern: /github_pat_[A-Za-z0-9_]{22,}/ },
  { name: 'GitHub OAuth', pattern: /gho_[A-Za-z0-9_]{36,}/ },
  { name: 'NPM Token', pattern: /npm_[A-Za-z0-9]{36,}/ },
  { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Slack Token', pattern: /xox[bpras]-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24,}/ },
  { name: 'Stripe Key (live)', pattern: /sk_live_[0-9a-zA-Z]{24,}/ },
  { name: 'Google API Key', pattern: /AIza[0-9A-Za-z\-_]{35}/ },
  {
    name: 'Hardcoded Password',
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/i,
  },
  { name: 'Database URL (資格情報付き)', pattern: /(?:postgres|mysql|mongodb):\/\/[^:]+:[^@]+@\S+/i },
  { name: 'JWT', pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
]

export function scanSecrets(): { findings: string[] } {
  const findings: string[] = []
  const tracked = execSync('git ls-files', { encoding: 'utf-8' }).split('\n').filter(Boolean)
  for (const file of tracked) {
    if (SKIP_PATTERNS.some((p) => p.test(file))) continue
    let content: string
    try {
      content = readFileSync(file, 'utf-8')
    } catch {
      continue
    }
    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line === undefined || line.includes(ALLOW_MARKER)) continue
      for (const { name, pattern } of SECRET_PATTERNS) {
        if (pattern.test(line)) {
          findings.push(`${file}:${i + 1} — ${name}`)
        }
      }
    }
  }
  return { findings }
}

/**
 * 無視中の advisory は package.json の `pnpm.auditConfig.ignoreGhsas` で管理する
 * (2026-10-03 bun→pnpm 移行。bun 版は --ignore フラグだったが pnpm は設定ファイル方式)。
 * 追加時は package.json 側に理由コメントを残せないため、本配列に理由と確認日を記録する。
 */
export const IGNORED_ADVISORIES: { id: string; reason: string }[] = [
  {
    id: 'GHSA-vfj7-8cjw-p6xm',
    // braces <=3.0.3 DoS(deeply nested patterns)。2026-10-03 時点で修正版未公開。
    // eslint-config-next 経由の dev 依存のみで、実行時には到達しない。
    reason: 'braces: 修正版未公開(dev 依存のみ・2026-10-03 確認)',
  },
]

/** high 以上のみ fail とする(moderate 以下は表示のみの運用)。 */
const AUDIT_LEVEL = 'high'

export function runAudit(): boolean {
  const result = spawnSync('pnpm', ['audit', `--audit-level=${AUDIT_LEVEL}`], {
    encoding: 'utf-8',
    stdio: 'pipe',
  })
  if (result.error) {
    console.error(`${RED}pnpm audit を実行できませんでした: ${result.error.message}${RESET}`)
    return false
  }
  const out = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
  if (out) console.log(out)
  return result.status === 0
}

export function main(argv = process.argv.slice(2)): boolean {
  const noSecrets = argv.includes('--no-secrets')
  const noAudit = argv.includes('--no-audit')
  let fail = false

  log('=== security:check ===')

  if (!noSecrets) {
    log('(1) シークレットスキャン(git 追跡ファイル)...')
    const { findings } = scanSecrets()
    if (findings.length > 0) {
      fail = true
      console.error(`${RED}✗ シークレット候補 ${findings.length} 件:${RESET}`)
      for (const f of findings) console.error(`  - ${f}`)
      console.error(`  誤検知の場合は該当行に ${ALLOW_MARKER} コメントを追加`)
    } else {
      log(`${GREEN}✓ シークレット検出なし${RESET}`)
    }
  }

  if (!noAudit) {
    log(`(2) pnpm audit(依存脆弱性、fail 閾値: ${AUDIT_LEVEL} 以上)...`)
    if (IGNORED_ADVISORIES.length > 0) {
      for (const { id, reason } of IGNORED_ADVISORIES)
        log(`  ignore(auditConfig.ignoreGhsas): ${id} — ${reason}`)
    }
    if (runAudit()) {
      log(`${GREEN}✓ ${AUDIT_LEVEL} 以上の脆弱性なし${RESET}`)
    } else {
      fail = true
      console.error(`${RED}✗ pnpm audit が脆弱性を報告しました${RESET}`)
    }
  }

  if (fail) {
    console.error(`${RED}security:check — FAIL${RESET}`)
  } else {
    log(`${GREEN}security:check — PASS${RESET}`)
  }
  return !fail
}

if (!process.env.VITEST && !process.env.VITEST_WORKER_ID) {
  process.exit(main() ? 0 : 1)
}
