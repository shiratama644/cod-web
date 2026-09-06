# PLAT-0 — フェーズ 0 計画書

> Date: 2026-09-05(JST) / Commit: (このコミット) / Branch: arena/01a06f8b-cod-web

## 1. 指示内容 (Task Summary)

Go。AGENTS.md を適用したまま、提示していた `PLAT-0`（`PHASE00_PLAN.md`）を進める。実装はまだ。

## 2. 実行内容 (Executed Actions)

| # | 対象 | 内容 |
|---|---|---|
| 1 | arch 全文 + 現行 protocol/server/net | 穴の表を計画に固定（13B、bufferedAmount、slice、record 未呼び出し） |
| 2 | `docs/planning/PHASE00_PLAN.md` | `_TEMPLATE.md` §1–12。サブタスク PH0-A〜F |
| 3 | `docs/task-list.md` `docs/README.md` | PLAT-0 完了、実装 ID 採番、索引 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- ADR-005 の「Channel / Hello を最初から」と milestones フェーズ 0 の穴リストは範囲が違う。計画は milestones を範囲とし、Hello はフェーズ 4、Channel はフェーズ 1 と書いた。
- OPEN-A（dtMs 単位）はフェーズ 0 では決めない。現行 u16 整数と >500 clamp のみ。
- 固定長表の Ping/BlockAction/Fire は未実装。PH0-F の ±1 は Input のみ。

## 4. 次にすべきこと (Next Actions)

ユーザーが Go したら PH0-A（BinaryReader + Input 16B）。
