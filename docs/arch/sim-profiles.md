# Sim Profile 実装

## VoxelProfile

Voxel は `official` / `ugc` の両方を持つ。`official` は Minecraft 風の地形生成（ノイズ、バイオーム、洞窟、鉱石、構造物など）を独自実装し、`ugc` は投稿/編集されたワールドを扱う。いずれも Game Type は `voxel` のままで、`official` / `ugc` を type にしない。


| ライブラリ | ライセンス | 用途 |
|---|---|---|
| `noa-engine` | MIT | クライアント描画・チャンク。npm latest 0.33.0 は `@babylonjs/core` を peer（`^6.1.0`）として要求 |
| `voxel-physics-engine` | MIT | 衝突・移動。**Babylon 非依存。サーバでも動かす** |
| `@babylonjs/core` | Apache-2.0 | 描画 |
| `ent-comp` | MIT | 軽量 ECS。Noa 系の構成に合わせて採用候補 |
| `micro-game-shell` | ISC | tick/render loop と pointerLock/fullscreen/resize 管理。Noa 依存として挙動を確認 |
| `game-inputs` | ISC | key/mouse event 抽象。プロジェクトの入力累積方針と競合しない範囲で採用候補 |
| `nipplejs` | MIT | モバイル仮想スティック候補。タッチ対応フェーズで採用検討 |

Noa の `tickRate` は v0.30.0 以降 **ticks per second**（ms/tick ではない）。`manuallyControlChunkLoading` は v0.29.0 で追加。導入時は latest history と `.d.ts` を再確認する（[api-sources.md](./api-sources.md)、[noa history](https://raw.githubusercontent.com/fenomas/noa/master/docs/history.md)）。

```ts
const noa = new NoaEngine({
  tickRate: 30,
  maxRenderRate: 0,
  manuallyControlChunkLoading: true, // 必須。サーバ権威ではクライアントが地形生成しない
  chunkSize: 16,
  chunkAddDistance: [8, 4],
  chunkRemoveDistance: [10, 6],
});
```

`manuallyControlChunkLoading` は v0.29 で追加。有効時は `manuallyLoadChunk` / `manuallyUnloadChunk`。[history.md](https://github.com/fenomas/noa/blob/master/docs/history.md)

Noa にネットワーク機能はない。ネットコードは自前。

### 物理（client/server 同一）

[voxel-physics-engine](https://github.com/fenomas/voxel-physics-engine):

```ts
import Physics from 'voxel-physics-engine';
const phys = new Physics({ gravity: [0, -22, 0] }, voxelIsSolid, voxelIsLiquid);
phys.tick(dtMs); // 引数の単位は導入時に `dist/src/index.d.ts` / 公式 README で再確認
body.autoStep = true;
```

剛体同士の衝突は非対応 → **プレイヤー同士はすり抜ける**（ADR-007）。階段・スラブは AABB 近似。ビット単位の決定論は保証されない。同一コード・量子化済み入力・許容誤差 0.35m で補正。

### ChunkStore

16³ = 4096 の `Uint16Array`。インデックス `(y << 8) | (z << 4) | x`（Y 最上位で RLE が効く）。キーはチャンク座標。実装は BigInt でも、文字列 / 入れ子 Map でもよい（プロトコルの AOI 節は BigInt 回避を推奨）。

ワールドは **ルーム終了後も保存して再開**する（方式はフェーズ 4）。遠方チャンクのアンロードは当面せずメモリ保持。

## FpsProfile

FPS は `official` / `ugc` の両方を持つ。Krunker.io のようなエディタで誰でもマップを作れることを目標にする。マップは静的アリーナだが、エディタ上では `.glb` 読み込みと spawn / zone / killVolume 編集をサポートする。

```
render.glb / collision.glb（三角形 1/10 以下）/ meta.json
```

`meta.json`: id, sha256 hash（client/server 照合）, bounds, spawns, zones, killVolumes。

**Havok は使わない。** サーバで同一コードが必要。`collision.glb` から自前 BVH。`sweepCapsule` / `raycast` の結果は事前確保オブジェクトへ書き込む。

移動デフォルト（ゲームモードが `MovementTuning` で調整、エンジンが範囲検証）:

walk 8 m/s、sprint 1.45、crouch 0.5、accel 60、airAccel 12、friction 8、gravity -24、jump 8.5、カプセル半径 0.4 高さ 1.8。

ヒットスキャン: rewind 0–250ms → マップレイ → プレイヤー（頭・胴・四肢 AABB）→ restore → `onHit`。

マップアセットは **CDN** 配信。階層は `/fps/official/pvp`, `/fps/official/zombie`, `/fps/ugc/athletic` 等（[editor.md](./editor.md)）。
