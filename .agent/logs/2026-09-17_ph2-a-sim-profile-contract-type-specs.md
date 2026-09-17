# PH2-A SimProfile contract + TYPE_SPECS

> Date: 2026-09-17(JST) / Commit: 本コミット / Branch: arena/01a0748a-cod-web

## 1. 指示内容 (Task Summary)

ユーザーから「前回と同様にGo」と指示を受け、Phase 2 計画に従って `PH2-A: SimProfile contract + TYPE_SPECS` を実装した。

受け入れ条件:

- `engine-core` に type 非依存の `SimProfile` contract を追加する。
- `protocol` に fps / voxel の `TYPE_SPECS` を追加する。
- 既存 fps constants と矛盾しない互換 export を維持する。
- mock profile を使った contract test を追加する。
- `engine-core` が `@cod/profile-fps` を import しない状態を維持する。
- Phase 1.5 quality gate を維持する。

## 2. 実行内容 (Executed Actions)

| 項目 | 内容 |
|---|---|
| 開始確認 | `git status --short && git branch --show-current && git log -5 --oneline` で Sandbox 再構築状態を検知 |
| 復旧 | `AGENTS.md` / `.agent/hooks/sandbox-rebuild-recovery.md` を確認後、`git fetch origin arena/01a0748a-cod-web && git reset --hard FETCH_HEAD && bash .agent/hooks/restore-sandbox-env.sh` を実行 |
| 健全性確認 | 復旧後 `bun run test:unit` が 17 files / 107 tests pass |
| 仕様確認 | `docs/task-list.md`, `docs/planning/HANDOFF.md`, `docs/planning/PHASE02_PLAN.md`, `.agent/skills/*` を再読 |
| protocol 実装 | `packages/protocol/src/protocol/type-specs.ts` を追加。`GAME_TYPES`, `GameType`, `TypeSpec`, `TYPE_SPECS`, `typeStepSeconds`, `snapshotEveryTicks` を実装 |
| constants 移行 | `SIM_TICK_HZ` / `SIM_DT` / `INPUT_SEND_HZ` / `SNAPSHOT_SEND_HZ` / `SNAPSHOT_SEND_EVERY_TICKS` / `MAX_PLAYERS` を `TYPE_SPECS.fps` 由来の互換 export に変更 |
| engine-core 実装 | `packages/engine-core/src/profile/SimProfile.ts` を追加。`SimProfile`, `SnapshotWriteArgs`, `profileStepSeconds`, `profileSnapshotEveryTicks` を実装 |
| exports | `packages/protocol/src/index.ts`, `packages/engine-core/src/index.ts`, `packages/engine-core/package.json` を更新 |
| tests | `_tests_/packages/protocol/protocol/type-specs.test.ts` と `_tests_/packages/engine-core/profile/SimProfile.test.ts` を追加 |
| docs / memory | `docs/task-list.md`, `docs/planning/PHASE02_PLAN.md`, `docs/planning/HANDOFF.md`, `docs/planning/README.md`, `.agent/skills/*` を PH2-A 完了・PH2-B 次タスクへ更新 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- PH2-A は既存挙動を壊さないため、`TYPE_SPECS` 導入後も既存 fps constants を互換 export として維持するのが安全。
- `TYPE_SPECS.voxel` は contract-only として追加できる。voxel package / dependency を追加しなくても L1/L2 境界設計を先に固定できる。
- `SimProfile` contract はこの段階ではまだ `Simulation` / `Room` へ統合せず、PH2-B 以降の profile 実装・注入で段階移行する方が安全。
- `engine-core/package.json` に `./profile/*` export を追加しないと、外部から `@cod/engine-core/profile/SimProfile` を参照しづらい。

## 4. 次にすべきこと (Next Actions)

1. PH2-B: `profile-fps` に `FpsSimProfile` 実装を追加する。
2. `FpsSimProfile` は現行 `createDefaultWorld` / `buildServerWorld` / `stepPlayer` / snapshot writer を束ねる。
3. PH2-B では gameserver / GameClient 注入までは広げない。
4. Phase 1.5 quality gate（typecheck / lint / unit / coverage / build / E2E discovery）を維持する。
