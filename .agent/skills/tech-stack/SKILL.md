---
name: tech-stack
description: 理想スタックと移行元コードの使いどころ・ハマりどころ。実装時に参照。仕様の正本は docs/arch。
---

# Tech Stack Skill — 技術構成を使いこなす

> **スキル**: 「どのライブラリをどこでどう使うか」と、このリポジトリで既に踏んだ地雷。
> 設計の正本は [`../../../docs/arch/`](../../../docs/arch/README.md)（特に protocol / client / sim-profiles / engineering / adr）。
> 欠ファイル `docs/arch/tech-stack.md`・`networking.md` は参照しない。

新規コードは **理想列**に従う。移行元の穴埋め（フェーズ 0）だけ現行ツリーを直す。新規 3D を R3F で足さない。WT / geckos / 生 UDP を実装しない。

## 理想（これから）

| 層 | 使うもの | 使わない |
| :--- | :--- | :--- |
| ランタイム | bun（`Bun.serve` ネイティブ WS） | Node `ws`、`uWebSockets.js` パッケージ（bun では動かない） |
| 3D | `@babylonjs/core`。voxel は `noa-engine` | 新規の Three / R3F / drei |
| UI | React はハブ・HUD・設定・メニュー | ゲームループを React State で回すこと。Context API 新規 |
| シム | `SimProfile` 純粋 `step`。L1 に `if (type)` を書かない | `Math.random` / `Date.now` を step 内 |
| ネット | 手書きバイナリ。Input **16 バイト固定**（不一致は切断）。制御は JSON | 高頻度の msgpack。ゲームコードから `WebSocket` 直接参照 |
| ボイス | 理想に含む。ゲーム同期とは別系統 | ゲームデータに WebRTC DataChannel |

レートは `TYPE_SPECS`（[`protocol.md`](../../../docs/arch/protocol.md)）: fps シム60 / 入力60 / スナップ30。voxel 30 / 30 / 15。描画は可変 rAF。

`ws.send()` は **-1 バックプレッシャ / 0 ドロップ / 1+ バイト**。存在しない `bufferedAmount` に頼らない。`perMessageDeflate: false`。

## ツールチェーン（現行も同じ）

| 用途 | 技術 |
| :--- | :--- |
| ビルド/Dev | Vite（`bun run dev` / `build` / `preview`） |
| Lint | Biome（ESLint/Prettier 不使用） |
| Unit | Vitest。`bun test` は使わない。配置は `_tests_/` ミラー |
| E2E | Playwright は未導入なら書かない。Sandbox では実行しない |
| パッケージ | bun。Sandbox では npm 経由で導入（下記） |

## 移行元コードで確認済み（フェーズ 0 で直す穴・残す資産）

> 描画（R3F / WebGPU / drei Sky）は破棄対象。ネット・バイナリ・ bun WS・テスト配置は移植する。

### bun / Vite / TS / Biome

- bun はプリインストールされない。`bun.sh` は SSL で到達不可。**npm registry 経由**（`restore-sandbox-env.sh`）。バージョンは devDependency で exact 固定。
- **TypeScript 7**: `baseUrl` 廃止。`paths` は相対（`"@/*": ["./src/*"]`）。
- **Biome 2**: `rules: { preset: "recommended" }`。`vcs.useIgnoreFile: true` で `files.includes` を書かない。import 制限は `linter.rules.style.noRestrictedImports`。
- ESM の `vite.config.ts` では `__dirname` 未定義。`path.dirname(fileURLToPath(import.meta.url))`。
- ライブプレビュー（e2b.app）では `server.allowedHosts: true`（preview も）+ `host: true`。未設定は 403。
- **tsconfig は 2 構成**: `tsconfig.json`（client+shared、DOM）と `tsconfig.server.json`（server+shared、`types: ["bun"]`、DOM なし）。エイリアス `@/` `@shared/` `@server/` は tsconfig・vite・vitest の 3 箇所。
- テストは `_tests_/` にソース構造をミラー。ソース横に `*.test.ts` を置かない。shared/server はファイル先頭 `// @vitest-environment node`。
- jest-dom の型: `src/vite-env.d.ts` に `/// <reference types="@testing-library/jest-dom" />`、setup を tsconfig include に入れる。
- `bun run start`（`scripts/execute.ts`）: `vite build` 成功後に server :8080 と preview :4173 を並列。クライアントは `/ws` を同一オリジンで叩き、Vite proxy が bun へ中継。ブラウザから localhost 直叩きをしない。

### bun WebSocket（移植する）

- Bun WebSocket の `ws.data` 型付けは最新 docs では serve call の generic 型引数 ではなく、`websocket: { data: {} as SocketData, ... }` に置く。`server.upgrade(req, { data })` の data は本プロジェクトでは必須。
- **uWebSockets.js を追加しない**（bun 内部で uWS。別パッケージは動かない）。
- 入力は「最新 1 つ上書き」ではなく **playerId ごとの FIFO**。空 tick は重力のみ、yaw/pitch は維持。
- クライアント予測・送信は **wall-clock の setInterval**。rAF は描画サンプリングのみ（タブ非表示で rAF が止まる）。
- リモートエンティティは 1 フレーム欠測で消さない（grace）。補間の外挿はクランプ。

### 描画（破棄。新規に真似しない）

- 現行は R3F v9 + `WebGPURenderer` 非同期ファクトリと WebGL2 フォールバック。**フェーズ 1 でシーンごと捨てる**。
- drei `<Sky>` は WebGPU で白箱になる、等の現行ワークアラウンドは Babylon 移行後不要。
- three-mesh-bvh は bun ヘッドレスで動く（現行権威衝突）。理想の fps 物理は [`sim-profiles.md`](../../../docs/arch/sim-profiles.md)。

### Zustand（ハブ UI には残してよい）

- 毎フレーム値はストアに入れない。React 外は `getState()` / `subscribe`。フックをゲームループから呼ばない。

### PLAT-1R 公式 API 確認（2026-09-06）

- Bun workspaces は root `package.json` の `workspaces` 配列と workspace 側 `package.json`、内部依存の `workspace:*` で組む。最新 docs には catalog / self-contained workspaces もあるが、PH1-A では単純な workspaces だけ使う。
- Biome の import 制限は `linter.rules.style.noRestrictedImports`（diagnostic `lint/style/noRestrictedImports`）。recommended ではないため PH1-B で明示有効化する。
- Babylon `Engine` は `new Engine(canvasOrContext, antialias?, options?, adaptToDeviceRatio?)`。`setHardwareScalingLevel` は typedoc で確認済み。
- 2026-09-06 時点の Babylon typedoc `EngineOptions` 取得結果では `desynchronized` / `preserveDrawingBuffer` が property 一覧に出ていない。一方 Chrome は Canvas context attributes として両 key を公式に示す。PH1-D では installed `.d.ts` を見て、型に無い key を invent しない。
- `@babylonjs/core` npm latest は `type: module`, `types: index.d.ts`, license Apache-2.0。`noa-engine@0.33.0` は `@babylonjs/core ^6.1.0` peer のため、voxel 導入時に Babylon major を再確認する。

## API を記憶で書かない

Babylon / noa / Bun WS は公式ドキュメントを検索する（AGENTS.md §7.5）。存在しないメソッドを発明しない。
