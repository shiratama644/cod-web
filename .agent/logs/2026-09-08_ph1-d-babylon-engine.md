# PH1-D Babylon Engine + R3F scene removal

> Date: 2026-09-08(JST) / Commit: このファイルを含む PH1-D commit / Branch: arena/01a0748a-cod-web

## 1. 指示内容 (Task Summary)

ユーザーから「次は PH1-D（Babylon Engine + R3F シーン削除）です。」と指示。
PHASE01_PLAN.md の PH1-D 範囲に従い、`@babylonjs/core` を導入し、apps/web の R3F / Three scene を Babylon の命令型 scene に置き換える。

## 2. 実行内容 (Executed Actions)

| 項目 | 内容 |
| :--- | :--- |
| 事前確認 | `AGENTS.md`、`.agent/skills/`、`.agent/hooks/pre-task.md`、`docs/task-list.md`、`PHASE01_PLAN.md`、`HANDOFF.md`、`docs/arch/client.md` を確認 |
| 外部確認 | `web_search depth:3` で Babylon `Engine` constructor / `EngineOptions` を確認。`npm view @babylonjs/core` で `9.25.0` / Apache-2.0 / ESM / `index.d.ts` を確認 |
| 型確認 | installed `@babylonjs/core@9.25.0` の `.d.ts` を読み、`Engine` constructor が `options?: EngineOptions` を取ること、`EngineOptions` が `Engines/thinEngine.pure` から import できることを確認 |
| 依存 | `apps/web` に `@babylonjs/core@^9.25.0` を追加。`@react-three/fiber` / `@react-three/drei` と apps/web の直接 `three` / `three-mesh-bvh` 依存を削除 |
| 実装 | `GameCanvas.tsx` を Babylon canvas wrapper に差し替え、`apps/web/src/game/babylon/BabylonGame.ts` を追加 |
| 削除 | `apps/web/src/game/scene/`、`apps/web/src/game/renderer/`、`apps/web/src/game/loop/`、`apps/web/src/game/types.ts` を削除 |
| 検証 | `bun run typecheck` / `bunx biome lint .` / `bun run test:unit` / `bun run build` / `git diff --check` を実行 |
| 目視補助 | `bun run start` で server + Vite preview を起動し、`http://127.0.0.1:4173/` が HTTP 200 を返すことを確認 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- `@babylonjs/core@9.25.0` の `EngineOptions` は `@babylonjs/core/Engines/engine` からは再 export されていないため、型は `@babylonjs/core/Engines/thinEngine.pure` から import する必要があった。
- `EngineOptions` は `WebGLContextAttributes` を継承しているため `alpha` / `antialias` / `premultipliedAlpha` / `powerPreference` などは型で通る。一方、計画どおり `desynchronized` / `preserveDrawingBuffer` は PH1-D では渡していない。
- apps/web から R3F / drei / Three scene を削除しても、`@cod/profile-fps` の server/client 共通衝突判定は `three` / `three-mesh-bvh` を使い続ける。これは描画ではなく profile-fps の衝突用なので PH1-D の削除対象外。

## 4. 次にすべきこと (Next Actions)

- 次は PH1-E。Pointer Lock で `unadjustedMovement: true` を試し、拒否時 fallback を入れる。
- PH1-E では mousemove / pointermove で直接 yaw/pitch を更新せず、視線 delta を累積してフレーム先頭で消費する。
- PH1-F で React HUD/メニューのみへの最終整理と、単一静的マップで既存ネットが Babylon 上で動く経路の仕上げを行う。
