# PH3-A gamemode-api L1 core + sdk facade

> Date: 2026-09-22(JST) / Commit: 56bc8d1 / Branch: arena/01a0b161-cod-web

## 1. 指示内容 (Task Summary)

PHASE03_PLAN.md PH3-A: `gamemode-api` package作成（L1 contract）

- `@cod/gamemode-api` が存在し、`defineGameMode` が id/type/source/slug/min/maxPlayers検証、GameModeDefinition / RoomCtx / BaseCtx / FpsCtx / VoxelCtx が仕様通り、L1 type非依存（profile-* import 0）
- ユーザー確認: both api core + sdk facade、ffa主 pvpエイリアス、hybrid async、spawnPointsはctx経由
- 事実確認: Bun.serve data typing + send -1/0/1+、Biome noRestrictedImports、Babylon EngineOptions、Room/RateLimiter/TYPE_SPECS vs plan

## 2. 実行内容 (Executed Actions)

| # | 対象 | 実装 |
|---|---|---|
| 1 | 現状把握 | git status/branch/log、task-list PH3-A未着手、PHASE03_PLAN §5 DoD、types.md GameModeDefinition、architecture.md L0-L3、server.md rate limit、protocol.md ModeMessage 0x20、biome.json gamemodes/*→sdkのみ |
| 2 | packages/gamemode-api | package.json deps protocolのみ、exports ./, ./define, ./types、src/types.ts GameType/ContentSource/RoomState/PlayerRef/Vec3/RaycastHit/BaseCtx/FpsCtx/VoxelCtx/RoomCtx/FpsWorldSpec/VoxelWorldSpec/GameModeDefinition hybrid async (onRoomCreate/Destroy, Join/Leave, NetworkMessage async許可、他 sync)、src/defineGameMode.ts ID_REGEX /^[a-z][a-z0-9-]{2,31}$/ SLUG_REGEX /^[a-z0-9-]{1,32}$/ min/max 1..64 world検証、src/ctx.ts LCG createLCG/createRandomHelpers、src/index.ts barrel |
| 3 | packages/gamemode-sdk | package.json deps apiのみ、src/index.ts export * from '@cod/gamemode-api' + SDK_VERSION、facadeとしてgamemodes/*がimportする唯一 |
| 4 | biome.json | overrides追加: gamemode-apiはengine-core/profile-*/gameserver/web/three/bvh禁止、gamemode-sdkはprotocol/engine-core/profile-*/gameserver/web/three/bvh禁止、_tests_ non-null off、既存gamemodes/*→sdkのみ維持 |
| 5 | vitest.config.ts | alias @cod/gamemode-api/sdk追加、coverage includeにgamemode-api/sdk追加 |
| 6 | tests | _tests_/packages/gamemode-api/src/defineGameMode.test.ts 10 tests (valid ffa/voxel, invalid id/type/source/slug/min/max/world/map, hooks preserved) + ctx.test.ts 5 tests (LCG determinism, randomInt inclusive, min>max throw, random 0..1)、biome-ignore位置修正でlint 0 warnings |
| 7 | 検証 | typecheck pass、lint 0 warnings (107 files)、test:unit 32 files 204 tests pass (30→32 files, 189→204 tests)、coverage 95.26%/88.48%/90.98%/96.9% thresholds 85 pass、build pass、E2E list 11、determinism pass |
| 8 | docs | task-list PH3-Aローカル検証済み100% evidence追加、roadmap Phase 3 → PH3-A local verified next PH3-B、skills/gamemode-api/SKILL.md新規 + index更新 |
| 9 | commit/push | 56bc8d1 feat(PH3-A): gamemode-api L1 core + sdk facade + define validation push |

## 3. 気づいたこと・知見 (Insights & Lessons Learned)

- **both設計が最適**: gamemode-api core (protocolのみ依存) + gamemode-sdk facade (apiのみ依存) で、architecture.md理想「gamemodes/* → sdkのみ」とL1純度「apiはprotocolのみ」を両立。Biomeで二重監査可能。
- **biome-ignoreは直前の行**: `as any` の直前の行に置かないと unused判定で警告になる（AGENTS.md §6.5）。`const v = { ... } as any;` の場合は `} as any;` の直前の行に置く必要がある。テストでは `const v = { // biome-ignore ... type: 'racing' as any }` のように property行の直前に置くのが確実。
- **_tests_ overrideはnoExplicitAnyをoffにしない方が良い**: 既存テストは `// biome-ignore lint/suspicious/noExplicitAny: private access for test` でanyを許可しており、offにすると suppressionがunusedで逆に警告になる。non-nullのみoffにするのが正。
- **LCGはdeterministic-sim/SKILL.mdの知見を再利用**: `s = (s*1664525+1013904223)>>>0` でseed welcome配布のrandom/randomIntを実装、決定論テストで固定。
- **ID regexはtypes.mdと一致**: `/^[a-z][a-z0-9-]{2,31}$/`、fps-official-ffaは16文字でOK、pvpエイリアスも同じIDに集約する方針はユーザー確認済み。
- **spawnPointsはctx経由で疎結合**: world specはmap名のみ、spawnPointsはFpsCtx.getSpawnPoints()でprofile-fpsから取得、gamemodeはmap名に依存せずスポーン位置を決められる。PH3-Cのffaはstatic-arena再利用でOK。
- **hybrid asyncはUGC観点で最適**: 初期化・破棄・イベントはasync許可でworldロード等可能、ゲームループonTick/onSpawn/onDeath/onHit等はsyncで決定論維持。PH3-BのGameModeRuntime.safeCallでtry/catch、1ルームのみcatch。
- **coverage include-all維持**: gamemode-api/sdkをincludeに追加しても95.26%/88.48%/90.98%/96.9%で85% threshold維持、handlers/babylonDeps分離パターン維持。

## 4. 次にすべきこと (Next Actions)

1. PH3-B: GameModeRuntime + Tick timer + RateLimiter。`packages/engine-core/src/gamemode/`新規、Room統合、exception safety / after/every/cancel tick / rate limit tests。
2. PH3-C: fps-ffa最小モード + pvpエイリアス。`gamemodes/fps/official/ffa/index.ts` + `pvp/index.ts` re-export、spawn/score/round lifecycle tests。
3. PH3-D: 統合 + docs + import境界 + quality gate。gameserver runtimeでprofile+gamemode注入、biome.json gamemodes/*→sdkのみ維持、coverage 85%維持、最終検証。
4. HANDOFF.md更新はPH3-D完了時に実施。
