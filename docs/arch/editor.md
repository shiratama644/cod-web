# エディタとコンテンツ階層

> 正本: 本ファイル + [`product.md`](./product.md) + [`types.md`](./types.md)。  
> API の一次情報: [`api-sources.md`](./api-sources.md)。  
> 目的: Krunker.io のように、公式コンテンツと UGC コンテンツの両方でマップ/ワールドを作れる状態にする。
> 2026-09-22 理想確定: FPS/Voxel/Sandbox 3カテゴリ構成、Sandbox は source=ugc の表示集約、genre/tag 拡張。

## 階層モデル

`fps` / `voxel` は **Game Type**。`official` / `ugc` はタイプではなく **Content Source**。`Sandbox` は表示上のカテゴリ（UGC ハブ）で、L1 分岐を増やさない。

```
/{type}/{source}/{mode-or-world}   <- 内部正本

/fps/official/ffa        <- FPSカテゴリ (official)
/fps/official/tdm        <- FPSカテゴリ
/fps/official/dom        <- FPSカテゴリ
/fps/official/zombie     <- FPSカテゴリ (将来)

/voxel/official/survival <- Voxelカテゴリ (official)

/fps/ugc/athletic        <- Sandboxカテゴリ (UGC)
/voxel/ugc/bedwars       <- Sandboxカテゴリ (UGC)
/voxel/ugc/athletic      <- Sandboxカテゴリ (UGC)

/sandbox                 <- 表示上の集約: source=ugc 一覧 (Sandboxモーダル)
/sandbox?genre=bedwars   <- genreフィルタ
/sandbox/{id}            <- 詳細ページ (内部 /{type}/ugc/{slug} に解決)
```

| 層 | 値 | 意味 |
|---|---|---|
| `type` | `fps` / `voxel` | シミュレーション・物理・座標系・同期形式を決める。`boxel` は `voxel` の表示エイリアス |
| `source` | `official` / `ugc` | 運営が同梱/承認するか、ユーザー作成かを表す。`official` タグはこれ |
| `mode-or-world` | `ffa`, `pvp`, `tdm`, `dom`, `zombie`, `survival`, `bedwars`, `athletic` 等 | ルール/ワールド/マップの表示・検索上の slug。Sandbox フィルタの genre と一致 |

重要: 3 種類目の type（例: `official` や `ugc`）を作らない。L2 の分岐は `fps` / `voxel` の 2 つだけ。official/UGC は L3 以降のメタデータと配信・権限で扱う。**Sandbox は `source=ugc` の表示グルーピング**で、物理パスではない。

## Genre / Tag 拡張（Phase 4 追加）

現行 `slug` を genre/tag としても扱えるよう、`GameModeDefinition` に optional 拡張を追加（後方互換）。

```ts
type Genre = 'fps' | 'zombie' | 'athletic' | 'bedwars' | 'survival' | 'tdm' | 'dom' | 'ffa' | 'pvp' | ...;
type Tag   = 'official' | 'ugc' | 'fps' | 'voxel' | 'pvp' | 'pve' | 'parkour' | ...;

interface GameModeDefinition {
  id: 'fps-official-ffa'
  type: 'fps' | 'voxel'
  source: 'official' | 'ugc'
  slug: 'ffa' | 'tdm' | 'dom' | 'zombie' | 'bedwars' | 'athletic' | 'survival' | ...

  // 追加 (optional)
  genres: Genre[] // 例: ['fps'] / ['zombie'] / ['bedwars']
  tags: Tag[]     // 例: ['official','pvp'] / ['ugc','bedwars','pvp']
}
```

- FPS公式: `genres=[fps|ffa|tdm|dom]`, `tags=[official, pvp]` 等
- Voxel公式: `genres=[survival]`, `tags=[official, voxel, survival]`
- Sandbox UGC: `genres=[bedwars] / [zombie] / [athletic]`, `tags=[ugc, ...]`

`boxel` は UI 表示エイリアスとして `voxel` に正規化。検索・フィルタでは `boxel` 入力も `voxel` として扱う。

## Sandbox 表示マッピング

| 理想カテゴリ | 現行内部マッピング | URL例 | 備考 |
|---|---|---|---|
| FPS (公式対戦) | `type=fps, source=official` | `/fps/official/ffa`, `/fps/official/tdm` | Header [FPS] タブ |
| Voxel (公式サバイバル) | `type=voxel, source=official` | `/voxel/official/survival` | Header [Voxel] タブ |
| Sandbox (UGC) | `source=ugc` | `/fps/ugc/*`, `/voxel/ugc/*` を Sandbox として表示 | Left Sidebar [Sandbox] ボタン → モーダル `/sandbox` |

- Sandbox モーダル: カード一覧（thumbnail/title/creator/plays/desc）、カテゴリフィルタ（Bedwars/Zombie/Athletic 等 = genres）、ソート（totalPlays/activePlayers/detailViews）。
- 詳細ページ: `/sandbox/{id}` → 内部 `/{type}/ugc/{slug}` 解決。Play Now (auto-match) / Room Selection (manual) フロー。

## ルーティングと ID（更新）

| 用途 | 形式 |
|---|---|
| 表示/URL (内部正本) | `/{type}/{source}/{slug}` |
| Sandbox 表示集約 | `/sandbox`, `/sandbox?genre={genre}`, `/sandbox/{id}` |
| GameMode ID | `fps-official-pvp`, `fps-official-ffa`, `voxel-official-survival`, `fps-ugc-athletic` 等 |
| 内部 metadata | `type: 'fps' | 'voxel'`, `source: 'official' | 'ugc'`, `slug: string`, `genres?: Genre[]`, `tags?: Tag[]`, `boxel` は `voxel` エイリアス |

`source` を Game Type に混ぜない。検索・一覧・権限・公開状態は metadata として扱う。Sandbox は表示上のグルーピング。

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

- `/voxel/ugc/athletic` など、type/source/slug で参照する。Sandbox 表示では genre でグルーピング。
- UGC スクリプトは [`ugc.md`](./ugc.md) の QuickJS sandbox 制限に従う。
- ワールド編集はサーバ権威の BlockAction / BlockDelta を通す。クライアントだけで永続地形を決めない。
- 投稿物はライセンス、通報、権利侵害窓口、moderation 状態を持つ。
- 表示メタ: thumbnail / title / creator / totalPlays / activePlayers / detailViews / description（Sandbox カード用）。

## フェーズへの反映（更新）

- Phase 1: FPS 系のみのモノレポ + Babylon 移行。エディタ本体は作らないが、FPS マップ path / GLB 前提は維持する。
- Phase 4: ハブ/マッチメイカー + Sandbox モーダル骨組み + 投票システム入口。`type` + `source` + `slug` + `genres`/`tags` で一覧・検索・フィルタ・ソート。Header FPS/Voxel タブ、Left Sidebar Sandbox ボタン、Sandbox モーダル（カード: thumbnail/title/creator/plays/desc、filter Bedwars/Zombie/Athletic、sort plays/active/views）、詳細ページ Play Now / Room Selection。
- Phase 5: voxel-creative / bedwars / fps-tdm / fps-dom 等の追加モード。profile-voxel 本実装。
- Phase 6: API 再設計（genres/tags 永続化、ランキング RDB）。
- Phase 7: voxel のチャンク同期・AOI と公式 terrain generator を本格化する。
- Phase 8: UGC エディタ、スクリプト sandbox、投稿/承認/配信フローを実装する（Sandbox ハブ本番化）。
