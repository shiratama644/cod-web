# PH1-F: React は HUD のみ + 位置同期経路

> Date: 2026-09-09(JST) / Commit: 本コミット / Branch: arena/01a0748a-cod-web

## 1. 指示内容 (Task Summary)

PH1-F として、React が HUD / メニュー / オーバーレイに留まり、3D を JSX / R3F / Three 描画へ戻さないことを固定する。あわせて、単一静的マップで既存の位置同期（Input 16B + Channel 1B + Snapshot 現行）が Babylon render loop 上で動く経路を、実装と unit test で確認できるようにする。

## 2. 実行内容 (Executed Actions)

| 対象 | 内容 |
|---|---|
| Sandbox 復旧 | 作業開始時に起点コミット相当の大量差分を検知したため、AGENTS.md §4.1.1 の例外手順で `git fetch origin arena/01a0748a-cod-web` → `git reset --hard FETCH_HEAD` → `restore-sandbox-env.sh` を実行し、HEAD `50d8cc6` へ復旧 |
| `apps/web/src/game/GameCanvas.tsx` | `GameRuntime` / `GameRuntimeFactory` seam を追加。React は `<canvas>` を配置し、imperative runtime の `start()` / `dispose()` を呼ぶだけに限定 |
| `apps/web/src/store/gameStore.ts` / `RendererHud.tsx` | 低頻度 HUD 値として `connectionStatus` を追加し、renderer と net status を DOM HUD に表示。座標・回転・remote map は React state に入れない方針を維持 |
| `apps/web/src/game/babylon/BabylonGame.ts` | `GameClient.onStatusChange` を Zustand の低頻度 status に接続。既存の `GameClient.frame()` / `renderSelf()` / `remotes` 経路は Babylon render loop から維持 |
| `apps/gameserver/src/index.ts` | PH1-D/E 前提に合わせ、サーバコメントを Channel.Unreliable Snapshot / Babylon 表記へ更新 |
| `_tests_/apps/web/src/App.test.tsx` | `GameCanvas` lifecycle seam と HUD 表示を jsdom で検証 |
| `_tests_/apps/web/src/game/net/GameClient.test.ts` | mock transport で `frame()` → Channel.Unreliable + Input 16B 送信、Snapshot 受信 → `remotes` 公開の経路を検証 |
| docs / skills | `docs/task-list.md`, `PHASE01_PLAN.md`, `HANDOFF.md`, `planning/README.md`, `docs/arch/client.md`, `.agent/skills/*` を PH1-F 実績と次タスク Phase 2 計画へ更新 |

検証:

- `bun run typecheck`: pass
- `bunx biome lint .`: pass（72 files）
- `bun run test:unit`: pass（14 files / 84 tests）
- `bun run build`: pass（Vite chunk-size warning のみ）
- R3F / Three 描画残存 audit: `@react-three`, `react-three`, `R3F`, `WebGPURenderer`, `useFrame`, `three/webgpu` は apps/packages/_tests 内 0 hits

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- React 公式は `useEffect` を「外部システムとの同期」に使う Hook と説明している。Babylon runtime の start/dispose は React 外の imperative system なので、`GameCanvas` の effect で lifecycle だけを同期する形が適切。
- jsdom では WebGL/Babylon の実描画や 2 タブ WS 目視はできないため、React/Babylon 境界は factory seam で、ネット同期経路は mock `NetTransport` で検証するのが安全。
- `GameClient` は `WebSocketTransport` だけでなく `onText` を持つ mock transport でも welcome→prediction 初期化→Input 送信→Snapshot 受信を通せる。これにより実ブラウザなしで位置同期の主要経路を固定できる。

## 4. 次にすべきこと (Next Actions)

- 次は Phase 2（Sim Profile 分離）の計画作成から進める。`docs/task-list.md` に新しい計画タスク ID を追加し、`docs/planning/PHASE02_PLAN.md` を `_TEMPLATE.md` 準拠で作る。
- PH1 の実 2 タブ目視、raw pointer lock の実ブラウザ成否、GPU 数値は Sandbox では捏造せず実環境検証待ちとして扱う。
