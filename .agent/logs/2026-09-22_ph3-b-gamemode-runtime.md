# PH3-B GameModeRuntime + Tick timer + RateLimiter

> Date: 2026-09-22(JST) / Commit: - / Branch: arena/01a0b161-cod-web

## 1. 指示内容 (Task Summary)

PHASE03_PLAN.md PH3-B: `GameModeRuntime` + Tick timer + RateLimiter

- `GameModeRuntime` が例外安全（mode例外でroomが落ちない）、after/every/cancel tick基準（setTimeout禁止）、gamemode message rate 40/s burst 20超過時false、Room統合
- tests for exception safety / timer tick / rate limit / broadcast false

## 2. 実行内容 (Executed Actions)

| # | 対象 | 実装 |
|---|---|---|
| 1 | 現状把握 | git status/branch/log、task-list PH3-A済み次PH3-B、PHASE03_PLAN §10.2 Runtime/Timer/RateLimiter設計、types.md GameModeDefinition、server.md modeMessage 40/20、engine-core/src/room/Room.ts、net/rate-limit.ts InputRateLimiter 90/s burst20、gamemode-api types BaseCtx after/every/cancel/send/broadcast |
| 2 | packages/engine-core/src/net/rate-limit.ts | MODE_MESSAGE_RATE_PER_SEC=40, MODE_MESSAGE_RATE_BURST=20追加、ModeMessageRateLimiter新規 (string id, TokenBucket再利用、allow/allowNumber/remove/removeNumber)、InputRateLimiter維持 |
| 3 | packages/engine-core/src/gamemode/GameModeTimer.ts | 新規: after(ticks,cb,nowTick) returns id, every(ticks,cb,nowTick) returns id (min 1), cancel(id), tick(nowTick)で期限収集→実行、例外は握りつぶし、setTimeout不使用、size/clear、after 0即時 |
| 4 | packages/engine-core/src/gamemode/GameModeRuntime.ts | 新規: def/options/timer/rateLimiterを保持、safeCall(K,...args) async例外安全 (Promise catch)、safeCallSync sync例外安全、tick(dtMs,nowTick)でtimer.tick+onTick最小ctx、tickWithCtx(ctx,dtMs,nowTick)、sendGameModeMessage(id,data) rate limit超過時false、broadcastGameModeMessage(data,exceptId?)で各player rate check、onPlayerJoin/Leave、onRoomCreate/Destroyでtimer.clear+rateLimiter.remove、createMinimalCtxでafter/every/cancel/send/broadcastをtimer/rateLimiterへ委譲 |
| 5 | packages/engine-core/src/gamemode/index.ts | barrel export Timer/Runtime + MODE_MESSAGE constants + ModeMessageRateLimiter re-export |
| 6 | packages/engine-core/src/index.ts | export * from './gamemode/index' 追加 |
| 7 | packages/engine-core/src/room/Room.ts | GameModeRoomBinding interface追加 (rateLimiter remove/removeNumber)、gameModeBinding field、setGameModeBinding/getGameModeBinding、leaveでrateLimiter.remove(String(id))+removeNumber(id)クリーンアップ、メモリリーク防止 |
| 8 | tsconfig.base.json | paths追加: @cod/gamemode-api, @cod/gamemode-api/*, @cod/gamemode-sdk, @cod/gamemode-sdk/*, @cod/gameserver, @cod/gameserver/* |
| 9 | tsconfig.server.json | include追加: packages/gamemode-api/src, packages/gamemode-sdk/src, _tests_/packages/gamemode-api |
| 10 | _tests_/packages/gamemode-api/src/defineGameMode.test.ts | (defineGameMode as any)でinvalid inputをany cast、tscエラー解消、biome-ignore維持 |
| 11 | _tests_/apps/gameserver/src/handlers.test.ts | close(code?: number, reason?: string)でimplicit any解消 |
| 12 | _tests_/packages/engine-core/gamemode/ | 新規3ファイル: GameModeTimer.test.ts 8 tests (after/every/cancel tick基準、setTimeout不使用検証、例外安全、size/clear、0 tick即時)、ModeMessageRateLimiter.test.ts 8 tests (定数40/20、burstまでOK超過false、1秒後再充填、player別独立、remove後戻る、40/s持続、超過false、TokenBucket)、GameModeRuntime.test.ts 11 tests (onTick/onRoomCreate/onPlayerJoin例外でroom落ちない、timer例外で他cb継続、after/every/cancel tick、tickWithCtx、40/s burst20超過false、broadcastで超過者は送らない、Uint8Array/string両対応、Room.setGameModeBinding+leaveクリーンアップ、onPlayerLeaveクリーンアップ) |
| 13 | 検証 | typecheck pass、lint 113 files 0 warnings (107→113)、test:unit 35 files 231 tests pass (32→35 files, 204→231 tests, +3 files +27 tests)、coverage 94.12%/87.52%/87.21%/95.69% thresholds 85 pass、build 958ms pass、determinism pass、E2E list 11 |
| 14 | docs | task-list PH3-Bローカル検証済み100% evidence追加、roadmap Phase3 PH3-B済み次PH3-C、skills/gamemode-api/SKILL.md更新 (PH3-B完了 Runtime/Timer/RateLimiter例外安全)、skills/index.md最終更新更新 |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **tsconfig includeは最小に**: tsconfig.jsonはweb用でgameserverを含めない、含めるとBun globalが見つからないエラーとimplicit anyエラーが出る。tsconfig.server.jsonがserver用でBun typesを持つ。PH3-Aでgamemode-apiをserver includeに追加したが、defineGameMode.test.tsがinvalid inputを`as any`でテストしており、`const v = {...} as any; defineGameMode(v)`ではvがanyにならずTS2345になる。`(defineGameMode as any)(v)`で回避、biome-ignore維持。
- **RateLimiterはstring id**: InputRateLimiterはnumber playerIdだが、gamemodeのPlayerRef.idはstring (peer id)。ModeMessageRateLimiterはstring idでMap管理、allowNumber/removeNumber互換メソッドでnumberでも使える。40/s burst20はserver.md表通り、Input 90/sと区別。
- **GameModeTimerは期限収集パターン**: Map iteration中にdelete/updateすると安全でないため、due配列に期限切れを集めてから実行。例外は握りつぶし、他cb継続。after 0は即時 (nowTick>=dueTick)、everyはmin 1で無限ループ防止。setTimeout禁止はコード監査`grep -R setTimeout packages/engine-core/src/gamemode` 0件で保証。
- **GameModeRuntimeは二重safeCall**: safeCallはasync対応 (await + catch)、safeCallSyncはsync hooks用 (onTick等)でPromiseが返ってもcatch。tickはtimer.tick後にonTickを最小ctxで呼ぶ、tickWithCtxは外部ctx付き。sendGameModeMessageはrateLimiter.allow後にsend、超過時false。broadcastは各playerでrate check、超過者はスキップ。
- **Room統合はbindingパターン**: RoomがGameModeRuntimeを直接importすると循環参照の恐れがあるため、GameModeRoomBinding interfaceでrateLimiterのみを抽象化。setGameModeBindingで注入、leaveでremove(String(id)) + removeNumber(id)両方試行、メモリリーク防止。GameModeRuntime.onPlayerLeaveでもremove。
- **coverage include-all維持**: gamemode追加で1344 statements 1265 covered 94.12%、閾値85維持。handlers/babylonDeps分離パターン維持。

## 4. 次にすべきこと (Next Actions)

1. PH3-C: fps-ffa最小モード。`gamemodes/fps/official/ffa/index.ts`で`fps-official-ffa` idでdefineGameMode export、waiting→countdown→playing→ended、spawn選択 via FpsCtx.getSpawnPoints()、kill→score、death→respawn 3s、static-arena再利用。
2. PH3-C: pvpエイリアス `gamemodes/fps/official/pvp/index.ts` re-export ffa。
3. PH3-D: 統合 + docs + import境界 + quality gate。gameserver runtimeでprofile+gamemode注入、biome.json gamemodes/*→sdkのみ維持、coverage 85%維持、最終検証。
4. HANDOFF.md更新はPH3-D完了時に実施。
