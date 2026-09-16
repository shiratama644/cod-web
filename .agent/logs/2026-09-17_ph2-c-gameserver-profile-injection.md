# PH2-C gameserver profile 注入

> Date: 2026-09-17(JST) / Commit: 本コミット / Branch: arena/01a0748a-cod-web

## 1. 指示内容 (Task Summary)

ユーザーから「前回と同様に実装を始めてください」と指示を受け、Phase 2 計画に従って `PH2-C: gameserver への profile 注入` を実施した。

受け入れ条件:

- `apps/gameserver` の低レベル fps imports（`buildServerWorld` / `stepPlayer` 等）を `createFpsSimProfile()` 経由へ寄せる。
- `engine-core` は `@cod/profile-fps` / `@cod/profile-voxel` を import しない状態を維持する。
- L1 に `if (type === 'fps' | 'voxel')` / `switch (gameType)` を入れない。
- 既存 `Room` / `Simulation` / `SnapshotBroadcaster` の挙動を壊さず、必要最小限の constructor seam / adapter を追加する。
- gameserver 組み立て経路の unit / smoke tests を追加する。
- Phase 1.5 quality gate を維持する。

## 2. 実行内容 (Executed Actions)

| 項目 | 内容 |
|---|---|
| 開始確認 | `git status --short && git branch --show-current && git log -5 --oneline` で clean / `arena/01a0748a-cod-web` / HEAD `5f879a8` を確認 |
| 仕様確認 | `AGENTS.md`, `.agent/hooks/*`, `.agent/skills/*`, `docs/task-list.md`, `docs/planning/HANDOFF.md`, `docs/planning/PHASE02_PLAN.md`, `docs/arch/*`, `docs/ops/quality-gates.md` を確認 |
| engine-core seam | `RoomOptions`、`Simulation` profile constructor、`SnapshotBroadcasterOptions` を追加し、未指定時は既存 fps 互換挙動を維持 |
| gameserver runtime | `apps/gameserver/src/runtime.ts` を追加。`createDefaultServerRuntime()` が `createFpsSimProfile()` から `Room` / `Simulation` / `SnapshotBroadcaster` / `InputRateLimiter` を組み立てる |
| executable 更新 | `apps/gameserver/src/index.ts` の低レベル fps imports を削除し、runtime 経由と `profile.typeSpec.simHz` 由来 interval へ変更 |
| tests | `Room` / `Simulation` / `SnapshotBroadcaster` の profile 注入 tests と `_tests_/apps/gameserver/src/runtime.test.ts` の smoke test を追加 |
| docs / memory | `docs/task-list.md`, `docs/planning/PHASE02_PLAN.md`, `docs/planning/HANDOFF.md`, `docs/planning/README.md`, `.agent/skills/*` を PH2-C 完了・PH2-D 次タスクへ更新 |

## 3. 検証結果 (Validation)

| Gate | 結果 |
|---|---|
| `bun run typecheck` | pass |
| `bunx biome lint .` | pass（85 files） |
| `bun run test:unit` | pass（21 files / 120 tests） |
| `bun run test:coverage` | pass。Statements 80.65%、Branches 74.93%、Functions 81.15%、Lines 82.28% |
| `bun run build` | pass（既存 Vite chunk-size warning のみ） |
| `bun run test:e2e -- --list` | pass（3 tests discovered） |
| boundary audit | `engine-core` TS 8 files、`@cod/profile-*` import / type 分岐 violations 0、`packages/profile-voxel` なし |
| Markdown link check | pass（112 files / broken links 0） |
| `git diff --check` | pass |

Playwright browser 実行は Sandbox Chromium 制約により未実行。確認済みなのは discovery まで。

## 4. 気づいたこと・知見 (Insights & Lessons Learned)

- `apps/gameserver` は executable なので `@cod/profile-fps` を import してよいが、低レベル fps 関数ではなく `createFpsSimProfile()` を唯一の L2 入口にすると smoke test しやすい。
- `Room` / `Simulation` / `SnapshotBroadcaster` は profile-like object を受ける seam を足しても、既存 constructor を維持すると PH2-D 以降の段階移行が安全。
- `SnapshotBroadcaster` は `snapshotHz` から `sendEveryTicks` を計算するため、将来の type rate 差し替え時も L1 に type 分岐を置かずに済む。

## 5. 次にすべきこと (Next Actions)

1. PH2-D: web `GameClient` / prediction への profile 注入を実施する。
2. `GameClient` / `ClientPrediction` の fps 固有 step/world import を profile contract または profile-like seam へ寄せる。
3. default fps 経路と既存 unit / E2E discovery を維持する。
4. `engine-core` は `@cod/profile-*` import と type 分岐なしを維持する。
5. PH2-E の determinism / same-input 本格テストはまだ混ぜない。
