# PH2-D web client profile 注入

> Date: 2026-09-17(JST) / Commit: 本コミット / Branch: arena/01a0748a-cod-web

## 1. 指示内容 (Task Summary)

ユーザーから「お願いします」と指示を受け、Phase 2 計画に従って `PH2-D: web GameClient / prediction への profile 注入` を実施した。

受け入れ条件:

- `GameClient` / `ClientPrediction` が fps 固有 step/world を直接固定しない形へ寄せる。
- default fps 経路は既存 unit / E2E discovery と互換に保つ。
- `engine-core` は `@cod/profile-fps` / `@cod/profile-voxel` import と type 分岐なしを維持する。
- web 側の unit tests を追加または拡張し、prediction / snapshot 受信経路の既存挙動を壊さない。
- `profile-voxel` package、Snapshot `0x11` 化、AOI、determinism / same-input 本格テストは混ぜない。

## 2. 実行内容 (Executed Actions)

| 項目 | 内容 |
|---|---|
| 開始確認 | `git status --short && git branch --show-current && git log -5 --oneline` で clean / `arena/01a0748a-cod-web` / HEAD `61ac621` を確認 |
| 仕様確認 | `AGENTS.md`, `.agent/hooks/*`, `.agent/skills/*`, `docs/task-list.md`, `docs/planning/HANDOFF.md`, `docs/planning/PHASE02_PLAN.md`, `docs/arch/*`, `docs/ops/quality-gates.md` を確認 |
| ClientPrediction seam | `ClientPredictionProfile<TWorld>` を追加し、`createPlayerState` / `stepPlayer` / `typeSpec.simHz` を注入して予測・replay・描画外挿に使用 |
| GameClient seam | `ClientSimProfile<TWorld>` と `createDefaultClientProfile()` を追加。default は `createFpsSimProfile()`、constructor から mock / future profile を注入可能にした |
| fps low-level import 削減 | `GameClient` から `createDefaultWorld` / `CollisionWorld` direct import を削除し、`ClientPrediction` から `stepPlayer` / `CollisionWorld` direct import を削除 |
| tests | `GameClient` に mock profile injection test、`ClientPrediction` に mock profile step / spawn / simHz test を追加。既存 default fps tests は維持 |
| docs / memory | `docs/task-list.md`, `docs/planning/PHASE02_PLAN.md`, `docs/planning/HANDOFF.md`, `docs/planning/README.md`, `.agent/skills/*` を PH2-D 完了・PH2-E 次タスクへ更新 |

## 3. 検証結果 (Validation)

| Gate | 結果 |
|---|---|
| `bun run typecheck` | pass |
| `bunx biome lint .` | pass（85 files） |
| `bun run test:unit` | pass（21 files / 122 tests） |
| `bun run test:coverage` | pass。Statements 80.78%、Branches 74.81%、Functions 81.25%、Lines 82.41% |
| `bun run build` | pass（既存 Vite chunk-size warning のみ。main js 1,404.75 kB / gzip 364.02 kB） |
| `bun run test:e2e -- --list` | pass（3 tests discovered） |
| boundary audit | `engine-core` TS 8 files、`@cod/profile-*` import / type 分岐 violations 0、`packages/profile-voxel` なし。`GameClient` / `prediction` の low-level fps sim imports 0 |
| `git diff --check` | pass |

Playwright browser 実行は Sandbox Chromium 制約により未実行。確認済みなのは discovery まで。

## 4. 気づいたこと・知見 (Insights & Lessons Learned)

- `@cod/web` は Biome で `@cod/engine-core` 直接 import が禁止されているため、web 側は engine-core の `SimProfile` 型を直接 import せず、必要最小の profile-like interface をローカルに定義するのが安全。
- `GameClient` は default constructor で `createFpsSimProfile()` を使いながら、constructor 第2引数で mock / future profile を注入できるため、既存 UI / Babylon 呼び出しを壊さず段階移行できる。
- `ClientPrediction` の `stepSeconds` を profile `typeSpec.simHz` 由来にすると、PH2-E の same-input test で server `Simulation` と比較しやすくなる。

## 5. 次にすべきこと (Next Actions)

1. PH2-E: client/server same input + 決定論 + docs 整理を実施する。
2. `Simulation` と `ClientPrediction` に同じ fps profile / quantized input stream を与える regression test を追加する。
3. fps profile determinism test を追加する。Sandbox 時間が厳しい場合は軽量常時 unit と重い dedicated script の分離を記録して判断する。
4. Phase 2 全体の import boundary audit と docs / handoff を整理する。
