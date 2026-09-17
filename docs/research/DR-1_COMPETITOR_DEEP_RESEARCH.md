# DR-1: Krunker.io / bloxd.io Deep Research

> Date: 2026-09-06(JST)
> 対応計画: [`../planning/complete/DEEP_RESEARCH_PLAN.md`](../planning/complete/DEEP_RESEARCH_PLAN.md)
> 状態: 完了
> 重要: 本調査では live service への接続解析、通信キャプチャ、production bundle 解析、アセット/コード流用を行っていない。

## 1. 調査方針と制約

| 項目 | 実施内容 |
|---|---|
| 安全境界 | 公開ドキュメント、公開 GitHub repository の clone、npm/package metadata、公式/準公式の公開 README のみを根拠にした |
| 実施しなかったこと | Krunker / bloxd の live WebSocket traffic 解析、production bundle 解析、minified client 解析、実サービスへの負荷を伴う調査 |
| GitHub code | GitHub Web UI の断片だけで判断せず、関連 repo は `/tmp/cod-web-research` へ `git clone --depth 1` し、remote / HEAD / 読んだファイルを記録した |
| 仕様反映 | 調査結果は設計への「提案」とし、競合の固有コード・独自数値・アセットは採用しない |

## 2. Executive Summary

| 対象 | 確認できたこと | 確認できなかったこと | cod-web への示唆 |
|---|---|---|---|
| Krunker.io | KrunkScript は client/server script を分ける。UGC 向け `GAME.NETWORK` は message id + object data の send/broadcast と rate/size limit を公開。Editor は 3D object placement、custom assets、script editor、live preview を公開 docs で説明している | 本体の private network protocol、transport、snapshot format、tick/snapshot rate、renderer 実装詳細は公開 docs だけでは断定不可 | cod-web は private protocol を模倣しない。UGC API は「client/server 分離」「短い message id」「送信頻度/サイズ制限」「server authority」を一般化して取り込む |
| bloxd.io | 公開 `Bloxdy/code-api` は World Code / Code Blocks、20Hz `tick`、block/chunk/player/mob callbacks、32x32x32 chunk ndarray、16-bit block id、client options、custom games を公開。`Bloxdy/texture-packs` は texture / skybox / GLB model / CSS pack 構造を公開 | live bloxd.io の transport、private packet format、production frontend framework は解析禁止のため未確認 | voxel UGC は block/chunk/event callback と権限付き API を採用候補。live service 互換や packet 模倣はしない |
| Noa 系 OSS | `noa-engine` は Babylon.js peer、fixed tick/render 分離、origin rebasing、world/chunk/physics/ECS/input を持つ。`voxel-physics-engine` は terrain collision 用 AABB sweep。`ent-comp` は軽量 ECS。`micro-game-shell` は fixed timestep + pointerLock。`game-inputs` は KeyboardEvent.code + pointer state | bloxd 本体での改変版採用状況は public docs では一部しか確認不可 | Phase 7 以降の voxel は Noa 系依存候補を維持。ただし `@babylonjs/core` peer version や loop ownership を導入時に検証する |

## 3. Source Inventory

### 3.1 Web / documentation sources

| ID | 種別 | URL | 取得日 | 根拠として使った内容 | 信頼度 |
|---|---|---|---|---|---|
| KR-DOC-ROOT | official docs | https://docs.krunker.io/ | 2026-09-06 | KrunkScript が client/server scripts、hooks、API、default behavior disable を持つ | 高 |
| KR-FIRST | official docs | https://docs.krunker.io/guides/your-first-game | 2026-09-06 | Krunker Editor が 3D object placement、object properties、client/server script panels、live preview を持つ | 高 |
| KR-NET | official docs | https://docs.krunker.io/guides/multiplayer-networking | 2026-09-06 | `GAME.NETWORK.send/broadcast`、server authority、rate/size limits | 高 |
| KR-SCENE | official docs | https://docs.krunker.io/guides/scene-composition | 2026-09-06 | scene components、lights、objects、coordinate system、object attach/delete/visibility | 高 |
| KR-LOGIC | official docs | https://docs.krunker.io/guides/game-logic | 2026-09-06 | timing/update delta、player update inputs、AABB/complex collision、path nodes | 高 |
| KR-RES | official docs | https://docs.krunker.io/guides/resource-packs | 2026-09-06 | mod.zip 構造、`.obj` / `.gltf` models、CSS/settings override、sound/animation | 高 |
| KR-API | official docs | https://docs.krunker.io/api | 2026-09-06 | API namespace 一覧（SCENE/UI/INPUTS/NETWORK/STORAGE 等） | 高 |
| KR-SETTINGS | official docs text | https://krunker.io/docs/settings.txt | 2026-09-06 | settings key の棚卸し。`lagComp`, `updateRate`, mobile/controller/default graphics/HUD settings の存在 | 中（設定名のみ） |
| KR-LEGAL | official legal | https://frvr.com/legal/krunker | 2026-09-06 | IP / User Content / asset / source code / scraping 等に関する制約 | 高 |
| KR-CHANGELOG | secondary wiki | https://krunkerio.fandom.com/wiki/Change_Log_V4 / https://krunkerio.fandom.com/wiki/Change_Log_v5 | 2026-09-06 | GLTF export fix、network rate setting、KrunkScript docs/network limits 更新の履歴。一次情報ではないため補助のみ | 低〜中 |
| BX-TERMS | secondary mirror | https://bloxd-io.fandom.com/wiki/Bloxd_Info | 2026-09-06 | bloxd の reverse engineering 禁止条項の確認。公式 URL が確認できなかったため既存 `legal.md` と合わせて安全側に扱う | 中 |
| NOA-GH | GitHub page | https://github.com/fenomas/noa | 2026-09-06 | README に bloxd.io が Noa 採用例として記載されていることの確認。実装事実は clone 側を優先 | 中 |

### 3.2 Cloned repositories

| ID | Repo | Clone path | Remote URL | HEAD | License | 読んだファイル |
|---|---|---|---|---|---|---|
| CL-NOA | noa-engine | `/tmp/cod-web-research/noa` | `https://github.com/fenomas/noa.git` | `bd74cd8add3abf216b53a995139276af665b1d52` | MIT | `README.md`, `package.json`, `LICENSE.txt`, `src/index.js`, `src/components/physics.js` |
| CL-VPE | voxel-physics-engine | `/tmp/cod-web-research/voxel-physics-engine` | `https://github.com/fenomas/voxel-physics-engine.git` | `53685b1219eba404fbf7ad35216f8c593ed0db41` | MIT | `README.md`, `package.json`, `LICENSE`, `src/index.js` |
| CL-ENT | ent-comp | `/tmp/cod-web-research/ent-comp` | `https://github.com/fenomas/ent-comp.git` | `ad16110528a5ad44bedbf66c1dfbdc1aba5e6778` | MIT | `README.md`, `api.md`, `package.json`, `src/ECS.js` |
| CL-MGS | micro-game-shell | `/tmp/cod-web-research/micro-game-shell` | `https://github.com/fenomas/micro-game-shell.git` | `fce4465e871944b4bc296aae0dc7e20092959ebf` | ISC | `README.md`, `package.json`, `src/micro-game-shell.js` |
| CL-GI | game-inputs | `/tmp/cod-web-research/game-inputs` | `https://github.com/fenomas/game-inputs.git` | `1bcdfd60ee09a6c492a91981f3e6d01c28f7608a` | ISC | `README.md`, `package.json`, `src/inputs.js` |
| CL-NIP | nipplejs | `/tmp/cod-web-research/nipplejs` | `https://github.com/yoannmoinet/nipplejs.git` | `ea425b3e81deaed14e384a2edcfbbd6a9a50f45b` | MIT | `README.md`, `package.json`, `LICENSE` |
| CL-BX-TP | Bloxdy texture-packs | `/tmp/cod-web-research/texture-packs` | `https://github.com/Bloxdy/texture-packs.git` | `cdb31ca160f0db2bcb1d1443261feef1708620ab` | 不明（license file なし） | `README.md`, `package.json` |
| CL-BX-API | Bloxdy code-api | `/tmp/cod-web-research/code-api` | `https://github.com/Bloxdy/code-api.git` | `675b56d94a2d56bb19924ff7a8dfa83710105536` | 不明（license file なし） | `README.md`, `CALLBACKS.md`, `API_REFERENCE.md`, `CLIENT_OPTIONS.md` |
| CL-BX-GAMES | Bloxdy developedCustomGames | `/tmp/cod-web-research/developedCustomGames` | `https://github.com/Bloxdy/developedCustomGames.git` | `f540e40db75a32ce7564b67ab18fb6a80e6171eb` | 不明（license file なし） | `Manhunt/README.md`, `Manhunt/src/init.js`, `Manhunt/out/worldcode.js` |
| CL-BX-VPE | Bloxdy voxel-physics-engine fork | `/tmp/cod-web-research/Bloxdy-voxel-physics-engine` | `https://github.com/Bloxdy/voxel-physics-engine.git` | `82799d3721d0f9586fef1a87c43495fbc1124fd9` | MIT | `README.md`, `package.json`, `LICENSE`, `src/index.js` |

## 4. Krunker.io Research

### 4.1 Network / authority / sync

| 主張 | Source | 根拠 | cod-web 判断 |
|---|---|---|---|
| KrunkScript の公開 networking API は client/server 両方向の `GAME.NETWORK.send` と server-side `broadcast` を提供する | KR-NET | client-to-server send、server-to-client send、broadcast、`onNetworkMessage` hooks が docs に記載 | UGC scripting API は高頻度 protocol と分け、制御系 message API として設計する |
| KrunkScript docs は重要状態を server authority にするべきと明記している | KR-NET | scoring / health / item ownership を client に信頼しない、と説明 | cod-web 既存方針（権威サーバー）と一致。維持する |
| UGC network limits は message ID 10 chars、data 2000 bytes、broadcast 10 msg/sec、server-to-client 20 msg/sec/user、client-to-server 40 msg/sec | KR-NET | Network Limits table | そのまま数値採用はしない。cod-web では UGC API に type/source/mode 別 quota を設ける候補 |
| 高頻度 game sync の transport / packet format / tick rate は公開 docs だけでは不明 | KR-DOC-ROOT, KR-NET, KR-SETTINGS | `settings.txt` に `updateRate`, `lagComp` はあるが、private protocol は公開されていない | private protocol を推測・模倣しない。cod-web は既存 `protocol.md` の WebSocket + binary packet を正とする |
| public settings には low spec / render distance / HUD / mobile / controller / audio/mic / sensitivity が細かく存在する | KR-SETTINGS | settings key list | Phase 4+ の settings schema は graphics / HUD / input / accessibility / audio を分離する候補 |

### 4.2 Frontend / rendering / editor-visible features

| 領域 | Source | 確認内容 | cod-web 判断 |
|---|---|---|---|
| Editor 基本 | KR-FIRST | editor は Quick Start/template、3D object placement、object properties、client/server KrunkScript panels、live preview を持つ | Phase 8 editor は「template から開始」「即時 preview」「client/server script 分離」を採用候補 |
| Scene API | KR-SCENE | sky/ambient/fog/lights/object move/rotate/scale/delete/attach/visibility/3D→screen coordinate conversion | Babylon editor API も scene graph 操作を明示する。ただし Krunker API 名は流用しない |
| Asset / resource pack | KR-RES | mod.zip は textures/models/sound/scripts/css/css-img/shaders、custom 3D model は `.obj`, `.gltf`、animation は glTF clip | cod-web は GLB/glTF を維持。resource pack は texture/model/css を分離し、shader は Phase 8 では慎重に扱う |
| Collision | KR-LOGIC | AABB が基本。rotated object/assets は complex collision あり、map export で 5000 collision triangles limit | cod-web FPS editor の `render.glb` / `collision.glb` 分離方針と一致。triangle budget を別途定義する候補 |
| Input | KR-LOGIC | onPlayerUpdate の `inputs` は mouseX/Y, movDir, lMouse/rMouse, jump/reload/crouch/scroll/swap/reset/interact を持つ | cod-web Input 16B は継続。UGC には抽象化した input state を渡す候補 |

### 4.3 UGC scripting / moderation / legal

| 領域 | Source | 確認内容 | cod-web 判断 |
|---|---|---|---|
| Script model | KR-DOC-ROOT | KrunkScript は statically-typed、client/server script、hooks、GAME namespace API を持つ | cod-web の UGC sandbox は QuickJS を使う場合も client/server 権限分離と API allowlist を必須にする |
| Default behavior override | KR-DOC-ROOT, KR-LOGIC | default prediction / player behavior / movement / shooting / UI / meshes などを disable できる | cod-web は L2 profile を壊さず、L3/UGC に「許可された default override」だけを expose する |
| User content | KR-LEGAL | FRVR legal は Service materials/source code/assets の無断利用禁止、User Content に関する権利/責任/削除可能性を定める | Krunker の asset/code/UI/trademark は流用しない。投稿ライセンスと takedown flow が必要 |

## 5. bloxd.io / Noa 系 Research

### 5.1 bloxd.io public custom-game API

| 主張 | Source | 根拠 | cod-web 判断 |
|---|---|---|---|
| `Bloxdy/code-api` は Code Blocks / Boards / World Code から JavaScript で bloxd API を操作する公開 docs | CL-BX-API | `README.md` に code blocks, press-to-code boards, `api` globals, examples | cod-web voxel UGC でも world-level script と object/code-block script の境界を検討する |
| World Code callbacks は多数あり、`tick` は 20 times/sec、`ms` は fixed timestep と説明されている | CL-BX-API | `CALLBACKS.md` の `tick` section | cod-web voxel 公式は 30Hz 方針だが、UGC callbacks は固定 tick を明示し、描画 FPS と分ける |
| block 変更・mob spawn・damage・inventory・chat などは callback return 値で prevent/modify できる | CL-BX-API | `CALLBACKS.md` の `onPlayerChangeBlock`, `onWorldChangeBlock`, damage hooks 等 | cod-web UGC hooks も戻り値を union 型で限定し、任意 object mutation より安全にする |
| chunk API は 32x32x32 ndarray、block id は 16-bit、read-only chunk と `resetChunk` 系の分離を示す | CL-BX-API | `API_REFERENCE.md` の `getChunk`, `getEmptyChunk` sections | cod-web ChunkStore では chunk read view と write transaction を分け、desync 防止を明文化する |
| client options は movement, creative, canChange, fog/lighting/HUD/mobile/touchscreenActionButton などを持つ | CL-BX-API | `CLIENT_OPTIONS.md` | cod-web は mode/room ごとの client capability flags を設計候補にする |
| public docs から private transport / packet format は確認しない | CL-BX-API, BX-TERMS | code API は scripting API であり network protocol ではない。terms 系情報は reverse engineering 禁止 | live protocol は未調査・採用不可 |

### 5.2 bloxd texture packs / UGC packaging

| 主張 | Source | 根拠 | cod-web 判断 |
|---|---|---|---|
| texture pack は `textures/*.png`, `skyBoxes/<name>/{nx,ny,nz,px,py,pz}.jpg`, `models/*.glb`, `css/*.css` の構造 | CL-BX-TP | `README.md` の Structure of a Texture Pack | cod-web UGC pack も resource manifest を導入し、render asset / style / skybox を分ける候補 |
| pack JSON encoding は `_json/` に base64 assets を持ち、version bump による更新がある | CL-BX-TP | `README.md` の Updating the JSON encodings | cod-web は base64 bundle ではなく CDN/hash manifest を優先。ただし `version` / `latestVersion` の概念は採用候補 |
| GLB model overwrite が docs にある | CL-BX-TP | `models/<modelName>.glb` | voxel/FPS とも GLB pipeline 方針と整合 |

### 5.3 Bloxdy developedCustomGames examples

| 主張 | Source | 根拠 | cod-web 判断 |
|---|---|---|---|
| `developedCustomGames` の Manhunt は build process を簡略化し、複数 source file を `globalThis` 共有で束ねる運用説明を持つ | CL-BX-GAMES | `Manhunt/README.md`, `Manhunt/src/init.js` | cod-web では global mutable namespace 方式は採用しない。代わりに UGC module manifest + explicit exports/imports を候補にする |
| `worldcode.js` は codeblock positions から code text を読み出し、stage 0/1/2 で eval する loader と callback dispatcher を持つ | CL-BX-GAMES | `Manhunt/out/worldcode.js` | eval/codeblock loader の思想はそのまま使わない。大きな UGC を分割ロードする必要性だけ一般化する |
| public game examples には license file がない | CL-BX-GAMES | repo top-level file list / license absence | コード流用不可。設計観察のみ |

### 5.4 Noa / physics / ECS / input OSS

| Repo | Source | 確認内容 | cod-web 判断 |
|---|---|---|---|
| noa-engine | CL-NOA | `package.json` は `@babylonjs/core:^6.1.0` peer、`ent-comp`, `game-inputs`, `micro-game-shell`, `voxel-physics-engine` dependencies。`src/index.js` は default `tickRate: 30`, `maxRenderRate: 0`, origin rebasing、World/Rendering/Physics/Entities/Inputs/Camera を組み立てる | Phase 7+ voxel は Noa 採用候補を維持。ただし cod-web の Babylon 9 系と peer 差を検証する |
| noa-engine tick/render | CL-NOA | `tick(dt)` は world/physics/rendering/entities を固定 tick で進め、`render(dt, framePart)` は camera input、world render、entity render、Babylon render を行う | cod-web では engine loop ownership を明確化し、React state と切り離す |
| voxel-physics-engine | CL-VPE | `Physics(opts, testSolid, testFluid)`、AABB body、semi-implicit Euler、sweep collision、fluid forces、autoStep、body sleep | サーバ側にも移植可能な terrain collision model の候補。非 cubic voxel / body-body collision は対象外と明記する |
| Bloxdy VPE fork | CL-BX-VPE | upstream v0.12 相当から `isBodyInsideUnloadedBlock`, `preventFallOffEdge`, `alwaysApplyHorizFriction` などが追加されている | bloxd 側が voxel physics を実運用向けに fork 調整している示唆。ただし live 本体での使用は断定しない。cod-web は独自 fork 前提で安全側機能を設計候補にする |
| ent-comp | CL-ENT | incrementing integer entity ID、component state、systems/renderSystems、system order、multi components、shallow-copy state caveat、fast accessors | Noa 内部に合わせるなら採用候補。cod-web L1/L2 の ECS は nested mutable state を避ける |
| micro-game-shell | CL-MGS | fixed tick and render events、`tickRate`, `maxRenderRate`, `maxTickTime`, pointerLock/fullscreen/resize handling | Noa 導入時は cod-web の tick/render loop と二重化しない。PointerLock は unadjustedMovement 方針との差を確認する |
| game-inputs | CL-GI | KeyboardEvent.code based bindings, pointer state dx/dy/scroll accumulation, press/release counts cleared by `tick()` | input abstraction の候補。ただし cod-web Input 16B と pointer lock sensitivity pipeline に合わせて wrapper 化する |
| nipplejs | CL-NIP | virtual joystick for touch interfaces、dynamic/semi/static modes、move events include force/vector/angle | mobile virtual stick 候補。DOM overlay は React HUD と干渉しない zone 管理が必要 |

## 6. Network Protocol Findings

| 対象 | 公開情報から言えること | 公開情報から言えないこと | cod-web 採用方針 |
|---|---|---|---|
| Krunker.io core | 設定に `lagComp`, `updateRate` が存在し、docs は UGC message API と rate limits を公開 | WebSocket/UDP/WebRTC など transport、binary layout、snapshot delta、hit validation 実装 | 解析しない。cod-web は WebSocket + binary + authority server を継続 |
| Krunker UGC | `GAME.NETWORK` は message id + data object。server authority と send less data を docs が推奨 | 内部 serialization / queueing / transport | cod-web UGC は control-plane JSON/object API、高頻度 game sync と分離 |
| bloxd core | Code API は tick 20Hz、chunk load/request callbacks、server API、client options を公開 | live protocol、packet format、transport、frontend framework | 解析しない。voxel protocol は cod-web 独自で設計 |
| bloxd custom games | callbacks, API, database values, chunk and block operations, matchmakePlayer API が公開 | lobby discovery internals / private matchmaking protocol | public scripting API の構造のみ参考 |
| Noa OSS | local fixed tick/render, world/chunk/physics/input architecture | multiplayer protocol は提供しない | voxel client/sim の基盤候補。network は cod-web server authority で別設計 |

## 7. 採用候補 / 不採用 / 要確認

### 7.1 採用候補

| 優先 | パターン | 根拠 | 反映候補 |
|---:|---|---|---|
| 高 | UGC scripting は client/server 権限分離し、server-side が scoring/health/item ownership を持つ | KR-DOC-ROOT, KR-NET, CL-BX-API | `docs/arch/ugc.md`, Phase 8 |
| 高 | 高頻度 game protocol と UGC/custom event message API を分ける | KR-NET, CL-BX-API | `protocol.md`, `ugc.md` |
| 高 | UGC message/callback に size/rate/time budget を設け、戻り値 union で prevent/modify を限定する | KR-NET, CL-BX-API | `ugc.md`, `engineering.md` |
| 高 | FPS collision は render asset と collision asset を分け、AABB/simple collision を第一候補にする | KR-LOGIC, `editor.md` | `editor.md` の将来詳細 |
| 中 | resource pack / world pack は textures/models/skybox/css/scripts を manifest で分け、version/hash を持つ | KR-RES, CL-BX-TP | Phase 8 UGC pack design |
| 中 | voxel chunk API は read view と write transaction を分ける | CL-BX-API | Phase 7 ChunkStore |
| 中 | Noa 系は client voxel rendering + ECS + physics の導入候補。ただし loop ownership と Babylon peer を検証 | CL-NOA, CL-VPE, CL-ENT, CL-MGS | Phase 7 planning |
| 中 | mobile は virtual joystick event を Input intent に変換し、desktop input pipeline と同じ送信形式へ合流 | CL-NIP, CL-GI | Phase 4+ mobile input |

### 7.2 不採用 / 採用不可

| 項目 | 理由 |
|---|---|
| Krunker / bloxd の private protocol 模倣 | 公開情報では確認不可。live traffic / bundle 解析は計画上禁止 |
| 競合の code / asset / UI / trademark 表現の流用 | 法務制約と project policy に反する |
| Bloxdy developedCustomGames の codeblock `eval` loader をそのまま使う | license 不明、global/eval 方式は cod-web の sandbox 方針に合わない |
| texture pack を base64 JSON として配る方式の直接採用 | CDN/hash/manifest の方が cod-web の権利確認・キャッシュ・CSP と相性が良い |
| UGC から任意 DOM/CSS/shader を無制限許可 | XSS/CSP/性能/権利侵害リスクが高い |

### 7.3 要確認

| 項目 | 確認が必要な理由 | 確認タイミング |
|---|---|---|
| `noa-engine@0.33.0` と Babylon 9 系の互換 | noa peer は `@babylonjs/core:^6.1.0`。cod-web は Babylon 9 系を想定 | Phase 7 前に installed `.d.ts` + smoke test |
| Noa の internal loop と cod-web platform loop の所有権 | `micro-game-shell` が tick/render/pointerLock を管理するため二重 loop の危険 | Phase 7 設計時 |
| UGC sandbox の言語/API | KrunkScript 型言語 / bloxd JS World Code / cod-web QuickJS のどれも権限境界が異なる | Phase 8 計画時に ask_user |
| Krunker / bloxd の official documentation URL 安定性 | docs URL や GitHub repo はサービス側都合で変わる可能性 | 設計反映時に再取得 |
| bloxd terms の公式出典 | 今回確認できた reverse engineering 条項は mirror/secondary。既存 `legal.md` 方針に従い安全側で禁止を維持 | 法務レビュー時 |

## 8. 仕様変更提案（このコミットでは未反映）

| 提案 ID | 提案 | 根拠 | 反映候補 |
|---|---|---|---|
| DR1-P1 | `ugc.md` に「game sync protocol と UGC message API は別層」と明記 | KR-NET, CL-BX-API | Phase 8 計画または DOC 追加 |
| DR1-P2 | `editor.md` に FPS collision triangle budget / AABB first / complex collision optional を追記 | KR-LOGIC | Phase 8 editor 詳細化 |
| DR1-P3 | `sim-profiles.md` に Noa 導入時の Babylon peer mismatch 検証項目を追記 | CL-NOA | Phase 7 計画 |
| DR1-P4 | `ugc.md` に callback return union（prevent/modify/void）と time budget checkpoint の設計方針を追記 | CL-BX-API | Phase 8 計画 |
| DR1-P5 | `client.md` / `editor.md` に resource pack manifest（textures/models/skyboxes/css/scripts/version/hash）案を追加 | KR-RES, CL-BX-TP | Phase 8 計画 |

## 9. 完了チェック

- [x] Krunker.io / bloxd.io それぞれについて network / frontend / editor / UGC / voxel 関連を整理した
- [x] すべての主要主張に source ID / URL / clone SHA を付けた
- [x] GitHub repo は clone path、remote URL、commit SHA、license、読んだファイル一覧を記録した
- [x] live service 接続解析、通信キャプチャ、production bundle 解析を行っていない
- [x] cod-web への採用候補、不採用、要確認、仕様変更提案を分けた
