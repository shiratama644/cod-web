# 中核の型

## TypeSpec

```ts
export type GameType = 'voxel' | 'fps';
export type ContentSource = 'official' | 'ugc';

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

スナップショット内の voxel 位置は **AOI 相対**で圧縮する（[protocol.md](./protocol.md)）。

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

  /**
   * 1ティック。クライアントとサーバで同一コード。
   * Date / Math.random / I/O 禁止。
   */
  step(state: SimState, entity: SimEntity, input: DecodedInput, dtMs: number): void;
  drainEvents(state: SimState): SimEvent[];

  writeSnapshot(state: SimState, viewer: SimEntity, w: BinaryWriter): void;
  writeWorldDelta(state: SimState, viewer: SimEntity, w: BinaryWriter, budgetBytes: number): boolean;
  handleTypedPacket(state: SimState, entity: SimEntity, type: number, r: BinaryReader): void;

  extendCtx(state: SimState): Record<string, unknown>;
  readPose(entity: SimEntity): Pose;
  writePose(entity: SimEntity, pose: Partial<Pose>): void;
}

export interface DecodedInput {
  seq: number;
  moveX: number; // -1..1（逆量子化後）
  moveZ: number;
  yaw: number;
  pitch: number;
  buttons: number;
  dtMs: number;
}

export interface Pose {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  yaw: number; pitch: number;
  onGround: boolean;
}
```

`drainEvents()` で L2 は L3 を直接知らずにイベントを出す。`extendCtx()` で `ctx.setBlock()` 等を合成する。L1 はその中身を知らない。

`SimEvent` の kind: `death` / `damage` / `blockPlace` / `blockBreak` / `landed`。

## GameModeDefinition — 2026-09-22 拡張（genres/tags, 表示メタ）

```ts
export type GameType = 'voxel' | 'fps';
export type ContentSource = 'official' | 'ugc';

// 表示上の 3 カテゴリ（内部 L1 は fps|voxel のまま）
export type PlatformCategory = 'fps' | 'voxel' | 'sandbox';
// sandbox = source=ugc の集約ビュー

export type Genre =
  | 'fps' | 'ffa' | 'pvp' | 'tdm' | 'dom'
  | 'zombie' | 'athletic' | 'bedwars' | 'survival' | 'parkour' | string;

export type Tag =
  | 'official' | 'ugc'
  | 'fps' | 'voxel'
  | 'pvp' | 'pve' | 'parkour' | string;

export interface GameModeDefinition<TType extends GameType = GameType> {
  readonly id: string; // /^[a-z][a-z0-9-]{2,31}$/ 例: fps-official-ffa
  readonly type: TType; // fps | voxel のみ
  readonly source: ContentSource; // official | ugc
  readonly slug: string; // URL短名 例: ffa

  readonly minPlayers: number; // 1..64
  readonly maxPlayers: number; // 1..64
  readonly world: TType extends 'voxel' ? VoxelWorldSpec : FpsWorldSpec;

  // --- Phase 4 追加 (optional, 後方互換) ---
  readonly genres?: Genre[]; // Sandbox フィルタ用: ['bedwars'] | ['zombie'] | ['athletic'] 等
  readonly tags?: Tag[];     // 検索用: ['official','pvp'] / ['ugc','bedwars'] 等

  // --- 表示メタ (Sandboxカード用, optional) ---
  readonly display?: {
    readonly title?: string;       // カードタイトル
    readonly description?: string; // 簡易説明文
    readonly thumbnail?: string;   // サムネイル URL
    readonly creator?: string;     // 作者名
    readonly creatorId?: string;
  };

  // --- 統計 (Phase 4 mock, Phase 6 RDB) ---
  readonly stats?: {
    readonly totalPlays?: number;   // 累計プレイ数
    readonly activePlayers?: number; // 現在同時接続数
    readonly detailViews?: number;  // 詳細ページ閲覧数
  };

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
  // voxel のみ
  onBlockPlace?(ctx: VoxelCtx, player: PlayerRef, pos: Vec3, block: number): void;
  onBlockBreak?(ctx: VoxelCtx, player: PlayerRef, pos: Vec3, block: number): void;
  // fps のみ
  onWeaponFire?(ctx: FpsCtx, player: PlayerRef, weapon: string): void;
  onHit?(ctx: FpsCtx, shooter: PlayerRef, target: PlayerRef, damage: number): void;
}
```

- `id`: `/^[a-z][a-z0-9-]{2,31}$/`（例: `fps-official-pvp`, `voxel-ugc-athletic`）
- `type: T` が所属タイプ（`fps` / `voxel` のみ）。過去に `boxel` と記載があった箇所は `voxel` のタイポ。
- `source: ContentSource` が公式/UGC 区分（`official` / `ugc`）。type に混ぜない。`Sandbox = source=ugc` の表示集約。
- `slug`: URL 用の短い名前（例: `/fps/official/pvp` の `pvp`）
- `minPlayers` / `maxPlayers`: 1..64
- `world`: voxel なら `VoxelWorldSpec`、fps なら `FpsWorldSpec`
- `genres` / `tags`: Sandbox フィルタ/検索用。optional で後方互換。
- `display`: Sandbox カード表示用（thumbnail/title/creator/desc）。
- `stats`: ソート用（totalPlays/activePlayers/detailViews）。Phase 4 mock、Phase 6 RDB。
- フック: `onRoomCreate/Destroy`, `onRoundStart/End`, `onPlayerJoin/Leave/Spawn/Death/Damage`, `onTick`, `onNetworkMessage`
- voxel のみ: `onBlockPlace` / `onBlockBreak`
- fps のみ: `onWeaponFire` / `onHit`

`defineGameMode(def)` は `id` / `type` / `source` / `slug` を検証してそのまま返す。階層ルールは [`editor.md`](./editor.md)。`genres`/`tags`/`display`/`stats` は検証 optional。

## Sandbox ハブ型（Phase 4）

```ts
// カード表示
export interface SandboxCard {
  readonly id: string; // GameModeDefinition.id
  readonly type: GameType;
  readonly source: ContentSource; // 常に 'ugc' だが型上は両方許容
  readonly slug: string;
  readonly genres: Genre[];
  readonly tags: Tag[];
  readonly title: string;
  readonly creator: string;
  readonly thumbnail: string;
  readonly totalPlays: number;
  readonly activePlayers: number;
  readonly detailViews: number;
  readonly description: string;
}

export type SandboxFilterCategory = 'all' | Genre; // all | bedwars | zombie | athletic | ...
export type SandboxSortKey = 'totalPlays' | 'activePlayers' | 'detailViews';

export interface SandboxQuery {
  filter: SandboxFilterCategory; // カテゴリ別フィルタ
  sort: SandboxSortKey;          // ソートキー
  order: 'desc' | 'asc';
  search?: string;
}

// 詳細ページ & 参加フロー
export interface SandboxDetail {
  card: SandboxCard;
  rooms: RoomSummary[]; // matchmaker game-list 相当
}

export interface RoomSummary {
  roomId: string;
  modeId: string;
  playerCount: number;
  maxPlayers: number;
  hasSpace: boolean;
}

// Play Now: POST /v1/seek-game 相当、空きルーム自動マッチ
// Room Selection: GET /v1/game-list 相当、手動選択モーダル
```

## Voting 型（メイン画面 FPS）

```ts
export interface VoteOption {
  readonly modeId: string; // 例: fps-official-ffa, fps-official-tdm, fps-official-dom
  readonly label: string;  // 表示名
  readonly votes: number;
}

export interface VoteSession {
  readonly roomId: string;
  readonly options: VoteOption[];
  readonly endsAtMs: number; // 投票終了時刻
  readonly voters: Set<string>; // 投票済み playerId
}

export type VoteEvent =
  | { kind: 'voteStart'; session: VoteSession }
  | { kind: 'voteCast'; playerId: string; modeId: string }
  | { kind: 'voteEnd'; winnerModeId: string };
```

- トリガー: `onRoundEnd` 後に全プレイヤーへ投票 UI 表示。
- 候補: `type=fps, source=official` の一覧（FFA/TDM/DOM 等）。
- 多数決で次モード決定。`after`/`every` tick 基準でタイマー管理（`setTimeout` 禁止）。

## RoomCtx

ゲームモードから見えるエンジン表面。**変更は必ず ctx 経由。** `PlayerRef` はすべて `readonly`（UGC で WASM 境界を越えるコピーになる前提）。

共通 `BaseCtx`: `random` / `randomInt`（シードは welcome で配布）、プレイヤー操作、インベントリ、スコア、HUD、`send`/`broadcast`（レート制限、超過時 `false`）、`after`/`every`/`cancel`（**ティック基準。`setTimeout` 禁止**）。

`VoxelCtx`: `getBlock` / `setBlock` / `fillBox` / `getRegion`（最大 32768） / `pasteSchematic` / `raycastBlock` / `setBlockProperty`

`FpsCtx`: `giveWeapon` / `setAmmo` / `getSpawnPoints` / `getZone` / `raycastWorld` / `raycastPlayers`（巻き戻し）

`RoomState`: `waiting` | `countdown` | `playing` | `ended`
