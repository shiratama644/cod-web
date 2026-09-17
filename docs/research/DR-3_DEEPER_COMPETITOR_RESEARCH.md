# DR-3 Deeper Competitor Research

日付: 2026-09-06  
対象: Krunker.io / bloxd.io / browser authoritative multiplayer 追加調査  
種別: docs-only research  
前提: DR-1 / DR-2 の追加。実装には進まない。

## 0. 重要な境界

- `web_search` はすべて `depth: "3"` で実施した。
- live service 接続解析、通信キャプチャ、production bundle / minified client 解析はしていない。
- 競合サービスの code / asset / UI / trademark は流用しない。
- GitHub repo の内容に言及する箇所は、既存 clone の remote / HEAD / license / 読んだファイルを再確認した範囲に限定する。
- 調査結果は設計の正本ではない。採用する場合は `docs/arch/` と phase plan に翻訳してから実装する。

## 1. Source inventory

### 1.1 Deep search queries

すべて `web_search` depth 3。

| Query | 主な用途 |
|---|---|
| `Krunker KrunkScript editor resource packs network limits official docs` | Krunker docs / network / editor / resource pack の追加探索 |
| `site:docs.krunker.io KrunkScript NETWORK STORAGE INPUTS MODS SCENE UI DEFAULT` | Krunker API の direct URL 探索 |
| `Bloxdy code-api callbacks client options entity settings mesh entity docs particles sounds skins qte` | bloxd code-api 追加 docs の探索 |
| `Bloxdy texture-packs glb css skyboxes base64 _json knownTexturePackLatestVersion` | bloxd texture pack 公式 repo の探索 |
| `Noa engine docs history Babylon peer dependency manuallyControlChunkLoading origin rebasing` | Noa engine 追加確認 |
| `browser multiplayer authoritative networking best practices client prediction reconciliation interpolation lag compensation` | 一般 authoritative netcode 確認 |
| `Krunker Editor publish custom games map publishing docs assets GLB KrunkScript Editor` | Krunker publish / GLB / editor history の補助確認 |
| `Krunker data storage KrunkScript STORAGE cookies persistent data rate limit official docs` | Krunker storage / cookies の補助確認 |
| `bloxd.io custom games world code code blocks JavaScript callbacks documentation official GitHub Bloxdy` | bloxd custom code / callbacks の補助確認 |
| `Valve Source Multiplayer Networking interpolation lag compensation client prediction server authoritative` | 一般 netcode の一次寄り資料確認 |

### 1.2 Web pages fetched

| Source | 種別 | 取得内容 |
|---|---|---|
| `https://docs.krunker.io/guides/introduction` | official | Krunker は server hosting / networking / accounts / persistent storage / cross-platform publish を提供。workflow は Build → Script → Assets → Test → Publish。 |
| `https://docs.krunker.io/guides/multiplayer-networking` | official, DR-2 再利用 | client/server scripts、server authority、`GAME.NETWORK.send/broadcast`、rate limits。 |
| `https://docs.krunker.io/api/network` | official, DR-2 再利用 | `NETWORK.send` / `NETWORK.broadcast` direct API。 |
| `https://docs.krunker.io/guides/data-storage` | official | server DB storage と client cookies の使い分け、storage limits。 |
| `https://docs.krunker.io/api/storage` | official | server-only `load/set/transact/update`。API page では `transact` currently disabled。 |
| `https://docs.krunker.io/api/cookies` | official | client-only cookie `has/load/removeByKey/save`。 |
| `https://docs.krunker.io/guides/trigger-logic` | official | non-scripting trigger workflow、events / conditions / actions、Custom Action と `onCustomTrigger` hook。 |
| `https://docs.krunker.io/api/default` | official | default behavior override: `disable3D`, `disablePlayerBehaviour`, `disablePrediction`, `disableServerSync`。 |
| `https://docs.krunker.io/api/inputs` | official | input default disable/enable、pointer lock/free mouse、mouse / key query。 |
| `https://docs.krunker.io/api/mods` | official | client-only `MODS.load(url)` / `reset()`。 |
| `https://docs.krunker.io/api/scene` | official | client-only primitives / custom geometry / asset loading / lights / sky / fog / `posToScreen`。 |
| `https://docs.krunker.io/api/ui` | official | client-only DIV / image / style / default UI hiding。 |
| `https://docs.krunker.io/api/time` | official | client/server `fixedDelta/now/getReadable`、server-only `freeze/unfreeze`。 |
| `https://docs.krunker.io/api/players` | official | player list / find / self / LOD / mesh visibility。 |
| `https://raw.githubusercontent.com/Bloxdy/texture-packs/main/README.md` | official GitHub raw | texture pack structure、`_json` base64 encoding、GLB model overwrite、skybox、CSS。 |
| `https://github.com/Bloxdy/texture-packs` | official GitHub | public repo metadata: latest commit `cdb31ca`, folders, README presence。 |
| `https://www.gabrielgambetta.com/client-server-game-architecture.html` | general reference | authoritative server: clients send inputs/commands; server owns state. |
| `https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html` | general reference | client-side prediction、sequence number、server reconciliation。 |
| `https://www.gabrielgambetta.com/entity-interpolation.html` | general reference | periodic server timestep、remote entity interpolation in the past。 |
| `https://www.gabrielgambetta.com/lag-compensation.html` | general reference | timestamped shot/input、server reconstructs past world for hit validation。 |
| `https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking` | engine reference | tick, snapshots, delta compression, user commands, interpolation, prediction, lag compensation, bandwidth tradeoffs。 |
| `https://developer.valvesoftware.com/wiki/Lag_Compensation` | engine reference | server rewind based on player latency; default player history 1 second; use sparingly for non-player entities。 |

### 1.3 GitHub cloned repos rechecked

| Repo | Clone path | Remote | HEAD | License | 読んだファイル |
|---|---|---|---|---|---|
| Bloxdy/code-api | `/tmp/cod-web-research/code-api` | `https://github.com/Bloxdy/code-api.git` | `675b56d94a2d56bb19924ff7a8dfa83710105536` (`675b56d Update API documentation`) | license file not found | `README.md`, `API_REFERENCE.md`, `CALLBACKS.md`, `CLIENT_OPTIONS.md`, `ENTITY_SETTINGS.md`, `MESH_ENTITY_DOCS.md`, `MOB_SETTINGS.md`, `PARTICLES.md`, `QTE_DOCS.md`, `SKINS_AND_POSES.md`, `SOUNDS_AND_MUSIC.md` |
| Bloxdy/texture-packs | `/tmp/cod-web-research/texture-packs` | `https://github.com/Bloxdy/texture-packs.git` | `cdb31ca160f0db2bcb1d1443261feef1708620ab` (`cdb31ca Updated jamBlox`) | license file not found | `README.md` |

注: license file が見当たらない repo は、公開ドキュメント観察に留める。コード・アセット流用は不可。

## 2. Krunker deeper findings

### 2.1 Platform / publish model

Krunker official docs は、platform が server hosting、networking、accounts/auth、persistent storage、cross-platform publish を提供し、creator は editor で scene を作り、KrunkScript で client/server logic を足し、asset import と editor preview を経て publish する流れを明記している。

cod-web への示唆:

- `fps` / `voxel` どちらも、ゲーム本体とは別に「platform が持つもの」を明確化する必要がある。
- UGC で公開すべき抽象は、server hosting / room / auth / persistence / asset ingest / publish workflow であり、個別ゲームの private protocol ではない。
- Phase 8 UGC の前に、Phase 1–4 で最小の publish unit、asset unit、room unit を分けると後戻りが少ない。

### 2.2 Networking and network limits

DR-2 の network guide / API に加え、今回も direct docs を補強した。Krunker の UGC network docs は server authority を前提に、client/server scripts 間で短い message ID と small object payload を送る設計で、rate limit と max payload を公式に提示している。

確認済み limit:

| 項目 | 値 |
|---|---:|
| message ID | 10 characters max |
| data | 2000 bytes / characters max（docs 表記差あり） |
| broadcast | 10 messages/sec |
| server-to-client | 20 messages/sec/user |
| client-to-server | 40 messages/sec |

cod-web への示唆:

- UGC scripting API は raw socket を直接公開せず、message ID / payload / rate budget を明示した capability として公開する。
- FPS realtime path は binary protocol のまま維持し、UGC control messages は別 channel / topic / budget に分ける。
- `send/broadcast` が boolean success を返すのは、script 側が rate limited / failed send を扱えるよい形。ただし cod-web では typed result（`ok | rate_limited | too_large | disconnected`）の方が debugging しやすい。

### 2.3 Storage and cookies

Data Storage guide は、server-side persistent storage と browser-local cookies を明確に分けている。server storage は player/account や game-owned data 向け、cookies は local preferences 向け。API page では `STORAGE.transact` が currently disabled とあり、guide の例と差がある。

確認済み limit / API:

| 項目 | 内容 |
|---|---|
| server storage API | `load`, `set`, `update`, `transact`（API page では transact disabled） |
| client cookie API | `has`, `load`, `removeByKey`, `save` |
| storage write | `set/update/transact` once per 10s per player |
| storage load | 5 per player connection |
| unique keys | 30 per game |
| key length | 20 max |

cod-web への示唆:

- 永続化 API は `server authoritative persistence` と `client local preferences` を別 namespace にする。
- `transact` のような atomic operation は、実装できるまで docs に書かない。書く場合は feature flag / unsupported status を明示する。
- UGC storage は low quota / explicit key budget / rate limit を前提にし、game economy や leaderboard は server-only にする。

### 2.4 Trigger logic as no-code UGC

Trigger Logic guide は scripting なしでも使える events / conditions / actions を公開している。actions は GUI show/hide、storage save/load、class/weapon change、global values、sounds、effects、AI target、mode-specific action などにまたがる。Custom Action (58) から server script の `onCustomTrigger(str playerID, str customParam, num value)` を呼べる。

cod-web への示唆:

- UGC は「code editor」だけでなく「no-code trigger graph」を持つべき。
- trigger graph と script を接続する場合、free-form eval ではなく typed custom event (`triggerId`, `actorId`, `param`, `value`) にする。
- Global value / interface value / self value のような scoped state は、UGC author に分かりやすい。ただし cod-web では replication scope と authority を型に含める必要がある。

### 2.5 Client customization APIs

Krunker official API は client-only modules を広く公開している。

| API | 主な確認事項 | cod-web 示唆 |
|---|---|---|
| `DEFAULT` | default player behavior / prediction / server sync / 3D を disable できる | 公式 profile の保護された default を、UGC が capability 付きで override する形にする |
| `INPUTS` | default input disable/enable、pointer lock / free mouse / mouse pos | Phase 1 input abstraction と Phase 8 UGC input capture を同じ primitive から伸ばす |
| `MODS` | client-only resource/mod load/reset | Resource pack は allowlist / CSP / size budget / cache key / versioning が必要 |
| `SCENE` | client-only primitives, assets, custom geometry, lights, sky/fog, `posToScreen` | UGC visual-only scene objects と server-auth collision objects を明確に分ける |
| `UI` | client-only DIV/image/style/default UI hiding | HUD は React 側で typed UI commands にする。raw CSS/DOM は sandbox 境界が必要 |
| `TIME` | fixedDelta/now は client/server、freeze は server-only | tick-time と wall-clock を別型にする |
| `PLAYERS` | list/find/self、client visual settings | player identity / local player / render-only options を分離する |

重要: `SCENE` が client-only である点は、visual customization と gameplay collision / authority を分ける設計の根拠になる。

## 3. bloxd deeper findings

### 3.1 code-api scope

Bloxdy/code-api は JavaScript world code / code block 系の API reference として、world/block manipulation、inventory、player options、mobs、mesh entities、particles、QTE、sounds/music、skins/poses、callbacks を広く文書化している。license file が見当たらないため、API shape の観察に限定し、コード流用はしない。

### 3.2 Execution / event model

`CALLBACKS.md` は `tick` が 20 times per second、join/leave/jump/respawn/chat/block change/inventory/chest/mob/entity collision/QTE/shop/vehicle などの callbacks を列挙している。複数 callback は return value で `preventChange`, `preventDrop`, `preventDamage`, `preventDeath`, `preventSpawn`, `keepInventory` などの intent を返す。

cod-web への示唆:

- UGC event API は callback 名と return contract を固定し、例外時 fallback を持つのがよい。
- `prevent*` 文字列は分かりやすいが型安全性が弱い。cod-web では discriminated union にする。
- `tick` を UGC に開く場合は time budget / interrupt / queueing が必須。

### 3.3 Time budget / long running code

`API_REFERENCE.md` の `isNearInterrupt()` は、長い loop を中断して進捗を保存する用途として説明されている。これは UGC sandbox で同期的な heavy code を許す場合の重要な逃げ道になる。

cod-web への示唆:

- Phase 8 UGC では、script runtime に instruction/time budget と cooperative yield/check API が必要。
- 予測不能な heavy world edit は job 化し、1 tick で完了させない。
- `doPeriodicSave` 相当の callback は、non-graceful shutdown の data loss を減らすために有用。

### 3.4 Voxel/world APIs

`API_REFERENCE.md` は block / chunk / entity / inventory APIs を持つ。

確認した代表例:

- `getBlock`, `setBlock`, `setBlockRect`, `setBlockWalls`
- `getChunk` / `getEmptyChunk` は 32x32x32 ndarray、block id は 16-bit。hot path 向けで、read-only / `resetChunk` 系の注意がある。
- `blockCoordToChunkId`, `chunkIdToBotLeftCoord`, `isBlockInLoadedChunk`
- `onPlayerRequestChunk`, `onChunkLoaded` callback。
- `setBlockData` / `getBlockData` は block-local data。block change で clear される。

cod-web への示唆:

- voxel chunk は 32^3 / 16-bit block id が現実的な先行例としてあるが、cod-web の chunk size は AOI / bandwidth / meshing cost で独自決定する。
- chunk ndarray 直接変更は desync を招く、という注意は重要。cod-web でも mutable raw chunk と replicated commit API を分ける。
- block-local data は便利だが、block change との lifecycle を明示しないと永続化 bug になる。

### 3.5 Client options / per-player capabilities

`CLIENT_OPTIONS.md` は movement、combat、camera、HUD、inventory、crafting、lighting/fog、music、mobile/touchscreen action、visibility などの per-player options を持つ。movement 系 option には「プレイヤーは default movement muscle memory に慣れているため、安易な変更は避ける」といった UX warning が多い。

cod-web への示唆:

- GameMode は per-player capability/options layer を持つべき。
- movement tuning は official profile と UGC override を分け、default muscle memory を壊す変更は explicit にする。
- mobile では walking/running の意味が desktop と違うため、input abstraction は device-aware にする。

### 3.6 Entity / mob customization

`ENTITY_SETTINGS.md` は、viewer player と target entity の関係で opacity / canSee / canAttack / nametag / leaderboard / damage amount / zIndex などを制御する。`MOB_SETTINGS.md` は mob attack / movement / health / ride/tame / drop / AI state を per-mob または default で制御する。Mob AI state は `idle`, `disabled`, `walking`, `chasing`, `runningAway`, `following`, `walkingToPosition`, `runningToPosition` など。

cod-web への示唆:

- Visibility や nametag は「entity 自身の状態」ではなく「viewer-target pair state」として表す必要がある。
- Mob AI は black-box behavior ではなく state machine と tunable settings を公開すると UGC が扱いやすい。
- Per-entity setting と default setting の二層は、official modes と UGC modes の両方に向く。

### 3.7 Mesh entities / throwables / node attachment

`MESH_ENTITY_DOCS.md` は server-created synced 3D objects として Mesh Entities を説明する。mesh types は `Box`, `BloxdBlock`, `Person`, `ParticleEmitter`。physics 付き mesh entity はさらに小さい budget がある。throwables は built-in projectile physics を使い、node mesh attachment は player/entity の named node に mesh を付ける。

cod-web への示唆:

- UGC object は `server-auth synced entity` と `client-only visual entity` を分ける。
- Physics entity は budget を別枠にする。creation は `null` / typed failure を返し、投げっぱなしにしない。
- Attachment node 名は stable public API として version 管理が必要。

### 3.8 QTE / particles / audio / cosmetics

- `QTE_DOCS.md` は `progressBar`, `timedClick`, `gravityBar`, `precisionBar`, `rhythmClick` を server-side request / callback result model で扱う。
- `PARTICLES.md` は texture / presetId 方式の particle effects を示す。
- `SOUNDS_AND_MUSIC.md` は one-shot sound API と music-as-client-option を分ける。
- `SKINS_AND_POSES.md` は pose と skin parts / NPC skins を API-selectable にしている。

cod-web への示唆:

- QTE は gameplay server が request を発行し、client result を callback で戻す model が自然。ただし trust boundary と timeout を server で持つ。
- Particles / audio / cosmetics は asset names を public API にしやすいが、権利と moderation を伴うため、最初は official allowlist にする。
- Music は one-shot sound と異なる lifecycle を持つため、audio channel / ownership を分ける。

### 3.9 Texture packs

Bloxdy/texture-packs README は、texture pack folder と `_json/` encoding を分け、assets は base64 encoded JSON として game が fetch する構造を説明している。pack は `textures/*.png`, `skyBoxes/<name>/nx|ny|nz|px|py|pz.jpg`, `models/*.glb`, `css/*.css` を持つ。`npm run update-pack -- <packName> [--bump]` で JSON を再生成し、`--bump` は `metaData.version` を上げる。

cod-web への示唆:

- Resource pack は source folder と immutable encoded artifact を分けると cache/version 管理しやすい。
- GLB model overwrite と custom CSS は強力だが、cod-web では sandbox / CSP / size / extension / moderation が必要。
- Existing players への auto-update は version bump と known latest version の管理が必要。

## 4. General authoritative netcode references

Gabriel Gambetta と Valve Source docs は、cod-web 既存方針（authoritative server、input command、snapshots、prediction/reconciliation/interpolation、lag compensation）を補強する一般資料として扱う。

| Topic | 確認事項 | cod-web への翻訳 |
|---|---|---|
| Authoritative server | client は input/command を送り、server が world state / rules / positions を所有 | 既存 binary input path 維持。client state は予測・表示用 |
| Prediction | local player は input を即時 simulation し、server ack 後に未処理 input を replay | Phase 1/2 で input sequence / ack / replay buffer を明示する |
| Entity interpolation | remote entities は snapshot 間を「少し過去」で補間 | render timeline と simulation timeline を分ける |
| Lag compensation | hit validation 時に server が timestamp / latency / interpolation を考慮して過去 hitbox を参照 | hitscan FPS は history buffer と max rewind を仕様化する |
| Bandwidth | snapshots は delta compression / rate budget / packet loss を前提にする | AOI, channel, per-client budget を Phase 7 で定量化する |
| Tradeoff | tickrate 増加は CPU/bandwidth cost が増える。high-performance setting は逆効果になり得る | 競合の tickrate をそのまま真似ず、cod-web の負荷試験で決める |

Valve docs は `Source_Multiplayer_Networking` で default 20 snapshot/sec、66 tick の例、interpolation 100ms default、lag compensation history 1 second などの具体値を示す。ただし Source engine 固有値であり、cod-web の仕様値として採用しない。

## 5. Cross-competitor design patterns

| Pattern | Krunker | bloxd | cod-web 採用候補 |
|---|---|---|---|
| Platform-managed hosting | official docs で hosting/publish を提供 | live service details は未解析 | 採用。room/matchmaker/persistence は platform 層 |
| Server-authoritative UGC | server scripts, network API | callbacks, world APIs | 採用。UGC は capability sandbox |
| No-code logic | trigger events/conditions/actions | code blocks/boards are code-first | 採用候補。Phase 8 より前に schema 設計 |
| Typed capability APIs | network/storage/input/scene/ui modules | api methods/client options/settings | 採用。raw engine access は不可 |
| Per-player options | default/input/ui/player APIs | client options, entity settings | 採用。viewer-target state を明示 |
| Resource packs | mods/resources docs | texture-packs repo | 採用候補。ただし CSS/GLB は moderation 必須 |
| Chunk/world edit | not voxel-focused | chunk/block APIs | voxel Phase 7/8 で採用候補 |
| Budgeted synced entities | network rate limits | mesh entity / physics budget | 採用。physics budget は別枠 |
| Script time budgeting | not confirmed in Krunker docs fetched | `isNearInterrupt`, 20Hz tick | 採用。UGC runtime の必須条件 |

## 6. Recommendations

### 6.1 Near-term docs / architecture updates before implementation

1. `docs/arch/ugc.md` に、UGC capability categories を追加する。
   - `network`, `storage`, `input`, `ui`, `scene-visual`, `scene-server-auth`, `resource-pack`, `trigger-graph`, `qte`, `audio`, `entity-visibility`。
2. `docs/arch/protocol.md` に、UGC control message は realtime movement channel と分離する方針を明記する。
3. `docs/arch/client.md` に、local player prediction、remote entity interpolation、render-time delay、server reconciliation の用語を追加する。
4. `docs/arch/sim-profiles.md` に、voxel chunk raw data と committed world mutation API を分ける方針を追加する。
5. Phase 8 plan 作成時に、script time budget / cooperative yield / callback fallback / storage quota / entity budget を DoD 化する。

### 6.2 Do not adopt

- 競合の exact API names / callback names / asset names / skin names / sound names / UI class names。
- license file がない repo からの code / assets / generated JSON の流用。
- Krunker / bloxd の private protocol や live service behavior の推測実装。
- Source engine の tickrate / interpolation / lag compensation window の具体値を cod-web 固定値として直輸入すること。

### 6.3 Open questions

| ID | Question | 次の確認先 |
|---|---|---|
| DR3-OQ-1 | cod-web UGC runtime は JS/QuickJS 互換にするか、独自 DSL / WASM sandbox にするか | Phase 8 計画 |
| DR3-OQ-2 | Resource pack で CSS を許可するか。許可する場合の CSP / selector scope / font policy | `arch/editor.md`, `arch/ugc.md` |
| DR3-OQ-3 | voxel chunk size / vertical range / block id width / palette strategy | Phase 7 load test |
| DR3-OQ-4 | hitscan lag compensation の max rewind と fairness policy | FPS profile plan |
| DR3-OQ-5 | no-code trigger graph を Phase 8 に含めるか、editor MVP の早期機能にするか | editor plan |

## 7. Verification checklist

- [x] `web_search` は depth 3 のみ使用。
- [x] Krunker trigger-logic chunk 1 まで取得し、`hasMore: false` を確認。
- [x] Krunker scene API chunk 1 まで取得し、`hasMore: false` を確認。
- [x] Bloxdy/code-api 既存 clone の remote / HEAD / license file absence を再確認。
- [x] Bloxdy/code-api の追加 docs を全体確認した範囲でのみ記録。
- [x] Bloxdy/texture-packs 既存 clone の remote / HEAD / license file absence を再確認。
- [x] live service 接続解析、通信キャプチャ、production bundle 解析なし。
- [x] docs-only。実装コード変更なし。
