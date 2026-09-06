# DR-5: Perplexity DeepResearch 差分検証

> 実施日: 2026-09-06（Asia/Tokyo）  
> 対象: [`../Perplexity-AI.md`](../Perplexity-AI.md) と [`DR-1`](./DR-1_COMPETITOR_DEEP_RESEARCH.md)〜[`DR-4`](./DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md) の差分  
> 目的: Perplexity 側 DeepResearch に含まれる新規・相違・古い指摘を、公式/一次情報優先で検証し、cod-web に採用できる正確な情報へ整理する。  
> 制約: 競合 live service への接続解析、通信キャプチャ、production bundle / minified client 解析、競合コード・アセット・UI・商標の流用は行わない。

## 0. 結論

Perplexity 文書は、既存 DR-1〜DR-4 よりも **現行 cod-web の通信改善指摘**、**Krunker の matchmaker / client-side anti-cheat 由来の二次情報**、**Bun / Colyseus / Babylon / browser API の運用寄りメモ**が多い。一方で、競合の live endpoint や reverse-engineering 記事に寄った記述が混じるため、正本仕様へ直接入れるべきではない。

採用判断は次の通り。

| 分類 | 判断 |
|---|---|
| すでに DR-1〜DR-4 / arch で確認済み | Noa/Babylon 利用、Krunker UGC server authority、UGC NETWORK API の rate limit、QuickJS sandbox、GLB validation pipeline、WebSocket を当面使う方針 |
| Perplexity で有用に追加された内容 | Colyseus scalability/seat reservation の具体、Bun `reusePort` の位置づけ、Bun WS backpressure/compression/cork の公式確認、Krunker `settings.txt` の実在設定、Pointer Lock `unadjustedMovement`、Canvas `desynchronized` / `powerPreference`、Babylon thin instances / merge / freeze の注意点 |
| 現行 cod-web の再確認で古くなっていた指摘 | Input は 12B ではなく 16B。長さ検証、境界チェック、入力 rate limit、Bun `perMessageDeflate:false`、`backpressureLimit`、`send()` 戻り値、`subarray`、lagcomp record、fuzz は Phase 0 で修正済み |
| まだ正しい課題 | AOI 未実装、delta snapshot 未実装、matchmaker / room registry / seat reservation 未実装、WebTransport 未実装、zero allocation は hot path に残課題あり |
| 正本へ入れない/低信頼 | Krunker live matchmaker の endpoint 詳細、hashed WSS サブドメイン、social WS / msgpack、Vultr 等の hosting 推測、bloxd WebSocket / Cloudflare / lobby error 推測、チート/解析記事由来の client bundle / anti-cheat 詳細 |

## 1. 読了・照合範囲

### 1.1 Workspace 文書

- `docs/Perplexity-AI.md`（全体読了。ユーザー発話は `Perplexity-Al.md` だったが実ファイル名は `Perplexity-AI.md`）
- `docs/research/DR-1_COMPETITOR_DEEP_RESEARCH.md`
- `docs/research/DR-2_ADDITIONAL_SOURCE_RESEARCH.md`
- `docs/research/DR-3_DEEPER_COMPETITOR_RESEARCH.md`
- `docs/research/DR-4_ENGINE_AND_UGC_SOURCE_RESEARCH.md`
- `docs/task-list.md`
- `docs/planning/DEEP_RESEARCH_PLAN.md`
- 追加で現行コード/仕様確認: `package.json`, `server/index.ts`, `server/net/ingest.ts`, `server/net/rate-limit.ts`, `server/net/snapshot.ts`, `server/sim/Simulation.ts`, `server/net/lagcomp-store.ts`, `server/room/Room.ts`, `shared/protocol/binary.ts`, `shared/protocol/packer.ts`, `shared/protocol/constants.ts`, `src/game/net/GameClient.ts`, `src/game/net/websocket.ts`, `src/game/net/interpolation.ts`, `src/game/net/prediction.ts`, `docs/arch/protocol.md`, `docs/arch/server.md`, `docs/arch/adr.md`, `docs/arch/api-sources.md`

### 1.2 追加 Web 調査（depth 3）

| 種別 | URL | 確認したこと | 扱い |
|---|---|---|---|
| 公式 | <https://bun.com/docs/runtime/http/websockets> | Bun server WS は `perMessageDeflate`, `backpressureLimit`, `closeOnBackpressureLimit`, `sendPings`, `maxPayloadLength`, `idleTimeout` を持つ。`send()` は `-1/0/1+`。`ServerWebSocket#cork` あり。browser client 側の backpressure 制御は不可。 | `api-sources.md` 反映済み/補強 |
| 公式 | <https://bun.com/guides/http/cluster> | `Bun.serve({ reusePort: true })` は同一 port を複数 process で共有し、Linux では SO_REUSEPORT/SO_REUSEADDR で load balance。Workers の共有メモリではなく process 分散として扱う。 | 追記候補 |
| 公式 | <https://docs.colyseus.io/matchmaker> | SDK join は matchmaker を通り seat reservation を返す。`filterBy`, `sortBy`, realtime listing, server-side matchMaker API がある。 | 既存確認の補強 |
| 公式 | <https://docs.colyseus.io/scalability> | Redis presence/driver が scaling に必要。Room は単一 process 所属。join は seat reservation → WebSocket 接続の 2 段階。process ごと public address。PM2 は fork mode 推奨。 | 追記候補 |
| 公式 | <https://krunker.io/docs/settings.txt> | `lagComp`, `shaderRendering`, `resolution`, `updateRate`, `antiAlias`, `noTex`, `shadows`, `shadowsDynamic`, `showPing`, `showFPS`, `servSendR` 等の設定キーが実在。 | research 参考。Krunker UI/設定の直輸入はしない |
| 公式 | <https://docs.krunker.io/guides/multiplayer-networking> | KrunkScript は client/server context を分離し、server authority を推奨。NETWORK は message ID 10 chars、data 2000 bytes、broadcast 10 msg/s、server→client 20 msg/s、client→server 40 msg/s。 | 既存確認の補強 |
| 公式 | <https://docs.krunker.io/api/network> | `GAME.NETWORK.broadcast/send` は UGC/KrunkScript 向け API。core realtime protocol とは同一視しない。 | 既存確認の補強 |
| 公式 | <https://docs.krunker.io/guides/data-storage> | Storage は server-side only、set/update/transact 10 秒に 1 回/player、load 5 回/connection、key 30 個/20 chars。 | 既存確認の補強 |
| 公式 | <https://developer.mozilla.org/en-US/docs/Web/API/Element/requestPointerLock> | `requestPointerLock({ unadjustedMovement:true })` は OS mouse acceleration を無効化する raw mouse input 用 optional。Limited availability / fallback 必須。 | `api-sources.md` 反映済み |
| 公式 | <https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext> | WebGL context attributes に `desynchronized`, `antialias`, `powerPreference`, `preserveDrawingBuffer` 等がある。`desynchronized` は latency hint。 | `api-sources.md` 補強 |
| 公式 | <https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/thinInstances> | Thin instances は JS object を作らず多数描画に有利。ただし all-or-nothing visibility、追加/削除コスト、静的多数向け。 | 採用候補の精密化 |
| 公式 | <https://doc.babylonjs.com/typedoc/classes/BABYLON.Mesh> | `freezeWorldMatrix`, `thinInstance*`, `MergeMeshes*` などを typedoc で確認。 | `api-sources.md` 反映済み/補強 |
| 公式 | <https://agones.dev/site/docs/reference/gameserverallocation/> | `GameServerAllocation` は GameServer を atomic に allocation し、Allocated state へ移す。selectors / scheduling / metadata あり。 | 将来 infra 参考。初期採用しない |
| 一次/著者記事 | <https://gafferongames.com/post/snapshot_compression/> | snapshot 60Hz は高帯域。量子化、baseline ack 付き delta、changed indices、bit packing の考え方。UDP 前提の細部は直輸入しない。 | 一般化パターンとして採用 |
| 二次/UGC 支援 | <https://www.bloxdforge.com/studio/wiki/guides/coding-guide> | BloxdForge は Bloxd scripting について 16,000 char limit、sandbox、DOM/network 制限を述べる。公式 bloxd.io ではない。 | 二次情報。設計参考のみ |
| 二次/解析記事 | <https://jakob.space/blog/browser-games-aren-t-an-easy-target.html> | 2020 年時点の Krunker を mitmproxy / browser debugger で解析し、WASM が JS を生成する等を述べる。 | reverse-engineering 由来。設計根拠にはしない |

### 1.3 clone 済み GitHub 根拠（今回再確認したもの）

今回、既存 clone の state を再確認した。新たな GitHub clone は行っていない。

| repo | clone path | remote | HEAD | license | 読んだ/再読したファイル |
|---|---|---|---|---|---|
| Bloxdy/code-api | `/tmp/cod-web-research/code-api` | `https://github.com/Bloxdy/code-api.git` | `675b56d94a2d56bb19924ff7a8dfa83710105536` | license file なし | `README.md` |
| Bloxdy/texture-packs | `/tmp/cod-web-research/texture-packs` | `https://github.com/Bloxdy/texture-packs.git` | `cdb31ca160f0db2bcb1d1443261feef1708620ab` | license file なし | path/HEAD/license file 有無のみ再確認（内容は DR-3/DR-4 記録済み） |

`code-api` README から確認できるのは、Code Blocks / Boards、world owner 限定、`api.*` でゲームを操作、`myId`/`playerId`/`thisPos` 等の global、`Date.now()` / `api.now()` が ms を返す、コメント制約、API 型一覧である。20TPS はこの README だけでは確認できない。

## 2. Perplexity 差分の項目別検証

### 2.1 bloxd / Noa / UGC

| Perplexity の主張 | DR-1〜DR-4との差 | 検証結果 | 正確な扱い |
|---|---|---|---|
| bloxd は Noa + Babylon 系 | DR-1/DR-4 で Noa/Babylon は確認済み | Noa 公式 repo/npm は Babylon を使う。bloxd 本体が現在もどの fork/version かは公式一次情報では未確定。 | 「Noa/Babylon 系とされる」は可。「現在の bloxd 内部 version」は断定しない |
| bloxd は 20TPS | DR-1〜DR-4 では未確定 | `Bloxdy/code-api` README には 20TPS 記述を確認できなかった。検索結果の deepwiki は二次自動解析。 | 低信頼。cod-web は既存の 60Hz server sim / 30Hz snapshot を維持し、UGC `tick(ms)` API は将来独自に決める |
| BloxdForge: Code Block 16,000 chars、sandbox、DOM/network 制限 | 既存 DR では薄い | BloxdForge page で確認。ただし公式 bloxd.io ではない。 | UGC sandbox 設計の参考。正本は QuickJS `ctx` API と独自上限で決める |
| Bloxdy forks / texture-packs | DR-3/DR-4 で確認済み | `code-api` / `texture-packs` clone は license file なし。README 観察に留める。 | コード/asset 流用不可。API 思想だけ参考 |
| bloxd WebSocket / Cloudflare / room creation error / VPN bot filter | 既存 DR では未確認 | 公式一次情報が不足。live service 調査は禁止。 | research では「未検証・二次/推測」。仕様へ入れない |

### 2.2 WebSocket/TCP で realtime FPS/voxel を成立させる一般論

| Perplexity の主張 | 検証結果 | cod-web への正確な反映 |
|---|---|---|
| TCP/WebSocket でも 20〜60Hz 程度なら成立し得る | Bun WS 公式は server-side WebSocket と backpressure 制御を提供。Gambetta/Valve/Gaffer は client prediction / reconciliation / interpolation / snapshot compression の一般原則を示す。 | ADR-005 の「今は WebSocket のみ」を維持。WT は Phase 9 条件付き。HOL はアプリ層で payload サイズ、優先度、補間遅延、backpressure で緩和 |
| delta compression / AOI / quantization が必要 | Gaffer snapshot compression は baseline ack 付き delta の必要性を説明。現行 `shared/protocol/constants.ts` は量子化済みだが、`server/net/snapshot.ts` は全員送信・delta なし。 | Phase 7 以降で AOI / delta を実装候補。現時点の小人数 Phase 1 では必須前提にしない |
| TCP_NODELAY を設定する | Bun 公式 WS docs に portable な TCP_NODELAY option は確認できない。uWebSockets 内部挙動を Bun API 外から前提にしない。 | `TCP_NODELAY` を cod-web 実装要件にしない。Bun 公式 API に出たら再調査 |
| `perMessageDeflate:false` | Bun 公式で option 確認。現行 `server/index.ts` は `perMessageDeflate: false`。 | 正しい。高頻度小バイナリでは明示 false を維持 |
| backpressure は `bufferedAmount` ではなく `send()` 戻り値 | Bun 公式で `send()` の `-1/0/1+` を確認。現行 `server/net/snapshot.ts` は `sendBinary` 戻り値を扱い、`bufferedAmount` は使わない。 | 正しい。browser client の `bufferedAmount` と Bun server の API を混同しない |
| Bun `reusePort` / multi-process | Bun guide で `reusePort:true` は同一 port を複数 process で共有し Linux で load balance と確認。 | 将来 room node を複数 process 化する選択肢。in-memory room は共有されないため Redis/registry/seat reservation 必須 |
| Colyseus の seat reservation / scaling | 公式 docs で matchmaker が seat reservation を返し、scaling には Redis presence/driver、Room は単一 process と確認。 | Colyseus を依存導入せず、思想として `matchmaker.md` の HMAC ticket + room registry に反映 |
| Agones | 公式 docs で GameServerAllocation は atomic allocation を提供。Kubernetes 運用寄り。 | 初期は過剰。リージョン/auto-scale が必要になる将来の infra 参考 |

### 2.3 現行 cod-web への Perplexity 指摘の再監査

Perplexity 文書の cod-web レビューは、Phase 0 完了前の状態を含んでいる。現在の repository HEAD では次のように再分類する。

| 指摘 | 現行確認 | 判定 |
|---|---|---|
| Input が 12B | `shared/protocol/constants.ts` / `packer.ts` は `INPUT_PACKET_BYTES = 16`。layout は type/reserved/seq/move/yaw/pitch/buttons/dtMs。 | 古い/不正確 |
| 長さ検証なし・短 packet で落ちうる | `BinaryReader.need()` が不足を `ProtocolError` にし、`decodeInput` は長さ厳密一致。`server/index.ts` は catch して close。 | 修正済み |
| rate limit なし | `server/net/rate-limit.ts` の input 90/s burst 20 を `server/index.ts` が使用。 | 修正済み |
| `perMessageDeflate` 未確認 | `server/index.ts` は `perMessageDeflate:false`。 | 修正済み |
| backpressure が実質動かない/`bufferedAmount` 依存 | `server/net/snapshot.ts` は `send()` 戻り値相当を受け、`-1` pause、`0` disconnect。`bufferedAmount` は不使用。 | 修正済み |
| `slice` copy が hot path に残る | snapshot 送信は `u8.subarray(0, bytes)`。client send も `subarray`。 | 該当箇所は修正済み |
| lagcomp 未接続 | `Simulation.step()` が毎 tick `this.lagComp.record(...)`。ただし射撃巻き戻し判定は未実装。 | record は修正済み。判定は後続 |
| fuzz/悪意 packet 検証なし | task-list は PH0-F で 1e6 fuzz / 72 tests を完了として記録。 | 修正済み |
| AOI なし | `SnapshotBroadcaster` は `room.getPlayers()` 全員を全員へ送信。 | まだ正しい課題 |
| delta なし | snapshot wire は type/tick/ack + player list。baseline/delta は未実装。 | まだ正しい課題 |
| 単一 Room / single process | `server/index.ts` は module-level `const room = new Room()`。matchmaker/seat reservation 未実装。 | まだ正しい課題 |
| clock sync / time sync なし | `GameClient` は receipt time ベース補間。protocol の TimeSync は理想仕様で未実装。 | まだ正しい課題 |
| zero allocation 方針違反 | `Room.getPlayers()` は array を作り、`SnapshotBroadcaster` は `players.map(...)` を使う。slice copy は直ったが zero allocation は未達。 | まだ正しい課題。ただし Phase 1/7 の最適化課題 |
| WebTransport 未実装 | `NetTransport` は抽象あり、実装は `WebSocketTransport` のみ。 | 意図通り。ADR-005 維持 |
| `docs/TECH_SELECTION.md` と矛盾 | 現行 tree に `docs/TECH_SELECTION.md` / `tech-selection.md` は存在しない。 | 古い/不正確 |

補足: `docs/arch/protocol.md` の理想 snapshot type は `0x11` だが、現行 constants は `MSG_S2C_SNAPSHOT = 2` とコメントで「現行ワイヤ（フェーズ 0 では変えない）」としている。これは Phase 1 の `Channel` 導入で整理する対象であり、Perplexity 指摘の主旨とは別の既知移行差分。

### 2.4 Krunker matchmaker / protocol / hosting 系

| Perplexity の主張 | 検証結果 | 正確な扱い |
|---|---|---|
| `matchmaker.krunker.io/game-list` / `seek-game` 等 | 2020 年の jakob.space 記事や GitHub gist/非公式 API で言及はある。ただし live endpoint へアクセスして検証することは、本調査の禁止境界に近い。 | 「二次/非公式に観測例あり」。cod-web は endpoint 名や JSON 形を真似ない。matchmaker 概念だけ独自設計 |
| `validationToken` / hashed WSS subdomain | 公式 docs では未確認。記事/非公式観測・過去時点依存の可能性。 | 採用不可。secret/token 付き seat reservation という一般化だけ採用 |
| social WS / msgpack | 公式 docs では未確認。 | 採用不可。chat/social は独自 protocol |
| Vultr / Cloudflare / express など hosting | Reddit / builtwith 系の推測が混じる。 | 低信頼。infra 方針へ入れない |
| client-side WASM/obfuscation/anti-cheat | jakob.space は 2020 時点の reverse engineering 記事として確認。AnticheatJS 等は cheat/解析文脈。 | anti-cheat の教訓は「client を信用しない」。具体実装・回避手法は使わない/記録しない |
| Krunker core tickrate | 公式 docs で core tickrate は確認できない。`settings.txt` に `updateRate` 等はあるが意味は公式仕様として説明されていない。 | core realtime 数値は断定しない。cod-web 独自予算で決める |
| KrunkScript NETWORK rate limits | 公式 docs で UGC API として確認。 | DR-3 と同じく UGC API の上限参考。core protocol とは別 |

### 2.5 Krunker settings / client performance

| Perplexity の主張 | 検証結果 | cod-web への反映 |
|---|---|---|
| Krunker `settings.txt` に graphics/input/network key がある | 公式 `https://krunker.io/docs/settings.txt` で `lagComp`, `resolution`, `updateRate`, `antiAlias`, `lowSpec`, `noTex`, `renderDist`, `shadows`, `shadowsDynamic`, `showPing`, `showFPS`, `servSendR` 等を確認。 | UX 参考。名称/値をそのまま使わず、cod-web 独自 settings schema を作る |
| draw calls < 100 | 競合由来数値としては公式確認できない。Babylon 公式は thin instances / merge / freeze 等の一般最適化を示す。 | 目標値は実測に基づいて `engineering.md` で決める。手法は採用候補 |
| `unadjustedMovement` | MDN で確認。Limited availability。 | PH1-E で試行し、NotSupported/非 Promise 実装へ fallback |
| Canvas `desynchronized`, `powerPreference` | MDN で context attributes として確認。 | Babylon `EngineOptions` に無い key を invent しない。必要なら canvas/context 側 feature detect |
| Babylon thin instances / merge / freeze | Babylon docs で確認。thin instances は静的多数向けで all-or-nothing visibility 等の制約あり。 | voxel chunk / static props / grass 等に候補。動的 player/entity へ無差別適用しない |
| GC を 1 frame も起こさない | 方針として妥当だが現行コードはまだ hot path allocation あり。 | Phase 1/7 で object pool/ring buffer/SoA などへ継続改善 |

### 2.6 UGC / GameMode API / ハブ設計

Perplexity 文書末尾には、ユーザーとの過去問答風に以下の意図が含まれていた。これは既存 user constraints と arch に反映済みであり、今回新たに覆す必要はない。

- Game Type は `voxel` と `fps` の 2 種。`official` / `ugc` は type ではなく区分。
- 階層は `/fps/official/pvp`, `/fps/official/zombie`, `/fps/ugc/athletic`, `/voxel/official/survival`, `/voxel/official/bedwars`, `/voxel/ugc/athletic` 等。
- エディタは Babylon.js で作り、GLB 読み込み対応予定。
- voxel official は Minecraft 風 terrain generation を独自に再現し、Noa engine を使って実装する。
- UGC は最終的にユーザーも GameMode / map / world を作れるようにする。

追加で正確化すべき点は次だけ。

| 項目 | 正確化 |
|---|---|
| UGC sandbox | BloxdForge の 16k char は二次参考。cod-web は QuickJS + `ctx` object + `allowFs:false` / `allowFetch:false` / timeout / memory limit を正本にする |
| GameMode API | `import`, I/O, async, global mutation, raw socket を許さない方向は妥当。ただし API 詳細は Phase 3/8 の実装時に、2 つ目の mode まで作ってから再設計する（ADR-010） |
| room lifecycle | Colyseus の seat reservation は一般化して採用可。Krunker live endpoint 形は採用しない |
| moderation | GLB upload は glTF Validator report + transform recipe/hash 保存（DR-4）を維持。UGC code は timeout/OOM/context destroy を必須化 |

## 3. 設計へ採用する差分

### 3.1 すぐ arch/api-sources へ反映する一次情報

- Bun `reusePort` official guide
- Colyseus scalability official docs
- Krunker `settings.txt` official URL
- MDN Canvas `getContext` attributes
- Babylon thin instances official docs
- Agones GameServerAllocation official docs（将来参考として）

### 3.2 research に留める情報

- BloxdForge coding guide（第三者 UGC 支援サイト）
- Krunker matchmaker endpoint 名/JSON/validation token/hashed WSS 等（非公式・live service 観測由来）
- Krunker anti-cheat/WASM/obfuscation 詳細（reverse-engineering/cheat 文脈）
- hosting provider 推測
- bloxd WebSocket / Cloudflare / lobby error 推測

### 3.3 今後のタスク化候補

| 候補 | 理由 | 推奨フェーズ |
|---|---|---|
| AOI / delta snapshot の実装計画を Phase 7 に細分化 | Perplexity 指摘は正しく、現行 full snapshot は scale しない | Phase 7 |
| room registry + HMAC seat reservation | Colyseus 公式 scaling と ADR-008 から優先度高 | Phase 4 |
| Bun `reusePort` 検証 | 単一 process 限界後の local scale option。ただし in-memory room 分散問題がある | Phase 4/7 |
| client settings schema | Krunker settings は項目設計の参考になる | Phase 1/5 |
| Babylon performance recipe | thin instances / merge / freeze / GLB transform を実測で使い分ける | Phase 1/5/7 |
| UGC sandbox spec v0 | QuickJS と BloxdForge 的上限の一般化 | Phase 3/8 |

## 4. 更新方針

この DR-5 では実装コードは変更しない。仕様への反映は一次情報だけを `api-sources.md` に索引として追記し、競合固有または二次情報は research に隔離する。Perplexity の古い cod-web 指摘は、現行コードを根拠に「修正済み / まだ課題 / 不正確」に再分類した。
