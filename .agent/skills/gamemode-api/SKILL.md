---
name: gamemode-api
description: L1 gamemode-api core + gamemode-sdk facade、defineGameMode検証、RoomCtx/BaseCtx/FpsCtx/VoxelCtx、hybrid async、spawnPointsはctx経由の実装スキル。
---

# Gamemode API — L1 core + facade + ffa最小の実装スキル

> 仕様正本: `docs/arch/types.md`（GameModeDefinition / RoomCtx）、`docs/arch/architecture.md`（gamemodes/* → sdkのみ）、`docs/arch/server.md`（レート制限）、`docs/planning/PHASE03_PLAN.md`  
> 計画: PLAT-3 / PH3-A / PH3-B / PH3-C / PH3-D

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

## GameModeRuntime（PH3-B予定）

```ts
class GameModeRuntime {
  async safeCall(hook,...args) {
    try { await this.def[hook]?.(this.ctx,...args); } catch(e) { console.warn(`[gamemode] ${hook} error`, e); }
  }
  tick(dtMs,tick) { this.timer.tick(tick); this.safeCall('onTick',dtMs); }
  sendGameModeMessage(id,data) { if (!rateLimiter.consume(id,'modeMessage')) return false; return ctx.send(id,data); }
}
class GameModeTimer {
  timers = new Map<number,{dueTick,interval?,cb}>();
  after(ticks,cb,nowTick) { id=nextId++; timers.set(id,{dueTick:nowTick+ticks,cb}); return id; }
  every(ticks,cb,nowTick) { ... interval ... }
  cancel(id) { timers.delete(id); }
  tick(nowTick) { for (const [id,t] of timers) if (nowTick>=t.dueTick) { try{t.cb()}catch{}; if(t.interval) t.dueTick=nowTick+t.interval; else timers.delete(id); } }
}
```

- Tick timerは head indexリング（EM01知見、zero-alloc/SKILL.md）
- Rate limit: modeMessage 40/s burst 20、超過時false、Input 90/s超過で切断維持（server.md表）
- 例外安全: 1ルームのみcatch、他ルーム巻き込まない、mode例外でroomが落ちないテスト

## ffa最小モード（PH3-C予定）

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

## 統合（PH3-D予定）

- `apps/gameserver/src/runtime.ts` が `createFpsSimProfile()` + `fps-official-ffa` を組み立てて Room へ注入
- `biome.json` に `gamemodes/* → @cod/gamemode-sdkのみ` 制限追加済み（本タスクで先行追加）
- coverage 85%維持、E2E discovery 11+維持、determinism heavy 0.8s維持

## テスト

- `defineGameMode.test.ts` 10 tests: valid ffa/voxel、invalid id/type/source/slug/min/max/world/map、hooks preserved
- `ctx.test.ts` 5 tests: LCG determinism、randomInt inclusive、min>max throw、random 0..1
- PH3-B: exception safety / after/every/cancel tick / rate limit / broadcast false
- PH3-C: ffa spawn/score/round lifecycle
- PH3-D: gameserver integration mode exceptionでroomが落ちない

## 監査コマンド

```bash
grep -R "profile-fps\|profile-voxel" packages/gamemode-api --include="*.ts" # 0件
grep -R "from.*gamemode" gamemodes --include="*.ts" | grep -v "gamemode-sdk" # 0件
grep -R "Math.random\|Date.now\|setTimeout" packages/gamemode-api packages/engine-core/src/gamemode --include="*.ts" # 0件
bun run test:unit # 32 files 204 tests
```

## 関連

- `docs/arch/types.md` GameModeDefinition / RoomCtx
- `docs/arch/architecture.md` L0-L3依存、gamemodes/* → sdkのみ
- `docs/planning/PHASE03_PLAN.md` §10.1-10.5
- `docs/arch/server.md` レート制限表
- `.agent/logs/2026-09-22_plat-3-fact-check.md`
