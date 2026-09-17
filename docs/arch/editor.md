# エディタとコンテンツ階層

> 正本: 本ファイル + [`product.md`](./product.md) + [`types.md`](./types.md)。  
> API の一次情報: [`api-sources.md`](./api-sources.md)。  
> 目的: Krunker.io のように、公式コンテンツと UGC コンテンツの両方でマップ/ワールドを作れる状態にする。

## 階層モデル

`fps` / `voxel` は **Game Type**。`official` / `ugc` はタイプではなく **Content Source**。

```
/{type}/{source}/{mode-or-world}

/fps/official/pvp
/fps/official/zombie
/fps/ugc/athletic

/voxel/official/survival
/voxel/official/bedwars
/voxel/ugc/athletic
```

| 層 | 値 | 意味 |
|---|---|---|
| `type` | `fps` / `voxel` | シミュレーション・物理・座標系・同期形式を決める |
| `source` | `official` / `ugc` | 運営が同梱/承認するか、ユーザー作成かを表す |
| `mode-or-world` | `pvp`, `zombie`, `survival`, `bedwars`, `athletic` 等 | ルール/ワールド/マップの表示・検索上の slug |

重要: 3 種類目の type（例: `official` や `ugc`）を作らない。L2 の分岐は `fps` / `voxel` の 2 つだけ。official/UGC は L3 以降のメタデータと配信・権限で扱う。

## FPS エディタ

FPS は Krunker.io のように、誰でもアリーナ/アスレチック/ゾンビ用マップを作れるエディタを目標にする。

| 項目 | 方針 |
|---|---|
| 実装技術 | Babylon.js。React は UI パネル、3D 操作は Babylon の命令型コード |
| インポート | `.glb` / glTF 2.0 を読み込む。Babylon 公式は `@babylonjs/loaders` と module-level loader functions を推奨 |
| 出力 | `render.glb`, `collision.glb`, `meta.json`（spawn, zones, killVolumes, hash 等） |
| 公式コンテンツ | `/fps/official/pvp`, `/fps/official/zombie` など。Git 管理または CDN 管理 |
| UGC | `/fps/ugc/<slug>`。アップロード後に検証・承認・バージョン管理する |

GLB 読み込み時の注意:

- Babylon 公式では glTF loader plugin は `@babylonjs/loaders` を使う。production では Babylon public CDN ではなく自前配信を推奨している。
- Draco / Meshopt / KTX2/Basis 等の圧縮を許可する場合、decoder を自前ホストまたは resource injection にする。CSP / GDPR 事故を避ける。
- `SceneLoader` class は typedoc 上 deprecated 扱いで、tree shaking と plugin options のため module-level functions（例: `LoadAssetContainerAsync`, `ImportMeshAsync` 等）が推奨されている。
- collision 用 GLB は描画用 GLB から自動生成してもよいが、最終的にはサーバで検証可能な簡略メッシュにする。

## Voxel 公式ワールド

Voxel の公式コンテンツは、Minecraft 風の地形生成（ノイズ、バイオーム、洞窟、鉱石分布、構造物など）を **独自実装**で再現する。Minecraft のコード・アセット・商標表現は流用しない。

| 項目 | 方針 |
|---|---|
| クライアント描画/チャンク | `noa-engine` を使う |
| 物理 | `voxel-physics-engine` を使う |
| ECS | `ent-comp` を使う/Noa 内部構成に合わせる |
| ループ/PointerLock | Noa が依存する `micro-game-shell` の挙動を理解する。プロジェクトのメインループと競合しないよう導入時に再確認 |
| 入力 | `game-inputs` の採用可否を、既存 `requestPointerLock({ unadjustedMovement: true })` 方針と照合して決める |
| モバイル | `nipplejs` を仮想スティック候補にする。タッチ対応は後続フェーズ |
| 公式例 | `/voxel/official/survival`, `/voxel/official/bedwars` |

公式 terrain generator は seed を入力に、サーバ権威で同じチャンクを再生成できる deterministic な関数として実装する。保存が必要な差分（破壊/設置）は ChunkStore に重ねる。

## Voxel UGC

UGC は公式 terrain generator とは別に、プレイヤーが作るワールド/ミニゲームを扱う。

- `/voxel/ugc/athletic` など、type/source/slug で参照する。
- UGC スクリプトは [`ugc.md`](./ugc.md) の QuickJS sandbox 制限に従う。
- ワールド編集はサーバ権威の BlockAction / BlockDelta を通す。クライアントだけで永続地形を決めない。
- 投稿物はライセンス、通報、権利侵害窓口、moderation 状態を持つ。

## ルーティングと ID

| 用途 | 形式 |
|---|---|
| 表示/URL | `/{type}/{source}/{slug}` |
| GameMode ID | `fps-official-pvp`, `fps-official-zombie`, `fps-ugc-athletic`, `voxel-official-survival` 等 |
| 内部 metadata | `type: 'fps' | 'voxel'`, `source: 'official' | 'ugc'`, `slug: string` |

`source` を Game Type に混ぜない。検索・一覧・権限・公開状態は metadata として扱う。

## フェーズへの反映

- Phase 1: FPS 系のみのモノレポ + Babylon 移行。エディタ本体は作らないが、FPS マップ path / GLB 前提は維持する。
- Phase 4: ハブ/マッチメイカーで `type` + `source` + `slug` を一覧・検索できる形にする。
- Phase 7: voxel のチャンク同期・AOI と公式 terrain generator を本格化する。
- Phase 8: UGC エディタ、スクリプト sandbox、投稿/承認/配信フローを実装する。
