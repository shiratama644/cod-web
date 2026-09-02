# Hook: Pre-Task（タスク開始時）

> **トリガー**: ユーザーから指示を受け、作業を開始する直前。
> **目的**: 現状を把握し、必要な知識だけを読み込み、スコープ違い/履歴破壊を防ぐ。

## 手順

### 1. 現状把握（AGENTS.md §4.1）

```bash
git status
git branch --show-current
git log -5 --oneline
```
- ※ ブランチ名は**セッションごとに変わる**。AGENTS.md §4.4 の記載値を鵜呑みにせず、必ず `git branch --show-current` で確認する。過去セッションのブランチ名は文書に残さない方針（AGENTS.md §4.4）。
- 未コミット変更があれば勝手に破棄・混入しない。
- ログが起点 1 件のみ / `git status` が大量の削除+未追跡 / `node_modules` 無 → **Sandbox 再構築**。→ [`sandbox-rebuild-recovery.md`](./sandbox-rebuild-recovery.md)。

### 2. 知識のピンポイント読込（本 hook の核心）

[`../skills/index.md`](../skills/index.md) の「読み方ガイド」で**該当スキルだけ**を読む。
- 全スキルを常に読まない（コンテキスト浪費）。
- 初回/全体把握が必要な時だけ `project-overview.md` + `tech-stack.md`。
- ゲームコード（ゲームループ・状態・ネットワーク）→ `game-engineering-principles.md`。ライブラリ選定 → `tech-stack.md`。環境制約 → `sandbox-constraints.md`。
- 技術スタックの大本は [`../../docs/CONFIG.md`](../../docs/CONFIG.md)。

### 3. docs/ と実コードの優先順位（AGENTS.md §6.8）

- 計画書（`docs/planning/*PLAN.md`）と AGENTS.md/skills が矛盾 → **計画書が正**。
- 計画書に無い事項 → AGENTS.md（特に §6）→ skills / docs/CONFIG.md の順。
- 実コードとドキュメントが食い違う場合は実コードを確認し、ドキュメント側を追従させる（タスクに関係する範囲で）。

### 4. タスク粒度の確認（AGENTS.md §1.2）

1 タスク = 1 つの意味のある論理的単位。「ついでに」スコープを広げない。
- 新しい問題を見つけたら現在のタスクに混ぜず、`docs/task-list.md` に新タスクとして登録（AGENTS.md §6.9）。

### 5. ゲームプロジェクト固有の心構え

- **ゲームループと React レンダリングの分離**・**ゼロアロケーション**（[`../skills/game-engineering-principles.md`](../skills/game-engineering-principles.md)）を実装前から意識。
- ネットワーク実結合・WebGPU・E2E は Sandbox で検証不可（[`../skills/sandbox-constraints.md`](../skills/sandbox-constraints.md)）。該当機能では検証範囲を事前にユーザーへ伝える（AGENTS.md §7.7）。

## 完了後

→ 実装 → [`verify-before-commit.md`](./verify-before-commit.md) で検証 → commit/push → [`log-task.md`](./log-task.md) でログ記録。
