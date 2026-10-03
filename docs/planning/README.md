# Planning Index

計画書(`docs/planning/`)は、`docs/task-list.md` の各タスクを **どの順で、どの範囲で、何をもって完了とするか** に分解する場所です。仕様そのものの正本は [`../arch/`](../arch/README.md) です。完了済み計画・合意記録は [`complete/`](./complete/) に置きます。

## まず読むもの

| 順 | 文書 | いつ読むか | 内容 |
|---:|---|---|---|
| 1 | [`../task-list.md`](../task-list.md) | 常に最初 | 状態・依存・次に着手できるタスクの唯一の正本 |
| 2 | [`HANDOFF.md`](./HANDOFF.md) | 次セッション/実装再開時 | 直近の完了状況と注意点、読んではいけない旧前提 |
| 3 | 対象タスクの計画書 | 実装/調査に入る前 | 変更範囲、禁止事項、DoD、停止条件、検証方法 |
| 4 | [`../arch/api-sources.md`](../arch/api-sources.md) | 外部 API を実装で使う直前 | Bun / Biome / Babylon 等の公式 API 確認メモ |

## 現用の計画書

| 文書 | 対応 ID | 状態 | 役割 |
|---|---|---|---|
| [`_TEMPLATE.md`](./_TEMPLATE.md) | — | 現用 | 新規計画書の必須形式 |
| [`HANDOFF.md`](./HANDOFF.md) | — | 現用 | 次セッションへの橋渡し。計画の代替ではない |
| [`CODM_DEEP_RESEARCH_PLAN.md`](./CODM_DEEP_RESEARCH_PLAN.md) | `R0`〜`R7` | **現用(R0 完了・R1 は GO 待ち)** | CoD Mobile システム全面入れ替えのリサーチ計画。コード変更ゼロ。成果物は [`../research/codm/`](../research/codm/00_scope.md) |

## 完了済み計画・合意記録([`complete/`](./complete/README.md))

| 文書 | 対応 ID | 状態 |
|---|---|---|
| [`complete/PHASE00_PLAN.md`](./complete/PHASE00_PLAN.md) | `PLAT-0`, `PH0-*` | 完了 |
| [`complete/PHASE01_PLAN.md`](./complete/PHASE01_PLAN.md) | `PLAT-1`, `PH1-*` | ローカル検証済み |
| [`complete/PHASE01_5_PLAN.md`](./complete/PHASE01_5_PLAN.md) | `PLAT-1.5`, `PH1.5-*` | ローカル検証済み(E2E browser は実環境検証待ち) |
| [`complete/PHASE02_PLAN.md`](./complete/PHASE02_PLAN.md) | `PLAT-2`, `PH2-*` | 完了(Sim Profile 分離) |
| [`complete/EM01_PLAN.md`](./complete/EM01_PLAN.md) | `PLAT-EM`, `EM1-*` | 完了(Emergency バグ修正) |
| [`complete/EM02_PLAN.md`](./complete/EM02_PLAN.md) | `PLAT-EM2`, `EM2-*` | 完了(coverage 85% 達成) |
| [`complete/PHASE03_PLAN.md`](./complete/PHASE03_PLAN.md) | `PLAT-3`, `PH3-*` | 完了(gamemode API 第1版 + fps-ffa) |
| [`complete/PHASE04_PLAN.md`](./complete/PHASE04_PLAN.md) | `PLAT-4`, `PH4-*` | 完了(旧 Vite ハブ UI。クライアントは Next.js へ置換済み) |
| [`complete/DEEP_RESEARCH_PLAN.md`](./complete/DEEP_RESEARCH_PLAN.md) | `DOC-6`, `DR-1`〜`DR-5` | 完了 |
| [`complete/SANDBOX_FILTER_DISCUSSION.md`](./complete/SANDBOX_FILTER_DISCUSSION.md) ほか SANDBOX_* 3 本 | — | 合意記録(2026-09-22 改訂版。arch 反映済み) |

旧デザイン案 `ARSENAL_IO_DESIGN_PLAN.md` は **SUPERSEDED**(CoDM 全面入れ替えにより代替)として
[`.archive/docs/planning/`](../../.archive/docs/planning/) に退避済み。正本にしない。

## 次に着手可能なタスク

| 優先 | ID | 内容 | 事前に読むもの |
|---:|---|---|---|
| 1 | R1 | CoDM リサーチ第1弾(MP モード/マップ/武器・Gunsmith 等)。**ユーザーの GO 待ち** | [`CODM_DEEP_RESEARCH_PLAN.md`](./CODM_DEEP_RESEARCH_PLAN.md), [`../research/codm/00_scope.md`](../research/codm/00_scope.md) |
| — | S フェーズ | 実装(R7 の INTEGRATION_SPEC 承認後のみ) | R7 成果物(未作成) |

## 計画書を書く/更新する時のルール

- 新規タスクは先に [`../task-list.md`](../task-list.md) へ ID を追加する。
- 新規計画書は [`_TEMPLATE.md`](./_TEMPLATE.md) の §1〜§9 を最低限満たす。
- 実装範囲、禁止事項、DoD、停止条件を必ず書く。
- 計画書と [`../arch/`](../arch/README.md) が矛盾したら、勝手に片方を正にせずユーザーへ確認する。
- 完了した計画書は `complete/` へ移し、本索引と [`complete/README.md`](./complete/README.md) を更新する。
  ただし過去ログや `.archive/` の内容は書き換えない。
- 外部 API 名を増やす場合は [`../arch/api-sources.md`](../arch/api-sources.md) または公式ドキュメントで確認する。
