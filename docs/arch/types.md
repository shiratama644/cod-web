# 中核の型

## TypeSpec

```ts
export type GameType = 'voxel' | 'fps';

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
|---|---:|---:|---:|---|
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

## GameModeDefinition

- `id`: `/^[a-z][a-z0-9-]{2,31}$/`
- `type: T` が所属タイプ
- `minPlayers` / `maxPlayers`: 1..64
- `world`: voxel なら `VoxelWorldSpec`、fps なら `FpsWorldSpec`
- フック: `onRoomCreate/Destroy`, `onRoundStart/End`, `onPlayerJoin/Leave/Spawn/Death/Damage`, `onTick`, `onNetworkMessage`
- voxel のみ: `onBlockPlace` / `onBlockBreak`
- fps のみ: `onWeaponFire` / `onHit`

`defineGameMode(def)` は検証してそのまま返す。実装例はソース仕様書 v2（`.archive/docs/マルチタイプ・ゲームプラットフォーム 設計書.md`）の fps-tdm / voxel-bedwars。

## RoomCtx

ゲームモードから見えるエンジン表面。**変更は必ず ctx 経由。** `PlayerRef` はすべて `readonly`（UGC で WASM 境界を越えるコピーになる前提）。

共通 `BaseCtx`: `random` / `randomInt`（シードは welcome で配布）、プレイヤー操作、インベントリ、スコア、HUD、`send`/`broadcast`（レート制限、超過時 `false`）、`after`/`every`/`cancel`（**ティック基準。`setTimeout` 禁止**）。

`VoxelCtx`: `getBlock` / `setBlock` / `fillBox` / `getRegion`（最大 32768） / `pasteSchematic` / `raycastBlock` / `setBlockProperty`

`FpsCtx`: `giveWeapon` / `setAmmo` / `getSpawnPoints` / `getZone` / `raycastWorld` / `raycastPlayers`（巻き戻し）

`RoomState`: `waiting` | `countdown` | `playing` | `ended`
