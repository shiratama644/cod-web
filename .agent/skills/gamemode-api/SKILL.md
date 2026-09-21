---
name: gamemode-api
description: L1 gamemode-api core + gamemode-sdk facade、defineGameMode検証、RoomCtx/BaseCtx/FpsCtx/VoxelCtx、hybrid async、spawnPointsはctx経由、parentGenre/genres/tags/subModes/display/stats拡張、Official FPS 1ゲーム複数モード投票の実装スキル。
---

# Gamemode API — L1 core + facade + ffa最小 + Phase4拡張の実装スキル

> 仕様正本: `docs/arch/types.md`（GameModeDefinition / RoomCtx）、`docs/arch/architecture.md`（gamemodes/* → sdkのみ）、`docs/arch/server.md`（レート制限）、`docs/planning/PHASE03_PLAN.md` / `PHASE04_PLAN.md`（改訂版）  
> 計画: PLAT-3 / PH3-A / PH3-B / PH3-C / PH3-D / PLAT-4 / PH4-A〜F

## パッケージ構成（ユーザー確認 both）

| Package | 役割 | 依存 | L1純度 |
|---|---|---|---|
| `@cod/gamemode-api` | L1 core contract | `@cod/protocol` のみ | protocolのみ、profile-fps/profile-voxel/three/bvh/gameserver/web/gamemode-sdk禁止（Biome） |
| `@cod/gamemode-sdk` | L1 facade、gamemodes/* が import する唯一 | `@cod/gamemode-api` のみ | apiのみ、protocol/engine-core/profile-*禁止（Biome） |
| `gamemodes/*` | L3 実装 | `@cod/gamemode-sdk` のみ | sdkのみ、protocol/engine-core/profile-*禁止（Biome） |

- `packages/gamemode-api/package.json` exports `./` / `./define` / `./types`
- `packages/gamemode-sdk/src/index.ts` は `export * from '@cod/gamemode-api'` + `SDK_VERSION`

## defineGameMode検証（PH3-A）

```ts
const ID_REGEX = /^[a-z][a-z0-9-]{2,31}$/;
const SLUG_REGEX = /^[a-z0-9-]{1,32}$/;

export function defineGameMode<T extends GameType>(def: GameModeDefinition<T>): GameModeDefinition<T> {
  assert(ID_REGEX.test(def.id), `id must match ${ID_REGEX.source}`);
  assert(['fps','voxel'].includes(def.type));
  assert(['official','ugc'].includes(def.source));
  assert(SLUG_REGEX.test(def.slug));
  assert(1 <= minPlayers <= 64 && minPlayers <= maxPlayers);
  assert(def.world != null);
  if (def.type === 'fps') assert(typeof (def.world as any).map === 'string' && map.length>0);
  return def;
}
```

- ID例: `fps-official-ffa` 16文字、 `voxel-official-survival`、 `fps-official-pvp` は ffa のエイリアスとして提供（ユーザー確認）
- URL: `/fps/official/ffa` 主、 `/fps/official/pvp` は同じモードが動くエイリアス、slugはURL用
- min/max 1..64、world必須、fps world.map必須

## RoomCtx / BaseCtx / FpsCtx / VoxelCtx

```ts
export interface PlayerRef { id: string; playerId: number; name: string; team?: number; }
export interface BaseCtx {
  roomId: string; tick: number; state: RoomState; players: readonly PlayerRef[];
  random(): number; randomInt(min,max): number; // LCG、seed welcome配布、決定論
  getPlayer(id): PlayerRef|undefined; getPlayers(): readonly PlayerRef[];
  setScore(id,score); getScore(id); setTeamScore(team,score); broadcastHud(data);
  send(id,data): boolean; broadcast(data,exceptId?): void; broadcastExcept(data,exceptId): void; // rate limit超過時false
  after(ticks,cb): number; every(ticks,cb): number; cancel(id): void; // tick基準、setTimeout禁止
  setState(state): void; getState(): RoomState;
}
export interface FpsCtx extends BaseCtx {
  giveWeapon(id,weaponId); setAmmo(id,ammo);
  getSpawnPoints(): readonly Vec3WithYaw[]; // profile-fpsから取得（ユーザー確認: world specはmap名のみ）
  getZone(name): {x,y,z,radius}|undefined;
  raycastWorld(from,dir,maxDist): RaycastHit|undefined;
  raycastPlayers(from,dir,maxDist,exceptId?): RaycastHit|undefined;
}
```

- spawnPointsは `FpsCtx.getSpawnPoints()` 経由で profile-fps から取得、world specはmap名のみ（ユーザー確認）
- `random`/`randomInt` は LCG、seedはwelcome配布、決定論（deterministic-sim/SKILL.md）

## Hybrid async（ユーザー確認）

| Hook | async許可 | 理由 |
|---|---|---|
| onRoomCreate/Destroy | void \| Promise<void> | 初期化・破棄、worldロード等 |
| onPlayerJoin/Leave | void \| Promise<void> | イベント |
| onNetworkMessage | void \| Promise<void> | イベント |
| onRoundStart/End, onPlayerSpawn/Death/Damage, onTick, onWeaponFire/onHit, onBlockPlace/Break | void syncのみ | ゲームループ、決定論維持 |

- async hooksは Room の doTick 外で実行、例外は safeCall で catch、他ルーム巻き込まない
- sync hooksは決定論、Math.random/Date.now/setTimeout禁止

## GameModeRuntime（PH3-B完了）

```ts
// packages/engine-core/src/gamemode/GameModeTimer.ts
class GameModeTimer {
  timers = new Map<number,{dueTick,interval?,cb}>(); nextId=1;
  after(ticks,cb,nowTick) { const id=nextId++; timers.set(id,{dueTick:nowTick+Math.max(0,Math.floor(ticks)),cb}); return id; }
  every(ticks,cb,nowTick) { const id=nextId++; timers.set(id,{dueTick:nowTick+Math.max(1,Math.floor(ticks)),interval:Math.max(1,Math.floor(ticks)),cb}); return id; }
  cancel(id) { timers.delete(id); }
  tick(nowTick) { const due=[]; for(const [id,e] of timers) if(nowTick>=e.dueTick) due.push({id,entry:e}); for(const {id,entry} of due){ try{entry.cb()}catch{}; if(entry.interval){ const cur=timers.get(id); if(cur) cur.dueTick=nowTick+entry.interval; } else timers.delete(id); } }
}
// packages/engine-core/src/net/rate-limit.ts
const MODE_MESSAGE_RATE_PER_SEC=40, MODE_MESSAGE_RATE_BURST=20;
class ModeMessageRateLimiter { buckets=Map<string,TokenBucket>; allow(id,nowMs){ let b=buckets.get(id); if(!b){ b=new TokenBucket(40,20,nowMs); buckets.set(id,b);} return b.tryConsume(nowMs); } remove(id){buckets.delete(id);} }
// packages/engine-core/src/gamemode/GameModeRuntime.ts
class GameModeRuntime {
  timer=GameModeTimer; rateLimiter=ModeMessageRateLimiter;
  async safeCall(hook,...args){ try{ const fn=this.def[hook] as any; if(fn){ const r=fn(...args); if(r instanceof Promise) await r.catch(()=>{}); } }catch{} }
  safeCallSync(hook,...args){ try{ const fn=this.def[hook] as any; if(fn){ const r=fn(...args); if(r instanceof Promise) r.catch(()=>{}); } }catch{} }
  tick(dtMs,nowTick){ timer.tick(nowTick); if(def.onTick){ const ctx=createMinimalCtx(nowTick); safeCallSync('onTick',ctx,dtMs); } }
  sendGameModeMessage(id,data){ if(!rateLimiter.allow(id,nowMs())) return false; return options.send(id,data); }
  broadcastGameModeMessage(data,exceptId?){ const now=nowMs(); for(const p of getPlayers()){ if(exceptId&&p.id===exceptId) continue; if(!rateLimiter.allow(p.id,now)) continue; options.send(p.id,data); } }
  async onPlayerLeave(player,ctx){ await safeCall('onPlayerLeave',ctx,player); rateLimiter.remove(player.id); }
}
```

- Tick timerは tick基準、setTimeout禁止、Map+期限収集で安全、例外は握りつぶし、after 0即時、everyは1以上
- Rate limit: modeMessage 40/s burst 20、超過時false、Input 90/s超過で切断維持（server.md表）、ModeMessageRateLimiterはstring id、allowNumber/removeNumber互換
- 例外安全: safeCall/safeCallSyncでtry/catch、asyncはcatch、1ルームのみcatch、他ルーム巻き込まない、mode例外でroomが落ちないテスト、timer例外でも他cb継続
- Room統合: Room.setGameModeBinding({rateLimiter})でバインド、leaveでrateLimiter.remove(String(id))クリーンアップ、GameModeRuntime.onPlayerLeaveでもremove、メモリリーク防止

## ffa最小モード（PH3-C完了）

```ts
// gamemodes/fps/official/ffa/index.ts — map名のみ、spawnPointsはctx経由
import { defineGameMode } from '@cod/gamemode-sdk';
export default defineGameMode({
  id: 'fps-official-ffa',
  type: 'fps',
  source: 'official',
  slug: 'ffa',
  minPlayers: 2,
  maxPlayers: 16,
  world: { map: 'static-arena' },
  async onRoomCreate(ctx) { ctx.setState('waiting'); }, // async許可
  onPlayerJoin(ctx,player) { // event async許可も可能だがsyncでOK
    if (ctx.players.length>=2 && ctx.state==='waiting') {
      ctx.setState('countdown');
      ctx.after(60*3,()=>{ ctx.setState('playing'); });
    }
  },
  onPlayerSpawn(ctx,player) { // sync
    const spawns=ctx.getSpawnPoints(); // profile-fpsから取得
    const idx=Math.floor(ctx.random()*spawns.length);
  },
  onPlayerDeath(ctx,player,killer) { // sync
    if (killer) ctx.setScore(killer.id, ctx.getScore(killer.id)+1);
    ctx.after(60*3,()=>{ ctx.getPlayer(player.id) && ctx.safeCall('onPlayerSpawn',player); });
  },
  onTick(ctx,dtMs) { /* round lifecycle */ }, // sync
  async onNetworkMessage(ctx,player,msg) { /* chat only */ }, // async許可
});
// pvpエイリアス
// gamemodes/fps/official/pvp/index.ts
import ffa from '../ffa/index.ts';
export default ffa;
```

- static-arena再利用、three-mesh-bvh衝突はprofile側維持、gamemodeはルールのみ
- kill判定簡易、巻き戻しヒットスキャンは将来

## 統合（PH3-D完了）

- `apps/gameserver/src/runtime.ts` が `createFpsSimProfile()` + `fps-official-ffa` を組み立てて Room へ注入
- `biome.json` に `gamemodes/* → @cod/gamemode-sdkのみ` 制限追加済み（本タスクで先行追加）
- coverage 85%維持、E2E discovery 11+維持、determinism heavy 0.8s維持

## Phase 4拡張（PH4-A〜F完了）2026-09-22改訂版

### GameModeDefinition拡張（PH4-A）

```ts
export type ParentGenre = 'fps' | 'voxel';
export type SubTag = 'bedwars' | 'zombie' | 'athletic' | 'tdm' | 'dom' | 'ffa' | 'survival' | 'creative' | 'pvp' | ...;
export type Tag = 'official' | 'ugc' | 'fps' | 'voxel' | ...;
export type GameCategory = 'Official' | 'Community'; // Official=公式、Community=UGC含む公式拡張+UGC
export interface GameModeDisplay { title: string; creator: string; thumbnail: string; description?: string; }
export interface GameModeStats { totalPlays: number; activePlayers: number; detailViews: number; }
export interface GameModeDefinition<T extends GameType> {
  id, type, source, slug, minPlayers, maxPlayers, world,
  parentGenre?: ParentGenre; // 親ジャンル FPS/Voxel
  genres?: SubTag[]; // サブタグ Bedwars/Zombie/Athletic/TDM/DOM/FFA
  tags?: Tag[];
  subModes?: SubTag[]; // Official FPS 1ゲーム複数モード [FFA,TDM,DOM]
  currentSubMode?: SubTag; // 現在のサブモード
  category?: GameCategory; // Official vs Community
  display?: GameModeDisplay; // thumbnail/title/creator
  stats?: GameModeStats; // plays/active/views
  // ...hooks
}
```

- parentGenre/genres/tags/display/stats/subModes/currentSubMode/categoryは全てoptional、後方互換維持、空配列許容
- ffa拡張: parentGenre fps, genres [ffa], tags [official,pvp,fps], subModes [ffa,tdm,dom], currentSubMode ffa, category Official, display title/creator/thumbnail, stats totalPlays/activePlayers/detailViews
- Sandboxは公式拡張+UGCの集合、parentGenre FPS/Voxel + subTag Bedwars/Zombie/Athleticでフィルタ、ソート plays/active/views

### ハブUI骨組み（PH4-B〜F）

| Component | File | 役割 |
|---|---|---|
| Header | `apps/web/src/components/Header.tsx` | Official FPS/Voxel切替 [FPS][Voxel]、activeTab store、data-testid header/official-fps-tab/official-voxel-tab |
| LeftSidebar | `apps/web/src/components/LeftSidebar.tsx` | Krunker風縦ナビ、SandboxボタンでsetSandboxOpen(true) 公式拡張+UGC、data-testid left-sidebar/sandbox-btn |
| sandbox.ts | `apps/web/src/lib/sandbox.ts` | MOCK_CARDS 6件 公式拡張+UGC、filterByParentGenre/SubTag/Search/sortByKey/applySandboxFilters純粋関数 |
| matchmaker-mock.ts | `apps/web/src/lib/matchmaker-mock.ts` | mockGameModes 6件 公式拡張+UGC、mockRooms 4件、fetchGameModes/fetchGameList/seekGame mock |
| SandboxModal | `apps/web/src/components/SandboxModal.tsx` | カード一覧 thumbnail/title/creator/plays/desc、親ジャンルフィルタ [All,FPS,Voxel] + サブタグ [All,Bedwars,Zombie,Athletic,TDM,DOM,FFA] + ソート [plays,active,views] |
| SandboxDetailPage | `apps/web/src/components/SandboxDetailPage.tsx` | 詳細 /{type}/{source}/{slug}→/sandbox/{id}、Play Now seekGame auto-match、Room Selection manual |
| RoomSelectionModal | `apps/web/src/components/RoomSelectionModal.tsx` | ルーム一覧手動選択、Join seekGame |
| VoteOverlay | `apps/web/src/components/VoteOverlay.tsx` | Official FPS 1-game multi-mode [FFA,TDM,DOM]投票、Voxel excluded Survival永続、timer/total/results sorted、vote-option-ffa/tdm/dom |

- gameStore拡張: activeTab, sandboxOpen, sandboxParentGenre, sandboxSubTag, sandboxSort, sandboxSearch, selectedSandboxCardId, roomSelectionOpen, voteSession {roomId,gameId,options[{subMode,label,votes}],endsAtMs}
- App統合: Header+LeftSidebar+SandboxModal+Detail+Room+Vote
- boxelはvoxelのタイポで訂正済み、エイリアス機能としては扱わない

## テスト

- `defineGameMode.test.ts` 10→19 tests (+9): valid ffa/voxel、invalid id/type/source/slug/min/max/world/map、hooks preserved、parentGenre/genres/tags/subModes/category/display/stats/empty array/Sandbox official extension/voxel survival/後方互換 (PH4-A)
- `ctx.test.ts` 5 tests: LCG determinism、randomInt inclusive、min>max throw、random 0..1
- PH3-B: `GameModeTimer.test.ts` 8 tests (after/every/cancel tick基準、setTimeout禁止、例外安全、size/clear)、`ModeMessageRateLimiter.test.ts` 8 tests (40/s burst20、超過時false、player別独立、remove、持続許可)、`GameModeRuntime.test.ts` 11 tests (onTick/onRoomCreate/onPlayerJoin例外でroom落ちない、timer例外で他cb継続、after/every/cancel tick、tickWithCtx、40/s burst20超過false、broadcastで超過者は送らない、Uint8Array/string両対応、Room.setGameModeBinding+leaveクリーンアップ、onPlayerLeaveクリーンアップ) — 計27 tests
- PH3-C: ffa spawn/score/round lifecycle 11 tests
- PH3-D: gameserver integration mode exceptionでroomが落ちない 13 tests
- PH4-B: Header 5 tests
- PH4-C: LeftSidebar 5 tests
- PH4-D: sandbox.test 7 tests + SandboxModal 8 tests
- PH4-E: SandboxDetailPage 7 tests + RoomSelectionModal 6 tests
- PH4-F: VoteOverlay 9 tests
- Total: 44 files 311 tests (PH3-D 37/255 → PH4-F 44/311 +7 files +56 tests)

## 監査コマンド

```bash
grep -R "profile-fps\|profile-voxel" packages/gamemode-api --include="*.ts" # 0件
grep -R "from.*gamemode" gamemodes --include="*.ts" | grep -v "gamemode-sdk" # 0件 (ffaはsdkのみ)
grep -R "Math.random\|Date.now\|setTimeout" packages/gamemode-api packages/engine-core/src/gamemode gamemodes --include="*.ts" # 0件 (TimerはsetTimeout不使用, ffaはctx経由, runtimeはLCG)
grep -R "setTimeout" packages/engine-core/src/gamemode gamemodes apps/gameserver --include="*.ts" # 0件 (runtimeはsetIntervalのみprofile simHz基準)
# gamemode exception safety
grep -R "safeCall\|try.*catch" packages/engine-core/src/gamemode apps/gameserver/src --include="*.ts" | wc -l # 例外安全確認
bun run test:unit # 37 files 255 tests (PH3-Dで+1 file +13 tests, 計+5 files +51 tests from PH3-A)
```

## 関連

- `docs/arch/types.md` GameModeDefinition / RoomCtx
- `docs/arch/architecture.md` L0-L3依存、gamemodes/* → sdkのみ
- `docs/planning/PHASE03_PLAN.md` §10.1-10.5
- `docs/arch/server.md` レート制限表
- `.agent/logs/2026-09-22_plat-3-fact-check.md`
