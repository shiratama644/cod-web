/**
 * gamemode-api — L1 core contract for GameModeDefinition and RoomCtx.
 *
 * L1なので type非依存、pure types + ctx contractのみ。
 * protocolのみ依存、profile-* / three / three-mesh-bvh 依存禁止。
 */

export type GameType = 'fps' | 'voxel';
export type ContentSource = 'official' | 'ugc';
export type RoomState = 'waiting' | 'countdown' | 'playing' | 'ended';

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Vec3WithYaw extends Vec3 {
  readonly yaw: number;
}

export interface RaycastHit {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly distance: number;
  readonly blockId?: number;
  readonly playerId?: number;
}

export interface PlayerRef {
  readonly id: string; // peer id (string)
  readonly playerId: number; // numeric id for snapshot
  readonly name: string;
  readonly team?: number;
}

export interface BaseCtx {
  readonly roomId: string;
  readonly tick: number;
  readonly state: RoomState;
  readonly players: readonly PlayerRef[];

  // random: seedはwelcomeで配布、決定論。LCG等で実装。
  random(): number;
  randomInt(min: number, max: number): number;

  // player操作
  getPlayer(id: string): PlayerRef | undefined;
  getPlayers(): readonly PlayerRef[];

  // score/HUD
  setScore(playerId: string, score: number): void;
  getScore(playerId: string): number;
  setTeamScore(team: number, score: number): void;
  broadcastHud(data: unknown): void;

  // send/broadcast: レート制限、超過時false
  send(playerId: string, data: Uint8Array | string): boolean;
  broadcast(data: Uint8Array | string, exceptId?: string): void;
  broadcastExcept(data: Uint8Array | string, exceptId: string): void;

  // tick timer: tick基準、setTimeout禁止
  after(ticks: number, cb: () => void): number;
  every(ticks: number, cb: () => void): number;
  cancel(timerId: number): void;

  // state
  setState(state: RoomState): void;
  getState(): RoomState;
}

export interface FpsWorldSpec {
  readonly map: string; // 例: 'static-arena'
}

export interface VoxelWorldSpec {
  readonly seed?: number;
  readonly worldSize?: number;
}

export interface FpsCtx extends BaseCtx {
  giveWeapon(playerId: string, weaponId: string): void;
  setAmmo(playerId: string, ammo: number): void;
  getSpawnPoints(): readonly Vec3WithYaw[];
  getZone(name: string): { x: number; y: number; z: number; radius: number } | undefined;
  raycastWorld(from: Vec3, dir: Vec3, maxDist: number): RaycastHit | undefined;
  raycastPlayers(from: Vec3, dir: Vec3, maxDist: number, exceptId?: string): RaycastHit | undefined;
}

export interface VoxelCtx extends BaseCtx {
  getBlock(x: number, y: number, z: number): number;
  setBlock(x: number, y: number, z: number, blockId: number): void;
  fillBox(min: Vec3, max: Vec3, blockId: number): void;
  getRegion(min: Vec3, max: Vec3): Uint8Array; // max 32768
  pasteSchematic(pos: Vec3, data: Uint8Array): void;
  raycastBlock(from: Vec3, dir: Vec3, maxDist: number): RaycastHit | undefined;
  setBlockProperty(x: number, y: number, z: number, key: string, value: unknown): void;
}

export type RoomCtx = FpsCtx | VoxelCtx;

export type FpsWorld = FpsWorldSpec;
export type VoxelWorld = VoxelWorldSpec;

export interface GameModeDefinition<T extends GameType = GameType> {
  readonly id: string; // /^[a-z][a-z0-9-]{2,31}$/ 例: fps-official-ffa
  readonly type: T;
  readonly source: ContentSource;
  readonly slug: string; // URL用 例: ffa
  readonly minPlayers: number; // 1..64
  readonly maxPlayers: number; // 1..64
  readonly world: T extends 'fps' ? FpsWorldSpec : VoxelWorldSpec;

  // hooks: hybrid async — 初期化・破棄・イベントのみasync、ゲームループはsync (2026-09-22確認)
  onRoomCreate?(ctx: RoomCtx): void | Promise<void>; // async許可
  onRoomDestroy?(ctx: RoomCtx): void | Promise<void>; // async許可
  onRoundStart?(ctx: RoomCtx): void; // syncのみ
  onRoundEnd?(ctx: RoomCtx): void; // syncのみ
  onPlayerJoin?(ctx: RoomCtx, player: PlayerRef): void | Promise<void>; // async許可 (イベント)
  onPlayerLeave?(ctx: RoomCtx, player: PlayerRef): void | Promise<void>; // async許可
  onPlayerSpawn?(ctx: RoomCtx, player: PlayerRef): void; // sync
  onPlayerDeath?(ctx: RoomCtx, player: PlayerRef, killer?: PlayerRef): void; // sync
  onPlayerDamage?(ctx: RoomCtx, player: PlayerRef, damage: number, attacker?: PlayerRef): void; // sync
  onTick?(ctx: RoomCtx, dtMs: number): void; // syncのみ、決定論
  onNetworkMessage?(ctx: RoomCtx, player: PlayerRef, msg: Uint8Array | string): void | Promise<void>; // async許可 (イベント)

  // fps only — ゲームループはsync
  onWeaponFire?(ctx: FpsCtx, player: PlayerRef, weaponId: string): void;
  onHit?(ctx: FpsCtx, attacker: PlayerRef, victim: PlayerRef, damage: number): void;

  // voxel only — ゲームループはsync
  onBlockPlace?(ctx: VoxelCtx, player: PlayerRef, pos: Vec3, blockId: number): void;
  onBlockBreak?(ctx: VoxelCtx, player: PlayerRef, pos: Vec3, blockId: number): void;
}
