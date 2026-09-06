# 計画書テンプレート（新規計画書は本形式）

> 進捗の正本は `docs/task-list.md`。計画書は個別タスクの詳細を担う。
> フェーズ計画は本テンプレートの §1〜§9 必須。§10〜§12 は必要に応じて。
> 新規タスクは必ず `task-list.md` に行を追加してから本形式で詳細化する。
> 仕様の正本は `docs/arch/`（理想形）。旧 FPS 専用仕様は `.archive/docs/`。

```markdown
# <Phase X or タスク名>: <タイトル>

> 対応 task-list ID: `PXX-Y` (docs/task-list.md)
> 計画書テンプレート: docs/planning/_TEMPLATE.md 準拠

## 1. 開始前確認

- 現在のブランチ / HEAD / `git status` を確認する（未コミット変更があれば停止）
- `docs/task-list.md` で依存タスクの完了を確認する
- 関連仕様（docs/arch/・AGENTS.md §6 / .agent/skills/）を読む
- 本計画書の §5（完了条件）と §7（停止条件）を再読する

## 2. 目的 (Why)

## 3. 変更範囲 (Scope)

変更対象:
-

変更しない（境界外）:
-

## 4. 禁止事項

- 不明点は推測で埋めず、§7 の停止条件に従って質問する
- `docs/arch/adr.md` に反する実装をしない
- L1 に `if (type === 'voxel' | 'fps')` を書かない

## 5. 完了条件 (DoD)

- [ ] `bun run typecheck` / `bunx biome lint .` / `bun run test:unit` / `bun run build` 全 pass
- [ ] `docs/task-list.md` の状態・進捗・証拠を更新
- [ ] タスク範囲外のファイル（`.archive/` を含む）に意図しない変更がない

## 6. テスト方法

| 層 | 実施 | 確認内容 |
|---|---|---|
| Unit (vitest) | | |
| Component (testing-library) | | |
| E2E (Playwright / CI) | | |
| 実環境 | | |

## 7. 停止条件

次の場合は作業を停止し、変更せず報告する:
- 仕様書（計画書・arch・AGENTS.md・skills）同士に矛盾がある
- task-list.md 記載の変更範囲を超える変更が必要
- 破壊的変更が必要
- ユーザー判断が必要な設計論点に到達した
- 開始時点で作業ツリーに未確認の変更がある

## 8. 完了時に行うこと

1. 差分を自己レビュー
2. 4 検証を実行（ドキュメントのみならリンク整合）
3. `docs/task-list.md` を更新
4. タスク ID を含むコミット
5. 証拠中心の完了報告

## 9. サブタスク分割

| ID | テーマ | 主要成果物 | 依存 |
|---|---|---|---|
| PXX-A | | | |

## 10. 設計詳細・仕様

## 11. リスク・Gotchas

## 12. 実績と証拠（実装後に記入）

| ID | コミット | テスト | 実測値・備考 |
|---|---|---|---|
| PXX-A | | | |
```
