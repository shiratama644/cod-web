# Sandbox + FPS/Voxel ハブ仕様整理 (2026-09-22 改訂版)

> 元: ユーザー提供「ゲームプラットフォーム 仕様定義書 (改訂版)」 + 議論
> 現状: Phase 3完了 (gamemode-api/sdk + ffa最小 + gameserver統合) + PLAT-4改訂版
> 目的: Official FPS 1ゲーム複数モード + Voxel 1モード永続 + Sandbox公式拡張+UGCの3層構成とSandboxモーダルの親ジャンル+サブタグフィルター/ソート/参加フローを明確化
> 正本: product.md/editor.md/types.md/matchmaker.md/client.md/architecture.md (2026-09-22改訂版)

## 1. ユーザー理想の要点 (改訂版)

### 1.1 ゲームカテゴリ定義 — 改訂版

- **Official FPS (公式対戦)**: 1つのゲームに複数モード [FFA, TDM, DOM, etc.] — 投票で次ルール決定
  - `/fps/official` (1ゲーム) subModes: ffa, tdm, dom
  - RoomState: waiting -> countdown -> playing(ffa) -> ended -> voting -> playing(tdm)
- **Official Voxel (公式サバイバル)**: 1モードのみ [Survival] — 永続サバイバル、死んだらリスポーン
  - `/voxel/official/survival` (1モード永続) finish_game無し
- **Sandbox (公式拡張+UGC)**: 標準FPS/Voxel以外の公式ゲーム + UGC
  - FPS examples [TDM,DOM,Zombie,etc.] (公式拡張 + UGC): `/fps/official/zombie`, `/fps/ugc/zombie`
  - Voxel examples [Bedwars,Athletic,etc.] (公式拡張 + UGC): `/voxel/official/bedwars`, `/voxel/ugc/bedwars`

→ 解釈: 
- Official FPS = 1ゲーム複数モード fps official、投票で次サブモード決定
- Official Voxel = 1モードのみ Survival永続、voxel official
- Sandbox = 標準FPS/Voxel以外の公式ゲーム + UGC、親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic

### 1.2 画面レイアウト & ナビゲーション — 改訂版

- Header / Navigation Tabs (Officialゲームの切り替え): [FPS]タブと[Voxel]タブの切り替え
  - [FPS]タブ: 公式FPS画面を表示。1ゲーム複数モード [FFA,TDM,DOM]、投票で次決定。
  - [Voxel]タブ: 公式Voxel画面を表示。1モードのみ [Survival]、永続サバイバル。
- Left Sidebar (Krunker.io風): 各種メニューボタン + 「Sandbox」ボタン (公式拡張+UGC)

### 1.3 メイン画面仕様 (デフォルト: Official FPS) — 改訂版

- サイトアクセス時の初期表示は Official FPSゲーム画面
- Official FPSは1つのゲームに複数モード [FFA,TDM,DOM,etc.] を持つ。現行 `fps-official-ffa` はFFAサブモード最小実装。
- 1マッチ終了時、全プレイヤー投票で次の試合形式(サブモード)を決定。Official FPSのみ。
- Official Voxelは1モードのみ [Survival]、永続サバイバル、死んだらリスポーン可能。

### 1.4 Sandbox (公式拡張+UGC) モーダル仕様 — 改訂版

- トリガー: 左サイドバーの「Sandbox」ボタン
- コンテンツリスト (カード形式):
  - サムネイル画像
  - タイトル
  - 作者名 (Creator) — Official または ユーザー名 (SandboxはUGCだけでなく公式拡張も含む)
  - 累計プレイ数
  - 簡易説明文
- フィルター:
  - 親ジャンル (FPS / Voxel など)
  - サブタグ (Bedwars, Zombie, Athletic など)
- ソート: 累計プレイ数順 / 現在同時接続数順 / 詳細ページ閲覧数順

### 1.5 詳細ページ & ルーム参加フロー — 改訂版

- 遷移: Sandboxモーダル内のカードクリックで詳細ページへ。/sandbox/{id} → 内部 /{type}/{source}/{slug} 解決。公式拡張 (例: /fps/official/zombie) もUGCも対象。
- [Play Now]: 空き枠のある既存ルームへ自動マッチング即時参加
- [ルーム選択]: ルーム一覧モーダル表示、手動選択参加

### 1.6 補足 (ユーザー回答)

- `boxel` は typo (voxelの意)、エイリアス機能としては扱わない
- SandboxはUGCだけでなく、標準FPS/Voxel以外の公式ゲームも含む
- Official FPSは1ゲーム複数モード、Official Voxelは1モード永続

## 2. 現行設計とのマッピング — 改訂版

### 現行 (editor.md 改訂版)

```
/{type}/{source}/{slug}
type: fps | voxel (L1/L2分岐2つ)
source: official | ugc (Sandboxは両方含む、標準以外)
slug: ffa, tdm, dom, zombie, athletic, survival, bedwars, ...

例:
  /fps/official (1ゲーム複数モード、subModes ffa/tdm/dom) — Official FPS本体
  /fps/official/ffa (FFAサブモード、現行実装済み fps-official-ffa)
  /fps/official/zombie (公式拡張、Sandbox表示)
  /voxel/official/survival (1モード永続) — Official Voxel
  /voxel/official/bedwars (公式拡張、Sandbox表示)
  /fps/ugc/zombie, /voxel/ugc/bedwars, /voxel/ugc/athletic (UGC、Sandbox表示)
```

### 理想へのマッピング — 改訂版

| 理想カテゴリ | 現行マッピング | 例 |
|---|---|---:|
| Official FPS 1ゲーム複数モード | type=fps, source=official, 1ゲーム fps-official, subModes [ffa,tdm,dom] | /fps/official (subModes ffa/tdm/dom), /fps/official/ffa (FFAサブモード) |
| Official Voxel 1モード永続 | type=voxel, source=official, 1モード survival 永続 | /voxel/official/survival |
| Sandbox 公式拡張+UGC | source=official|ugc かつ標準FPS/Voxel以外、親ジャンル FPS/Voxel + サブタグ | /fps/official/zombie (公式拡張), /voxel/official/bedwars (公式拡張), /fps/ugc/*, /voxel/ugc/* (UGC) をまとめてSandboxとして表示 |

→ **Sandboxは物理パスではなく、source=official|ugc かつ標準FPS/Voxel以外の公式拡張+UGCを集めた表示上のハブ**。URLとしては /sandbox がトップ、/sandbox?parent=fps&tag=zombie 等でフィルター。親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic。

### ParentGenre/SubTag拡張 (Phase 4で追加) — 改訂版

現行の slug を parentGenre/subTag としても扱う:

```ts
interface GameModeDefinition {
  id: 'fps-official' | 'fps-official-ffa' | 'voxel-official-survival' | 'fps-official-zombie'
  type: 'fps' | 'voxel'
  source: 'official' | 'ugc' // Sandboxは両方含む
  slug: 'ffa' | 'tdm' | 'dom' | 'zombie' | 'bedwars' | 'athletic' | 'survival' | ...

  // 追加 (optional, 後方互換) — 改訂版
  parentGenre: ParentGenre // 'fps' | 'voxel'
  genres: SubTag[] // サブタグ: ['bedwars'] / ['zombie'] / ['athletic'] / ['ffa'] / ['tdm'] / ['dom']
  tags: Tag[]     // ['official','pvp'] / ['ugc','bedwars'] 等
  subModes: SubTag[] // Official FPSのみ: [FFA,TDM,DOM]
  currentSubMode: SubTag
  category: GameCategory // Official | Sandbox
  display: { title, description, thumbnail, creator }
  stats: { totalPlays, activePlayers, detailViews }
}

type ParentGenre = 'fps' | 'voxel'
type SubTag = 'ffa' | 'tdm' | 'dom' | 'zombie' | 'bedwars' | 'athletic' | 'survival' | string
type Tag = 'official' | 'ugc' | 'fps' | 'voxel' | 'pvp' | 'pve' | 'parkour' | ...
type GameCategory = 'Official' | 'Sandbox'
```

- Official FPS: parentGenre=fps, genres=[ffa|tdm|dom], subModes=[ffa,tdm,dom], category=Official, 1ゲーム複数モード
- Official Voxel: parentGenre=voxel, genres=[survival], category=Official, 1モード永続
- Sandbox 公式拡張: parentGenre=fps|voxel, genres=[zombie]|[bedwars], source=official, category=Sandbox
- Sandbox UGC: parentGenre=fps|voxel, genres=[zombie]|[bedwars]|[athletic], source=ugc, category=Sandbox

## 3. 画面構成案 — 改訂版

### Header (Official切替)

```
[Logo] [FPS] [Voxel] [Search] [User]
```

- FPSタブ: Official FPS画面 (1ゲーム複数モード FFA/TDM/DOM投票)
- Voxelタブ: Official Voxel画面 (Survival永続)
- 切り替えはクライアントの表示切替、デフォルト Official FPS

### Left Sidebar (Krunker.io風)

```
[Play]
[Sandbox] <- クリックでSandboxモーダル (公式拡張+UGC)
[Settings]
[Shop] etc.
```

### メイン画面 (デフォルト Official FPS) — 改訂版

- 初期表示: Official FPSゲーム画面 (GameCanvas + HUD)
- Official FPSは1ゲーム複数モード、現行 ffa はFFAサブモード最小実装、将来 TDM/DOM追加、投票で次決定
- Official Voxelは1モードのみ Survival永続、死んだらリスポーン
- 投票UI: Official FPSでマッチ終了時に全プレイヤーに次サブモード候補 FFA/TDM/DOMを表示、多数決で決定

### Sandboxモーダル — 改訂版 (親ジャンル+サブタグ、公式拡張+UGC)

```
+-----------------------------+
| Sandbox (公式拡張+UGC)  [X] |
| Parent: [All][FPS][Voxel]   |
| SubTag: [All][Bedwars][Zombie][Athletic][TDM][DOM] |
| Sort: [Plays][Active][Views] v           |
| +----------------+ +----------------+     |
| | [Thumbnail]    | | [Thumbnail]    |     |
| | Title          | | Title          |     |
| | Creator: Official/ユーザー | ... |     |
| | Plays: 1234    | | Plays: 567     |     |
| | Desc: ...      | | Desc: ...      |     |
| +----------------+ +----------------+     |
+-----------------------------+
```

- カードクリックで詳細ページへ遷移。公式拡張+UGC両方。

### 詳細ページ — 改訂版

```
/sandbox/{id}  例: /sandbox/fps-official-zombie, /sandbox/voxel-ugc-bedwars-abc

[Thumbnail]
Title: Zombie (Official拡張) / Bedwars Pro UGC
Creator: Official / User123
Plays: 10,234
Active: 12
Description: ...

[Play Now] -> 空きルーム自動マッチング (公式拡張+UGC)
[Room Selection] -> ルーム一覧モーダル

Room List Modal:
  Room #1: 4/16 players, map: ...
  Room #2: 8/16 players
  [Join]
```

## 4. 実装フェーズ案 — 改訂版

### Phase 4: ハブ + Sandboxモーダル骨組み + 投票入口 (Official 1ゲーム複数モード + Voxel永続 + Sandbox公式拡張+UGC)

- PLAT-4: Phase 4計画作成 (ハブ+Sandbox+投票入口) 改訂版
- PH4-A: GameModeDefinitionにparentGenre/genres(サブタグ)/subModes/display/stats/category追加 (optional)
- PH4-B: ハブUI - Header [FPS][Voxel] Official切替 (App.tsx)
- PH4-C: Left Sidebar + Sandboxボタン (公式拡張+UGC)
- PH4-D: Sandboxモーダル - カード一覧 + 親ジャンル+サブタグフィルター + ソート (mockデータ 公式拡張+UGC)
- PH4-E: 詳細ページ + Play Now / ルーム選択モーダル (mock 公式拡張+UGC)
- PH4-F: 投票システム入口 Official FPS 1ゲーム複数モード (onRoundEndで投票UI表示 FFA/TDM/DOM、mock投票、Voxel投票対象外)

### Phase 5: voxel + fps追加モード

- voxel-official-survival 永続本実装、voxel-official-bedwars 公式拡張、fps-official tdm/dom サブモード本実装
- profile-voxel本実装はPhase 5

### Phase 6以降: UGC本実装

- QuickJS sandbox, GLBエディタ, 投稿/承認/配信フロー
- ランキング・プレイ数・アクティブ数の永続化 (RDB)

## 5. 技術的制約の維持 — 改訂版

- L1 type分岐は fps|voxelの2つのまま (D2維持)。Sandboxは公式拡張+UGC表示上のグルーピングで、type分岐を増やさない。Official FPSは1ゲーム複数モードだがL1分岐ではない。
- gamemodes/* → @cod/gamemode-sdkのみ (Biome維持)
- engine-core → profile-* 禁止 (Biome維持)
- 決定論・ゼロアロケ・例外安全維持
- boxelはvoxelのタイポでvoxelに訂正。エイリアス機能としては扱わない
- SandboxはUGCだけでなく標準FPS/Voxel以外の公式ゲームも含む
- Official FPSは1ゲーム複数モード、Official Voxelは1モード永続
