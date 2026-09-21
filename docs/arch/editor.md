# エディタとコンテンツ階層

> 正本: 本ファイル + [`product.md`](./product.md) + [`types.md`](./types.md)。  
> API の一次情報: [`api-sources.md`](./api-sources.md)。  
> 目的: Krunker.io のように、公式コンテンツと UGC コンテンツの両方でマップ/ワールドを作れる状態にする。
> 2026-09-22 改訂版確定: OfficialはFPS 1ゲーム複数モード + Voxel 1モード永続、Sandboxは標準FPS/Voxel以外の公式ゲーム + UGC、親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic。

## 階層モデル — 改訂版

```
Official (公式ゲーム) — 運営が公式に提供するゲーム群
  /fps/official              <- FPS公式ゲーム本体 (1ゲーム複数モード) type=fps source=official modes=[FFA,TDM,DOM]
    subModes: ffa, tdm, dom, etc. (同一ゲーム内のサブモード、投票で次決定)
  /voxel/official/survival   <- Voxel公式 (1モードのみ) type=voxel source=official modes=[Survival] 永続サバイバル

Sandbox — 標準FPS/Voxel以外の公式ゲーム + UGC (親ジャンル FPS/Voxel + サブタグ)
  /fps/official/zombie       <- 公式拡張: Zombie (Sandbox表示) type=fps source=official genre=Zombie
  /voxel/official/bedwars    <- 公式拡張: Bedwars (Sandbox表示) type=voxel source=official genre=Bedwars
  /fps/ugc/zombie            <- UGC: Zombie
  /voxel/ugc/bedwars         <- UGC: Bedwars
  /voxel/ugc/athletic        <- UGC: Athletic

内部正本: /{type}/{source}/{slug}  例: /fps/official/ffa (FFAサブモード), /fps/official/zombie (公式拡張), /voxel/ugc/bedwars
表示集約: /sandbox, /sandbox?parent=fps&tag=zombie, /sandbox/{id}
```

| 層 | 値 | 意味 |
|---|---|---|
| `type` | `fps` / `voxel` | シミュレーション・物理・座標系・同期形式を決める。L1分岐は2つのみ |
| `source` | `official` / `ugc` | 運営が同梱/承認するか、ユーザー作成かを表す。Sandboxは両方含む |
| `slug` | `ffa`, `zombie`, `bedwars`, `athletic`, `survival`, `tdm`, `dom` 等 | ルール/ワールド/マップの表示・検索上の slug。Official FPSはサブモード、Sandboxはgenre/サブタグと一致 |
| `game` | `Official` / `Sandbox` | ゲーム種別。OfficialはFPS 1ゲーム複数モード + Voxel 1モード永続、Sandboxは標準以外の公式+UGC |

重要: 3 種類目の type（例: `official` や `ugc`）を作らない。L2 の分岐は `fps` / `voxel` の 2 つだけ。**Official FPSは1ゲーム複数モード、Official Voxelは1モード永続、Sandboxは公式拡張+UGC**。

## Official 構成 — 改訂版

### Official FPS: 1ゲーム複数モード

- 1つのゲーム `/fps/official` が内部に複数サブモード `modes: [FFA,TDM,DOM,etc.]` を持つ。
- 現行実装 `fps-official-ffa` はFFAサブモードの最小実装。将来TDM/DOM等を同一ゲーム内にサブモードとして追加。
- 1マッチ終了時、全プレイヤー投票で次サブモード決定。投票はゲームを跨がず、同一FPS公式ゲーム内のモード切替。
- ルームは常に `fps-official` で、内部状態 `subMode` が ffa/tdm/dom 等を保持。

```
RoomState: waiting -> countdown -> playing(ffa) -> ended -> voting -> playing(tdm) -> ...
```

### Official Voxel: 1モードのみ 永続サバイバル

- モード1つのみ [Survival]。`/voxel/official/survival`。
- 永遠続くMinecraftサバイバル、死んだらリスポーン可能。`finish_game` が無い。
- 投票対象外。永続ワールド。

## Sandbox 構成 — 改訂版 (公式拡張+UGC)

> SandboxはUGCだけでなく、標準で付いているFPS,Voxel以外の公式が作成したゲームもあります。

- **親ジャンル (FPS / Voxel など)**: `type=fps|voxel` でフィルタ。Official拡張もUGCも対象。
- **サブタグ (Bedwars, Zombie, Athletic など)**: `genres` / `tags` でフィルタ。
- 例:
  - FPSカテゴリ: TDM, DOM, Zombie等 (公式拡張 + UGC)
  - Voxelカテゴリ: Bedwars, Athletic等 (公式拡張 + UGC)

| Sandbox例 | source | 親ジャンル | サブタグ | 備考 |
|---|---|---|---|---|
| `/fps/official/zombie` | official | FPS | Zombie | 公式拡張、Sandbox表示 |
| `/voxel/official/bedwars` | official | Voxel | Bedwars | 公式拡張、Sandbox表示 |
| `/fps/ugc/zombie` | ugc | FPS | Zombie | UGC |
| `/voxel/ugc/athletic` | ugc | Voxel | Athletic | UGC |

- 表示上の `/sandbox` は公式拡張+UGCの集約ビュー。
- 内部URLは `/{type}/{source}/{slug}` 維持、表示では親ジャンル+サブタグでグルーピング。

## Genre / Tag 拡張（Phase 4 追加）— 改訂版

親ジャンルとサブタグの2層フィルタ。

```ts
type ParentGenre = 'fps' | 'voxel'; // 親ジャンル: FPS / Voxel
type SubTag = 'bedwars' | 'zombie' | 'athletic' | 'tdm' | 'dom' | 'ffa' | 'pvp' | 'survival' | string; // サブタグ

interface GameModeDefinition {
  id: 'fps-official-ffa' | 'voxel-official-survival' | 'fps-official-zombie' | 'voxel-ugc-bedwars'
  type: 'fps' | 'voxel'
  source: 'official' | 'ugc'
  slug: 'ffa' | 'survival' | 'zombie' | 'bedwars' | 'athletic' | ...

  // 追加 (optional)
  parentGenre?: ParentGenre // 親ジャンル: FPS / Voxel
  genres: SubTag[] // サブタグ: ['bedwars'] / ['zombie'] / ['athletic'] 等、旧名称 genres はサブタグとして維持
  tags: Tag[]      // 検索用: ['official','pvp'] / ['ugc','bedwars'] 等
}
```

- Official FPS: `parentGenre=fps`, `genres=[ffa|tdm|dom]`, `tags=[official,pvp]`, 内部 `subModes=[ffa,tdm,dom]`
- Official Voxel: `parentGenre=voxel`, `genres=[survival]`, `tags=[official,voxel,survival]`, 1モードのみ
- Sandbox 公式拡張: `parentGenre=fps|voxel`, `genres=[zombie]|[bedwars]`, `tags=[official,...]`
- Sandbox UGC: `parentGenre=fps|voxel`, `genres=[zombie]|[bedwars]|[athletic]`, `tags=[ugc,...]`

## Sandbox 表示マッピング — 改訂版

| 表示種別 | 内部マッピング | URL例 | 備考 |
|---|---|---|---|
| Official FPS (1ゲーム複数モード) | `type=fps, source=official`, 1ゲーム `fps-official` | `/fps/official` (subModes ffa/tdm/dom) | Header [FPS] タブ、投票で次サブモード |
| Official Voxel (1モード永続) | `type=voxel, source=official`, 1モード Survival | `/voxel/official/survival` | Header [Voxel] タブ、永続サバイバル |
| Sandbox (公式拡張+UGC) | `source=official|ugc` かつ標準FPS/Voxel以外。親ジャンル FPS/Voxel + サブタグ | `/fps/official/zombie`, `/voxel/official/bedwars`, `/fps/ugc/*`, `/voxel/ugc/*` をSandboxとして表示 | Left Sidebar [Sandbox] ボタン → モーダル `/sandbox` |

- Sandbox モーダル: カード一覧（thumbnail/title/creator/plays/desc）、親ジャンルフィルタ FPS/Voxel、サブタグフィルタ Bedwars/Zombie/Athletic、ソート totalPlays/activePlayers/detailViews。
- 詳細ページ: `/sandbox/{id}` → 内部 `/{type}/ugc/{slug}` または `/{type}/official/{slug}` (公式拡張) に解決。Play Now / Room Selection。

## ルーティングと ID（更新: Official 1ゲーム複数モード）

| 用途 | 形式 |
|---|---|
| 表示/URL (内部正本) | `/{type}/{source}/{slug}`。Official FPSは `/fps/official` が本体で subMode `ffa|tdm|dom` を内包 |
| Official FPS | `/fps/official` (1ゲーム複数モード)。サブモード ffa/tdm/dom。現行 `fps-official-ffa` はFFAサブモード |
| Official Voxel | `/voxel/official/survival` (1モードのみ、永続) |
| Sandbox 表示集約 | `/sandbox`, `/sandbox?parent=fps&tag=zombie`, `/sandbox/{id}`。公式拡張+UGCの集約 |
| GameMode ID | `fps-official` (FPS公式本体), `fps-official-ffa` (FFAサブモード), `voxel-official-survival`, `fps-official-zombie` (公式拡張), `fps-ugc-athletic` 等 |
| 内部 metadata | `type: 'fps' | 'voxel'`, `source: 'official' | 'ugc'`, `slug: string`, `parentGenre?: 'fps'|'voxel'`, `genres?: SubTag[]`, `tags?: Tag[]` |

`source` を Game Type に混ぜない。Officialは運営提供のFPS 1ゲーム複数モード + Voxel 1モード永続、Sandboxは標準以外の公式+UGC。

## FPS エディタ

FPS は Krunker.io のように、誰でもアリーナ/アスレチック/ゾンビ用マップを作れるエディタを目標にする。

| 項目 | 方針 |
|---|---|
| 実装技術 | Babylon.js。React は UI パネル、3D 操作は Babylon の命令型コード |
| インポート | `.glb` / glTF 2.0 を読み込む。Babylon 公式は `@babylonjs/loaders` と module-level loader functions を推奨 |
| 出力 | `render.glb`, `collision.glb`, `meta.json`（spawn, zones, killVolumes, hash 等） |
| 公式コンテンツ | Official FPSは `/fps/official` 本体、Official拡張は `/fps/official/zombie` など。Git 管理または CDN 管理 |
| UGC | `/fps/ugc/<slug>`。アップロード後に検証・承認・バージョン管理する。Sandbox表示 |

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
| 公式例 | Official Voxelは `/voxel/official/survival` (1モード永続)。公式拡張は `/voxel/official/bedwars` (Sandbox表示) |

公式 terrain generator は seed を入力に、サーバ権威で同じチャンクを再生成できる deterministic な関数として実装する。保存が必要な差分（破壊/設置）は ChunkStore に重ねる。永続サバイバルは finish_game無し。

## Voxel UGC + 公式拡張

UGC + 公式拡張は公式 terrain generator とは別に、プレイヤーが作るワールド/ミニゲームや運営が追加する拡張ゲームを扱う。

- `/voxel/ugc/athletic`, `/voxel/official/bedwars` など、type/source/slug で参照する。Sandbox 表示では親ジャンル+サブタグでグルーピング。
- UGC スクリプトは [`ugc.md`](./ugc.md) の QuickJS sandbox 制限に従う。
- ワールド編集はサーバ権威の BlockAction / BlockDelta を通す。クライアントだけで永続地形を決めない。
- 投稿物はライセンス、通報、権利侵害窓口、moderation 状態を持つ。
- 表示メタ: thumbnail / title / creator / totalPlays / activePlayers / detailViews / description（Sandbox カード用）。

## フェーズへの反映（更新: 改訂版）

- Phase 1: FPS 系のみのモノレポ + Babylon 移行。エディタ本体は作らないが、FPS マップ path / GLB 前提は維持する。
- Phase 4: ハブ + Sandbox モーダル骨組み + 投票システム入口 + マッチメイカー骨組み。OfficialはFPS 1ゲーム複数モード (FFA/TDM/DOM投票) + Voxel 1モード永続 (Survival)、Sandboxは公式拡張+UGC (親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic)。Header [FPS][Voxel]はOfficial切替、Left Sidebar [Sandbox]ボタン→モーダル `/sandbox` (カード: thumbnail/title/creator/plays/desc、親ジャンル+サブタグフィルタ、ソート plays/active/views)、詳細ページ Play Now / Room Selection。
- Phase 5: voxel-creative / bedwars / fps-tdm / fps-dom 等の追加モード。profile-voxel本実装。Official FPSのサブモード本実装 (TDM/DOM)。
- Phase 6: API 再設計（genres/tags 永続化、ランキング RDB、Sandboxは公式拡張+UGC永続化）。
- Phase 7: voxel のチャンク同期・AOI と公式 terrain generator を本格化する。
- Phase 8: UGC エディタ、スクリプト sandbox、投稿/承認/配信フローを実装する（Sandbox ハブ本番化、公式拡張も含む）。
