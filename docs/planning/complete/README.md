# Completed Plans

完了済みの計画書・合意記録を置くフォルダです。現用の次タスク入口は [`../README.md`](../README.md)、進捗の正本は [`../../task-list.md`](../../task-list.md) です。

## 完了済み計画書

| 文書 | 対応 ID | 完了状態 |
|---|---|---|
| [`PHASE00_PLAN.md`](./PHASE00_PLAN.md) | `PLAT-0`, `PH0-A`〜`PH0-F` | 完了 |
| [`PHASE01_PLAN.md`](./PHASE01_PLAN.md) | `PLAT-1`, `PH1-A`〜`PH1-F` | ローカル検証済み |
| [`PHASE01_5_PLAN.md`](./PHASE01_5_PLAN.md) | `PLAT-1.5`, `PH1.5-A`〜`PH1.5-E` | ローカル検証済み(E2E browser は実環境検証待ち) |
| [`PHASE02_PLAN.md`](./PHASE02_PLAN.md) | `PLAT-2`, `PH2-A`〜`PH2-E` | 完了(Sim Profile 分離) |
| [`EM01_PLAN.md`](./EM01_PLAN.md) | `PLAT-EM`, `EM1-A`〜`EM1-E` | 完了(Emergency バグ修正) |
| [`EM02_PLAN.md`](./EM02_PLAN.md) | `PLAT-EM2`, `EM2-A`〜`EM2-D` | 完了(テストカバレッジ 85% 達成) |
| [`PHASE03_PLAN.md`](./PHASE03_PLAN.md) | `PLAT-3`, `PH3-A`〜`PH3-D` | 完了(gamemode API 第1版 + fps-ffa 最小) |
| [`PHASE04_PLAN.md`](./PHASE04_PLAN.md) | `PLAT-4`, `PH4-A`〜`PH4-F` | 完了(旧 Vite ハブ UI 骨組み。クライアントはその後 Next.js `apps/web` へ置換) |
| [`DEEP_RESEARCH_PLAN.md`](./DEEP_RESEARCH_PLAN.md) | `DOC-6`, `DR-1`〜`DR-5` | 完了 |

## 合意記録(仕様へ反映済み)

| 文書 | 内容 |
|---|---|
| [`SANDBOX_FILTER_DISCUSSION.md`](./SANDBOX_FILTER_DISCUSSION.md) | Sandbox フィルタ構造の論点整理(議論元) |
| [`SANDBOX_FINAL_AGREED.md`](./SANDBOX_FINAL_AGREED.md) | 2026-09-22 最終合意(Official/Sandbox 階層・親ジャンル+サブタグ) |
| [`SANDBOX_SPEC整理.md`](./SANDBOX_SPEC整理.md) | 合意内容の仕様整理メモ |

合意内容は `docs/arch/`(product / types / matchmaker / client / architecture / editor)へ反映済みです。

## 注意

- このフォルダの文書は履歴です。再開・新規実装の正本として使う前に、必ず [`../../task-list.md`](../../task-list.md) と現用の計画書・[`../../arch/`](../../arch/README.md) を確認してください。
- 2026-09-24 以降、システムは CoDM 全面入れ替え方針([`../CODM_DEEP_RESEARCH_PLAN.md`](../CODM_DEEP_RESEARCH_PLAN.md))に移行しており、Phase 3/4 の Sandbox/投票 UI 前提は将来の S フェーズで再設計される可能性があります。
- 旧デザイン案 `ARSENAL_IO_DESIGN_PLAN.md`(SUPERSEDED・未実装)は [`.archive/docs/planning/`](../../../.archive/docs/planning/) にあります。
