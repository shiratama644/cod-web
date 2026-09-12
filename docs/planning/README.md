# Planning Index

計画書（`docs/planning/`）は、`docs/task-list.md` の各タスクを **どの順で、どの範囲で、何をもって完了とするか** に分解する場所です。仕様そのものの正本は [`../arch/`](../arch/README.md) です。完了済み計画は [`complete/`](./complete/) に置きます。

## まず読むもの

| 順 | 文書 | いつ読むか | 内容 |
|---:|---|---|---|
| 1 | [`../task-list.md`](../task-list.md) | 常に最初 | 状態・依存・次に着手できるタスクの唯一の正本 |
| 2 | [`HANDOFF.md`](./HANDOFF.md) | 次セッション/実装再開時 | Phase 1.5 品質ゲート前の注意、PH1 完了状況、読んではいけない旧前提 |
| 3 | 対象タスクの `*_PLAN.md` | 実装/調査に入る前 | 変更範囲、禁止事項、DoD、停止条件、検証方法 |
| 4 | [`../research/DEEP_RESEARCH_SYNTHESIS.md`](../research/DEEP_RESEARCH_SYNTHESIS.md) | 外部技術・競合調査の根拠が必要な時 | DR-1〜DR-5 の採用/不採用/要確認の入口 |
| 5 | [`../arch/api-sources.md`](../arch/api-sources.md) | 外部 API を実装で使う直前 | Bun / Biome / Babylon / Noa 等の公式 API 確認メモ |

## 計画書一覧

| 文書 | 対応 ID | 状態 | 役割 |
|---|---|---|---|
| [`_TEMPLATE.md`](./_TEMPLATE.md) | — | 現用 | 新規計画書の必須形式 |
| [`HANDOFF.md`](./HANDOFF.md) | — | 現用 | 次セッションへの橋渡し。計画の代替ではない |
| [`PHASE00_PLAN.md`](./complete/PHASE00_PLAN.md) | `PLAT-0`, `PH0-A`〜`PH0-F` | 完了 | 現行コードの穴埋め（Input 16B、fuzz、backpressure、subarray、lagcomp record） |
| [`PHASE01_PLAN.md`](./PHASE01_PLAN.md) | `PLAT-1`, `PH1-A`〜`PH1-F` | ローカル検証済み | bun workspaces + fps 系移動 + Babylon 移行 |
| [`PHASE01_5_PLAN.md`](./PHASE01_5_PLAN.md) | `PLAT-1.5`, `PH1.5-A`〜`PH1.5-D` | PH1.5-D ローカル検証済み（E2E browser は実環境検証待ち） | Vitest coverage 測定、意味ある coverage 増加、Playwright E2E 品質ゲート |
| [`DEEP_RESEARCH_PLAN.md`](./complete/DEEP_RESEARCH_PLAN.md) | `DOC-6`, `DR-1`〜`DR-5` | 完了 | Krunker.io / bloxd.io / engine / UGC / Perplexity 差分調査の手順と禁止事項 |

## 次に着手可能なタスク

| 優先 | ID | 内容 | 事前に読むもの |
|---:|---|---|---|
| 1 | Phase 2 計画 | Sim Profile 分離の計画書作成へ進む。PH1.5 の quality gate は維持し、E2E browser 実行は CI / 実環境検証待ちとして扱う | [`HANDOFF.md`](./HANDOFF.md), [`../task-list.md`](../task-list.md), [`../arch/`](../arch/README.md), [`../research/DEEP_RESEARCH_SYNTHESIS.md`](../research/DEEP_RESEARCH_SYNTHESIS.md), [`../ops/quality-gates.md`](../ops/quality-gates.md) |

## 計画書を書く/更新する時のルール

- 新規タスクは先に [`../task-list.md`](../task-list.md) へ ID を追加する。
- 新規計画書は [`_TEMPLATE.md`](./_TEMPLATE.md) の §1〜§9 を最低限満たす。
- 実装範囲、禁止事項、DoD、停止条件を必ず書く。
- 計画書と [`../arch/`](../arch/README.md) が矛盾したら、勝手に片方を正にせずユーザーへ確認する。
- 完了後は「実績と証拠」に commit / validation を書く。ただし過去ログや `.archive/` は書き換えない。
- 外部 API 名を増やす場合は [`../arch/api-sources.md`](../arch/api-sources.md) または公式ドキュメントで確認する。

## 完了済み調査の扱い

DR-1〜DR-5 は完了済みです。通常実装では長い DR を全て読むのではなく、まず [`../research/DEEP_RESEARCH_SYNTHESIS.md`](../research/DEEP_RESEARCH_SYNTHESIS.md) を読み、必要な根拠だけ個別 DR に戻ります。

ただし、ユーザーが「全体を理解して」と明示したファイルは、そのファイル全体を読む必要があります。
