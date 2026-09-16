# PH2-B FpsSimProfile 実装

> Date: 2026-09-17(JST) / Commit: 本コミット / Branch: arena/01a0748a-cod-web

## 1. 指示内容 (Task Summary)

ユーザーから「先ほどと同様にGo」と指示を受け、Phase 2 計画に従って `PH2-B: FpsSimProfile 実装` を実施した。

受け入れ条件:

- `packages/profile-fps` に `FpsSimProfile` factory を追加する。
- 既存 fps の world / player spawn / step / snapshot writer を profile として束ねる。
- 現行 fps snapshot layout（`MSG_S2C_SNAPSHOT = 2`、player 16B、`vy` 含む）を維持する。
- gameserver / web 注入は PH2-C / PH2-D に残す。
- `engine-core` が `@cod/profile-fps` / `@cod/profile-voxel` を import しない状態を維持する。
- Phase 1.5 quality gate を維持する。

## 2. 実行内容 (Executed Actions)

| 項目 | 内容 |
|---|---|
| 開始確認 | `git status --short && git branch --show-current && git log -5 --oneline` で clean / `arena/01a0748a-cod-web` / HEAD `f7eff96` を確認 |
| 仕様確認 | `AGENTS.md`, `.agent/hooks/*`, `.agent/skills/*`, `docs/task-list.md`, `docs/planning/HANDOFF.md`, `docs/planning/PHASE02_PLAN.md`, `docs/arch/*`, `docs/ops/quality-gates.md` を確認 |
| 実装対象確認 | `packages/profile-fps/src/**`, `packages/engine-core/src/net/snapshot.ts`, `packages/engine-core/src/room/Room.ts`, protocol packer/messages/types、既存 tests を確認 |
| profile 実装 | `packages/profile-fps/src/profile/FpsSimProfile.ts` を追加。`createFpsSimProfile()`, `createIdleInput()`, `writeFpsSnapshot()`, `fpsSnapshotPayloadBytes()` を実装 |
| exports / deps | `packages/profile-fps/package.json` に `@cod/engine-core` dependency と `./profile/*` export を追加。`src/index.ts` から profile を export |
| tests | `_tests_/packages/profile-fps/profile/FpsSimProfile.test.ts` を追加。world / spawn / idle input / step / injected world / snapshot writer / `encodeSnapshot` との byte-for-byte 一致を検証 |
| docs / memory | `docs/task-list.md`, `docs/planning/PHASE02_PLAN.md`, `docs/planning/HANDOFF.md`, `docs/planning/README.md`, `.agent/skills/*` を PH2-B 完了・PH2-C 次タスクへ更新 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- `profile-fps` は L2 なので、`@cod/engine-core/profile/SimProfile` を import して contract を実装してよい。逆に `engine-core` から `profile-fps` への import は引き続き禁止。
- Snapshot writer は `encodeSnapshot` と同じ field order / quantizer を使って直接書くと、中間 `Snapshot` 配列を増やさずに現行 wire layout を固定できる。
- `createFpsSimProfile({ createWorld })` の seam を用意すると、PH2-C 以降の injection tests で重い BVH world を差し替えやすい。
- PH2-B は profile factory 追加までに留め、`apps/gameserver` / `GameClient` への接続を混ぜない方が差分を小さく保てる。

## 4. 次にすべきこと (Next Actions)

1. PH2-C: gameserver への profile 注入を実施する。
2. `apps/gameserver` の低レベル fps imports（`buildServerWorld` / `stepPlayer` 等）を `createFpsSimProfile()` 経由へ寄せる。
3. `engine-core` は `@cod/profile-*` import と type 分岐なしを維持する。
4. `Room` / `Simulation` / `SnapshotBroadcaster` の constructor seam / adapter は必要最小限に留める。
5. Phase 1.5 quality gate（typecheck / lint / unit / coverage / build / E2E discovery）を維持する。
