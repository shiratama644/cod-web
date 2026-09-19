# PH2-E client/server same input + 決定論 + docs 整理

> Date: 2026-09-20(JST) / Commit: 本コミット / Branch: arena/01a0b161-cod-web

## 1. 指示内容 (Task Summary)

ユーザーから「では実装を始めてください」と指示を受け、HANDOFF.md の次タスク PH2-E を実施した。

受け入れ条件（PHASE02_PLAN.md §5 DoD）:
- fps determinism test がある（目標 1000 tick x100 scenario。軽量 smoke + heavy script 分離方針を明記）
- client/server same input test がある（server Simulation + client ClientPrediction 同一 quantized input で same position 0.25-0.35m）
- import boundary audit（engine-core no profile-fps import、biome check）
- docs/handoff/skills/log 整理
- SimProfile.step 決定論、zero alloc hot path、no type branching in L1、WebSocket only 維持

スコープ外:
- profile-voxel、voxel terrain/physics、snapshot 0x11/AOI/delta、gamemode SDK

## 2. 実行内容 (Executed Actions)

| 項目 | 内容 |
|---|---|
| 開始確認 | `git status` / `git branch --show-current` / `git log` で clean / `arena/01a0b161-cod-web` を確認。AGENTS.md、.agent/hooks、.agent/skills、docs/task-list、PHASE02_PLAN、arch/*、quality-gates を再読 |
| determinism lightweight | `_tests_/packages/profile-fps/sim/determinism.test.ts` を作成。LCG RNG seed 12345、100 ticks x10 scenarios で profileA vs profileB 同一結果を `toBeCloseTo(10)` で検証。purity test（same snapshot => same result）と factory isolation test を追加。`// @vitest-environment node` + `createPlaneWorld` で DOM 排除 |
| same-input | `_tests_/packages/profile-fps/sim/same-input.test.ts` を作成。`Room` + `Simulation`（server authority）と `ClientPrediction`（client）に同じ quantized input stream を与える。mock Peer で `room.join` 経由で player 追加、spawn y=5 に設定。120 ticks exact closeTo(2) + 100 ticks per-tick error <0.35m を検証 |
| heavy determinism script | `scripts/determinism-heavy.ts` を作成。1000 ticks x100 scenarios、tolerance 1e-10、LCG RNG、進捗ログ、exit code 0/1。`bun run scripts/determinism-heavy.ts` で 0.8s pass を確認 |
| import boundary audit | `grep -R profile-fps packages/engine-core` で 0 hits、`biome lint` で 0 violations、`scripts/check-determinism.ts` pass を確認 |
| 既存テスト回帰 | `bun run test:unit` 23 files 127 tests pass、`typecheck` pass、`lint` pass、`build` pass、`test:e2e --list` 3 tests discovered を確認 |
| docs 更新 | `docs/task-list.md` PH2-E を ローカル検証済み 100% に更新、Phase 2 全体を完了に更新。`docs/planning/PHASE02_PLAN.md` §12 実績行と DoD チェックを更新。`docs/planning/HANDOFF.md` を Phase 2 完了・Phase 3 計画前へ全面書き換え |
| skills/log | `.agent/logs/2026-09-20_ph2-e-same-input-determinism.md` 本ファイルを作成。`.agent/skills` は変更不要（既存の project-overview / tech-stack / sandbox-constraints が PH2-E 方針と一致） |

## 3. 検証結果 (Validation)

| Gate | 結果 |
|---|---|
| `bun run typecheck` | pass |
| `bun run lint` | pass（1 any warning は `unknown as Peer` に修正済み） |
| `bun run test:unit` | pass（23 files / 127 tests）。新規 determinism 3 tests + same-input 2 tests 含む |
| `bun run test:unit -- determinism same-input` | pass（2 files / 5 tests / 28ms+44ms） |
| `bun run test:coverage` | pass。thresholds statements 79 / branches 73 / functions 79 / lines 80 を維持（既存 80%台） |
| `bun run build` | pass（Vite 596 modules、chunk-size warning のみ既知） |
| `bun run test:e2e -- --list` | pass（3 tests discovered） |
| `bun run scripts/check-determinism.ts` | ✅ pass |
| `bun run scripts/determinism-heavy.ts` | ✅ Heavy determinism passed: 100 scenarios x 1000 ticks identical within 1e-10（0.8s） |
| import boundary audit | `engine-core` → `profile-fps` 0 violations、`profile-voxel` 0 |
| `git diff --check` | pass |

Playwright browser 実行は Sandbox Chromium 制約により未実行。discovery まで確認。

## 4. 気づいたこと・知見 (Insights & Lessons Learned)

- `Room` は `addPlayer` ではなく `join(Peer)` API。PH2-E の same-input test では mock Peer を作成して `join` し、`getPlayer` で PlayerState を取得する必要がある。`players` Map は private。
- `Simulation.receiveInput` は seq 巻き戻りガードがあり、FIFO キューで入力を消費する。client/server same input test では playerId を mock Room から取得して `receiveInput(playerId, ...)` する必要がある。
- Determinism 1000x100 は当初の懸念（Sandbox 時間）と異なり 0.8s で pass。`createPlaneWorld`（静的平面のみ）を使えば heavy でも軽い。`three-mesh-bvh` を含む server world だと重くなる可能性があるが、PH2-E は plane world で十分。
- 軽量 smoke 100x10 は unit に常時置き、heavy 1000x100 は `scripts/` に分離する方針が PHASE02_PLAN §11 のリスク対応と一致。両方 pass したので分離を維持しつつ CI で heavy も実行可能。
- `ClientPrediction` は `applyInput` で look delta queue を内部で持ち、`stepPlayer` は profile から注入された `typeSpec.simHz` 由来の `stepSeconds` で動く。server `Simulation` と同じ quantized input（moveX/Z, yaw, flags, dtMs）を与えれば 0.01m 以内で一致し、fps 許容 0.35m を十分満たす。

## 5. 次にすべきこと (Next Actions)

1. PLAT-3: Phase 3 計画書作成（gamemode API 第1版 + fps-ffa 最小）を実施する。
2. `docs/planning/PHASE03_PLAN.md` を `_TEMPLATE.md` 準拠で作成し、`docs/task-list.md` に PLAT-3 と PH3-* を追加する。
3. Phase 3 の DoD を `docs/arch/milestones.md` と突き合わせ、fps 先行方針・voxel 契約のみ継続を明記する。
4. CI の `quality-gates.yml` に `determinism-heavy` を追加するか検討（現行でも `check-determinism` はあるが heavy は未追加）。
5. Phase 2 完了を `docs/planning/complete/` へ移すかは PLAT-3 計画時に判断する。
