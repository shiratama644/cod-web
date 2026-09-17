# PLAT-2 Phase 2 Sim Profile Planning

> Date: 2026-09-15(JST) / Commit: 本コミット / Branch: arena/01a0748a-cod-web

## 1. 指示内容 (Task Summary)

ユーザーから `Go` を受け、Phase 2（Sim Profile 分離）の計画作成を実施した。

主な受け入れ条件:

- `docs/planning/PHASE02_PLAN.md` を `_TEMPLATE.md` 準拠で作成する。
- `docs/task-list.md` に `PLAT-2` と PH2-* サブタスクを追加する。
- `engine-core` を type 非依存の L1 として保ち、`profile-fps` を L2 実装として分離する計画にする。
- `SimProfile` contract、`FpsSimProfile`、client/server 同一入力テスト、決定論テスト、`TYPE_SPECS`、GameClient/gameserver への注入方針を決める。
- PH1.5 quality gate を Phase 2 の各サブタスクで維持する。

## 2. 実行内容 (Executed Actions)

| 項目 | 内容 |
|---|---|
| 開始確認 | `git status --short && git branch --show-current && git log -5 --oneline` で clean / `arena/01a0748a-cod-web` / HEAD `caff693` を確認 |
| ルール確認 | `AGENTS.md`, `.agent/skills/index.md`, `.agent/hooks/index.md`, `pre-task`, `verify-before-commit`, `log-task` を全体確認 |
| 仕様確認 | `docs/task-list.md`, `docs/planning/HANDOFF.md`, `docs/planning/_TEMPLATE.md`, `docs/arch/product.md`, `architecture.md`, `sim-profiles.md`, `engineering.md`, `protocol.md`, `server.md`, `client.md`, `adr.md`, `milestones.md`, `docs/ops/quality-gates.md` を確認 |
| 現行コード確認 | `packages/engine-core`, `packages/profile-fps`, `packages/protocol`, `apps/gameserver`, `apps/web/src/game/net` の関連ファイルと既存 unit tests を確認 |
| 外部情報確認 | `web_search depth:3` と npm registry fetch で `noa-engine@0.33.0` / `voxel-physics-engine@0.13.0` の peer / license / dt ms などを再確認 |
| 人間確認 | milestones の `VoxelSimProfile` 記述と既存合意の `profile-voxel` 未作成方針が衝突するため `ask_user`。回答は `fps先行＋voxelは契約だけ` |
| 計画作成 | `docs/planning/PHASE02_PLAN.md` を新規追加 |
| 進捗更新 | `docs/task-list.md` に `PLAT-2`, `PH2-A`〜`PH2-E` を追加 |
| 導線更新 | `docs/planning/README.md`, `docs/README.md`, `docs/planning/HANDOFF.md` を PH2-A 着手向けに更新 |
| 記憶同期 | `.agent/skills/project-overview/SKILL.md`, `.agent/skills/tech-stack/SKILL.md`, `.agent/skills/index.md` を PLAT-2 状態へ更新 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- `docs/arch/milestones.md` の Phase 2 は `VoxelSimProfile` まで含む表現だが、HANDOFF / 既存合意では `profile-voxel` はまだ作らない方針だった。今回は人間確認により **fps 先行＋voxel は契約だけ** が正となった。
- 現行 `Simulation<TWorld>` はすでに `SimulationStep<TWorld>` 注入を受けているため、Phase 2 の最初の実装は完全な作り直しではなく、contract と injection の整理が中心になる。
- まだ fps 固有結合が残る主な場所は `Room` の `createPlayerState` 固定、`SnapshotBroadcaster` の fps snapshot 組み立て、`GameClient` / `ClientPrediction` の `profile-fps` direct import、`apps/gameserver` の低レベル fps import。
- `TYPE_SPECS` は fps を実使用し、voxel は将来 spec のみ定義する方針が最小で安全。
- `noa-engine@0.33.0` は `@babylonjs/core ^6.1.0` peer、`voxel-physics-engine@0.13.0` は MIT かつ `tick(dt_in_miliseconds)` と確認できるが、Phase 2 では dependency 追加しない。

## 4. 次にすべきこと (Next Actions)

1. PH2-A: `SimProfile` contract + `TYPE_SPECS` を実装する。
2. PH2-A 着手前に `docs/planning/PHASE02_PLAN.md` と `docs/planning/HANDOFF.md` を再読する。
3. 実装では `engine-core` に `@cod/profile-fps` import や type 分岐を入れない。
4. 各 subtask で PH1.5 quality gate（typecheck / lint / unit / coverage / build / E2E discovery）を維持する。
