# PLAT-1 Phase 1 計画書

> Date: 2026-09-05(JST) / Commit: 本コミット / Branch: セッション固定（`git branch --show-current`）

## 1. 指示内容 (Task Summary)

現状と計画を確認したうえでフェーズ 1 に進む。途中停止せず、合意を計画書へ落とす。

合意: モノレポは fps 系のみ。Channel は頭 1B のみ。GPU 予算は本フェーズ DoD から外す。

## 2. 実行内容 (Executed Actions)

| # | 内容 |
|---|---|
| 1 | Sandbox 再構築を検知し `fetch` + `reset --hard FETCH_HEAD`（69e9ce2） |
| 2 | `PHASE01_PLAN.md` を `_TEMPLATE.md` で作成 |
| 3 | `docs/task-list.md` に PLAT-1 / PH1-A〜F を追加 |
| 4 | `docs/README.md` と `project-overview` スキルのフェーズ表を更新 |

コード変更なし。web_search は使わない（前回失敗で停止したため、arch の確認済み記述を正とした）。

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- Sandbox 再構築が頻発する。計画だけのコミットでもすぐ push する
- protocol.md の `bufferedAmount` と 13B 記述、product.md の lagcomp 未呼び出しはフェーズ 0 後に古い。arch を本計画では書き換えない
- Channel はソケット 17B、decode は 16B。client+server 同時コミットが必要

## 4. 次にすべきこと (Next Actions)

Go があれば **PH1-A**（bun workspaces + fps 系へ移動）。Babylon は PH1-D。Channel は PH1-C。
