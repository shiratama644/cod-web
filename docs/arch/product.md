# プロダクト定義

## 用語

| 用語 | 意味 |
|---|---|
| **タイプ（Game Type）** | `voxel` または `fps`。シミュレーションの根本的なパラダイム。`boxel` は `voxel` の typo エイリアス |
| **Sim Profile** | タイプごとのシミュレーション実装 |
| **コンテンツソース（Content Source）** | `official` または `ugc`。タイプではなく、運営/ユーザー作成の区分 |
| **ゲームモード** | ルールの単位。1つのタイプと1つの source に属する。例: `/fps/official/pvp`, `/voxel/ugc/athletic`。`genres`/`tags`/`display`/`stats` は optional 拡張 |
| **プラットフォームカテゴリ** | 表示上の 3 カテゴリ: FPS (公式対戦) / Voxel (公式サバイバル) / Sandbox (UGCハブ) |
| **Sandbox ハブ** | `source=ugc` のゲームを集めた表示上のハブ。L1 type分岐は増やさない |
| **ルーム** | 1つのゲームモードのインスタンス |
| **ゲームノード** | ルームをホストする Bun プロセス。1プロセス = 1 CPU コア |
| **マッチメイカー** | ルーム一覧と入室チケットを扱うステートレス HTTP サービス。genre/tagフィルタ、ソート、Play Now/Room Selection対応 |
| **ハブ** | ルーム閲覧・参加の Web UI。Header FPS/Voxelタブ、Left Sidebar Sandboxボタン、Sandboxモーダル、詳細ページ、投票UI |
| **ティック** | サーバのシミュレーション更新 1 回 |
| **スナップショット** | サーバ→クライアントの状態同期パケット |
| **投票** | 1マッチ終了時に全プレイヤーが次モードを投票で決定 |

## 作るもの

ブラウザで動作するマルチプレイヤーゲームプラットフォーム。

- **ハブ**から稼働中ルームを一覧・検索して参加できる。Header [FPS][Voxel]タブ切替、Left Sidebar (Krunker風) Sandboxボタン
- ルームは **2 タイプ**のいずれかに属する（L1分岐は fps|voxel の2つのまま）
  - `voxel` — Minecraft / bloxd.io 的。編集可能なボクセル世界。公式 survival / bedwars と UGC world。`boxel` は typoエイリアス
  - `fps` — Krunker.io 的。静的/編集可能アリーナ。公式 pvp / zombie と UGC map
- 各タイプ内に `official` と `ugc` の **コンテンツソース**がある。`official` / `ugc` を 3 種類目の type にしない。**Sandbox は `source=ugc` の表示集約**
- 表示上は **3カテゴリ**: FPS (公式対戦) FFA/TDM/DOM等、Voxel (公式サバイバル) Survival、Sandbox (UGC) Bedwars/Zombie/Athletic等
- Krunker.io のようなエディタで、誰でも FPS マップや voxel ワールドを作れるようにする。エディタは Babylon.js で書き、FPS エディタは `.glb` 読み込みに対応する
- **モバイルは両タイプ対象**（タッチ入力は後続フェーズ）
- **ボイスチャットは理想に含める**（ゲーム同期には使わない。WebRTC メディアは別チャネル。着手時期は未定）
- **ライセンスは MIT**

## プラットフォームカテゴリ（FPS / Voxel / Sandbox） — 2026-09-22 理想確定

> ユーザー提供「ゲームプラットフォーム 仕様定義書」に基づく 3 カテゴリ構成。L1 type 分岐は `fps | voxel` の 2 つのまま。Sandbox は表示上の UGC ハブ。

| 表示カテゴリ | 内部マッピング | 説明 | 例 |
|---|---|---|---|
| **FPS (公式対戦)** | `type=fps`, `source=official` | 公式対戦 FPS。FFA/TDM/DOM 等 | `/fps/official/ffa`, `/fps/official/tdm`, `/fps/official/dom`, `/fps/official/pvp` |
| **Voxel (公式サバイバル)** | `type=voxel`, `source=official` | 公式サバイバル voxel | `/voxel/official/survival` |
| **Sandbox (UGC)** | `source=ugc` (type は `fps` / `voxel` 両方) | ユーザー生成コンテンツハブ。Bedwars/Zombie/Athletic 等 | `/fps/ugc/*`, `/voxel/ugc/*` をまとめて Sandbox として表示。内部 URL は `/{type}/ugc/{slug}` |

- `boxel` は `voxel` の typo として扱い、表示エイリアスに留める。内部 `GameType` は `voxel` のみ。
- Sandbox の `fps / zombie / athletic / boxel / bedwars` という表現は、Sandbox UGC の genre フィルタを指す。`official` タグは `source=official` を表す。

## ナビゲーション & レイアウト

### Header / Navigation Tabs

```
[Logo] [FPS] [Voxel] [Search] [User]
```

- `[FPS]` タブと `[Voxel]` タブの切り替えが可能。クライアントの表示切替で、URL は `/?type=fps` 等でも可。
- FPS タブ: `/fps/official/*` をメイン表示（デフォルト）。
- Voxel タブ: `/voxel/official/survival` 等をメイン表示。

### Left Sidebar (Krunker.io風)

```
[Play]
[Sandbox] <- クリックで Sandbox モーダル
[Settings]
[Shop] etc.
```

- Krunker.io 風の縦ボタン群。
- 「Sandbox」ボタンを配置。押下で Sandbox モーダルをオープン。

## メイン画面仕様 (デフォルト: FPS)

- サイトアクセス時の初期表示（ホームページ）は FPS ゲーム画面。
- 現状は `fps-official-ffa` 単一だが、将来は FFA/TDM/DOM 等へ拡張。
- **1マッチ終了時、全プレイヤーによる投票システムで「次の試合形式（ゲームモード）」を決定する。**
  - `onRoundEnd` 後に投票 UI を表示。候補は `type=fps, source=official` の一覧。
  - 多数決で次モード決定。詳細は `types.md` の `Voting` 仕様と Phase 4 計画。

## Sandbox (UGC) ハブ仕様

### モーダル トリガー

- 左サイドバーの「Sandbox」ボタン押下時にオープン。

### コンテンツリスト (カード形式)

```
+---------------------------------------------+
| Sandbox (UGC)                          [X]  |
| Filter: [All][Bedwars][Zombie][Athletic]    |
| Sort: [Plays][Active][Views] v              |
|  +----------------+ +----------------+       |
|  | [Thumbnail]    | | [Thumbnail]    |       |
|  | Title          | | Title          |       |
|  | Creator: ...   | | Creator: ...   |       |
|  | Plays: 1234    | | Plays: 567     |       |
|  | Desc: ...      | | Desc: ...      |       |
|  +----------------+ +----------------+       |
+---------------------------------------------+
```

- 各カード表示項目: サムネイル画像 / タイトル / 作者名 (Creator) / 累計プレイ数 / 簡易説明文。
- クリックで詳細ページへ遷移。

### フィルター機能

- カテゴリ別フィルタリング: `Bedwars`, `Zombie`, `Athletic` 等（= `genres`）。
- 実装は `GameModeDefinition.genres` を利用。`source=ugc` のみを対象。

### ソート機能

- 累計プレイ人数順 (`totalPlays` DESC)
- 現在の同時接続 (アクティブ) プレイヤー数順 (`activePlayers` DESC)
- 詳細ページ閲覧数順 (`detailViews` DESC)

ソート元データは Phase 4 では mock、Phase 6 以降 RDB 永続化（ランキング・統計）。

### 詳細ページ & ルーム参加フロー

- 遷移: Sandbox モーダル内の各ゲームカードクリックで `/sandbox/{id}` 詳細ページへ（例: `/sandbox/voxel-ugc-bedwars-abc`）。内部的には `/{type}/ugc/{slug}` に解決。
- アクションボタン:
  - **[Play Now]**: 空き枠のある既存ルームへ自動マッチングして即時参加 (`POST /v1/seek-game` 相当)。
  - **[ルーム選択]**: ルーム一覧モーダルを表示し、プレイヤーが任意のサーバー/ルームを手動選択して参加可能 (`GET /v1/game-list` 相当)。

## ゲームモードの想定例（更新）

```
fps タイプ (FPSカテゴリ = official)
  ├ /fps/official/ffa        公式 FFA (現行実装 fps-official-ffa, pvpはエイリアス)
  ├ /fps/official/tdm        公式 TDM (将来)
  ├ /fps/official/dom        公式 DOM (将来)
  ├ /fps/official/zombie     公式 PvE / Zombie (将来)

voxel タイプ (Voxelカテゴリ = official)
  ├ /voxel/official/survival 公式 Survival (将来)
  └ /voxel/official/bedwars  公式 Bedwars (将来: Sandboxでも再分類可能だが公式はVoxelタブ)

UGC = Sandboxカテゴリ (typeはfps/voxel両方)
  ├ /fps/ugc/athletic        UGC Athletic (Sandbox表示)
  ├ /fps/ugc/zombie          UGC Zombie (Sandbox表示)
  ├ /voxel/ugc/bedwars       UGC Bedwars (Sandbox表示)
  └ /voxel/ugc/athletic      UGC Athletic (Sandbox表示)

表示上の /sandbox は source=ugc の集約ビュー:
  /sandbox                   -> 全 UGC 一覧 (Sandboxモーダル)
  /sandbox?genre=bedwars     -> genre=bedwars フィルタ
  /sandbox/{id}              -> 詳細ページ (内部 /{type}/ugc/{slug} に解決)
```

詳細な階層・エディタ方針は [`editor.md`](./editor.md)。型定義は [`types.md`](./types.md)。

## なぜ単一の移動モデルにしないのか

「ボクセル＋FPS 移動の単一モデル」は **却下**（[adr.md](./adr.md) ADR-001）。

- 物理: ボクセルは AABB 対グリッド、FPS はカプセル対三角形
- 座標範囲: ボクセルは数千〜数万ブロック、FPS アリーナは約 200m。量子化パラメータが 2 桁違う
- ティック: ボクセルは 20–30Hz で足りる、FPS は 60Hz
- スナップショット: ボクセルはブロック差分、FPS は弾道と姿勢

**プラットフォーム層を完全に共有し、シミュレーション層だけを差し替える。** これが中核。

## 現行コード（cod-web）の扱い

当初リポジトリは React Three Fiber ベースの単一ルーム FPS だった。PH1 で Bun workspaces モノレポ（`apps/*`, `packages/*`）へ移行済み。PH1-D で apps/web の描画は Babylon.js へ移行済み。現行は理想形への段階移植途中。

| 資産（旧パス → 現行パス） | 判定 | 備考 |
|---|---|---|
| `shared/protocol/*` → `packages/protocol/src/protocol/*` | **移植済み** | タイプ非依存部分。PH1-Aで `@cod/protocol` へ |
| `shared/sim/movement.ts` → `packages/profile-fps/src/sim/movement.ts` | **移植済み** | FPS Profile基礎。PH2-Bで `FpsSimProfile` として分離 |
| `src/game/net/*` → `apps/web/src/game/net/*` + `packages/engine-core/src/net/*` | **移植済み** | レンダラ非依存。PH1-CでChannel framing、PH1-FでHUD分離 |
| `server/index.ts`, `server/room/Room.ts` → `apps/gameserver/src/` + `packages/engine-core/src/room/` | **移植済み** | PH1でマルチルーム化・PH2-Cでprofile注入 |
| `server/net/lagcomp-store.ts` → `packages/engine-core/src/net/lagcomp-store.ts` | **移植済み** | PH0で毎ティック `record()` 修正済み |
| `src/game/scene/*`, `src/game/renderer/*` | **破棄済み** | PH1-Dで削除。Babylon.jsへ置換 |
| `_tests_/` → `_tests_/apps/*`, `_tests_/packages/*` | **移植済み** | 量子化・決定論・rate-limit等を維持 |
| `.archive/docs/` の旧仕様 | **参照のみ** | geckos.io / WT 主経路など、本 arch と矛盾する記述は使わない |
| `packages/gamemode-api/`, `packages/gamemode-sdk/`, `gamemodes/` | **移植済み** | PH3-A〜Dで実装 |
| 未実装: `packages/profile-voxel/`, `packages/shared-types/`, `apps/matchmaker/` | **未実装** | 理想構成。PH2ではfps先行、voxelは契約のみ。matchmakerはPH4以降 |

## 初期スコープで決めた運用（詳細は [adr.md](./adr.md)）

- アカウント: **初期は匿名**（表示名＋一時 uid）。認証はマッチメイカー以降
- voxel ワールド: **保存して再開できる**（方式はフェーズ 4 で詳細化）
- プレーヤー同士の衝突: **すり抜け**（voxel-physics-engine の制約を受容）
- FPS マップ配信: **CDN**。公式/UGC とも `/fps/{official|ugc}/{slug}` で参照し、GLB 読み込み対応エディタで作成する
- チャンク: 当面サーバがメモリに保持
- 初期リージョン: **1 拠点**
- ランキング・統計の RDB: 後続（Phase 6以降、Sandboxソート用 totalPlays/activePlayers/detailViews永続化）
