# 公式 API 確認メモ

> 最終確認: 2026-09-06（Asia/Tokyo）  
> 目的: `docs/arch/` と `docs/planning/` に散らばる外部 API 名・設定キーを、公式ドキュメントまたは一次情報に寄せるための索引。  
> 原則: この表に無い外部 API 名を実装時に足す場合は、公式ドキュメント・npm metadata・インストール済み `.d.ts` / schema で再確認する。

## Bun

| 領域 | 公式確認した内容 | 本プロジェクトでの扱い | 出典 |
|---|---|---|---|
| Workspaces | root `package.json` の `workspaces` に workspace path/glob を指定する。workspace 内依存は `workspace:*` 等で参照できる。Bun は catalog / self-contained workspaces も持つ。 | PH1-A では単純な `"workspaces": ["packages/*", "apps/*"]` を使う。catalog / self-contained は必要になった時だけ再確認して導入する。 | <https://bun.com/docs/pm/workspaces> |
| `Bun.serve` WebSocket | `websocket` handler は `open` / `message` / `close` / `drain` / `error`。`maxPayloadLength`, `idleTimeout`, `backpressureLimit`, `closeOnBackpressureLimit`, `sendPings`, `publishToSelf`, `perMessageDeflate` を設定できる。 | サーバは `idleTimeout: 30`, `maxPayloadLength: 64 * 1024`, `backpressureLimit: 1024 * 1024`, `closeOnBackpressureLimit: true`, `sendPings: true`, `perMessageDeflate: false` を明示する。 | <https://bun.com/docs/runtime/http/websockets> |
| `ServerWebSocket.send` | `.send(message, compress?)` は number を返す。`-1` は backpressure ありで enqueue、`0` は connection issue で dropped、`1+` は送信バイト数。`drain` で再開。 | Bun server 側は戻り値を見る。存在しない `bufferedAmount` に頼らない。 | <https://bun.com/docs/runtime/http/websockets#backpressure> |
| `ws.data` typing | 最新 Bun docs は serve call の generic 引数ではなく、`websocket` handler 内の `data: {} as MyData` で `ws.data` を型付けする例を示す。 | 新規コードは `websocket.data` に型を置く。過去メモの generic 型引数前提は使わない。 | <https://bun.com/docs/runtime/http/websockets#contextual-data> |
| HTTP/3 | Bun v1.3.14 の HTTP/3 は highly experimental。WebSocket over HTTP/3 は未対応、WebTransport は separate project。 | ADR-005 維持。フェーズ 0–8 は WebSocket のみ。 | <https://bun.com/blog/bun-v1.3.14> |

## Biome

| 領域 | 公式確認した内容 | 本プロジェクトでの扱い | 出典 |
|---|---|---|---|
| import 制限 | diagnostic category は `lint/style/noRestrictedImports`。設定は `linter.rules.style.noRestrictedImports`。recommended ではない。`paths` / `patterns` / `importNames` / `allowImportNames` を持つ。static import、re-export、dynamic import、`require()` を対象にできる。 | PH1-B は `style.noRestrictedImports` を明示有効化する。architecture 内の `noRestrictedImports` は意図名であり、実設定はこの path に置く。 | <https://biomejs.dev/linter/rules/no-restricted-imports/> |
| private import | diagnostic category は `lint/correctness/noPrivateImports`。recommended。`@public` / `@package` / `@private` / `@access` を認識するが、dynamic import と `require()` は対象外。 | package 内 public/private 境界の補助に使える。workspace 間の import 制限は `noRestrictedImports` を主に使う。 | <https://biomejs.dev/linter/rules/no-private-imports/> |

## Babylon / Canvas / Pointer Lock

| 領域 | 公式確認した内容 | 本プロジェクトでの扱い | 出典 |
|---|---|---|---|
| `Engine` | constructor は `new Engine(canvasOrContext, antialias?, options?: EngineOptions, adaptToDeviceRatio?)`。 | PH1-D は公式 constructor を使う。`createEngine()` はプロジェクト内 wrapper 名としてのみ使う。 | <https://doc.babylonjs.com/typedoc/classes/BABYLON.Engine> |
| `EngineOptions` | `stencil`, `failIfMajorPerformanceCaveat`, `premultipliedAlpha`, `useHighPrecisionFloats`, `useHighPrecisionMatrix`, `useLargeWorldRendering`, `xrCompatible` 等が typedoc にある。2026-09-06 取得結果では `desynchronized` / `preserveDrawingBuffer` は property 一覧に無い。 | `desynchronized` / `preserveDrawingBuffer` は Canvas/WebGL context attributes として扱う。Babylon に渡す場合は、導入した `@babylonjs/core` の `.d.ts` が許す key だけを使う。型に無い key を invent しない。 | <https://doc.babylonjs.com/typedoc/interfaces/BABYLON.EngineOptions> |
| 解像度 | `Engine#setHardwareScalingLevel(level: number): void` がある。 | `resolutionScale` を使う場合は `engine.setHardwareScalingLevel(1 / resolutionScale)` の形を基本にする。 | <https://doc.babylonjs.com/typedoc/classes/BABYLON.Engine#sethardwarescalinglevel> |
| Scene/Mesh/Material 最適化 | `Mesh#freezeWorldMatrix`, `Mesh#thinInstanceSetBuffer`, `Mesh#doNotSyncBoundingInfo`, `Material#freeze` は typedoc で確認済み。 | 静的 mesh/material と thin instances のみに使う。動的変更が必要なものへ無条件に適用しない。 | <https://doc.babylonjs.com/typedoc/classes/BABYLON.Mesh> / <https://doc.babylonjs.com/typedoc/classes/babylon.material> |
| Canvas `desynchronized` | `canvas.getContext('webgl', { desynchronized: true, preserveDrawingBuffer: true })` の例があり、`getContextAttributes().desynchronized` で feature detection する。 | 低遅延 canvas の意図は維持。ただし Babylon の public API / 型で渡せない場合は停止して確認する。private field へ依存しない。 | <https://developer.chrome.com/blog/desynchronized> |
| Pointer Lock | `requestPointerLock(options?)` と `PointerLockOptions.unadjustedMovement` がある。`unadjustedMovement` は OS-level mouse acceleration を無効化する raw mouse input 用 optional boolean。 | PH1-E はユーザー操作から `requestPointerLock({ unadjustedMovement: true })` を試し、失敗時は通常 pointer lock へフォールバックする。 | <https://developer.mozilla.org/en-US/docs/Web/API/Element/requestPointerLock> / <https://w3c.github.io/pointerlock/> |
| `@babylonjs/core` npm | 2026-09-06 確認の latest は `9.25.0`。Apache-2.0、ESM (`type: module`)、`types: index.d.ts`、dependencies / peerDependencies は latest metadata 上 null。 | 実装時の導入バージョンは計画と lockfile で明示する。Noa との peer 範囲も確認する。 | <https://registry.npmjs.org/@babylonjs/core/latest> |
| glTF / GLB loading | Babylon 公式は `.glTF File Loader Plugin` を `@babylonjs/loaders` ES6 NPM package で使うことを推奨。`SceneLoader` class typedoc は deprecated とし、tree shaking と plugin options のため module-level functions（`LoadAssetContainerAsync`, `ImportMeshAsync` 等）を推奨。production では Babylon public CDN ではなく自前配信を推奨。`@babylonjs/loaders` npm latest は 2026-09-06 確認で `9.25.0`、Apache-2.0、peerDependencies は `@babylonjs/core: ^9.0.0` と `babylonjs-gltf2interface: ^9.0.0`。 | FPS/voxel エディタの GLB 読み込みは `@babylonjs/loaders` と module-level loader functions を前提にする。Draco/Meshopt/KTX2 decoder は自前配信または resource injection を検討する。 | <https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF> / <https://doc.babylonjs.com/typedoc/classes/BABYLON.SceneLoader> / <https://registry.npmjs.org/@babylonjs/loaders/latest> |

## Noa / voxel physics / UGC

| 領域 | 公式確認した内容 | 本プロジェクトでの扱い | 出典 |
|---|---|---|---|
| `noa-engine` npm | latest は `0.33.0`。license MIT。`typings: dist/src/index.d.ts`。peerDependencies は `@babylonjs/core: ^6.1.0`。 | voxel フェーズで Babylon major を決める時に peer 範囲を再確認する。PH1 の fps Babylon 導入と混ぜない。 | <https://registry.npmjs.org/noa-engine/latest> |
| Noa options | v0.30.0 で `tickRate` は ticks/sec、`maxRenderRate` が追加。v0.29.0 で `manuallyControlChunkLoading` と `manuallyLoadChunk` / `manuallyUnloadChunk` が追加。最大 voxel ID は 65535。v0.33.0 で `Engine` named export、camera/input 変更などがある。 | `tickRate` を ms/tick として扱わない。サーバ権威のため voxel では `manuallyControlChunkLoading: true` を前提に、導入時は latest history と `.d.ts` を再確認する。 | <https://raw.githubusercontent.com/fenomas/noa/master/docs/history.md> |
| `voxel-physics-engine` npm | latest は `0.13.0`。license MIT。`types: dist/src/index.d.ts`。dependencies に `aabb-3d`, `gl-vec3`, `voxel-aabb-sweep` 等。 | サーバで同一コードを動かす方針は維持。導入時に actual API は `.d.ts` で確認する。 | <https://registry.npmjs.org/voxel-physics-engine/latest> |
| `ent-comp` npm | latest は `0.11.0`。license MIT。 | `legal.md` の「要確認」を MIT に更新済み。 | <https://registry.npmjs.org/ent-comp/latest> |
| `micro-game-shell` npm | latest は `0.9.0`。license ISC。説明は tick/render events と pointerLock/fullscreen/resize 管理。 | Noa 系の loop / pointerLock 挙動を理解するための依存。プロジェクト main loop と競合しないか導入時に確認する。 | <https://registry.npmjs.org/micro-game-shell/latest> |
| `game-inputs` npm | latest は `0.8.0`。license ISC。key/mouse events 抽象。 | 入力候補。既存の pointer lock + mousemove 累積方針と競合しない範囲で採用する。 | <https://registry.npmjs.org/game-inputs/latest> |
| `nipplejs` npm | latest は `1.0.4`。license MIT。説明は touch capable interfaces 向け virtual joystick。types/module/exports あり。 | モバイル仮想スティック候補。タッチ対応は後続フェーズで導入する。 | <https://registry.npmjs.org/nipplejs/latest> |
| QuickJS sandbox | `@sebastianwessel/quickjs` は JSR latest `3.1.0`、license MIT。JSR metadata は Node.js / Bun 対応、Browsers / Deno / Cloudflare Workers は unknown と表示。 | UGC は Bun/Node サーバ側 sandbox 前提。ブラウザ実行前提にしない。 | <https://jsr.io/@sebastianwessel/quickjs> |
| Noa cloned source | DR-4 で `fenomas/noa` を clone 再確認。HEAD `bd74cd8add3abf216b53a995139276af665b1d52`、MIT。`Engine` は `Container` / `Inputs` / `Registry` / `World` / `Rendering` / `Physics` / `Entities` / `Camera` を束ね、default `tickRate: 30`, `maxRenderRate: 0`, `originRebaseDistance: 25`。`World` default `chunkSize: 24` だが `manuallyControlChunkLoading` と `manuallyLoadChunk` / `manuallyUnloadChunk` がある。 | cod-web voxel client は `chunkSize: 16` を明示し、server chunk stream と `manuallyControlChunkLoading: true` を前提にする。Noa local/global coord は adapter 内に閉じる。 | [`DR-4`](../research/DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md) |
| voxel physics cloned source | DR-4 で `fenomas/voxel-physics-engine` を clone 再確認。HEAD `53685b1219eba404fbf7ad35216f8c593ed0db41`、MIT。`Physics.tick(dt)` は ms を内部で seconds に変換。collision は body vs solid voxel terrain のみで、body-body / non-cubic voxel は非対応。 | `dtMs` は ms として渡す。player-player collision なし、slab/stair は AABB 近似または別 table。determinism は許容誤差補正で扱う。 | [`DR-4`](../research/DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md) |
| Noa support libs cloned source | DR-4 で `ent-comp` HEAD `ad16110528a5ad44bedbf66c1dfbdc1aba5e6778`（package/README MIT、license file なし）、`micro-game-shell` HEAD `fce4465e871944b4bc296aae0dc7e20092959ebf`（package/README ISC、license file なし）、`game-inputs` HEAD `1bcdfd60ee09a6c492a91981f3e6d01c28f7608a`（package/README ISC、license file なし）を確認。 | Noa loop/input を理解するための source。採用時は npm package license と bundled notice を再確認し、main loop/input ownership を cod-web 側で明示する。 | [`DR-4`](../research/DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md) |
| `nipplejs` cloned source | DR-4 で `yoannmoinet/nipplejs` を clone 確認。HEAD `ea425b3e81deaed14e384a2edcfbbd6a9a50f45b`、MIT。`mode: dynamic|semi|static`、`dataOnly`、`follow`、`baseDelta`、`reposition()`、`dynamicPage` の performance caveat、events / types を確認。 | モバイル仮想スティックは HUD layer で導入候補。初期は static left stick、必要なら right aim stick。layout 変更は `reposition()`、`dynamicPage` は最後の手段。 | [`DR-4`](../research/DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md) |
| QuickJS cloned source | DR-4 で `sebastianwessel/quickjs` を clone 確認。HEAD `25e5ed6ab75c212fff21935599afc3eb41439e6d`、MIT。`executionTimeout`, `memoryLimit`, `maxStackSize`, `allowFs`, `allowFetch`, `env`, `dangerousSync`, timer limit を確認。 | UGC runtime は `allowFs:false`, `allowFetch:false`, `dangerousSync` 禁止、timer なし/最小、`ctx` だけ expose。timeout/OOM 後は context を破棄する。 | [`DR-4`](../research/DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md) |
| glTF toolchain cloned source | DR-4 で `KhronosGroup/glTF-Validator` HEAD `434283be08a668a8fb4e437145630ddbf93b0686`（Apache-2.0, NOTICES あり）と `donmccurdy/glTF-Transform` HEAD `01cad7b8e516b334bb2ac3e7e662231ba017352b`（MIT）を確認。Validator は GLBv2/schema/buffer/accessor/image/extensions を report し error で non-zero、glTF Transform は Node/Web/Deno SDK と CLI optimization を提供。 | GLB upload gate は Validator report を保存し、error reject / warning moderation。transform chain は reproducible recipe と original/optimized hash を保存する。 | [`DR-4`](../research/DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md) |

## マッチメイキング参考

| 領域 | 公式確認した内容 | 本プロジェクトでの扱い | 出典 |
|---|---|---|---|
| Colyseus Room | Room は connected clients と shared state/messages を持つ単位。 | 概念参考のみ。Colyseus を依存として導入する計画ではない。 | <https://docs.colyseus.io/room> |
| Colyseus Matchmaking | SDK の join は matchmaker を通り、matchmaker が room を選び、seat reservation を返す。`filterBy`, `sortBy`, realtime listing, server-side `matchMaker` API などがある。 | 座席予約の思想のみ参考。実装は本プロジェクト独自の HMAC ticket + Redis。 | <https://docs.colyseus.io/matchmaker> |
