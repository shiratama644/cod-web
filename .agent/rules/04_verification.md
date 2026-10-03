---
paths:
  - "package.json"
  - "pnpm-lock.yaml"
  - ".github/workflows/**"
  - "scripts/**"
  - "apps/**"
  - "packages/**"
  - "_tests_/**"
---

# Rule 04: 検証・品質保証ルール（cod-web）

> 優先度: **HIGH** — 「動いた」で終わらせず、機械的に品質を担保する
> 本体は AGENTS.md §3 と [`../hooks/verify-before-commit.md`](../hooks/verify-before-commit.md)。

## 1. 検証コマンド（必須）

`package.json` に定義されたスクリプトのみ使用（捏造禁止）。ランナーは **pnpm**（`pnpm install` / `pnpm run` / `pnpm exec`、TS スクリプトは tsx。2026-10-03 bun→pnpm 移行）。

**推奨は一括実行**:

```bash
pnpm run check:all   # install → lint/determinism/heavy/typecheck/test:unit/coverage を並列、~50s、logs/ に保存
```

個別（4+3）:

```bash
pnpm run typecheck             # root tsc ×2（※ apps/web は含まない）
pnpm exec biome lint .             # Biome（※ apps/web は対象外）
pnpm run test:unit             # vitest run（watch 禁止。bun test も使わない）
pnpm run build                 # packages + gameserver + apps/web (next build)
pnpm run check:determinism     # SimProfile.step 禁止 API 検出
pnpm run test:coverage         # threshold 85/85/85/85
pnpm run test:e2e --list    # E2E discovery（browser 起動なし、Sandbox 可）
```

**apps/web（Next.js）を触った場合は必ず追加**:

```bash
cd apps/web && pnpm run typecheck && pnpm run lint   # app ローカルの tsc + ESLint が正
```

- docs-only 変更は検証スキップ可。代わりにリンク切れ・参照整合・旧名称残存を grep で確認（`verify-doc-integrity/SKILL.md`）。
- 依存を変更した直後の `pnpm install --frozen-lockfile` は失敗する。先に素の `pnpm install`。

## 2. エラー対応と品質維持

- **テストを通すためだけの不正な修正は厳禁**: テスト削除/skip・アサーション緩和・安易な `any`・Lint 無効化・エラー握り潰し。
- 純粋ロジックを他パッケージが import している場合、削除で逃げず **packages 側へ移設してテストを維持**する（2026-10-03 Vite 削除時の実績）。
- 既存テストが落ちたら「テストが間違っている」と即断せず、既存仕様を壊していないか先に確認。

## 3. テスト配置規則

- テストは `_tests_/` にワークスペース構造をミラー、`<name>.test.ts`。ソース横に `*.test.ts` を置かない。
- shared/server 系はファイル先頭 `// @vitest-environment node`。
- coverage は include-all 方針。難しいファイルを exclude して数字を作らない（`testing/SKILL.md`）。

## 4. 完了前チェックリスト

- (A) 検証全 PASS（`pnpm run check:all` 7/7 or 4+3 + web）
- (B) `git status --short` / `git diff --stat` で意図しない差分なし
- (C) `.env` 等の機密混入なし（`post_edit_verify.sh` が自動検査）
- (D) docs 変更時は目次更新 + タスクリストの証拠（SHA / テスト件数 / 実測値）記録
