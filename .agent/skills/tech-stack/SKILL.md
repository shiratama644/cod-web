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
| 3D | `@babylonjs/core`。FPS/voxel エディタも Babylon.js。GLB 読み込みは `@babylonjs/loaders`。voxel は `noa-engine` | 新規の Three / R3F / drei。apps/web の 3D へ Three を戻さない |
| UI | React はハブ・HUD・設定・メニュー | ゲームループを React State で回すこと。Context API 新規 |
| シム | `SimProfile` 純粋 `step`。L1 に `if (type)` を書かない | `Math.random` / `Date.now` を step 内 |
| ネット | 手書きバイナリ。Input **16 バイト固定**（不一致は切断）。制御は JSON | 高頻度の msgpack。ゲームコードから `WebSocket` 直接参照 |
| ボイス | 理想に含む。ゲーム同期とは別系統 | ゲームデータに WebRTC DataChannel |

レートは `TYPE_SPECS`（[`protocol.md`](../../../docs/arch/protocol.md)）: fps シム60 / 入力60 / スナップ30。voxel 30 / 30 / 15。描画は可変 rAF。

`ws.send()` は **-1 バックプレッシャ / 0 ドロップ / 1+ バイト**。存在しない `bufferedAmount` に頼らない。`perMessageDeflate: false`。

PH1-C 以降の高頻度バイナリは **Channel 1B + payload**。Input payload は 16B のまま、WS frame は 17B。ブラウザ送信は payload view の 1B 前に余白を持たせ、transport が Channel を書くと payload コピーを避けられる。

## ツールチェーン（現行も同じ）

| 用途 | 技術 |
| :--- | :--- |
| ビルド/Dev | Vite（`bun run dev` / `build` / `preview`） |
| Lint | Biome（ESLint/Prettier 不使用） |
| Unit | Vitest。`bun test` は使わない。配置は `_tests_/` ミラー。Phase 1.5 では coverage を `vitest run --coverage` で導入する |
| Coverage | Vitest coverage。まず `@vitest/coverage-v8` + `provider: 'v8'` を候補にするが、Bun runtime 制約に当たる場合は停止して fallback を判断する |
| E2E | Playwright は Phase 1.5 で導入予定。Sandbox では browser 実行を捏造せず CI / 実環境検証待ちにする |
| パッケージ | bun。Sandbox では npm 経由で導入（下記） |

## 移行元コードで確認済み（フェーズ 0 で直す穴・残す資産）

> 描画（R3F / WebGPU / drei Sky）は破棄対象。ネット・バイナリ・ bun WS・テスト配置は移植する。

### bun / Vite / TS / Biome

- bun はプリインストールされない。`bun.sh` は SSL で到達不可。**npm registry 経由**（`restore-sandbox-env.sh`）。バージョンは devDependency で exact 固定。
- **TypeScript 7**: `baseUrl` 廃止。`paths` は相対（`"@/*": ["./src/*"]`）。
- **Biome 2**: `rules: { preset: "recommended" }`。`vcs.useIgnoreFile: true` で `files.includes` を書かない。import 制限は `linter.rules.style.noRestrictedImports`。scope package の深い subpath は `@cod/profile-fps/**` のように `**` で捕捉する（`*` は 1 階層だけ）。DOM global の `WebSocket` 直接参照禁止は import rule ではなく `linter.rules.style.noRestrictedGlobals` を使う。
- ESM の `vite.config.ts` では `__dirname` 未定義。`path.dirname(fileURLToPath(import.meta.url))`。
- ライブプレビュー（e2b.app）では `server.allowedHosts: true`（preview も）+ `host: true`。未設定は 403。
- **tsconfig は 2 構成**: `tsconfig.json`（client+shared、DOM）と `tsconfig.server.json`（server+shared、`types: ["bun"]`、DOM なし）。エイリアス `@/` `@shared/` `@server/` は tsconfig・vite・vitest の 3 箇所。
- テストは `_tests_/` にソース構造をミラー。ソース横に `*.test.ts` を置かない。shared/server はファイル先頭 `// @vitest-environment node`。
- jest-dom の型: `src/vite-env.d.ts` に `/// <reference types="@testing-library/jest-dom" />`、setup を tsconfig include に入れる。
- `bun run start`（`scripts/execute.ts`）: `vite build` 成功後に server :8080 と preview :4173 を並列。クライアントは `/ws` を同一オリジンで叩き、Vite proxy が bun へ中継。ブラウザから localhost 直叩きをしない。


### Coverage / Playwright（Phase 1.5）

- coverage は **baseline → meaningful tests → threshold ratchet** の順。PH1.5-A baseline は Statements 66.82% (725/1085), Branches 57.10% (225/394), Functions 64.43% (125/194), Lines 68.97% (696/1009)。PH1.5-B after は Statements 79.17% (859/1085), Branches 73.85% (291/394), Functions 79.38% (154/194), Lines 80.77% (815/1009)。threshold は statements 79 / branches 73 / functions 79 / lines 80 へ ratchet 済み。
- `coverage.include` は production source を明示する。PH1.5-A では package barrel、browser entrypoint、type-only transport、ambient d.ts だけを理由付き exclude。難しいファイルを除外して数字を作らない。
- meaningful tests は protocol 境界、Input 16B / Channel 1B、prediction/reconcile、interpolation、server backpressure / rate-limit、GameClient transport 経路を優先する。PH1.5-B では `WebSocketTransport` の mock WebSocket、`GameClient` の mock transport、`StartOverlay` の mock screenfull、`TouchControls` の mock nipplejs が有効だった。
- Playwright は `webServer` で `bun run start` を起動し、`baseURL` は Vite preview `http://127.0.0.1:4173` を基本にする。app code は `/ws` 相対 URL を維持し、browser-facing code が backend localhost を直叩きしない。
- `.github/workflows/` は書けない。CI YAML が必要なら `docs/ops/` に提案を置く。

### bun WebSocket（移植する）

- Bun WebSocket の `ws.data` 型付けは最新 docs では serve call の generic 型引数 ではなく、`websocket: { data: {} as SocketData, ... }` に置く。`server.upgrade(req, { data })` の data は本プロジェクトでは必須。
- **uWebSockets.js を追加しない**（bun 内部で uWS。別パッケージは動かない）。
- 入力は「最新 1 つ上書き」ではなく **playerId ごとの FIFO**。空 tick は重力のみ、yaw/pitch は維持。
- クライアント予測・送信は **wall-clock の setInterval**。rAF は描画サンプリングのみ（タブ非表示で rAF が止まる）。
- リモートエンティティは 1 フレーム欠測で消さない（grace）。補間の外挿はクランプ。

### 描画（破棄。新規に真似しない）

- PH1-D で apps/web の R3F scene / renderer / loop は削除済み。`GameCanvas.tsx` は `<canvas>` を置き、`BabylonGame` が `new Engine(canvas, false, options, false)` で命令型に所有する。PH1-F で `GameCanvas` は runtime factory seam を持ち、React lifecycle が imperative runtime の `start()` / `dispose()` を呼ぶだけであることを jsdom unit で検証できる。
- PH1-F 以降、低頻度 HUD 値は Zustand（renderer / connectionStatus）に置けるが、座標・回転・リモート player map は React state に入れず `GameClient` / Babylon mesh が直接持つ。`GameClient` は mock transport unit で Channel.Unreliable Input 16B 送信と Snapshot→`remotes` 公開を検証する。
- PH1-E で `InputController` は `requestPointerLock({ unadjustedMovement: true })` を first try し、Promise rejection の `NotSupportedError` 時だけ通常 `requestPointerLock()` へ fallback する。旧ブラウザが void を返す場合に備え、戻り値は Promise-like 判定して扱う。
- PH1-E 以降、`pointermove` / PointerLock 中の mouse movement はイベント中に yaw/pitch を直接変えず、delta を蓄積して `BabylonGame` render loop 先頭の `input.consumeLookDelta()` で消費する。
- `EngineOptions` は `@babylonjs/core@9.25.0` の installed `.d.ts` で `Engines/thinEngine.pure` から import できることを確認済み。`desynchronized` / `preserveDrawingBuffer` は PH1-D では渡していない。
- three-mesh-bvh は bun ヘッドレスで動く（server/profile-fps の衝突用に残す）。apps/web の 3D 描画へ Three / R3F / drei を戻さない。FPS マップ/voxel ワールドの official/UGC 階層とエディタは [`editor.md`](../../../docs/arch/editor.md)。

### Zustand（ハブ UI には残してよい）

- 毎フレーム値はストアに入れない。React 外は `getState()` / `subscribe`。フックをゲームループから呼ばない。

### PLAT-1R 公式 API 確認（2026-09-06）

- Bun workspaces は root `package.json` の `workspaces` 配列と workspace 側 `package.json`、内部依存の `workspace:*` で組む。最新 docs には catalog / self-contained workspaces もあるが、PH1-A では単純な workspaces だけ使う。
- Biome の import 制限は `linter.rules.style.noRestrictedImports`（diagnostic `lint/style/noRestrictedImports`）。recommended ではないため PH1-B で明示有効化する。
- Babylon `Engine` は `new Engine(canvasOrContext, antialias?, options?, adaptToDeviceRatio?)`。`setHardwareScalingLevel` は typedoc で確認済み。
- 2026-09-06 時点の Babylon typedoc `EngineOptions` 取得結果では `desynchronized` / `preserveDrawingBuffer` が property 一覧に出ていない。一方 Chrome は Canvas context attributes として両 key を公式に示す。PH1-D では installed `.d.ts` を見て、型に無い key を invent しない。
- `@babylonjs/core` npm latest は `type: module`, `types: index.d.ts`, license Apache-2.0。`@babylonjs/loaders` は GLB/glTF エディタ用候補。`noa-engine@0.33.0` は `@babylonjs/core ^6.1.0` peer のため、voxel 導入時に Babylon major を再確認する。

## API を記憶で書かない

Babylon / noa / Bun WS は公式ドキュメントを検索する（AGENTS.md §7.5）。存在しないメソッドを発明しない。

### DOC-5 official / UGC 階層（2026-09-06）

- Game Type は `fps` / `voxel` の 2 種類。`official` / `ugc` は type ではなく Content Source。URL は `/fps/official/pvp`, `/fps/ugc/athletic`, `/voxel/official/survival`, `/voxel/ugc/athletic` の形。
- FPS/voxel のエディタは Babylon.js。FPS エディタは GLB 読み込み対応。Babylon 公式は glTF loader に `@babylonjs/loaders` と module-level loader functions を推奨。
- voxel 公式は Minecraft 風 terrain generation を独自実装し、Noa 系（`noa-engine`, `voxel-physics-engine`, `ent-comp`, `micro-game-shell`, `game-inputs`, `nipplejs`）を候補として扱う。
