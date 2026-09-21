/**
 * gamemode-api — L1 core contract for GameModeDefinition and RoomCtx.
 *
 * L1なので type非依存、pure types + ctx contractのみ。
 * protocolのみ依存、profile-* / three / three-mesh-bvh 依存禁止。
 * 2026-09-22改訂版: Official FPS 1ゲーム複数モード + Voxel 1モード永続、Sandboxは公式拡張+UGC、親ジャンル FPS/Voxel + サブタグ。
 */

export type GameType = 'fps' | 'voxel';
export type ContentSource = 'official' | 'ugc';
export type RoomState = 'waiting' | 'countdown' | 'playing' | 'ended' | 'voting';

// --- 親ジャンル / サブタグ / タグ / カテゴリ — 改訂版 ---

export type ParentGenre = 'fps' | 'voxel';
export type SubTag =
  | 'ffa'
  | 'tdm'
  | 'dom'
  | 'zombie'
  | 'bedwars'
  | 'athletic'
  | 'survival'
  | 'pvp'
  | 'pve'
  | string;
export type Genre = SubTag; // 後方互換: 旧 genres はサブタグ
export type Tag = 'official' | 'ugc' | 'fps' | 'voxel' | 'pvp' | 'pve' | string;
export type GameCategory = 'Official' | 'Sandbox';
export type PlatformCategory = 'fps' | 'voxel' | 'sandbox';
export type ParentGenreFilter = 'all' | ParentGenre;
export type SubTagFilter = 'all' | SubTag;
export type SandboxSortKey = 'totalPlays' | 'activePlayers' | 'detailViews';

// --- 表示 / 統計 ---

export interface GameModeDisplay {
  readonly title?: string;
  readonly description?: string;
  readonly thumbnail?: string;
  readonly creator?: string;
  readonly creatorId?: string;
}

export interface GameModeStats {
  readonly totalPlays?: number;
  readonly activePlayers?: number;
  readonly detailViews?: number;
}

// --- Sandbox ハブ型 — 改訂版 ---

export interface SandboxCard {
  readonly id: string;
  readonly type: GameType;
  readonly source: ContentSource; // official (公式拡張) | ugc
  readonly slug: string;
  readonly parentGenre: ParentGenre;
  readonly genres: SubTag[]; // サブタグ
  readonly tags: Tag[];
  readonly title: string;
  readonly creator: string; // Official または ユーザー名
  readonly thumbnail: string;
  readonly totalPlays: number;
  readonly activePlayers: number;
  readonly detailViews: number;
  readonly description: string;
  readonly category: 'Sandbox';
}

export interface SandboxQuery {
  parentGenre: ParentGenreFilter;
  subTag: SubTagFilter;
  sort: SandboxSortKey;
  order: 'desc' | 'asc';
  search?: string;
}

// --- 投票 — Official FPS 1ゲーム複数モード用 ---

export interface VoteOption {
  readonly subMode: SubTag; // ffa, tdm, dom
  readonly label: string;
  readonly votes: number;
}

export interface VoteSession {
  readonly roomId: string;
  readonly gameId: string; // fps-official
  readonly options: VoteOption[]; // 同一FPSゲーム内のサブモード一覧
  readonly endsAtMs: number;
  readonly voters: Set<string>;
}

export type VoteEvent =
  | { kind: 'voteStart'; session: VoteSession }
  | { kind: 'voteCast'; playerId: string; subMode: SubTag }
  | { kind: 'voteEnd'; winnerSubMode: SubTag };

// --- Official Voxel 永続サバイバル ---

export interface VoxelSurvivalSpec {
  readonly mode: 'survival';
  readonly finish_game: false;
  readonly respawn: true;
}

// --- 共通 ---

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
  readonly id: string; // /^[a-z][a-z0-9-]{2,31}$/ 例: fps-official-ffa, fps-official (本体)
  readonly type: T;
  readonly source: ContentSource;
  readonly slug: string; // URL用 例: ffa
  readonly minPlayers: number; // 1..64
  readonly maxPlayers: number; // 1..64
  readonly world: T extends 'fps' ? FpsWorldSpec : VoxelWorldSpec;

  // --- Official FPS 1ゲーム複数モード用 — 改訂版 ---
  readonly subModes?: SubTag[]; // Official FPSのみ: [FFA,TDM,DOM,etc.] 内部サブモード一覧
  readonly currentSubMode?: SubTag; // 現在のサブモード

  // --- 親ジャンル/サブタグ (Sandboxフィルタ用) — 改訂版 ---
  readonly parentGenre?: ParentGenre; // 親ジャンル: FPS / Voxel
  readonly genres?: SubTag[]; // サブタグ: Bedwars/Zombie/Athletic等 (旧名称維持)
  readonly tags?: Tag[];

  // --- 表示メタ ---
  readonly display?: GameModeDisplay;

  // --- 統計 ---
  readonly stats?: GameModeStats;

  // --- カテゴリ ---
  readonly category?: GameCategory; // Official | Sandbox

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
