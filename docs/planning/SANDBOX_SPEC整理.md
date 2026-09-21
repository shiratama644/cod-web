# Sandbox + FPS/Voxel ハブ仕様整理 (ユーザー理想 2026-09-22)

> 元: ユーザー提供「ゲームプラットフォーム 仕様定義書」 + 議論
> 現状: Phase 3完了 (gamemode-api/sdk + ffa最小 + gameserver統合)
> 目的: FPS/Voxel/Sandboxの3カテゴリ構成とSandboxモーダルのフィルター/ソート/参加フローを明確化

## 1. ユーザー理想の要点 (原文整理)

### 1.1 ゲームカテゴリ定義

- **FPS (公式対戦)**: modes [FFA, TDM, DOM, etc.]
- **Voxel (公式サバイバル)**: modes [Survival]
- **Sandbox (UGC / ユーザー生成コンテンツ)**: modes [Bedwars, Zombie, Athletic, etc.]

→ 解釈: 
- FPS = fps official
- Voxel = voxel official  
- Sandbox = ugc (ユーザー生成、fps/voxel両方を含むUGCハブ)

### 1.2 画面レイアウト & ナビゲーション

- Header / Navigation Tabs: [FPS]タブと[Voxel]タブの切り替え
- Left Sidebar (Krunker.io風): 各種メニューボタン + 「Sandbox」ボタン

### 1.3 メイン画面仕様 (デフォルト: FPS)

- サイトアクセス時の初期表示はFPSゲーム画面
- 1マッチ終了時、全プレイヤー投票で次の試合形式(ゲームモード)を決定

### 1.4 Sandbox (UGC) モーダル仕様

- トリガー: 左サイドバーの「Sandbox」ボタン
- コンテンツリスト (カード形式):
  - サムネイル画像
  - タイトル
  - 作者名 (Creator)
  - 累計プレイ数
  - 簡易説明文
- フィルター: カテゴリ別 (Bedwars, Zombie, Athletic など)
- ソート: 累計プレイ人数順 / 現在同時接続数順 / 詳細ページ閲覧数順

### 1.5 詳細ページ & ルーム参加フロー

- 遷移: Sandboxモーダル内のカードクリックで詳細ページへ
- [Play Now]: 空き枠のある既存ルームへ自動マッチング即時参加
- [ルーム選択]: ルーム一覧モーダル表示、手動選択参加

### 1.6 補足 (ユーザー回答)

- `boxel` は typo (voxelの意)
- `sandbox/{fps, zombie, athletic, boxel, bedwars}` の sandbox は上記Sandbox (UGCハブ) を指す
- フィルターのタグ `official`, `boxel` は、officialはsource、boxelはvoxelのtypo

## 2. 現行設計とのマッピング

### 現行 (editor.md)

```
/{type}/{source}/{slug}
type: fps | voxel (L1/L2分岐2つ)
source: official | ugc
slug: pvp, ffa, zombie, athletic, survival, bedwars, ...

例:
  /fps/official/ffa (現行実装済み fps-official-ffa)
  /fps/official/pvp (エイリアス)
  /fps/official/zombie (将来)
  /fps/official/tdm, dom (将来)
  /voxel/official/survival (将来)
  /voxel/official/bedwars (将来)
  /fps/ugc/*, /voxel/ugc/* (UGC)
```

### 理想へのマッピング

| 理想カテゴリ | 現行マッピング | 例 |
|---|---|---|
| FPS (公式対戦) | type=fps, source=official | /fps/official/ffa, /fps/official/tdm, /fps/official/dom, /fps/official/pvp |
| Voxel (公式サバイバル) | type=voxel, source=official | /voxel/official/survival |
| Sandbox (UGC) | source=ugc (typeはfps/voxel両方) | /fps/ugc/*, /voxel/ugc/* をまとめてSandboxとして表示。内部では /voxel/ugc/bedwars, /fps/ugc/zombie, /voxel/ugc/athletic 等 |

→ **Sandboxは物理パスではなく、source=ugcのゲームを集めた表示上のハブ**。URLとしては /sandbox がトップ、/sandbox?genre=bedwars 等でフィルター。

### Genre/Tag拡張 (Phase 4で追加)

現行の slug を genre/tag としても扱う:

```ts
interface GameModeDefinition {
  id: 'fps-official-ffa'
  type: 'fps' | 'voxel'
  source: 'official' | 'ugc'
  slug: 'ffa' | 'tdm' | 'dom' | 'zombie' | 'bedwars' | 'athletic' | 'survival' | ...

  // 追加 (optional, 後方互換)
  genres: Genre[] // 例: ['fps'] / ['zombie'] / ['bedwars'] / ['athletic']
  tags: Tag[]     // 例: ['official','pvp'] / ['ugc','bedwars','pvp'] / ['ugc','zombie','pve']
}

type Genre = 'fps' | 'zombie' | 'athletic' | 'bedwars' | 'survival' | 'tdm' | 'dom' | 'ffa' | 'pvp' | ...
type Tag = 'official' | 'ugc' | 'fps' | 'voxel' | 'pvp' | 'pve' | 'parkour' | ...
```

- FPS公式: genres=[fps], tags=[official, pvp] 等
- Voxel公式: genres=[survival], tags=[official, voxel, survival]
- Sandbox UGC: genres=[bedwars] / [zombie] / [athletic], tags=[ugc, ...]

## 3. 画面構成案

### Header

```
[Logo] [FPS] [Voxel] [Search] [User]
```

- FPSタブ: /fps/official/* のゲームをメイン表示 (デフォルト)
- Voxelタブ: /voxel/official/survival 等をメイン表示
- 切り替えはクライアントの表示切替、URLは /?type=fps 等でも可

### Left Sidebar (Krunker.io風)

```
[Play]
[Sandbox] <- クリックでSandboxモーダル
[Settings]
[Shop] etc.
```

### メイン画面 (デフォルト FPS)

- 初期表示: FPSゲーム画面 (GameCanvas + HUD)
- 現在は単一ルーム ffa だが、将来は FFA/TDM/DOM等の投票で次モード決定
- 投票UI: マッチ終了時に全プレイヤーに次のモード候補を表示、多数決で決定

### Sandboxモーダル

```
+-----------------------------+
| Sandbox (UGC)         [X]   |
| Filter: [All][Bedwars][Zombie][Athletic] |
| Sort: [Plays][Active][Views] v           |
| +----------------+ +----------------+     |
| | [Thumbnail]    | | [Thumbnail]    |     |
| | Title          | | Title          |     |
| | Creator: ...   | | Creator: ...   |     |
| | Plays: 1234    | | Plays: 567     |     |
| | Desc: ...      | | Desc: ...      |     |
| +----------------+ +----------------+     |
+-----------------------------+
```

- カードクリックで詳細ページへ遷移

### 詳細ページ

```
/sandbox/{id}  例: /sandbox/voxel-ugc-bedwars-abc

[Thumbnail]
Title: Bedwars Pro
Creator: User123
Plays: 10,234
Active: 12
Description: ...

[Play Now] -> 空きルーム自動マッチング
[Room Selection] -> ルーム一覧モーダル

Room List Modal:
  Room #1: 4/16 players, map: ...
  Room #2: 8/16 players
  [Join]
```

## 4. 実装フェーズ案

### Phase 4: ハブ + Sandboxモーダル骨組み

- PLAT-4: Phase 4計画作成 (ハブ+Sandbox+投票入口)
- PH4-A: GameModeDefinitionにgenres/tags追加 (optional)
- PH4-B: ハブUI - Header FPS/Voxelタブ切替 (App.tsx)
- PH4-C: Left Sidebar + Sandboxボタン (StartOverlay拡張 or 新コンポーネント)
- PH4-D: Sandboxモーダル - カード一覧 + カテゴリフィルター + ソート (mockデータから)
- PH4-E: 詳細ページ + Play Now / ルーム選択モーダル (mock)
- PH4-F: 投票システム入口 (onRoundEndで投票UI表示、mock投票)

### Phase 5: voxel + fps追加モード

- voxel-creative / bedwars / fps-tdm 等
- profile-voxel本実装はPhase 5以降

### Phase 6以降: UGC本実装

- QuickJS sandbox, GLBエディタ, 投稿/承認/配信フロー
- ランキング・プレイ数・アクティブ数の永続化 (RDB)

## 5. 技術的制約の維持

- L1 type分岐は fps|voxelの2つのまま (D2維持)。Sandboxは表示上のグルーピングで、type分岐を増やさない。
- gamemodes/* → @cod/gamemode-sdkのみ (Biome維持)
- engine-core → profile-* 禁止 (Biome維持)
- 決定論・ゼロアロケ・例外安全維持
- boxelはvoxelのエイリアスとしてUIで表示、内部はvoxel

## 6. 次のアクション (合意後)

1. 本ドキュメントをレビューし、ユーザーと合意
2. docs/arch/product.md, editor.md, types.md を本設計に更新 (FPS/Voxel/Sandbox 3カテゴリ、Sandboxモーダル仕様)
3. PLAT-4 Phase 4計画作成
4. PH4-A〜F 実装
