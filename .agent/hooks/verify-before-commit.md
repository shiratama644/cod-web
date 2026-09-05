# Hook: Verify Before Commit（commit 直前検証）

> **トリガー**: 実装が終わり、Git Commit する直前。
> **目的**: AGENTS.md §3.1 の 4 検証を必ず全 pass させてから commit する。途中の検証失敗で次へ進んではならない。

## 4 検証（順に実行、1 つでも失敗したら原因特定→修正→再全検証）

```bash
bun run typecheck                # tsc --noEmit および tsc -p tsconfig.server.json
bunx biome lint .        # Biome 直接呼出（bun run lint より起動が速い）
bun run test:unit                # vitest run （※ watch モードではない）
bun run build                    # vite build（production）
```

### 各コマンドの注意

- **typecheck**: `tsc --noEmit`。strict 構成。配列アクセス・nullable に注意。
- **biome lint**: `0 error / 0 warning` まで。`biome-ignore` は対象コードの**直前の行**に置く（1 行以上離れると unused 判定で逆に警告になる, AGENTS.md §6.5）。テストファイルは `overrides` で `noNonNullAssertion` off。
- **test:unit**: `vitest`（watch）**ではない**。必ず `test:unit`（vitest run）。Canvas/WebGL は jsdom で描画テストしない。シム・パックは純粋関数（[`../skills/sandbox-constraints/SKILL.md`](../skills/sandbox-constraints/SKILL.md)）。
- **build**: `vite build`。成果物は `dist/`。
  - バンドルサイズは `ls -lh dist/assets` 等で直接確認（3D エンジンは大きい。依存の重複・chunk 分割に注意）。
- **ドキュメントのみ変更時**: 4 検証はスキップ可（AGENTS.md §3.1）。代わりに「リンク切れ・他ファイルとの参照整合・旧名称の残存がないこと」を grep 等で確認する。

## 追加確認（commit 前）

```bash
git status
git diff                       # 意図しないファイル/差分が無いか
```
- タスク範囲外のファイルが混ざっていないか確認する。
- `.archive/` 等のアーカイブを置いている場合は、それがビルド/lint/テストの対象外であることを確認（AGENTS.md §4.5）。

## 検証失敗時の原則（AGENTS.md §3.2）

- テストを通すためだけの**不正な修正厳禁**（テスト削除/skip・アサーション緩和・安易な `any`・Lint 無効化・エラー握り潰し）。
- 既存テストが落ちたら「テストが間違っている」と即断せず、**既存仕様を壊していないか**先に確認。

## E2E について

- `bun run test:e2e`（Playwright）は **Sandbox では実行不可**（Chromium install 不可）。CI（GitHub Actions）でのみ。
- commit 前検証には**含めない**。書けるがローカルで走らせない。

## 完了後

4 検証 all pass（または docs-only 時の整合性確認）を確認 → commit（Conventional Commits、タスク ID をスコープに）→ `git push origin <session-branch>`（AGENTS.md §4.3.1 で事前許可済み）。
