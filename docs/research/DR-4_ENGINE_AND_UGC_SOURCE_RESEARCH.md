# DR-4 Engine / UGC / Asset Pipeline Deep Research

> task-list ID: `DR-4`  
> 実施日: 2026-09-06（Asia/Tokyo）  
> 変更種別: docs-only research  
> ユーザー指示: 「現状と計画を確認してからディープリサーチ」  
> 実施境界: 公開 docs / npm metadata / lawful public GitHub clone のみ。live service 接続解析・通信キャプチャ・production bundle / minified client 解析・競合 code / asset / UI / trademark 流用なし。

## 1. 開始前確認

今回の deep research は、DR-1〜DR-3 の続きとして新規 ID `DR-4` で扱う。既存 ID は再利用しない。

開始前に次を全体確認した。

| 確認対象 | 結果 |
|---|---|
| `git status --short` | clean |
| `git branch --show-current` | `arena/01a0748a-cod-web` |
| `git log -5 --oneline` | HEAD `a09a374 docs(DR-3): add deeper competitor research` |
| `AGENTS.md` / `.agent/hooks/pre-task.md` | 適用ルール再確認 |
| `docs/task-list.md` | Phase 1 次タスクは `PH1-A`。ただし今回は追加 research のため実装しない |
| `docs/planning/DEEP_RESEARCH_PLAN.md` | DR-1/2/3 まで完了。追加 deep research は `DR-4` として追記 |
| `docs/research/DR-3_DEEPER_COMPETITOR_RESEARCH.md` / `docs/research/README.md` | DR-3 成果と index を確認 |
| `.agent/skills/index.md` | 調査専用 skill はなし。既存 `docs/arch` と research を正本/参照元にする |

## 2. 今回の狙い

DR-1〜DR-3 は主に Krunker / bloxd の公開 API、ToS、texture pack、netcode を掘った。DR-4 では、今後の `voxel` / `ugc` / `editor` 実装に直接効く周辺 OSS と標準ツールを深掘りする。

| 領域 | 調査対象 | 知りたいこと |
|---|---|---|
| Voxel engine | `noa-engine`, `voxel-physics-engine`, `ent-comp`, `micro-game-shell`, `game-inputs` | Noa 系を server-authoritative cod-web に載せる時の API 境界、tick/chunk/physics/input の注意点 |
| Mobile input | `nipplejs` | `fps` / `voxel` の仮想スティック実装で使うべき option / event / performance caveat |
| UGC sandbox | `@sebastianwessel/quickjs` | Bun サーバ側 sandbox の resource limit、capability gate、禁止 option |
| Asset pipeline | Khronos glTF / glTF-Validator / glTF Transform | GLB import、検証、最適化、collision mesh 分離、ローカル処理方針 |

## 3. Web deep search / fetch で確認した公開情報

`web_search` はユーザー補正どおり `depth: "3"` のみ使用した。

| Source | 確認した内容 | cod-web への示唆 |
|---|---|---|
| `https://www.npmjs.com/package/voxel-physics-engine` / `https://registry.npmjs.org/voxel-physics-engine/latest` | `0.13.0`, MIT, `types: dist/src/index.d.ts`, `tick(dt_in_milliseconds)`, AABB body と solid/liquid voxel getter。body-body / non-cubic voxel collision なし | サーバ側 voxel 物理候補として妥当。ただし player-player 衝突や非立方ブロックは別実装/近似が必要 |
| `https://registry.npmjs.org/ent-comp/latest` | `0.11.0`, MIT, no dependencies。component order / state list / accessor API | Noa と同じ ECS 構造を理解する用途。server core は独自 ECS にしても、Noa client adapter は component order を尊重 |
| `https://registry.npmjs.org/micro-game-shell/latest` | `0.9.0`, ISC。tick/render events と pointerLock/fullscreen/resize 管理 | Noa の内部 loop 依存。cod-web main loop と二重管理にならないよう、Noa 導入時は ownership を明示 |
| `https://registry.npmjs.org/game-inputs/latest` | `0.8.0`, ISC。KeyboardEvent.code / PointerEvent / pointerState / pressCount / releaseCount | 入力ライブラリとして使う場合も、cod-web の「フレーム先頭で mouse delta 消費」規則と競合させない |
| `https://registry.npmjs.org/nipplejs/latest` | `1.0.4`, MIT, ESM/CJS/types, deps 0, SLSA provenance。`dataOnly`, `mode`, `multitouch`, `follow`, `dynamicPage` など | モバイル仮想スティック候補として強い。HUD レイヤで `dataOnly` または static/semi を使い、move event を Input 量子化へ変換 |
| `https://jsr.io/@sebastianwessel/quickjs` | `3.1.0`, MIT, Node.js / Bun 対応、Browsers / Deno / Cloudflare Workers は unknown。WASM QuickJS sandbox | UGC はサーバ側に限定する既存方針を維持。browser sandbox 前提にしない |
| `https://sebastianwessel.github.io/quickjs/docs/runtime-options.html` | `executionTimeout`, `maxStackSize`, `memoryLimit`, `allowFs`, `allowFetch`, `fetchAdapter`, `env`, `dangerousSync`, timer limit, TS transform | UGC では `allowFs:false`, `allowFetch:false`, `dangerousSync` 禁止、timer count 0〜最小、`ctx` のみ expose が安全 |
| `https://www.khronos.org/gltf/` | glTF は royalty-free で runtime transmission/loading 用。glTF 2.0 は ISO/IEC 12113:2022。official Validator / Sample Viewer / Asset Auditor / Texture Compressor がある | FPS/voxel editor の GLB import は glTF 2.0 を一次形式にし、Validator report を upload gate にする |
| `https://github.com/KhronosGroup/glTF-Validator` | glTF 2.0 / GLBv2 validation、JSON schema、binary accessor、image、extension validation、CLI は non-zero on error | CI / upload pipeline で validation report JSON を保存し、error は reject、warning は moderation queue へ回す |
| `https://github.com/donmccurdy/glTF-Transform` | JS/TS SDK。Node/Web/Deno IO、`prune`, `dedup`, `draco`, `meshopt`, `resize`, `webp`, `uastc`, `etc1s` など | エディタ/asset pipeline は reproducible transform chain を記録し、render.glb と collision.glb を分離して処理 |

## 4. GitHub clone 監査

GitHub コード確認は Web UI/snippet ではなく clone 済み checkout で確認した。下表の「読んだファイル」以外の内容は根拠にしていない。

| Repo | Clone path | Remote / HEAD | License | 読んだファイル |
|---|---|---|---|---|
| `fenomas/noa` | `/tmp/cod-web-research/noa` | `https://github.com/fenomas/noa.git` / `bd74cd8add3abf216b53a995139276af665b1d52` | `LICENSE.txt` MIT | `README.md`, `package.json`, `LICENSE.txt`, `docs/components.md`, `docs/positions.md`, `docs/history.md`, `src/index.js`, `src/lib/world.js`, `src/lib/physics.js`, `src/lib/registry.js`, `src/lib/container.js`, `src/lib/camera.js` |
| `fenomas/voxel-physics-engine` | `/tmp/cod-web-research/voxel-physics-engine` | `https://github.com/fenomas/voxel-physics-engine.git` / `53685b1219eba404fbf7ad35216f8c593ed0db41` | `LICENSE` MIT | `README.md`, `package.json`, `LICENSE`, `src/index.js`, `src/rigidBody.js` |
| `fenomas/ent-comp` | `/tmp/cod-web-research/ent-comp` | `https://github.com/fenomas/ent-comp.git` / `ad16110528a5ad44bedbf66c1dfbdc1aba5e6778` | license file not found。`package.json` / `README.md` は MIT と記載 | `README.md`, `package.json`, `api.md`, `src/ECS.js` |
| `fenomas/micro-game-shell` | `/tmp/cod-web-research/micro-game-shell` | `https://github.com/fenomas/micro-game-shell.git` / `fce4465e871944b4bc296aae0dc7e20092959ebf` | license file not found。`package.json` / `README.md` は ISC と記載 | `README.md`, `package.json`, `src/micro-game-shell.js` |
| `fenomas/game-inputs` | `/tmp/cod-web-research/game-inputs` | `https://github.com/fenomas/game-inputs.git` / `1bcdfd60ee09a6c492a91981f3e6d01c28f7608a` | license file not found。`package.json` / `README.md` は ISC と記載 | `README.md`, `package.json`, `src/inputs.js` |
| `yoannmoinet/nipplejs` | `/tmp/cod-web-research/nipplejs` | `https://github.com/yoannmoinet/nipplejs.git` / `ea425b3e81deaed14e384a2edcfbbd6a9a50f45b` | `LICENSE` MIT | `README.md`, `LICENSE`, `packages/nipplejs/package.json`, `packages/docs/src/pages/options.mdx`, `packages/docs/src/pages/events.mdx`, `packages/docs/src/pages/api.mdx`, `packages/nipplejs/src/types.ts` |
| `sebastianwessel/quickjs` | `/tmp/cod-web-research/quickjs` | `https://github.com/sebastianwessel/quickjs.git` / `25e5ed6ab75c212fff21935599afc3eb41439e6d` | `LICENSE` MIT | `README.md`, `package.json`, `LICENSE`, `website/docs/runtime-options.md`, `src/types/SandboxOptions.ts`, `src/types/RuntimeOptions.ts`, `src/loadQuickJs.ts`, `src/sandbox/syncVersion/createEvalCodeFunction.ts`, `src/sandbox/provide/provideFs.ts`, `src/test/sync/core-timeout.test.ts` |
| `KhronosGroup/glTF-Validator` | `/tmp/cod-web-research/glTF-Validator` | `https://github.com/KhronosGroup/glTF-Validator.git` / `434283be08a668a8fb4e437145630ddbf93b0686` | `LICENSE` Apache-2.0、`NOTICES` あり | `README.md`, `LICENSE`, `NOTICES` |
| `donmccurdy/glTF-Transform` | `/tmp/cod-web-research/glTF-Transform` | `https://github.com/donmccurdy/glTF-Transform.git` / `01cad7b8e516b334bb2ac3e7e662231ba017352b` | `LICENSE.md` MIT | `README.md`, `LICENSE.md`, `packages/cli/README.md` |

## 5. Noa 系 engine の実装境界

### 5.1 Noa は client voxel renderer / client-side physics convenience として扱う

Noa の `Engine` は `Container`, `Inputs`, `Registry`, `World`, `Rendering`, `Physics`, `Entities`, `Camera` を内部で束ねる。constructor default は `tickRate: 30`, `maxRenderRate: 0`, `blockTestDistance: 10`, `stickyPointerLock: true`, `originRebaseDistance: 25` などだった。

cod-web は server-authoritative なので、Noa を「ゲーム全体の権威 loop」にしない。Noa は `voxel` client の chunk display / local feel / pick helper として扱い、authoritative state は server snapshot / chunk stream を正本にする。

### 5.2 chunk sync は `manuallyControlChunkLoading` が必須

Noa `World` には `worldDataNeeded(requestID, dataArr, x, y, z, worldName)` event と `setChunkData(id, array, userData, fillVoxelID)` がある。`manuallyControlChunkLoading` を有効にすると自動 add/remove を止め、`manuallyLoadChunk` / `manuallyUnloadChunk` を client が呼ぶ。

cod-web では client が勝手に worldgen しないため、次を守る。

- server の AOI / chunk stream を受けた chunk だけ `manuallyLoadChunk` する
- `worldDataNeeded` には server-delivered chunk data を詰め、足りない chunk は air placeholder としても gameplay 権威には使わない
- `setChunkData(..., fillVoxelID)` は全 air / 全 stone 等の bandwidth optimization として有効。ただし server 正本の chunk hash と一致させる
- `chunkSize` は Noa default 24 だが cod-web protocol は 16³ 前提。Noa instance は必ず `chunkSize: 16` を明示する

### 5.3 world origin rebasing は protocol 座標と分離する

Noa は大規模 world の精度対策として `worldOriginOffset` と local/global conversion を使う。`positions.md` は、rendering / physics / raycasting / entity collision が local frame で動くと説明している。

cod-web protocol は global block/entity coordinate を正本にし、Noa local coordinate は client adapter の内部だけに閉じる。server snapshot の位置を Noa entity へ反映する時は `globalToLocal` / `localToGlobal` の扱いを adapter に集約し、game mode から Noa internal `_local*` API を直接触らせない。

### 5.4 component order は camera / physics / mesh の見え方に効く

`docs/components.md` では system order が `receivesInputs` 20 → `movement` 30 → `physics` 40 → `followsEntity` 50 → `position` 60 → `collideEntities` 70、render system が `physics` 40 → `followsEntity` 50 → `shadow` 80 → `mesh` 100 だった。

remote entity interpolation を Noa entity に載せる場合、`mesh` の前に renderPosition を更新する必要がある。安易に Noa の `movement` / `receivesInputs` を remote entity へ付けない。

## 6. voxel-physics-engine の採用条件

`voxel-physics-engine` は `Physics(opts, testSolid, testFluid)` に solid/liquid getter を渡し、`addBody(aabb, mass, friction, restitution, gravMult, onCollide)` で AABB body を作り、`tick(dt)` で進める。`dt` は ms を受けて内部で seconds に変換する。

確認した制約:

- collision は body vs solid voxel terrain のみ
- body-body collision は扱わない
- non-cubic voxel は扱わない
- fluid は body bottom corner 付近から単純に submerged ratio を見る実装
- integration は semi-implicit Euler
- `resting[axis]` で地面/天井/壁接触を見られる
- `autoStep` は one-block obstruction の乗り越えを試す
- `mass <= 0` は static body 扱い

cod-web への扱い:

| 採用 | 理由 |
|---|---|
| server/client 同一コードで voxel player movement の候補 | Babylon 非依存で、solid/liquid getter を差し替えられる |
| `dtMs` 入力は ms で渡す | README/source とも `tick(dt_in_milliseconds)` / `dt = dt / 1000` |
| player-player collision は当面なし | engine 制約と ADR-007 に一致 |
| slabs/stairs/fences は AABB 近似または別 collision table | non-cubic voxel 非対応のため |
| determinism は bit exact ではなく許容誤差補正 | floating integration であり replay/reconciliation 前提 |

## 7. input stack の使い分け

### 7.1 game-inputs

`game-inputs` は `KeyboardEvent.code` strings（例 `KeyA`, `ArrowLeft`）で bind し、`state`, `pressCount`, `releaseCount`, `pointerState.dx/dy/scroll*` を提供する。pointer movement は累積され、`tick()` でゼロ化される。

cod-web では既に「mousemove ではカメラを動かさず累積し、フレーム先頭で消費」方針がある。Noa 経由で `game-inputs` を使う場合も、zero timing を `render()` 後に任せると protocol input sampling とズレる。PH1/PH7 では cod-web の input accumulator を正本にし、Noa inputs は必要なら disable / bridge にする。

### 7.2 micro-game-shell

`micro-game-shell` は fixed tick と render を分け、`tickRate`, `maxRenderRate`, `maxTickTime` を持つ。behind schedule 時は `maxTickTime` を超える pending tick を捨てて catch-up する。

Noa 内部で使われるため、cod-web 側でさらに別 fixed-loop を持つと二重 tick になりやすい。Voxel client adapter は次のどちらかに決める必要がある。

1. Noa loop を描画/ローカル物理に使い、network snapshot application は Noa tick boundary に寄せる
2. Noa は render/chunk helper として使い、cod-web loop から明示 tick する設計に寄せる

現時点では 1 が安全。server tick は別物として扱う。

### 7.3 nipplejs

`nipplejs@1.0.4` は TypeScript-first、deps 0、MIT。`mode` は `dynamic` / `semi` / `static`。`static` / `semi` は multitouch 不可、`dynamic` は multitouch 可。`dataOnly` で DOM を作らず event data だけ使える。`dynamicPage` は毎 move で position recalculation するため performance cost があり、通常は `ResizeObserver` + `manager.reposition()` が推奨。

cod-web mobile input 推奨:

| 用途 | 推奨 |
|---|---|
| 左移動 stick | `mode: "static"`, fixed HUD zone, `lockX/Y:false`, move event の `vector` / `force` を `moveX/moveZ` へ量子化 |
| 右視点/aim stick | `mode: "static"` または `dynamic`, `follow:true` は慎重に試験。`baseDelta` を camera pan に使える |
| 独自 HUD 描画 | `dataOnly:true` |
| layout 変更 | `manager.reposition()`。`dynamicPage:true` は最後の手段 |
| multi-touch | separate zones か `dynamic + multitouch`。static/semi に multi-touch 期待を置かない |

## 8. UGC sandbox 深掘り

`@sebastianwessel/quickjs` は Bun 対応の WASM QuickJS sandbox。`loadQuickJs(variant)` 後、`runSandboxed(fn, options)` が毎回 `module.newContext()` を作り、`Scope` dispose で片付ける。`executionTimeout` は interrupt handler と Promise.race の両方で扱われ、timeout regression test も存在した。

重要 option:

| Option | 意味 | cod-web UGC での扱い |
|---|---|---|
| `executionTimeout` | 最大実行時間 ms | `onTick` 8ms 方針と合わせる。ただし host overhead を含む余裕を別計測 |
| `memoryLimit` | QuickJS runtime allocation limit | 32MB 上限方針を維持。OOM 後は context 再利用せず破棄 |
| `maxStackSize` | stack limit | recursion abuse 対策として必須 |
| `allowFs` | `node:fs` を expose | UGC では false 固定 |
| `allowFetch` / `fetchAdapter` | fetch を expose | UGC では false 固定。外部 HTTP capability は別 moderation 後まで禁止 |
| `env` | guest global `env` | 使わない。必要な値は readonly `ctx` API として bridge |
| `dangerousSync` | host/guest mutable sync | 禁止 |
| `maxTimeoutCount` / `maxIntervalCount` | timer abuse 対策 | import/async/Promise 禁止方針なら 0 または timer 未提供が望ましい |
| `transformTypescript` | mounted TS transpile | runtime submission では使わない。editor 側 build step へ分離 |

`provideFs.ts` では disabled filesystem 関数も `File access is disabled` を投げる形で `__fs` を expose する。UGC 仕様では `import` を禁止しているため `node:fs` module に到達しない前提だが、defense-in-depth として `allowFs:false` は必須。

### UGC への具体反映

- `ctx` だけを expose し、`env`, `fetch`, `fs`, `dangerousSync`, host object reference を出さない
- UGC script は build/validation 時点で `import`, `async`, `Promise`, timer API を静的拒否
- 実行単位は「room script context per room」だが、fatal timeout / OOM / uncaught repeated error 時は room script を disabled にして context を破棄
- `console` は直接出さず、既存方針どおり `ctx.log` に集約し rate limit / moderation 可能にする
- host callback は plain JSON value だけを受け渡し、object reference / function reference を guest に保持させない

## 9. GLB / glTF asset pipeline

Khronos glTF は royalty-free な runtime 3D asset delivery format。glTF 2.0 は ISO/IEC 12113:2022。official resources として Validator / Sample Viewer / Asset Auditor / Texture Compressor がある。

### 9.1 upload gate

FPS/voxel editor の GLB import は次の順を推奨する。

1. upload された `render.glb` / `collision.glb` を保存前に content hash する
2. Khronos glTF-Validator で GLBv2 / schema / buffers / accessors / images / extensions を検証
3. error は reject。warning は report とともに moderation / optimization queue へ
4. `render.glb` は glTF Transform で `prune` / `dedup` / texture resize/compress / mesh compression を candidate として生成
5. `collision.glb` は visual material / texture を捨て、triangle count / bounds / scale / node names を独自検証
6. `meta.json` に original hash、optimized hash、validator report hash、transform recipe、bounds、spawn/zone/killVolume を記録

### 9.2 transform chain の注意

`glTF Transform` は `optimize` 一発でも使えるが、`prune` / `dedup` / `draco` / `meshopt` / texture compression をまとめて行うほど、編集用 marker や参照前提の scene structure への影響を個別に検証しにくくなる。cod-web editor では spawn/zone/collision marker を node name で参照する可能性があるため、最初から次を区別する。

| Asset | 方針 |
|---|---|
| `render.glb` | visual optimization 可。ただし marker node を使う場合は transform 後に再検証 |
| `collision.glb` | compression より determinism / simple geometry 優先。node order/name に依存しない `meta.json` 化 |
| UGC texture/model | rights metadata と moderation state を必須化 |
| runtime decode | Draco / Meshopt / KTX2 decoder を自前配信し、CDN runtime fetch に依存しない |

## 10. 採用候補 / 不採用 / 要確認

### 採用候補

- Noa `chunkSize: 16` + `manuallyControlChunkLoading: true` + server chunk stream bridge
- `voxel-physics-engine` を server/client shared voxel movement に試験導入
- `nipplejs` を mobile HUD layer に導入。最初は `static` left stick + optional right aim stick
- QuickJS sandbox は Bun サーバ側。`allowFs:false`, `allowFetch:false`, `dangerousSync` 禁止を仕様化
- GLB upload gate に Khronos glTF-Validator report を保存
- glTF Transform は reproducible pipeline として `prune` / `dedup` / texture resize/compress を段階導入

### 不採用 / 使わない

- Noa の worldgen を client authority として使うこと
- Noa / game-inputs の input state を protocol input の正本にすること
- `voxel-physics-engine` に player-player collision や non-cubic voxel collision を期待すること
- QuickJS `allowFetch`, `allowFs`, `dangerousSync`, arbitrary `env` exposure
- live service 解析、競合 asset / code / UI / trademark 流用

### 要確認

- Noa `0.33.0` と Babylon `9.x` の peer mismatch の実害。導入フェーズで lockfile / bundler / runtime smoke test が必要
- Noa loop ownership。cod-web client loop と Noa `micro-game-shell` をどう統合するか
- QuickJS timeout / memory limit の実測 overhead。8ms onTick 制限を満たせるか
- glTF Transform の `optimize` が marker / node names / material semantics を変える範囲
- mobile aiming の `nipplejs follow:true` が FPS 操作に合うか

## 11. 仕様への反映提案

今回の research により、既存 `docs/arch` の方向性は大きく変更不要。ただし後続実装前に次を正本へ反映する価値がある。

| 反映先 | 提案 |
|---|---|
| `docs/arch/sim-profiles.md` | Noa `chunkSize: 16` / `manuallyControlChunkLoading: true` / protocol-global vs Noa-local coordinate adapter を明記 |
| `docs/arch/ugc.md` | QuickJS options の禁止/固定方針（`allowFs:false`, `allowFetch:false`, `dangerousSync` 禁止、timer なし）を追記 |
| `docs/arch/editor.md` | GLB upload gate に glTF-Validator report / transform recipe / original & optimized hash を追加 |
| `docs/arch/api-sources.md` | Noa/voxel physics/nipplejs/QuickJS/glTF の詳細 API source と clone SHA を追加 |

本コミットでは docs-only research として、DR-4 本文・index・task/plan・API source memo の範囲に留める。
