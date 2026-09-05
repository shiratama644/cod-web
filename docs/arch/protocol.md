# ネットワークプロトコル

## 方針

- **手書きバイナリ**。リトルエンディアン `DataView`。高頻度に msgpack / JSON は使わない
- **`BinaryReader` は必ず境界チェック。** 不足なら `ProtocolError`。現行 `getUint32` の RangeError でプロセスが落ちる問題への対策
- タイプ非依存 framing の上にタイプ固有ペイロード
- **制御メッセージのみ JSON**（Welcome 詳細、チャット等）
- **トランスポートは WebSocket（TCP）のみ**（フェーズ 0–8）。WT / WebRTC DataChannel / geckos.io / 生 UDP は今は実装しない

確認済み: Bun v1.3.14 で HTTP/3 は実験的。**WebSocket over HTTP/3 は未対応**（`server.upgrade()` は false）。**WebTransport は別プロジェクト**。[Bun v1.3.14](https://bun.com/blog/bun-v1.3.14)

## パケットタイプ

```ts
export const enum PacketType {
  Hello = 0x00, Welcome = 0x01, Reject = 0x02,
  Ping = 0x03, Pong = 0x04, TimeSync = 0x05, Disconnect = 0x06,

  Input = 0x10, Snapshot = 0x11, PlayerJoin = 0x12, PlayerLeave = 0x13,
  RoomState = 0x14, Event = 0x15, Chat = 0x16,

  ModeMessage = 0x20,

  ChunkData = 0x40, ChunkUnload = 0x41, BlockDelta = 0x42,
  BlockAction = 0x43, InventoryState = 0x44, ItemUse = 0x45,

  MapInfo = 0x60, WeaponState = 0x61, FireAction = 0x62,
  ReloadAction = 0x63, HitConfirm = 0x64, Tracer = 0x65,
}
```

`type >= 0x40 && type < 0x60` → voxel プロファイル、`>= 0x60` → fps。L1 は中身を知らず L2 へ委譲。

### 固定長（長さが違うと即切断 1002）

| type | バイト |
|---|---:|
| Input | 16 |
| BlockAction | 20 |
| FireAction | 24 |
| ReloadAction | 6 |
| Ping | 10 |

## Hello / Welcome / Reject

Hello（C→S）: `u8 type`, `u8 protocolVersion`（現行 1）, `u16 ticketLen`, ticket UTF-8。Welcome 前の他パケットは拒否。

検証: バージョン、チケット HMAC、`exp` が未来（TTL 15 秒）、`roomId` が自ノード、`seatId` 未使用。失敗は Reject して切断。

Welcome: `gameType` 0=voxel 1=fps、`yourPlayerId`、`randomSeed`、`serverTimeMs`、tick/snapshot/input Hz、`maxPlayers`、JSON（roomId, mode, world, teams, players, round）。

Reject reason: 1 バージョン、2 チケット、3 ルームなし、4 満員、5 BAN、6 再起動中。

認証情報は **Hello ペイロード**に載せる。Cookie / `Sec-WebSocket-Protocol` / URL クエリに載せない（WT 移行時にハンドシェイク層を作り直さないため）。

## Input (0x10) — 16 バイト固定

```
0  u8   type = 0x10
1  u8   reserved = 0
2  u32  seq
6  i8   moveX   -100..100 → -1..1
7  i8   moveZ
8  u16  yaw     0..65535 → 0..2π
10 i16  pitch   -16384..16384 → -π/2..π/2
12 u16  buttons
14 u16  dtMs
```

`buttons`: bit0 jump, 1 crouch, 2 sprint, 3 primary, 4 secondary, 5 reload/interact, 6–8 weapon slot, 9–15 予約（非0なら不正記録）。

検証: 長さ≠16 で切断。moveX/Z 範囲外で切断。`dtMs > 500` は clamp（切断しない）。

**未決:** `dtMs` の単位が「ミリ秒」か「ミリ秒×10」か、ソース仕様書 v2 に両方の記述がある。実装着手時に人間へ確認する。現行 packer は type 込み 13 バイト（本体 12B）。理想は 16B 固定。

## Snapshot (0x11)

```
0  u8   type
1  u8   flags     bit0: full / delta
2  u32  tick
6  u32  lastAckedInputSeq   ★必須。予測の巻き戻し基準
10 u32  baselineTick        full なら 0
14 u16  entityCount
16 bytes entities...        SimProfile.writeSnapshot
```

単体で復元できるか、baseline seq を明示する。「直前スナップショットが必ず届いている」前提を置かない。

### fps エンティティ 17B

`playerId u16`, `flags u8`（alive/crouch/sprint/onGround/reloading）, `x,y,z i16`（1cm 絶対）, `vx,vz i16`（1cm/s）, `yaw u16`, `pitch i8`, `health u8`。

`vy` は送らない（重力は決定論、onGround と位置から補間）。実装単純さのため追加してよいが、MTU 予算を守ること。

### voxel エンティティ 15B（AOI 相対）

`playerId`, `flags`（+swimming）, `dx,dy,dz i16`（ビューアのチャンク原点から 1cm）, `yaw`, `pitch i8`, `health`, `heldItem u16`。

voxel の場合 Snapshot ヘッダの後に `viewerOriginX/Y/Z i32`（ブロック座標）を置く。AOI 半径を 256m 以内にすれば相対は i16 に収まる。

## voxel 専用

### ChunkData (0x40)

チャンク **16³**（Noa デフォルト）。`encoding` 0=raw（デバッグ）, 1=RLE（最初にこれ）, 2=palette+bitpack（本命）。断片: `payloadLen` 最大 4096B。1ティックあたりプレイヤー最大 4 断片。バックプレッシャ時はチャンク停止・スナップショットのみ。優先度は距離×（視線外なら 2.5）。

最大ボクセル ID **65535**（Noa 制約）。palette は u16。

### BlockDelta (0x42)

`seq` 欠落検出。TCP では通常起きないが WT の datagram 用に最初から書く。欠落時クライアントは ChunkResync。entry 14B × 最大 512。

### BlockAction (0x43) 20B 固定

`action` 0=break 1=place 2=use、`inputSeq`、`x,y,z i32`、`blockId u16`。

必須検証: リーチ 5.5m、チャンクロード済み、レート 20/s、インベントリ、occupied、他プレイヤー AABB、ゲームモードフック、blockId 登録。拒否専用パケットは作らない（BlockDelta で巻き戻す）。

## fps 専用

### FireAction (0x62) 24B

武器スロット、inputSeq、clientTimeMs、照準 yaw/pitch、申告 origin、shotId。

検証: 申告位置と履歴の乖離 >1.5m はフラグ（即切断しない）、連射間隔、弾数、巻き戻し clamp 0–250ms。

履歴: 直近 500ms、記録は毎ティック。現行 `lagcomp-store.ts` の `record()` 未呼び出しは直すか削除。

### HitConfirm (0x64)

bodyPart、shotId、victimId、damage、killed。

## AOI

現行フルスナップショットは O(n²)。20 人で約 193 KB/s 総帯域。

| タイプ | 手法 |
|---|---|
| voxel | チャンクグリッド。半径 8 チャンク（128m）内のプレイヤーのみ |
| fps | 全員送信 + 距離 LOD。&lt;30m 30Hz、30–80m 15Hz、&gt;80m と視錐台外 7.5Hz |

帯域目標は [engineering.md](./engineering.md)。

## トランスポート

### 今（フェーズ 0–8）

`Bun.serve` + ネイティブ WebSocket のみ。議論や再実装で UDP 系に逃げない。TCP の HOL はアプリ層で緩和する（断片化、送信優先度、`perMessageDeflate: false`、`send()` 戻り値、`cork()`、補間遅延）。

公式: [`send()` は -1 バックプレッシャ（キュー済み）、0 破棄、1+ 送信バイト](https://bun.com/docs/runtime/http/websockets)。`drain` で再開。`bufferedAmount` に頼らない。

### 将来 WT のための備え（今から守る）

`NetTransport` 抽象。ゲームコードは `WebSocket` に直接触れない。

```ts
export const enum Channel {
  Reliable = 0,    // Hello/Welcome/RoomState/Chat/BlockDelta
  Unreliable = 1,  // Input/Snapshot
  Bulk = 2,        // ChunkData
}

export interface NetTransport {
  connect(url: string, ticket: string): Promise<void>;
  send(channel: Channel, payload: ArrayBufferView): void;
  onMessage(cb: (channel: Channel, data: DataView) => void): void;
  onClose(cb: (code: number, reason: string) => void): void;
  close(code?: number, reason?: string): void;
  readonly bufferedAmount: number;
  readonly kind: 'websocket' | 'webtransport';
}
```

WS 実装では Channel は先頭 1B に載せるが同一 TCP。WT では Reliable→双方向 stream、Unreliable→datagram、Bulk→単方向 stream。

`webtransport.ts` は今作らない（フェーズ 9）。

`seq` 欠落パスはモックトランスポートで CI し続ける（TCP ではデッドに見える）。

メッセージ: Input 16B。Snapshot は **1200B 超えたら分割**する設計（QUIC datagram 安全圏）。ChunkData は断片化前提で MTU 非対象。

### フェーズ 9 の着手条件（すべて満たすこと）

1. Bun が WT サーバ API を安定提供している、または別言語エッジを運用する判断
2. 実測で TCP 再送スパイクが主要ボトルネック
3. WS を主要として維持できる（フォールバックは恒久必須）

改善が確認できなければ WT を無効化して撤退する（実装は残す）。
