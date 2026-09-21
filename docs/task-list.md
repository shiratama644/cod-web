# タスクリスト（唯一の正本）

> 1. 本ファイルが進捗の正本。矛盾時は本ファイル。
> 2. 進行中は原則 1 件。
> 3. タスク ID は再利用しない。中止は「対象外」＋理由。
> 4. 新問題は新タスク。混ぜない。
> 5. 完了は証拠で判定。
> 6. 詳細は `docs/planning/*_PLAN.md`。完了済み計画は `docs/planning/complete/`（`_TEMPLATE.md` 準拠）。
> 7. 仕様の正本は `docs/arch/`（マルチタイププラットフォーム）。旧 FPS 専用仕様は `.archive/docs/`。

**状態**: `未着手` / `調査中` / `実装中` / `ローカル検証済み` / `実環境検証待ち` / `完了` / `保留` / `対象外`

---

## プロダクト概要

ブラウザ向け **マルチタイプ・ゲームプラットフォーム**（`voxel` / `fps`）。プラットフォーム層（L0/L1）を共有し、Sim Profile（L2）だけを差し替える。描画は Babylon.js。今のトランスポートは WebSocket のみ。詳細は [`arch/product.md`](./arch/product.md)。

ライセンス **MIT**。初期は匿名。モバイルは両タイプ（タッチは後続）。ボイスは理想に含む（ゲーム同期とは別）。

---

## 現行コード（移行元）

単一ルーム FPS（旧 Phase 0–1）。理想形のフェーズ番号とは別。資産の移植判定は [`arch/product.md`](./arch/product.md)。

| 項目 | 状態 | 備考 |
|---|---|---|
| Vite + React + TS + Biome + Vitest | 移行元として存在 | bun 1.4.0 |
| 旧 R3F シーン（WebGPU/WebGL2） | **破棄済み** | PH1-D。apps/web の 3D は Babylon Engine |
| bun WS 権威サーバ・位置同期 | **拡張して移植** | 16B Input 等はフェーズ 0 で穴埋め |
| shared バイナリ packer | **移植** | レイアウトは理想プロトコルへ更新 |
| 実ブラウザ 2 タブ目視 | 旧 P1-G が実環境検証待ち | プラットフォーム移行後に再確認 |

旧タスク ID（P0-* / P1-*）は `.archive/docs/task-list.md` に残す。本ファイルでは再利用しない。

---

## 目標ロードマップ（理想形フェーズ）

計画書は着手前に `docs/planning/PHASE{N}_PLAN.md` を作る。DoD は [`arch/milestones.md`](./arch/milestones.md)。

| Phase | テーマ | 状態 |
|---|---|---|
| **0** | 現行コードの穴（長さ検証・fuzz・backpressure・slice） | 完了（PH0-A〜F） |
| **1** | モノレポ + Babylon 移行 | PH1-F ローカル検証済み |
| **1.5** | Vitest coverage + 意味あるテスト増加 + Playwright E2E 品質ゲート | PH1.5-D ローカル検証済み（Phase 1.5 実装完了、E2E browser は実環境検証待ち） |
| **2** | Sim Profile 分離 | PH2-E ローカル検証済み。Phase 2 完了 |
| **EM** | 完全バグ修正フェーズ（Emergency） | EM1-F ローカル検証済み。EM02完了 |
| **3** | ゲームモード API 第 1 版 + fps-ffa 最小 | PH3-D ローカル検証済み（統合+例外安全+coverage 93%）。Phase 3 完了 |
| **4** | ハブ + Sandbox モーダル + 投票 + マッチメイカー骨組み | PLAT-4 実装中（FPS/Voxel/Sandbox 3カテゴリ、Header/Sidebar、Sandboxモーダル、詳細ページ、投票入口、boxelエイリアス） |
| **5** | voxel-creative / bedwars / fps-tdm | 未着手 |
| **6** | API 再設計 | 未着手 |
| **7** | チャンク本同期・AOI・スケール | 未着手 |
| **8** | UGC | 未着手 |
| **9** | WebTransport（条件付き） | 未着手 |

### Phase 0

計画書: [`planning/complete/PHASE00_PLAN.md`](./planning/complete/PHASE00_PLAN.md)

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| PLAT-0 | フェーズ 0 計画書作成（`PHASE00_PLAN.md`） | 完了 | 100% | DOC-2 | `_TEMPLATE.md` 準拠の計画が arch と矛盾しない | 本コミット |
| PH0-A | BinaryReader + Input 16B + 長さ/範囲で切断 | 完了 | 100% | PLAT-0 | 16B 往復。15/17B は切断。短バッファでプロセス死なし | 本コミット / 59 tests |
| PH0-B | 入力レート制限 90/s | 完了 | 100% | PH0-A | 超過で切断するテストがある | 本コミット / 64 tests |
| PH0-C | Bun WS オプション + `send()` -1/0 | 完了 | 100% | PH0-A | `bufferedAmount` 不使用。-1 スキップ / 0 切断 | 本コミット / 65 tests |
| PH0-D | `slice` → `subarray` | 完了 | 100% | PH0-C | ホットパス送信がコピーでない | 本コミット / 66 tests |
| PH0-E | lagcomp 毎ティック `record()`（または削除） | 完了 | 100% | PH0-A | 記録されているかモジュール削除。混在しない | 本コミット / 68 tests |
| PH0-F | 100 万 fuzz + 固定長 ±1 | 完了 | 100% | PH0-A〜E | 1e6 で落ちない。Input ±1 で切断 | 本コミット / 72 tests / 1e6 fuzz 4.9s |

### Phase 1

計画書: [`planning/PHASE01_PLAN.md`](./planning/PHASE01_PLAN.md)
橋渡し: [`planning/HANDOFF.md`](./planning/HANDOFF.md)（PH1-F 完了後。次は **Phase 1.5 品質ゲート**）

合意: fps 系パッケージのみ。Channel 頭 1B。GPU 予算は本フェーズ DoD 外。`dtMs` はミリ秒。fps Snapshot は `vy` を含める。workspace package name は `@cod/*`。Babylon options は型にあるものだけ使う。

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| PLAT-1 | フェーズ 1 計画書作成（`PHASE01_PLAN.md`） | 完了 | 100% | PH0-F | `_TEMPLATE.md` 準拠。arch と合意が矛盾しない | `663f815` / `87e0294` |
| PLAT-1R | 公式 API を Web 検索して `PHASE01_PLAN` を書き直す | 完了 | 100% | PLAT-1 | 公式 URL 付き。D1–D10 維持。invent なし | `20fa678` / 公式一次情報 URL を PHASE01_PLAN §10.5 に記載 / link check broken 0 / typecheck・lint・unit・build pass |
| PLAT-1Q | 不確かな点の最終決定を docs へ反映 | 完了 | 100% | PLAT-1R | `dtMs` 単位、fps Snapshot `vy`、workspace package name、Babylon options 方針が arch / plan / handoff に反映される | 本コミット / 人間回答: `vy`含む・`@cod/*` / agent推奨採用: `dtMs`ミリ秒・Babylon型にあるものだけ |
| PH1-A | bun workspaces + fps 系へ移動 | ローカル検証済み | 100% | PLAT-1Q | `@cod/protocol` / `@cod/engine-core` / `@cod/profile-fps` / `@cod/gameserver` / `@cod/web` がビルドできる | 本コミット / `bun run typecheck` pass / `bunx biome lint .` pass / `bun run test:unit` 11 files・72 tests pass / `bun run build` pass |
| PH1-B | 依存規則を Biome で強制 | ローカル検証済み | 100% | PH1-A | 破ると lint が落ちる。ルール名は公式確認 | 本コミット / `biome.json` overrides / `SimulationStep<TWorld>` 注入で engine-core→profile-fps 依存を解消 / probe: WebSocket 直接参照は `lint/style/noRestrictedGlobals`、engine-core→profile-fps は `lint/style/noRestrictedImports` で失敗 / 4検証 pass |
| PH1-C | Channel 頭 1B | ローカル検証済み | 100% | PH1-A | Unreliable の payload は Input 16B。欠落は 1002 | 本コミット / `Channel` + `decodeFrame` 追加 / Input frame 17B・payload 16B / Channel 欠落・空・Reliable・Bulk は ProtocolError 1002 / `bun run test:unit` 12 files・78 tests pass / 4検証 pass |
| PH1-D | Babylon Engine + R3F シーン削除 | ローカル検証済み | 100% | PH1-A | R3F シーンが無い。EngineOptions は公式どおり | 本コミット / `@babylonjs/core@9.25.0` / `new Engine(canvas, false, options, false)` / installed `.d.ts` で `EngineOptions` を確認し型にある key のみ使用 / R3F scene・renderer・loop 削除 / `bun run test:unit` 12 files・78 tests pass / 4検証 pass / preview HTTP 200 |
| PH1-E | unadjustedMovement + 入力累積 | ローカル検証済み | 100% | PH1-D | 視線はフレーム先頭で消費 | 本コミット / `requestPointerLock({ unadjustedMovement: true })` first + `NotSupportedError` fallback / look delta queue + `consumeLookDelta()` / `bun run test:unit` 13 files・81 tests pass / 4検証 pass |
| PH1-F | React は HUD のみ + 位置同期経路 | ローカル検証済み | 100% | PH1-C〜E | 単一静的マップで既存ネットが Babylon 上の経路になる | 本コミット / `GameCanvas` は canvas host + runtime factory のみ / `RendererHud` は低頻度 renderer+net 状態のみ / `GameClient` mock transport unit で Channel.Unreliable Input 16B 送信と Snapshot→Babylon 用 remotes 経路を検証 / R3F・Three描画残存 audit 0 hits / 4検証 pass |


### Phase 1.5

計画書: [`planning/PHASE01_5_PLAN.md`](./planning/PHASE01_5_PLAN.md)
橋渡し: [`planning/HANDOFF.md`](./planning/HANDOFF.md)（次は **Phase 2 計画作成**）

目的: Phase 2 の Sim Profile 分離前に、Vitest coverage 測定、重要経路の意味ある coverage 増加、Playwright E2E の入口を追加する。Sandbox では Playwright browser 実行結果を捏造せず、CI / 実環境検証待ちとして扱う。

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| PLAT-1.5 | Phase 1.5 計画追加（coverage / meaningful tests / E2E） | 完了 | 100% | PH1-F | `_TEMPLATE.md` 準拠。Vitest coverage と Playwright 公式 API 根拠、Sandbox 制約、意味ある coverage 増加方針が docs に反映される | 本コミット / [`planning/PHASE01_5_PLAN.md`](./planning/PHASE01_5_PLAN.md) / Vitest・Playwright 公式 docs 確認 / link check broken 0 / typecheck・lint・unit・build pass / git diff --check pass |
| PH1.5-A | Vitest coverage 測定導入 | ローカル検証済み | 100% | PLAT-1.5 | `test:coverage` と coverage config があり、baseline coverage が記録される | 本コミット / `@vitest/coverage-v8@4.1.11` / `bun run test:coverage` pass（14 files・84 tests）/ baseline: Statements 66.82% (725/1085), Branches 57.10% (225/394), Functions 64.43% (125/194), Lines 68.97% (696/1009) / coverage include/exclude/0%初期threshold設定 / typecheck・lint・unit・build pass / git diff --check pass |
| PH1.5-B | 意味のある Vitest coverage 増加 | ローカル検証済み | 100% | PH1.5-A | protocol / input / prediction / interpolation / UI seam 等の重要未テスト branch に assertion を追加し、before/after を記録する | 本コミット / 17 files・107 tests / WebSocketTransport Channel framing・malformed frame 1002・no-copy/fallback send・status、GameClient welcome reject・malformed snapshot・dispose/status、Interpolator extrapolate/hold/departure/yaw wrap/history、StartOverlay fullscreen rejection/fallback、TouchControls joystick clamp/reset/jump / after: Statements 79.17% (859/1085), Branches 73.85% (291/394), Functions 79.38% (154/194), Lines 80.77% (815/1009) / thresholds ratchet: statements 79, branches 73, functions 79, lines 80 |
| PH1.5-C | Playwright E2E 実装 | 実環境検証待ち | 100% | PH1.5-B | `@playwright/test`、`playwright.config.ts`、E2E specs、Sandbox 未実行理由または CI 実行結果がある | 本コミット / `@playwright/test@1.63.0` / `test:e2e` script / `playwright.config.ts`（Desktop Chrome、`webServer.command: bun run start`、`baseURL: http://127.0.0.1:4173`、`PLAYWRIGHT_BASE_URL` override）/ `e2e/game-shell.spec.ts` 3 specs（shell smoke、fullscreen unavailable start、same-origin `/ws` proxy connection）/ `bun run test:e2e -- --list` pass（3 tests discovered）/ browser実行は Sandbox Chromium 制約により未実行・実環境検証待ち / typecheck・lint・unit・coverage・build・link check・git diff --check pass |
| PH1.5-D | Quality gate docs / CI 提案整理 | ローカル検証済み | 100% | PH1.5-C | coverage threshold ratchet 方針、E2E 実行手順、次 Phase 2 handoff が docs に反映される | 本コミット / `docs/ops/README.md`, `docs/ops/quality-gates.md`, `docs/ops/github-actions-proposal.yml` 追加 / 当時は `.github/workflows/` への直接書き込みが禁止で配置提案のみだったが、2026-09-19 に許可され本番配置へ（2026-09-22 整理で提案ファイル削除し正本を `.github/workflows/quality-gates.yml` に統一） / Playwright CI・webServer、Bun `bun ci`、GitHub Actions workflow syntax、setup-bun 公式情報を再確認 / Phase 2 handoff 更新 / typecheck・lint・unit・coverage・build・E2E discovery・link check・git diff --check pass |


### Phase 2

計画書: [`planning/PHASE02_PLAN.md`](./planning/PHASE02_PLAN.md)
橋渡し: [`planning/HANDOFF.md`](./planning/HANDOFF.md)（Phase 2 完了。次は **Phase 3 計画作成 PLAT-3**）

目的: `engine-core` を type 非依存の L1 として保ち、`profile-fps` を L2 の `FpsSimProfile` 実装として注入できる形に分離する。2026-09-15 の人間確認により、Phase 2 は **fps 先行＋voxel は契約だけ** とする。`profile-voxel` package、voxel terrain、voxel physics 本実装は含めない。

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| PLAT-2 | Phase 2 計画作成（Sim Profile 分離） | ローカル検証済み | 100% | PH1.5-D | `_TEMPLATE.md` 準拠。`PLAT-2` と PH2-* が task-list に追加され、fps先行＋voxel契約のみの範囲が明記される | 本コミット / [`planning/PHASE02_PLAN.md`](./planning/PHASE02_PLAN.md) / 人間回答: `fps先行＋voxelは契約だけ` / docs link check・`git diff --check` pass |
| PH2-A | `SimProfile` contract + `TYPE_SPECS` | ローカル検証済み | 100% | PLAT-2 | `engine-core` に type 非依存 contract、`protocol` に fps/voxel rate spec があり、既存 fps constants と矛盾しない | 本コミット / `packages/engine-core/src/profile/SimProfile.ts` / `packages/protocol/src/protocol/type-specs.ts` / `TYPE_SPECS.fps` 由来の互換 constants / mock profile contract tests / type-spec tests / typecheck・lint・unit・coverage・build・E2E discovery pass |
| PH2-B | `FpsSimProfile` 実装 | ローカル検証済み | 100% | PH2-A | `profile-fps` が world / player spawn / step / snapshot writer を profile として提供し、現行 fps 挙動を維持する | 本コミット / `packages/profile-fps/src/profile/FpsSimProfile.ts` / `createFpsSimProfile()` / direct fps snapshot writer（現行 `encodeSnapshot` と byte-for-byte 一致）/ smoke tests / typecheck・lint・unit・coverage・build・E2E discovery pass |
| PH2-C | gameserver への profile 注入 | ローカル検証済み | 100% | PH2-B | `apps/gameserver` が profile factory を注入し、`engine-core` は `@cod/profile-*` を import しない | 本コミット / `apps/gameserver/src/runtime.ts` / `createDefaultServerRuntime()` / `Room`・`Simulation`・`SnapshotBroadcaster` profile seam / gameserver runtime smoke test / typecheck・lint・unit・coverage・build・E2E discovery pass |
| PH2-D | web `GameClient` / prediction への profile 注入 | ローカル検証済み | 100% | PH2-B | `GameClient` / `ClientPrediction` が profile contract で動き、default fps 経路が既存 E2E discovery と unit tests を維持する | 本コミット / `ClientSimProfile`・`ClientPredictionProfile` seam / default `createFpsSimProfile()` 経路 / mock profile injection tests / typecheck・lint・unit・coverage・build・E2E discovery pass |
| PH2-E | client/server same input + 決定論 + docs 整理 | ローカル検証済み | 100% | PH2-C, PH2-D | fps determinism と client/server 同一入力テストがあり、Phase 2 の証拠・handoff が更新される | 本コミット / `_tests_/packages/profile-fps/sim/determinism.test.ts` 100ticks x10 scenarios smoke + purity + factory isolation / `_tests_/packages/profile-fps/sim/same-input.test.ts` server Simulation vs ClientPrediction same quantized input 120ticks exact + 100ticks per-tick <0.35m / `scripts/determinism-heavy.ts` 1000ticks x100 scenarios determinism 0.8s pass / `engine-core` import boundary audit 0 violations / `scripts/check-determinism.ts` pass / typecheck・lint・unit 23 files 127 tests・coverage・build・E2E discovery pass |

### Emergency Phase (EM)

計画書: [`planning/EM01_PLAN.md`](./planning/EM01_PLAN.md)
橋渡し: [`planning/HANDOFF.md`](./planning/HANDOFF.md)（Phase 2 完了後、EM1 計画作成中）

目的: Phase 3 前に現行コードのバグ・リーク・ゼロアロケ違反・ログ汚染を完全解消する。事実確認済みバグ B1〜B15 を対象。

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---:|
| PLAT-EM | EM01 計画作成（完全バグ修正） | ローカル検証済み | 100% | PH2-E | `_TEMPLATE.md` 準拠。事実確認とバグ一覧 B1〜B15 が明記され、task-list に EM が追加される | 本コミット / [`planning/EM01_PLAN.md`](./planning/EM01_PLAN.md) / 事実確認: typecheck・lint・unit 23/127・coverage 80.96% Statements 927/1145, Branches 75.06% 307/409, Functions 81.25% 169/208, Lines 82.6% 883/1069 / build 596 modules / determinism + heavy 100x1000 0.8s pass / E2E list 3 tests / console.log 4件( client 1件削除対象 ) / slice 0 / Math.random in sim 0 / any 0除node_modules / gh issue 0 / git diff --check pass |
| EM1-A | メモリリーク修正（LagCompStore/InputQueues/paused） | ローカル検証済み | 100% | PLAT-EM | `Simulation.removePlayer` / `SnapshotBroadcaster.removePlayer` / `LagCompStore.clear` が leave 時に呼ばれる | `003d95c` / Simulation.removePlayer + SnapshotBroadcaster.removePlayer + gameserver close 整理 / 回帰 3+2+2 tests / typecheck/lint/unit 134/build pass |
| EM1-B | console.log削除 + ログ整理 | ローカル検証済み | 100% | PLAT-EM | `BabylonGame.ts` console.log削除、gameserverログ整理、client側 noConsole lint | `56f6c8b` / BabylonGame console.log削除 / biome noConsole error for babylon/net / 134 tests pass |
| EM1-C | ゼロアロケ違反修正（Room.getPlayers / Snapshot encode） | ローカル検証済み | 100% | EM1-A | `Room.getPlayersIterable()` 追加、hot path の `getPlayers()` 使用0、encodeループ外1回 | `721461e` / getPlayersIterable + getPeersIterable / Simulation.step iterable / Snapshot encode once + lastAckSeq patch + writeCompatSnapshot map廃止 / 134 tests |
| EM1-D | クライアントGC削減（remotes Map / players.map） | ローカル検証済み | 100% | EM1-C | `GameClient.remotes` Map再利用、`writeCompatSnapshot` map廃止 | `fddc7c7` / GameClient remotes reuse via interpolator out Map / prediction pending in-place filter / 134 tests |
| EM1-E | 入力キュー/補間/ラグ補償のshift/splice改善 | ローカル検証済み | 100% | EM1-C | `shift()` / `splice` を head index リングに（可能な範囲） | `325771b` / InputQueue {buf,head} + LagCompStore HistoryBuffer + Interpolator sampleHead / 134 tests |
| EM1-F | 回帰テスト + coverage + docs整理 | ローカル検証済み | 100% | EM1-A〜EM1-E | B1〜B5,B11,B12回帰テスト、coverage閾値維持、HANDOFF/quality-gates更新 | 本コミット / Room iterable 2 tests + snapshot encode once 2 tests + GameClient reuse 1 + prediction in-place 1 + interpolator reuse 2 = 142 tests / coverage 81.22%/76.02%/81.9%/82.8% / determinism + heavy pass / E2E list 3 / HANDOFF/quality-gates更新 |

### Emergency Phase 2 (EM2) — テストカバレッジ 85% 達成

計画書: [`planning/EM02_PLAN.md`](./planning/EM02_PLAN.md)
目的: 意味あるテストで coverage を Statements/Branches/Functions/Lines 85%以上へ引き上げ、Playwright フルE2E（gameserver + preview の複数 webServer）を実現する。include-all 方針で gameserver/index.ts、BabylonGame.ts、App.tsx もカバー。

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---:|
| PLAT-EM2 | EM02 計画作成（カバレッジ85%） | ローカル検証済み | 100% | EM1-F | `_TEMPLATE.md` 準拠の計画、事実確認（81.22%/76.02%/81.9%/82.8%）、低カバレッジ一覧、task-list に EM2 追加 | 本コミット / `EM02_PLAN.md` / task-list 更新 / 81.22%/76.02%/81.9%/82.8% 事実確認済み |
| EM2-A | サーバー/プロトコル/エンジンの意味あるカバレッジ増加 | ローカル検証済み | 100% | PLAT-EM2 | gameserver/index.ts 0%→70%+、types 50%→100%、ingest/snapshot/Room/Simulation/collision/movement/packer/quantize 85%+、coverage 全体 85%へ寄与 | 本コミット / `handlers.ts` 新規 + `handlers.test.ts` 13 tests + `index.test.ts` 5 tests / `types.test.ts` 3 tests / `quantize.test.ts` 6 tests / `ingest` ArrayBuffer branch / `packer` readMessageType empty / handlers 97% / index 30%→~80% (setInterval loop + ws handlers) / coverage 95.12%/87.97%/90.7%/96.8% |
| EM2-B | クライアント（BabylonGame/InputController/App/GameCanvas/store）のカバレッジ増加 | ローカル検証済み | 100% | PLAT-EM2 | BabylonGame 2%→80%+、InputController 72%→85%+、App 0%→85%+、GameCanvas/store/websocket/interpolation/prediction 85%+ | 本コミット / `babylonDeps.ts` 新規 (testability) / `BabylonGame.test.ts` 6 tests (mock deps) / `InputController.test.ts` 3→13 tests (WASD/jump/joystick/deadzone/pitch/touch-ui/pointer up/lock) / `App2.test.tsx` 2 tests (App 0%→100%) / `GameCanvas` 81%→~90% (null ref + re-create) / BabylonGame 2%→96.9% / InputController 72%→~95% |
| EM2-C | Playwright E2E拡充（フルE2E複数webServer） | ローカル検証済み | 100% | PLAT-EM2 | `playwright.config.ts` webServer 配列化（gameserver + preview）、E2E 3→8+ tests、WS proxy・HUD・StartOverlay・TouchControls・multi-context・切断再接続 | 本コミット / `playwright.config.ts` webServer配列化 (gameserver 8080 + preview 4173) / `game-shell.spec.ts` 3→11 tests (HUD hp/ammo, StartOverlay hide, no console errors, TouchControls mobile, canvas resize, WS /ws proxy, multi-context 2 tabs, disconnection) / `bun run test:e2e -- --list` 11 tests discovered |
| EM2-D | thresholds 85%更新 + docs整理 | ローカル検証済み | 100% | EM2-A〜EM2-C | `vitest.config.ts` thresholds 85/85/85/85、task-list/HANDOFF/quality-gates/skills/log 更新 | 本コミット / `vitest.config.ts` 79/73/79/80→85/85/85/85 / coverage 95.12%/87.97%/90.7%/96.8% pass / `App.tsx` 100% / `BabylonGame` 96.9% / `types` 100% / `quantize` 100% |
| EM2-E | 最終検証（coverage 85%達成確認） | ローカル検証済み | 100% | EM2-D | 4検証 + coverage 85% + E2E discovery 8+ + determinism + heavy pass | 本コミット / typecheck pass / lint 0 warnings / test:unit 30 files 189 tests / coverage 95.12%/87.97%/90.7%/96.8% / build pass / E2E list 11 / determinism + heavy pass |

### Phase 3 — ゲームモード API 第1版 + fps-ffa 最小

計画書: [`planning/PHASE03_PLAN.md`](./planning/PHASE03_PLAN.md)
橋渡し: [`planning/HANDOFF.md`](./planning/HANDOFF.md)（EM02完了。次は **Phase 3 計画作成 PLAT-3** → Phase 3 実装）

目的: `engine-core` を type非依存の L1 として保ち、`gamemode-api` を L1 contractとして追加し、`fps-ffa` 最小モードを L3 として動かす。`profile-voxel` / voxel terrain / AOI / delta snapshot / matchmaker / UGC / WT は含めない。

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| PLAT-3 | Phase 3 計画作成（gamemode API第1版 + fps-ffa最小） | ローカル検証済み | 100% | EM2-E | `_TEMPLATE.md` 準拠。`PLAT-3` と PH3-A〜D が task-list に追加され、fps先行＋voxel契約のみ継続が明記される | 本コミット / [`planning/PHASE03_PLAN.md`](./planning/PHASE03_PLAN.md) / `fps先行＋voxelは契約だけ` 継続 / docs link check・`git diff --check` pass |
| PH3-A | `gamemode-api` package作成（L1 contract） | ローカル検証済み | 100% | PLAT-3 | `@cod/gamemode-api` が存在し、`defineGameMode` が id/type/source/slug/min/maxPlayers検証、GameModeDefinition / RoomCtx / BaseCtx / FpsCtx / VoxelCtx が仕様通り、L1 type非依存（profile-* import 0） | 本コミット / `packages/gamemode-api/` package.json + src/types.ts + defineGameMode.ts + ctx.ts + index.ts / `packages/gamemode-sdk/` package.json + src/index.ts facade (api re-export) / `biome.json` gamemode-api/sdk overrides追加 + _tests_ non-null off / `_tests_/packages/gamemode-api/src/defineGameMode.test.ts` 10 tests + ctx.test.ts 5 tests / typecheck pass / lint 0 warnings / test:unit 32 files 204 tests / coverage 95.26%/88.48%/90.98%/96.9% thresholds 85 pass / build pass / E2E list 11 / determinism pass |
| PH3-B | `GameModeRuntime` + Tick timer + RateLimiter | ローカル検証済み | 100% | PH3-A | `GameModeRuntime` が例外安全（mode例外でroomが落ちない）、after/every/cancel tick基準（setTimeout禁止）、gamemode message rate 40/s burst 20超過時false、Room統合 | 本コミット / `packages/engine-core/src/gamemode/GameModeTimer.ts` + `GameModeRuntime.ts` + `index.ts` + `net/rate-limit.ts` MODE_MESSAGE 40/s burst20 + `room/Room.ts` setGameModeBinding/cleanup / `_tests_/packages/engine-core/gamemode/GameModeTimer.test.ts` 8 tests + `ModeMessageRateLimiter.test.ts` 8 tests + `GameModeRuntime.test.ts` 11 tests (exception safety/timer tick/rate limit/broadcast false/Room統合) / `tsconfig.base.json` paths gamemode-api/sdk/gameserver + `tsconfig.server.json` include gamemode-api/sdk + `vitest.config.ts` 既存 / typecheck pass / lint 113 files 0 warnings / test:unit 35 files 231 tests pass (+3 files +27 tests) / coverage 94.12%/87.52%/87.21%/95.69% thresholds 85 pass / build 958ms pass / determinism pass / E2E list 11 |
| PH3-C | `fps-ffa` 最小モード | ローカル検証済み | 100% | PH3-B | `gamemodes/fps/official/ffa` が `fps-official-ffa` idで defineGameMode export、waiting→countdown→playing→ended、spawn選択、kill→score、death→respawn 3s、static arena再利用 | 本コミット / `gamemodes/fps/official/ffa/index.ts` defineGameMode fps-official-ffa type fps source official slug ffa min2 max16 world map static-arena hooks onRoomCreate/Destroy onPlayerJoin/Leave/Spawn/Death/Damage onTick onWeaponFire/onHit onNetworkMessage chat 200文字制限 COUNTDOWN 60*3 RESPAWN 60*3 ENDED 60*5 WIN_SCORE 10 + `gamemodes/fps/official/pvp/index.ts` re-export ffa alias + `_tests_/gamemodes/fps/official/ffa.test.ts` 11 tests (id/type/source/slug/map, pvp alias同一, waiting→countdown→playing lifecycle, spawn getSpawnPoints+randomInt+giveWeapon+setAmmo, kill→score, death→respawn 3s after, 10キル勝利ended, playing中<2でended, chat 200制限, static-arena再利用) / `vitest.config.ts` coverage include gamemodes追加 / typecheck pass / lint 116 files 0 warnings / test:unit 36 files 242 tests pass (+1 file +11 tests) / coverage 93.42%/85.89%/85.4%/94.93% thresholds 85 pass / build 1.12s pass / determinism pass / E2E list 11 |
| PH3-D | 統合 + docs + import境界 + quality gate | ローカル検証済み | 100% | PH3-C | gameserverが profile + gamemode注入、biome.json gamemodes/*→gamemode-apiのみ、coverage 85%維持、E2E discovery 11+維持、typecheck/lint/unit/build/determinism/heavy pass、task-list/HANDOFF/quality-gates更新 | 本コミット / `apps/gameserver/src/runtime.ts` profile+gamemode注入 createDefaultServerRuntimeがFpsSimProfile+GameModeTimer+ModeMessageRateLimiter+GameModeRuntime+STATIC_ARENA_SPAWNS 8点+FpsCtx実装(random LCG seed 0x12345678, getPlayerRefByStringId numeric+custom id search, scores/teamScores/weapons/ammos Map, broadcastHud/send/broadcast/broadcastExcept例外安全try/catch, after/every/cancel tick基準, setState/getState, giveWeapon/setAmmo/getSpawnPoints/getZone/raycast stub)+GameModeRuntime options+onRoomCreate waiting初期化 / `apps/gameserver/src/handlers.ts` createHandlersにgameModeRuntime/createFpsCtx/_playerRefs optional追加+openでPlayerRef登録+onPlayerJoin例外安全+messageでstring JSON chatをonNetworkMessageへ+closeでonPlayerLeave+_playerRefs削除+createHandlersFromRuntimeヘルパー / `apps/gameserver/src/index.ts` runtime統合+setIntervalでsim.update+各tickでsnapshots.maybeSend+gameModeRuntime.tickWithCtx例外安全+steps 0でもtimer消化 / `packages/engine-core/src/room/Room.ts` broadcastExcept public化+sendTo/sendBinaryTo追加(例外安全)+gamemode binding維持 / `apps/gameserver/package.json` gamemode-api/sdk依存追加 / `gamemodes/fps/official/ffa/index.ts` FpsCtx cast追加でtypecheck pass / `_tests_/apps/gameserver/src/runtime-gamemode.test.ts` 13 tests (profile+gamemode注入, spawn 8点, waiting→countdown→playing lifecycle, mode例外でroom落ちない throwingMode onTick/onJoin/onNetworkMessage/timer, chat 200制限, Room sendTo/broadcastExcept public, FpsCtx全メソッド random/randomInt/getPlayer/getPlayers/setScore/getScore/setTeamScore/broadcastHud/after/every/cancel/setState/getState/giveWeapon/setAmmo/getSpawnPoints/getZone/raycast/send/broadcast/broadcastExcept string/binary, send/broadcast with players rate limit, GameModeRuntime send/broadcast rate limit, handlers backward compat, getPlayerRefByStringId分岐, ctx例外安全, gameModeRuntime全分岐) / typecheck pass / lint 117 files 0 warnings / test:unit 37 files 255 tests pass (+1 file +13 tests, PH3-Cから+1+13) / coverage 93.34%/86.82%/86.72%/94.83% thresholds 85 pass / build 1.00s pass / determinism pass / E2E list 11 |

### Phase 4 — ハブ + Sandbox モーダル + 投票システム + マッチメイカー骨組み

計画書: [`planning/PHASE04_PLAN.md`](./planning/PHASE04_PLAN.md)  
橋渡し: [`planning/HANDOFF.md`](./planning/HANDOFF.md)（PH3-D完了。次は **Phase 4 計画作成 PLAT-4** → Phase 4 実装）

目的: Phase 3で分離した gamemode APIの上に、ユーザー理想の 3カテゴリプラットフォーム (FPS公式/Voxel公式/Sandbox UGC) のハブUI骨組みを実装し、Sandbox UGCハブのフィルタ/ソート/参加フローとFPS投票システムの入口を作る。L1 type分岐は fps|voxelの2つのまま、Sandboxは source=ugc表示集約、boxelはvoxelエイリアス。matchmaker本実装は含めずmock、voxel本実装/AOI/delta/QuickJS/GLBエディタ本実装は含めない。

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---:|
| PLAT-4 | Phase 4計画作成（ハブ+Sandboxモーダル骨組み+投票入口） | 実装中 | 80% | PH3-D | `_TEMPLATE.md`準拠。PLAT-4とPH4-A〜Fがtask-listに追加され、FPS/Voxel/Sandbox 3カテゴリ・Header FPS/Voxelタブ・Left Sidebar Sandboxボタン・Sandboxモーダル(カード thumbnail/title/creator/plays/desc、フィルタ Bedwars/Zombie/Athletic、ソート plays/active/views)・詳細ページ Play Now/Room Selection・投票システム入口・boxelエイリアス・genre/tag拡張が明記される | 本コミット / `PHASE04_PLAN.md` / product.md/editor.md/types.md/matchmaker.md/client.md/architecture.md 2026-09-22理想反映済み / docs link check・`git diff --check` pass予定 |
| PH4-A | GameModeDefinition genres/tags/display/stats拡張 + boxelエイリアス | 未着手 | 0% | PLAT-4 | `gamemode-api`にgenres/tags/display/stats optional追加、normalizeGameType boxel→voxel、ffa拡張、後方互換維持、tests追加 | - |
| PH4-B | ハブUI Header FPS/Voxelタブ切替 | 未着手 | 0% | PH4-A | Headerコンポーネント FPS/Voxelタブ、activeTab state、App統合、tests | - |
| PH4-C | Left Sidebar Krunker風 + Sandboxボタン | 未着手 | 0% | PH4-B | LeftSidebarコンポーネント、Sandboxボタンでモーダルopen、GameStore sandboxOpen、App統合、tests | - |
| PH4-D | Sandboxモーダル カード一覧+フィルタ+ソート (mock) | 未着手 | 0% | PH4-C | sandbox.ts filter/sort/normalize、matchmaker-mock.ts mockGameModes、SandboxModal カード thumbnail/title/creator/plays/desc、フィルタ Bedwars/Zombie/Athletic、ソート plays/active/views、GameStore filter/sort、tests | - |
| PH4-E | 詳細ページ + Play Now/Room Selectionモーダル (mock) | 未着手 | 0% | PH4-D | SandboxDetailPage、RoomSelectionModal、matchmaker-mock拡張 mockRooms/fetchGameList/seekGame、Play Now auto-match mock、Room Selection manual mock、tests | - |
| PH4-F | 投票システム入口 (mock) + quality gate + docs更新 | 未着手 | 0% | PH4-E | VoteOverlay、voteSession state、onRoundEnd mockで投票UI、FFA/TDM/DOM候補、多数決、typecheck/lint/unit 255+ /coverage 85%/build/E2E 11+/determinism pass、task-list/HANDOFF/quality-gates更新 | - |

### ドキュメント・規約

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| DOC-1 | 旧 docs を `.archive/docs/` へ退避し、理想形で `docs/arch` を再構成 | 完了 | 100% | — | 索引が実ファイルと一致。旧 docs が archive にある。相対リンク切れ 0 | `cbd026e` |
| DOC-2 | AGENTS.md §6 を理想形（Babylon・WS のみ・16B Input 等）へ追従 | 完了 | 100% | DOC-1 | AGENTS と docs/arch が矛盾しない | 本コミット |
| DOC-3 | `.agent/skills` を理想形の実践ノウハウへ更新 | 完了 | 100% | DOC-1 | skills/index が arch を参照し旧 WT 主・R3F 前提が残らない | 本コミット |
| LIC-1 | MIT の LICENSE ファイルをルートに配置 | 完了 | 100% | — | LICENSE が MIT 全文 | 本コミット |
| DOC-4 | 現用ドキュメント全体の外部 API 記述を公式一次情報に追従 | 完了 | 100% | PLAT-1R | `docs/arch/api-sources.md` を追加し、現用 docs の古い API 記述を解消。リンク切れなし | 本コミット / Bun・Biome・Babylon・Noa・QuickJS・Colyseus 公式確認 / link check broken 0 / typecheck・lint・unit・build pass |
| DOC-5 | 公式/UGC 階層とエディタ方針を仕様へ反映 | 完了 | 100% | DOC-4 | `/fps|voxel/{official|ugc}/<slug>`、Babylon GLB エディタ、voxel 公式地形生成、Noa 系依存候補が docs に反映 | 本コミット / `docs/arch/editor.md` / Babylon loaders・Noa 系 npm metadata 確認 / link check broken 0 / typecheck・lint・unit・build pass |
| DOC-6 | Krunker.io / bloxd.io Deep Research 計画書作成 | 完了 | 100% | DOC-5 | 調査範囲・禁止事項・GitHub clone + SHA 記録ルールを明文化 | 本コミット / `docs/planning/complete/DEEP_RESEARCH_PLAN.md` / link check broken 0 |
| DOC-7 | ドキュメント整理（Deep Research 統合入口と読む順の整理） | 完了 | 100% | DR-5 | `docs/README.md` / `docs/research/README.md` / `docs/planning/HANDOFF.md` が DR-5 後の読む順と調査入口を示す | `9bd5371` / [`research/DEEP_RESEARCH_SYNTHESIS.md`](./research/DEEP_RESEARCH_SYNTHESIS.md) / link check broken 0 |
| DOC-8 | ドキュメント整理（planning/arch/research 導線と安全な索引追加） | 完了 | 100% | DOC-7 | ファイル移動なしで、読む順・計画書入口・仕様/調査の境界が docs に明示される | `4f1e2fc` / [`planning/README.md`](./planning/README.md) / link check broken 0 |
| DOC-9 | ドキュメント最終チェックと完了済み plan の整理 | 完了 | 100% | DOC-8 | 完了済み計画を `docs/planning/complete/` に移し、現用リンク・計画導線・API 根拠を再確認する | 本コミット / [`planning/complete/README.md`](./planning/complete/README.md) / link check broken 0 |

### 検証待ち・将来

| ID | タスク | 状態 | 進捗 | 依存 | 完了条件 | 証拠 |
|---|---|---|---:|---|---|---|
| CI-1 | GitHub Actions を `.github/workflows/` に本番配置（2026-09-19 許可） | 完了 | 100% | PH1.5-D | `.github/workflows/quality-gates.yml` が正本として配置され、CI で typecheck/lint/determinism/unit/coverage/build/E2E discovery が実行される（旧提案 `docs/ops/github-actions-proposal.yml` は 2026-09-22 に削除） | 本コミット / `.github/workflows/quality-gates.yml` 追加 / 旧「書き込み不可」表記は AGENTS.md §6.3 更新で解除 / 2026-09-22 整理で提案ファイル削除し正本統一 |
| DR-1 | Krunker.io / bloxd.io Deep Research 実施 | 完了 | 100% | DOC-6 | network / frontend / editor / UGC / voxel 実装を source URL・clone SHA 付きで整理 | 本コミット / [`research/DR-1_COMPETITOR_DEEP_RESEARCH.md`](./research/DR-1_COMPETITOR_DEEP_RESEARCH.md) / clone SHA・読んだファイル一覧記録 / link check broken 0 |
| DR-2 | DR-1 要確認の追加 Deep Research | 完了 | 100% | DR-1 | bloxd 公式 Terms、Krunker direct API URL、Noa/Babylon peer mismatch を source URL・clone SHA 付きで整理 | 本コミット / [`research/DR-2_ADDITIONAL_SOURCE_RESEARCH.md`](./research/DR-2_ADDITIONAL_SOURCE_RESEARCH.md) / Noa examples clone SHA 記録 / link check broken 0 |
| DR-3 | 追加 Deep Research（search depth 3） | 完了 | 100% | DR-2 | Krunker direct API、bloxd code-api 追加 docs、texture-packs、authoritative netcode を deep search / fetch / clone SHA 付きで整理 | 本コミット / [`research/DR-3_DEEPER_COMPETITOR_RESEARCH.md`](./research/DR-3_DEEPER_COMPETITOR_RESEARCH.md) / web_search depth 3 / clone SHA 再確認 / link check broken 0 |
| DR-4 | 追加 Deep Research（engine / UGC / asset pipeline） | 完了 | 100% | DR-3 | Noa 系 engine、voxel physics、input/mobile、QuickJS sandbox、glTF validation/optimization pipeline を deep search / fetch / clone SHA 付きで整理 | 本コミット / [`research/DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md`](./research/DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md) / web_search depth 3 / clone SHA 記録 / link check broken 0 |
| DR-5 | Perplexity DeepResearch 差分検証 | 完了 | 100% | DR-4 | `docs/Perplexity-AI.md` と DR-1〜DR-4 の差分を分類し、一次情報/現行コードで修正済み・未解決・低信頼を整理 | 本コミット / [`research/DR-5_PERPLEXITY_DIFF_RESEARCH.md`](./research/DR-5_PERPLEXITY_DIFF_RESEARCH.md) / web_search depth 3 / 現行コード再監査 / link check broken 0 |
| OPEN-A | Input `dtMs` の単位（ms か ×10 か）を決定 | 完了 | 100% | PLAT-0 | 人間の回答が protocol.md に反映 | `dtMs` はミリ秒で確定。0.1ms単位（×10）は不採用 |
