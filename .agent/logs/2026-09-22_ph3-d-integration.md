# PH3-D 統合 + docs + import境界 + quality gate

> Date: 2026-09-22(JST) / Commit: - / Branch: arena/01a0b161-cod-web

## 1. 指示内容 (Task Summary)

PHASE03_PLAN.md PH3-D: 統合 + docs + import境界 + quality gate

- gameserverが profile + gamemode注入、biome.json gamemodes/*→gamemode-apiのみ、coverage 85%維持、E2E discovery 11+維持、typecheck/lint/unit/build/determinism/heavy pass、task-list/HANDOFF/quality-gates更新

## 2. 実行内容 (Executed Actions)

| # | 対象 | 実装 |
|---|---|---|
| 1 | 現状把握 | git status/branch/log、task-list PH3-C済み次PH3-D、PHASE03_PLAN §10.4統合、types.md GameModeDefinition/RoomCtx、server.md Room/TickScheduler/レート制限、runtime.ts/handlers.ts/index.ts現状、biome.json gamemodes→sdkのみ既存、package.json gamemode依存なし、Room.ts broadcastExcept private |
| 2 | Sandbox再構築 | bun/node_modules消失 → `bash .agent/hooks/restore-sandbox-env.sh` → bun 1.4.0復旧 → `bun install` lockfile更新 (gamemode-api/sdk追加前) → `git fetch origin arena/01a0b161-cod-web` → `git reset --hard origin/arena/01a0b161-cod-web` → PH3-C 15dc71a復旧 |
| 3 | apps/gameserver/package.json | 依存追加: `@cod/gamemode-api: workspace:*`, `@cod/gamemode-sdk: workspace:*` |
| 4 | packages/engine-core/src/room/Room.ts | broadcastExcept private→public (PH3-D gamemode ctx用)、sendTo(playerId, data:string):boolean追加、sendBinaryTo(playerId, Uint8Array):boolean追加、try/catch例外安全、getPeersIterable維持、setGameModeBinding維持 |
| 5 | gamemodes/fps/official/ffa/index.ts | FpsCtx cast追加: `import { defineGameMode, type FpsCtx }` + `const fps = ctx as FpsCtx` でgetSpawnPoints/giveWeapon/setAmmo/randomIntを型安全に、typecheck pass |
| 6 | apps/gameserver/src/runtime.ts | 全面書き換え: import GameModeRuntime/Timer/ModeMessageRateLimiter/InputRateLimiter/SnapshotBroadcaster/Room/Simulation/createLCG/FpsCtx/PlayerRef/RoomState/Vec3WithYaw/createFpsSimProfile/ffaMode、STATIC_ARENA_SPAWNS 8点定義、GameServerRuntime interface拡張 (gameModeTimer/RateLimiter/Runtime/getRoomState/setRoomState/getTick/getPlayerRef/getPlayerRefs/createFpsCtx/getScore/setScore/_playerRefs/_scores/_weapons/_ammos)、createDefaultServerRuntimeでprofile+room+world+sim+snapshots+inputRate+timer+rateLimiter+roomState waiting+scores/teamScores/playerRefs/weapons/ammos Map+rng LCG 0x12345678+random/randomInt、getPlayerRefs/getPlayerRefByStringId (Number(id) NaN→loop search by ref.id)、createFpsCtxでtick=sim.currentTick() players=getPlayerRefs() FpsCtx実装 (random/randomInt/getPlayer/getPlayers/setScore/getScore/setTeamScore/broadcastHud JSON kind:hud/try/catch/send rateLimiter+sendTo/sendBinaryTo try/catch/broadcast string/binary exceptId分岐 try/catch/broadcastExcept同/after/every/cancel tick基準/setState/getState/giveWeapon/setAmmo/getSpawnPoints 8点/getZone undefined/raycast undefined)、GameModeRuntime生成 (roomId default/getTick/getState/setState/getPlayers/getPlayer/send/broadcast/broadcastExcept/nowMs Date.now())、room.setGameModeBinding、onRoomCreate waiting初期化 fire-and-forget例外安全 |
| 7 | apps/gameserver/src/handlers.ts | 全面書き換え: ServerDepsにgameModeRuntime/createFpsCtx/_playerRefs optional追加、openでPeer生成+room.join+PlayerRef id String(id) playerId id name Player{id}を_playerRefs.set+gameModeRuntime.onPlayerJoin例外安全、messageでstringならchatとしてonNetworkMessageへsafeCall例外安全+バイナリはingestInput+inputRate+sim.receiveInput、closeでonPlayerLeave+_playerRefs.delete+inputRate.remove+sim.removePlayer+snapshots.removePlayer+room.leave、createHandlersFromRuntimeヘルパー追加 |
| 8 | apps/gameserver/src/index.ts | runtime統合: createDefaultServerRuntime()でruntime取得、createHandlersFromRuntime、setIntervalでsim.update+before/after tickでsnapshots.maybeSend+gameModeRuntime.tickWithCtx例外安全+steps 0でもtimer消化、logにmode/gamemode追加 |
| 9 | _tests_/apps/gameserver/src/runtime-gamemode.test.ts | 新規 13 tests: profile+gamemode注入、spawn 8点、waiting→countdown→playing lifecycle (open 2人でcountdown+timer180 ticksでplaying)、mode例外でroom落ちない throwingMode onTick/onJoin/onNetworkMessage/timer、chat 200制限、Room sendTo/broadcastExcept public、FpsCtx全メソッド (random/randomInt min>max throw/getPlayer/getPlayers/setScore/getScore/setTeamScore/broadcastHud/after/every/cancel/setState/getState/giveWeapon/setAmmo/getSpawnPoints/getZone/raycast/send/broadcast/broadcastExcept string/binary)、send/broadcast with players rate limit、GameModeRuntime send/broadcast rate limit、handlers backward compat、getPlayerRefByStringId分岐 (numeric string+custom id loop search+nonexistent)、ctx例外安全 (broadcast throw/sendTo throw/sendBinaryTo throw/peer sendBinary throw)、gameModeRuntime全分岐 (broadcast string/binary existent/nonexistent, send nonexistent false, options broadcastExcept/send) |
| 10 | 検証 | typecheck pass、lint 117 files 0 warnings (116→117 +1 runtime-gamemode.test.ts)、test:unit 37 files 255 tests pass (36→37 +1 file, 242→255 +13 tests)、coverage 93.34%/86.82%/86.72%/94.83% thresholds 85 pass (PH3-C 93.42%/85.89%/85.4%/94.93%からruntime追加でStatements 93.34% Branches 86.82% Functions 86.72% Lines 94.83%維持)、build 1.00s pass、determinism pass、E2E list 11 pass |
| 11 | docs | task-list PH3-Dローカル検証済み100% evidence追加、roadmap Phase3 PH3-D完了 Phase3完了、HANDOFF.md全面更新 (Phase3完了・Phase4準備、D13-D16追加、事実確認PH3-D、完了サマリPH3-A〜D、quality gate現状)、quality-gates.md更新 (PH3-Dタスク、coverage表PH3-D追加、完了確認Phase3、追加ゲートPhase3)、skills/gamemode-api/SKILL.md更新 (統合完了 runtime/handlers/index/Room)、skills/index.md最終更新 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **Sandbox再構築でブランチがmainに戻る**: restore-sandbox-env.shは`git fetch origin <現在ブランチ>`→`reset --hard FETCH_HEAD`だが、FETCH_HEADがmainになることがある。`git ls-remote origin | grep arena`でoriginに15dc71aが存在することを確認し、`git fetch origin refs/heads/arena/01a0b161-cod-web:refs/remotes/origin/arena/01a0b161-cod-web` + `reset --hard origin/arena/01a0b161-cod-web`で復旧。package.jsonのgamemode依存追加でlockfileが変わり`bun install --frozen-lockfile`が失敗するので`bun install`でlockfile更新が必要。
- **FpsCtxの型狭め**: GameModeDefinitionのctxはRoomCtx = FpsCtx|VoxelCtx unionで、typeがfpsでもTSは自動でFpsCtxに狭めない。PH3-Cでは`biome.json`の`_tests_` non-null offのみでtypecheckが通っていたが、PH3-Dで`tsconfig.server.json`にgamemode-apiが含まれると`getSpawnPoints`がVoxelCtxにないエラーが出る。`import { type FpsCtx }` + `const fps = ctx as FpsCtx`でキャストして解消。理想はdefineGameModeのジェネリクスでctxをTに依存させるが、現行types.mdはRoomCtx unionなのでキャストが最小。
- **Roomのpublic化**: gamemode ctxのbroadcastExceptはRoomのprivateメソッドだったが、PH3-Dでpublic化が必要。sendTo/sendBinaryToも追加し、try/catchで例外安全に。RoomはL1なのでgamemodeに依存しないが、gamemodeのrateLimiterをsetGameModeBindingでバインドしleave時にremoveでメモリリーク防止。
- **FpsCtx実装の例外安全**: ctx.send/broadcast/broadcastExcept/broadcastHudはすべてtry/catchで握りつぶし、roomが落ちないように。sendはrateLimiter.allowチェック+room.sendTo/sendBinaryTo、broadcastはexceptIdの有無でbroadcastExceptとbroadcastを使い分け、binaryはpeers iterableで個別送信。after/every/cancelはGameModeTimerにnowTick=sim.currentTick()を渡してtick基準。
- **randomの決定論**: createLCG(seed)でseed固定0x12345678、random/randomIntはLCGから生成。welcomeでseed配布は将来、現行は固定seedで決定論。Math.random/Date.nowはsim/gamemodeには入れず、nowMsはGameModeRuntimeのrate limiter用にDate.now()を使うが、simの決定論には影響しない。
- **handlersのbackward compat**: 既存のhandlers.test.tsはgameModeなしで動作する想定なので、ServerDepsのgameModeRuntime/createFpsCtx/_playerRefsをoptionalにし、なければ旧来通り動作。createHandlersFromRuntimeでruntimeからhandlersを生成するヘルパーを追加し、index.tsではそちらを使う。
- **coverage 85%維持のコツ**: runtime.tsは分岐が多く33%からスタートしたが、13 testsで77%まで上げ、全体で93.34%/86.82%/86.72%/94.83%を維持。getPlayerRefByStringIdのNumber(id) NaN→loop search分岐、sendのrate limit false、broadcastのexceptId existent/nonexistent、binary/string両方、例外安全のtry/catchをテストでカバー。handlers.tsは98%維持、index.tsは84%だが許容。include-all方針で難しいファイルをexcludeせず、意味あるテストでカバー。
- **lint 0 warnings維持**: _tests_の`as any`は`suspicious/noExplicitAny`で警告になるが、`biome-ignore lint/suspicious/noExplicitAny: reason`で抑制。_tests_のnon-null offは既存だが、noExplicitAnyはoffにしない方がignoreの必要性が明確で、無駄なignoreが増えない。runtime-gamemode.test.tsのany 4件はignoreで0 warnings維持。

## 4. 次にすべきこと (Next Actions)

1. PH3-D完了でPhase 3全体完了。Phase 4計画作成 PLAT-4: ハブ + マッチメイカー + voxel 永続化方針。`docs/planning/PHASE04_PLAN.md`を_TEMPLATE準拠で作成、task-listにPH4-*追加、arch/milestones更新。
2. Phase 4では`/fps|voxel/{official|ugc}/<slug>` hierarchyをhub UIで表示、matchmakerのseat reservation入口、voxel永続化方針 (SQLite/ファイル)、official/ugc区分の明確化。
3. Phase 3の成果物を`docs/planning/complete/`へ移行するタイミングを検討 (PHASE03_PLAN.mdは完了済みだが、現行はplanning直下。DOC-9の方針に従い完了済みplanの整理)。
4. CIで`bun run test:e2e`のbrowser実行を実環境で一度実行し、11 testsの結果を記録。
