# 2026-10-03 TEMPLATE_REPO 追加資産の採用（第2弾: scripts / workflows / meta）

## 目的
TEMPLATE_REPO から .agent/ 以外の資産（スクリプト・workflow・GitHub メタ）を cod-web 向けに
書き直して導入する。**scripts/setup.ts（pnpm setup）はユーザー明示指示により不採用**。

## 実施内容

| # | 対象 | 内容 |
|---|---|---|
| 1 | scripts/verify-docs.ts | 新規（bun 版）。docs/ + .agent/(logs除く) + ルート md のリンク検査、.env 追跡検査、bun.lock 整合 |
| 2 | scripts/check-env.ts | 新規（全面書き直し）。tsgo 混入・@types/react 二重化・Biome スキーマ乖離・husky・bun.lock を診断 |
| 3 | scripts/check-security.ts | 新規（縮約版）。シークレットスキャン（`secret-scan:allow` で除外可）+ `bun audit --audit-level=high` |
| 4 | bench/protocol.bench.ts + vitest.bench.config.ts | 新規。packer encode/decode・quantize の実ベンチ |
| 5 | cspell.json + devDep cspell | 新規。コード識別子のみ・CJK 除外・ドメイン辞書 42 語・`flagWords: boxel` |
| 6 | .github/workflows/codeql.yml, dependency-review.yml | 新規。CodeQL は依存インストール不要構成。quality-gates.yml の品質ゲート正本は維持 |
| 7 | .github/ ISSUE_TEMPLATE×3, PULL_REQUEST_TEMPLATE, CODEOWNERS, SECURITY.md | 新規（cod-web の領域・7 ゲート・IP 境界に適合） |
| 8 | .editorconfig | 新規（テンプレ縮約） |
| 9 | package.json | scripts 追加: check:env / verify:docs / security:check / bench / spell |
| 10 | AGENTS.md §3.1 §6.3, ci-quality-gates/SKILL.md, .agent/README.md | 任意コマンド文書化、目的別 workflow 併設ルール、採用/不採用表（第2弾） |

## 新コマンドが即座に発見・修正した実問題
1. **リンク切れ**: docs/ops/quality-gates.md → 存在しない `e2e/game-shell.spec.ts`（正: main-menu.spec.ts）→ 修正
2. **脆弱性 20 件（critical 3）**: Next.js 16.2.6 の RCE×3 等 → `bun audit fix` で **next 16.3.6**・sharp 0.35.4・postcss 更新。
   残置 = braces GHSA-vfj7-8cjw-p6xm（修正版未公開・dev 依存のみ、script 内に理由+確認日を記録）、esbuild moderate（閾値未満）
3. **Biome スキーマ乖離**: biome.json 2.5.12 → 2.5.15 に更新（check:env が検出）

## 検証結果（全て実測）
- `bun run check:all`: **7/7 PASS**（50.3s、next 16.3.6 更新後）
- `cd apps/web && bun run build`: 成功（route 表正常）
- `bun run verify:docs` / `check:env` / `security:check` / `spell`: 全 PASS
- `bun run bench`: encodeInput 3.21M ops/s、decodeInput 2.69M、encodeSnapshot(20p) 220K、decodeSnapshot 160K
- `bunx biome lint`: 0 error / 0 warning

## 不採用（理由は .agent/README.md の表に記録）
setup.ts（ユーザー指示）、check-cicd/lib 検出基盤、knip/jscpd/stryker/type-coverage/dep-cruise、
size-limit/publint/changesets/taze/renovate、lighthouse/a11y/visual/bundle-size/preview/stale/automerge/label、
docker/devcontainer/create-template/FUNDING。

## 知見
- `bun audit` は `--audit-level` / `--ignore=GHSA-…`（repeatable）対応。`bun audit fix` は範囲内更新で
  exact pin（apps/web の next）も必要時は書き換える。
- cspell は CLI にパス（`.`）を渡すと設定の `files` が無効化され全ファイル走査になる。
  パスを渡さず設定準拠にするのが正（542 件 → 23 語 → 辞書化で 0 件）。
- ベンチ基準値（Sandbox 実測・参考値）: 上記 ops/s。回帰疑い時は同環境で相対比較すること。
