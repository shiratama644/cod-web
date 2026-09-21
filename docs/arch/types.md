# 中核の型 — 改訂版 (Official 1ゲーム複数モード、Sandboxは公式拡張+UGC)

## TypeSpec

```ts
export type GameType = 'voxel' | 'fps';
export type ContentSource = 'official' | 'ugc';
export type GameCategory = 'Official' | 'Sandbox'; // ゲーム種別: Officialは運営提供、Sandboxは公式拡張+UGC

export interface TypeSpec {
  readonly type: GameType;
  readonly simHz: number;
  readonly snapshotHz: number;
  readonly inputHz: number;
  readonly posEncoding: 'i16_cm' | 'i32_1_256';
  readonly worldExtent: number;
}

export const TYPE_SPECS: Record<GameType, TypeSpec> = {
  voxel: {
    type: 'voxel',
    simHz: 30,
    snapshotHz: 15,
    inputHz: 30,
    posEncoding: 'i32_1_256',
    worldExtent: 32_768,
  },
  fps: {
    type: 'fps',
    simHz: 60,
    snapshotHz: 30,
    inputHz: 60,
    posEncoding: 'i16_cm',
    worldExtent: 327,
  },
} as const;
```

| 方式 | サイズ | 分解能 | 範囲 | 用途 |
|---|---:|---:|---:|---:|
| `i16_cm` | 2 B/軸 | 1 cm | ±327.67 m | FPS。現行 packer と同じ |
| `i32_1_256` | 4 B/軸 | ≈ 3.9 mm | ±8,388,608 m | voxel。`i16_cm` だと溢れる |

## SimProfile（L1 ↔ L2 の最も重要な境界）

L1 はこれ以外の方法で L2 を呼ばない。`SimState` / `SimEntity` は branded で L1 が中身を覗けない。

```ts
export interface SimProfile<TWorldSpec = unknown> {
  readonly type: GameType;
  readonly spec: TypeSpec;
  createWorld(worldSpec: TWorldSpec, seed: number): Promise<SimState>;
  destroyWorld(state: SimState): void;
  spawnEntity(state: SimState, playerId: number, x: number, y: number, z: number): SimEntity;
  despawnEntity(state: SimState, entity: SimEntity): void;
  step(state: SimState, entity: SimEntity, input: DecodedInput, dtMs: number): void;
  drainEvents(state: SimState): SimEvent[];
  writeSnapshot(state: SimState, viewer: SimEntity, w: BinaryWriter): void;
  writeWorldDelta(state: SimState, viewer: SimEntity, w: BinaryWriter, budgetBytes: number): boolean;
  handleTypedPacket(state: SimState, entity: SimEntity, type: number, r: BinaryReader): void;
  extendCtx(state: SimState): Record<string, unknown>;
  readPose(entity: SimEntity): Pose;
  writePose(entity: SimEntity, pose: Partial<Pose>): void;
}
```

## GameModeDefinition — 改訂版 (Official 1ゲーム複数モード、Sandbox公式拡張+UGC)

```ts
export type PlatformCategory = 'fps' | 'voxel' | 'sandbox';
export type ParentGenre = 'fps' | 'voxel'; // 親ジャンル: FPS / Voxel
export type SubTag = 'ffa' | 'tdm' | 'dom' | 'zombie' | 'bedwars' | 'athletic' | 'survival' | 'pvp' | 'pve' | string; // サブタグ
export type Genre = SubTag; // 後方互換: 旧 genres はサブタグ
export type Tag = 'official' | 'ugc' | 'fps' | 'voxel' | 'pvp' | 'pve' | string;

export interface GameModeDefinition<TType extends GameType = GameType> {
  readonly id: string; // 例: fps-official (本体), fps-official-ffa (FFAサブモード), voxel-official-survival
  readonly type: TType; // fps | voxel のみ
  readonly source: ContentSource; // official | ugc。Sandboxは両方含む
  readonly slug: string;
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly world: TType extends 'voxel' ? VoxelWorldSpec : FpsWorldSpec;

  // --- Official FPS: 1ゲーム複数モード ---
  readonly subModes?: SubTag[]; // Official FPSのみ: [FFA,TDM,DOM,etc.] 内部サブモード一覧
  readonly currentSubMode?: SubTag; // 現在のサブモード

  // --- 親ジャンル/サブタグ (Sandboxフィルタ用) ---
  readonly parentGenre?: ParentGenre; // 親ジャンル: FPS / Voxel
  readonly genres?: SubTag[]; // サブタグ: Bedwars/Zombie/Athletic等 (旧名称維持)
  readonly tags?: Tag[];

  // --- 表示メタ ---
  readonly display?: {
    readonly title?: string;
    readonly description?: string;
    readonly thumbnail?: string;
    readonly creator?: string;
    readonly creatorId?: string;
  };

  // --- 統計 ---
  readonly stats?: {
    readonly totalPlays?: number;
    readonly activePlayers?: number;
    readonly detailViews?: number;
  };

  // --- カテゴリ ---
  readonly category?: GameCategory; // Official | Sandbox。OfficialはFPS 1ゲーム複数モード + Voxel 1モード永続、Sandboxは公式拡張+UGC

  // フック
  onRoomCreate?(ctx: RoomCtxFor<TType>): void | Promise<void>;
  onRoomDestroy?(ctx: RoomCtxFor<TType>): void | Promise<void>;
  onRoundStart?(ctx: RoomCtxFor<TType>): void;
  onRoundEnd?(ctx: RoomCtxFor<TType>): void;
  onPlayerJoin?(ctx: RoomCtxFor<TType>, player: PlayerRef): void;
  onPlayerLeave?(ctx: RoomCtxFor<TType>, player: PlayerRef): void;
  onPlayerSpawn?(ctx: RoomCtxFor<TType>, player: PlayerRef): void;
  onPlayerDeath?(ctx: RoomCtxFor<TType>, player: PlayerRef, killer?: PlayerRef): void;
  onPlayerDamage?(ctx: RoomCtxFor<TType>, player: PlayerRef, amount: number, from?: PlayerRef): void;
  onTick?(ctx: RoomCtxFor<TType>, dtMs: number): void;
  onNetworkMessage?(ctx: RoomCtxFor<TType>, player: PlayerRef, msg: unknown): void;
  onBlockPlace?(ctx: VoxelCtx, player: PlayerRef, pos: Vec3, block: number): void;
  onBlockBreak?(ctx: VoxelCtx, player: PlayerRef, pos: Vec3, block: number): void;
  onWeaponFire?(ctx: FpsCtx, player: PlayerRef, weapon: string): void;
  onHit?(ctx: FpsCtx, shooter: PlayerRef, target: PlayerRef, damage: number): void;
}
```

- **Official FPSは1ゲーム複数モード**: `id=fps-official` が本体、内部 `subModes=[ffa,tdm,dom,etc.]`、投票で次サブモード決定。現行 `fps-official-ffa` はFFAサブモードの最小実装。
- **Official Voxelは1モードのみ**: `id=voxel-official-survival`、永続サバイバル、死んだらリスポーン、finish_game無し。
- **Sandboxは公式拡張+UGC**: 標準FPS/Voxel以外の公式ゲーム (例: Zombie, Bedwars) もSandboxに含まれる。親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic でフィルタ。

## Sandbox ハブ型 — 改訂版 (親ジャンル+サブタグ)

```ts
export interface SandboxCard {
  readonly id: string;
  readonly type: GameType; // fps | voxel
  readonly source: ContentSource; // official (公式拡張) | ugc
  readonly slug: string;
  readonly parentGenre: ParentGenre; // 親ジャンル: FPS / Voxel
  readonly genres: SubTag[]; // サブタグ: Bedwars/Zombie/Athletic等
  readonly tags: Tag[];
  readonly title: string;
  readonly creator: string; // Official または ユーザー名
  readonly thumbnail: string;
  readonly totalPlays: number;
  readonly activePlayers: number;
  readonly detailViews: number;
  readonly description: string;
  readonly category: 'Sandbox'; // 常に Sandbox。OfficialはHeaderタブ
}

export type ParentGenreFilter = 'all' | ParentGenre; // all | fps | voxel
export type SubTagFilter = 'all' | SubTag; // all | bedwars | zombie | athletic | ...
export type SandboxSortKey = 'totalPlays' | 'activePlayers' | 'detailViews';

export interface SandboxQuery {
  parentGenre: ParentGenreFilter; // 親ジャンルフィルタ: FPS / Voxel
  subTag: SubTagFilter; // サブタグフィルタ: Bedwars/Zombie/Athletic等
  sort: SandboxSortKey;
  order: 'desc' | 'asc';
  search?: string;
}
```

- 親ジャンルフィルタ: FPS / Voxel
- サブタグフィルタ: Bedwars, Zombie, Athletic等
- SandboxはUGCだけでなく、標準FPS/Voxel以外の公式ゲームも含む。

## Voting 型 — Official FPS 1ゲーム複数モード用

```ts
export interface VoteOption {
  readonly subMode: SubTag; // 例: ffa, tdm, dom
  readonly label: string; // 表示名: FFA, TDM, DOM
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
```

- トリガー: Official FPSで1マッチ終了時 `onRoundEnd` 後に全プレイヤーへ投票UI。
- 候補: 同一FPS公式ゲーム内のサブモード [FFA,TDM,DOM,etc.]。
- 多数決で次サブモード決定。Official Voxelは投票対象外 (Survival永続)。

## Official Voxel 永続サバイバル

```ts
export interface VoxelSurvivalSpec {
  readonly mode: 'survival';
  readonly finish_game: false; // 永遠続く
  readonly respawn: true; // 死んだらリスポーン可能
}
```

- Official Voxelはモード1つのみ [Survival]、永続サバイバル。

## RoomCtx

ゲームモードから見えるエンジン表面。**変更は必ず ctx 経由。** `PlayerRef` はすべて `readonly`。

共通 `BaseCtx`: `random` / `randomInt`（シードは welcome で配布）、プレイヤー操作、インベントリ、スコア、HUD、`send`/`broadcast`（レート制限、超過時 `false`）、`after`/`every`/`cancel`（**ティック基準。`setTimeout` 禁止**）。

`VoxelCtx`: `getBlock` / `setBlock` / `fillBox` / `getRegion`（最大 32768） / `pasteSchematic` / `raycastBlock` / `setBlockProperty`

`FpsCtx`: `giveWeapon` / `setAmmo` / `getSpawnPoints` / `getZone` / `raycastWorld` / `raycastPlayers`（巻き戻し）

`RoomState`: `waiting` | `countdown` | `playing` | `ended` | `voting` (投票中を追加)
