# 2026-10-03 パッケージマネージャ bun→pnpm 全面移行(ユーザー指示・D26)

## 指示
プロジェクト全体の PM を pnpm に移行。不要なロックファイル削除、`pnpm install` が通る状態に。
root/各ワークスペースの package.json スクリプトも必要に応じ修正。
事前確認(ask_user): **完全移行** + **TS スクリプトは tsx 実行** をユーザーが選択(過去の「bun 統一」指示を上書き)。

## 方針決定
- **gameserver の実行ランタイムのみ bun 継続**: `apps/gameserver/src/index.ts` が `Bun.serve` 使用。
  ws への書き換えはネットコード全面改修になるため PM 移行のスコープ外。
  bun は devDependencies(1.4.0) → `node_modules/.bin/bun` で供給、グローバル導入不要。

## 実施内容
| # | 対象 | 内容 |
|---|---|---|
| 1 | pnpm-workspace.yaml 新規 / package.json | packageManager=pnpm@10.34.6、engines(node>=22,pnpm>=10)、scripts を pnpm --filter / tsx に全面書き換え、devDep +tsx、pnpm.onlyBuiltDependencies(5件)+auditConfig.ignoreGhsas(braces) |
| 2 | bun.lock / bunfig.toml 削除 | pnpm-lock.yaml 生成(pnpm install) |
| 3 | scripts/check-all.ts | Bun.spawn→node:child_process に全面移植(setsid/pgid kill/abort/hard timeout の意味論維持、'close' で stream drain 保証)。タスク cmd を pnpm 化 |
| 4 | scripts/execute.ts | 同上移植 + pnpm コマンド化(トラブルシュート文言も pnpm store prune 等へ) |
| 5 | scripts/check-determinism.ts | `import { Glob } from 'bun'` → 再帰 walker(walkTsFiles)に置換 |
| 6 | scripts/check-env.ts | bun 検査 → Node/.nvmrc/pnpm(packageManager 整合)/pnpm-lock/他 PM ロック残存/bin/bun(警告) に書き換え |
| 7 | scripts/check-security.ts | bun audit --ignore → `pnpm audit --audit-level=high` + package.json auditConfig.ignoreGhsas 方式 |
| 8 | scripts/verify-docs.ts | PM 整合 = pnpm-lock.yaml 唯一 + packageManager=pnpm@ 検査に反転 |
| 9 | .husky/pre-commit / playwright.config.ts(webServer) | pnpm run / pnpm exec 化 |
| 10 | .github/workflows/quality-gates.yml | setup-bun → pnpm/action-setup@v4 + setup-node@v4(.nvmrc, cache:pnpm)、bun ci → pnpm install --frozen-lockfile、e2e discovery は `--list`(`--` なし) |
| 11 | .agent/hooks/restore-sandbox-env.sh | bun 導入 → pnpm 導入(packageManager 記載版)+ pnpm install に書き換え |
| 12 | .agent/settings.json / post_edit_verify.sh | 許可コマンド +pnpm/tsx、packageManager 検査 bun@→pnpm@ |
| 13 | ドキュメント一括 | AGENTS.md(§3.1/§6.1 等)、rules/02・04、hooks×5、skills×12、.agent/README(移行節追記)、docs/ops×2、docs/arch(api-sources/engineering の運用記述)、README.md、PR テンプレ。`Bun.serve`/bun:test 等ランタイム記述は温存 |
| 14 | vitest.bench.config.ts | @cod/* alias 追加(pnpm は未宣言 workspace パッケージを root にリンクしないため) |
| 15 | スキル書き換え | bun-runtime/SKILL.md を「pnpm + Node/tsx + gameserver 用 bun」の正に全面改訂(ディレクトリ名は過去ログ参照保全のため維持) |
| 16 | HANDOFF.md | 決定 D26 追加 |

## 検証結果(全て実測)
- `pnpm install`(クリーン): OK、pnpm-lock.yaml 生成
- `pnpm run check:all`: **7/7 PASS**(70.9s。install/lint/determinism/heavy/typecheck/unit/coverage すべて pnpm+tsx 経由)
- `pnpm run build`: packages + gameserver + next build 成功
- gameserver 起動スモーク: `node_modules/.bin/bun run src/index.ts` → `listening on ws://0.0.0.0:8080` 確認
- `pnpm run test:e2e --list`: 3 tests discovered
- verify:docs / check:env(9✓・警告0) / security:check(high以上0・ignore1) / spell(0) / bench(3 suite PASS): 全 PASS
- `pnpm exec biome lint .`: 0 error

## pnpm 固有の知見(bun-runtime/SKILL.md にも記録)
1. **pnpm 10 はビルドスクリプトをデフォルト拒否** → bun バイナリの postinstall が走らない。`pnpm.onlyBuiltDependencies` に bun/esbuild/sharp/@biomejs/biome/unrs-resolver を明示
2. `pnpm run x -- --flag` は **`--` が子コマンドにそのまま渡る**(npm と逆)。`pnpm run test:e2e --list` が正
3. packageManager フィールドが bun のままだと pnpm 自体が実行拒否(`ERROR This project is configured to use bun`) → 移行はフィールド書き換えが先
4. pnpm は root に未宣言の workspace パッケージをリンクしない → vitest 設定の @cod/* alias が必須(bench で顕在化)
5. advisory 個別無視は CLI フラグでなく `pnpm.auditConfig.ignoreGhsas`
6. ブロックコメント内に `packages/*/src` と書くと `*/` でコメントが終了し rolldown が PARSE_ERROR(vitest.bench.config.ts で実際に発生)

## 追記(同日)
本移行は同日のユーザー指示により **revert 済み**(HANDOFF D26)。bun 統一が正。
本ログは pnpm 固有の知見の保存のため追記専用ポリシーに従い残置。
