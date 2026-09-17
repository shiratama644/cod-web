# PH1-B import boundary implementation log

## 指示内容

ユーザーから「では実装を始めてください。」と指示。直前確認に従い、PH1-B（依存規則を Biome で強制）を実装した。

## 実行内容

- `git status --short && git branch --show-current && git log -5 --oneline` で開始状態を確認。
- `AGENTS.md`, `docs/task-list.md`, `docs/planning/PHASE01_PLAN.md`, `docs/arch/architecture.md`, `biome.json` を全体確認。
- Biome 公式ドキュメントを確認し、`lint/style/noRestrictedImports` と `lint/style/noRestrictedGlobals` の設定形式を確認。
- `packages/engine-core/src/sim/Simulation.ts` から `@cod/profile-fps` 依存を外し、`SimulationStep<TWorld>` をコンストラクタ注入する形へ変更。
- `apps/gameserver/src/index.ts` と `Simulation.test.ts` で `stepPlayer` を注入。
- `packages/engine-core/package.json` から `@cod/profile-fps` dependency を削除。
- `biome.json` に workspace 境界用 overrides を追加。
  - `packages/protocol` から他 `@cod/*` workspace への import を禁止。
  - `packages/engine-core` から `@cod/profile-fps` / app 層 / Three 系への import を禁止。
  - `packages/profile-fps` から app 層への import を禁止。
  - `apps/web/src` から `@cod/engine-core` / `@cod/gameserver` への import を禁止。
  - `apps/web/src` の `WebSocket` グローバル直接参照を禁止し、`apps/web/src/game/net/websocket.ts` だけ許可。
- 一時 probe file で lint が落ちることを確認し、probe file は削除した。

## 気づき

- `noRestrictedImports` の `patterns.group` は scope package の深い subpath に対して `@cod/profile-fps/**` のように `**` を使う必要がある。`@cod/profile-fps/*` では `@cod/profile-fps/sim/movement` を捕捉できなかった。
- `WebSocket` は import ではなく DOM global なので、直接参照の禁止には `noRestrictedImports` ではなく `noRestrictedGlobals` が必要だった。
- PH1-A 時点の `engine-core -> profile-fps` 依存は、`SimulationStep<TWorld>` 注入で無理なく切り離せた。

## 次アクション

- 次は PH1-C（Channel 頭 1B）。client/server/protocol/tests を同一 commit で変更する。
