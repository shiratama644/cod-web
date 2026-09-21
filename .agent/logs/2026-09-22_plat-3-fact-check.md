# PLAT-3 Fact Check — Phase 3計画の事実確認

> Date: 2026-09-22(JST) / Branch: arena/01a0b161-cod-web / Commit: 24cd39e + updates
> 対象: docs/planning/PHASE03_PLAN.md, docs/arch/*, packages/*, official docs

## 1. 指示内容

- 事実確認: PHASE03_PLANが既存arch/codeと矛盾しないか、外部API記述が公式と一致するか
- 不明瞭点は ask_user + web_search + fetch_page で確認
- ユーザー回答を計画に反映

## 2. 実施した事実確認

### 2.1 コードベース現状

| 項目 | 事実 | 証拠 | 計画との整合 |
|---|---|---|---|
| `engine-core` L1純度 | `Room.ts` は `SimProfile` の `typeSpec`/`createPlayerState` のみPick、profile-fps import 0 | `grep -R "profile-fps" packages/engine-core --include="*.ts"` 0件 | OK、PH3-Aで gamemode-api も L1 として許可、profile-*禁止維持 |
| `SimProfile` contract | `typeSpec`, `createWorld`, `createPlayerState`, `stepPlayer`, `createIdleInput`, `writeSnapshot` | `packages/engine-core/src/profile/SimProfile.ts` | OK、gamemodeは別レイヤー、SimProfileは維持 |
| `TYPE_SPECS` | fps 60/60/30 max 16, voxel 30/30/15 max 16 | `type-specs.ts` | OK、PH3のafter/everyはsimHzから換算 |
| `RateLimiter` | `InputRateLimiter` のみ存在、90/s burst 20 | `rate-limit.ts` | 計画の gamemode 40/20 は新規追加、server.md 表と一致、要PH3-Bで拡張 |
| `Room` | `join(peer: Peer): number|null`, `leave(id)`, `getPlayersIterable()`, `getPeersIterable()`, maxPlayersはprofile.typeSpec.maxPlayers由来 | `Room.ts` | OK、GameModeRuntime統合はRoom拡張で可能、doTickは現状無いがserver.md仕様ではRoomManagerがtickIfDueを呼ぶ想定、PH3-Bで実装 |
| `FpsSimProfile` | `createWorld` seamあり、`stepPlayer`, `writeSnapshot` は現行16B layout維持、spawnPoints無し | `FpsSimProfile.ts` | 計画の「map名のみ、spawnPointsはctx.getSpawnPoints()経由」は新規要件、profile-fps拡張が必要、PH3-A/Bで対応 |
| `protocol` constants | `MSG_C2S_INPUT 0x10`, `MSG_S2C_SNAPSHOT 2`, `Channel Reliable 0/Unreliable 1/Bulk 2`, `INPUT_PACKET_BYTES` 16B固定 | `constants.ts` | OK、ModeMessage 0x20はprotocol.md定義済み、planのMSG_C2S_GAMEMODE仮定義は不要、0x20を使う |
| `architecture.md` 理想 | `gamemodes/* → gamemode-sdkのみ`, `packages/gamemode-sdk` が L3 が import する唯一 | `architecture.md` | 計画当初は gamemode-api のみ、ユーザー確認で both (api core + sdk facade) に修正、整合 |
| `types.md` GameModeDefinition | id `/^[a-z][a-z0-9-]{2,31}$/`、type fps|voxel、source official|ugc、slug、min/max 1..64、world FpsWorldSpec/VoxelWorldSpec、hooks onRoomCreate/Destroy etc | `types.md` | OK、planのid検証は正、world specはFpsWorldSpecを参照、PH3-Aで具体化 |

### 2.2 公式ドキュメント検証 (web_search + fetch_page)

| 項目 | 公式URL | 検証結果 | 計画への反映 |
|---|---|---|---|
| Bun.serve websocket | https://bun.com/docs/runtime/http/websockets | `websocket.data` に型を置く、generic引数ではない、send戻り値 -1/0/1+、options maxPayloadLength/idleTimeout/backpressureLimit/closeOnBackpressureLimit/sendPings/perMessageDeflate/drain/open/message/close/error、uWS内部 | OK、networking/SKILL.mdとserver.md記載は正、PHASE03_PLANのBun記述も正 |
| Biome noRestrictedImports | https://biomejs.dev/linter/rules/no-restricted-imports/javascript/ | `linter.rules.style.noRestrictedImports`、options.paths、importNames/allowImportNames、patterns group、recommendedではないため明示有効化必要 | OK、import-boundaries/SKILL.md記載は正、PH3-Dで `gamemodes/* → @cod/gamemode-sdkのみ` をBiomeで強制可能 |
| Babylon EngineOptions | https://doc.babylonjs.com/typedoc/interfaces/BABYLON.EngineOptions | EngineOptionsはAbstractEngineOptions + WebGLContextAttributes継承、antialias/alpha/depth/desynchronized/powerPreference/premultipliedAlpha/preserveDrawingBuffer等はWebGLContextAttributes由来、adaptToDeviceRatio/audioEngine/deterministicLockstep等はEngineOptions固有 | OK、babylon-engine/SKILL.mdの「thinEngine.pureからimport、desynchronized/preserveDrawingBufferは型に無いのでPH1-Dでは渡さない」は installed .d.ts では一部異なるが公式typedocでは存在、PH1-D時点の判断は妥当、PH3では影響なし |

### 2.3 不明点のユーザー確認 (ask_user)

| 質問 | 選択肢 | ユーザー回答 | 計画への反映 |
|---|---|---|---|
| package_name | sdk / api / both | both (sdk facade, api core) | PHASE03_PLAN更新: gamemode-api core + gamemode-sdk facade、gamemodes/*はsdkのみ |
| ffa_id | ffa / pvp / both | both文脈活かしつつIDをfps-official-ffaに集約、pvpエイリアス | 更新: ffa主、pvpはre-exportエイリアス、URL /fps/official/ffa主、/fps/official/pvpも同じモード |
| async_hooks | sync_only / allow_async / hybrid | hybrid: 初期化・破棄・イベントのみasync、ゲームループはsync | 更新: onRoomCreate/Destroy, onPlayerJoin/Leave, onNetworkMessageのみ async許可、他 syncのみ、決定論維持 |
| world_spec | static_arena / new_map / ctx_spawn | ctx_spawn: map名のみ、spawnPointsはFpsCtx.getSpawnPoints()経由 | 更新: world specはmap名のみ、spawnPointsはprofile-fpsからctx経由取得 |

### 2.4 追加で判明した矛盾・要修正

| # | 問題 | 対応 |
|---|---|---|
| 1 | `RoomManager` / `TickScheduler` がコードに存在しない、server.mdの仕様のみ | PH3-Bで `GameModeTimer` を `engine-core/src/gamemode/` に新規作成、Room拡張で `doTick` 的な tick消化を実装、既存RoomにはmaxPlayersしか無いため拡張必要 |
| 2 | `FpsSimProfile` に spawnPoints が無い | PH3-Aで `FpsSimProfile` に `getSpawnPoints()` 的な API を追加するか、gamemode-apiのFpsCtxがprofile-fpsのworldから取得する形でPH3-Bで実装 |
| 3 | `MSG_C2S_GAMEMODE` 仮定義は不要、protocol.mdに `ModeMessage 0x20` 既存 | PH3-Bで `ModeMessage 0x20` を使う、rate limit 40/20はserver.md表通り |
| 4 | `defineGameMode` の id regex `/^[a-z][a-z0-9-]{2,31}$/` は types.md と一致、fps-official-ffaは16文字でOK | 検証済み、正 |
| 5 | coverage thresholds 85%はEM02で達成済み95.12%/87.97%/90.7%/96.8%、PH3で下がらないようにinclude-all維持 | PH3-A/B/C/Dでテスト追加時もhandlers/babylonDeps分離パターン維持 |

## 3. 気づいたこと・知見

- **Bun公式は `data` propertyでws.dataを型付け**: 旧 `Bun.serve<MyData>` は廃止、TS limitationで `websocket: { data: {} as MyData }` が正。networking/SKILL.mdは既に正しく記載、PHASE03_PLANも正。
- **Biome patternsは `import-foo/*` + `!import-foo/bar` で否定可能**: gamemodes/* → sdkのみ制限は `patterns` でも可能だが、単純に `paths` で `@cod/gamemode-api` 以外を禁止するより `gamemodes/*` のincludesで `noRestrictedImports` を設定する方が明確。PH3-Dでbiome.jsonに `overrides: [{ include: ["gamemodes/**/*"], linter: { rules: { style: { noRestrictedImports: { paths: { "@cod/engine-core": "use sdk", "@cod/protocol": "use sdk", "@cod/profile-fps": "use sdk" } } } } }]` 的に設定可能。
- **Babylon EngineOptionsはWebGLContextAttributes継承**: alpha/antialias等はWebGL由来、desynchronized等も公式typedocでは存在するが、installed .d.ts のバージョン差でPH1-D時点では出ていなかった。PH3では影響なし、babylon-engine/SKILL.mdの注意は維持。
- **ユーザー回答の hybrid async は UGC 観点で最適**: 初期化・破棄・イベントはasync許可でworldロード等可能、ゲームループonTick/onSpawn/onDeath/onHit等はsyncで決定論維持。types.mdの `void | Promise<void>` を全hooksで許可していたが、PH3では絞ることで決定論を守れる。
- **spawnPointsをctx経由にすることで gamemode と profile の結合を疎に**: world specはmap名のみ、spawnPointsはFpsCtx.getSpawnPoints()でprofile-fpsから取得、gamemodeはmap名に依存せずspawnロジックをctx経由で実装できる。PH3-Cのffaはstatic-arena再利用でOK。
- **ffa主 pvpエイリアスは editor.md hierarchy と両立**: `/fps/official/ffa` 主、`/fps/official/pvp` は同じモードが動くエイリアス、IDはfps-official-ffaに集約。types.md例 `fps-official-pvp` は将来pvp専用モードを作る時に再利用可能。

## 4. 次にすべきこと

1. PHASE03_PLAN.md の事実確認結果を反映した更新を commit/push（本ログと同時）。
2. PH3-A着手: `packages/gamemode-api` + `packages/gamemode-sdk` 作成、define validation tests。
3. PH3-B: GameModeRuntime + Timer + RateLimiter、exception safety / tick / rate limit tests。
4. PH3-C: ffa + pvpエイリアス、spawn/score/round lifecycle tests。
5. PH3-D: 統合 + biome.json gamemodes/*→sdkのみ + docs + quality gate 85%維持。
