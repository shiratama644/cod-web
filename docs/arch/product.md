# プロダクト定義

## 用語

| 用語 | 意味 |
|---|---|
| **タイプ（Game Type）** | `voxel` または `fps`。シミュレーションの根本的なパラダイム |
| **Sim Profile** | タイプごとのシミュレーション実装 |
| **コンテンツソース（Content Source）** | `official` または `ugc`。タイプではなく、運営/ユーザー作成の区分 |
| **ゲーム種別** | `Official` (公式ゲーム) と `Sandbox` (公式+UGCの拡張ゲーム群) の2階層 |
| **ゲームモード** | Official FPSは1ゲームに複数モード [FFA,TDM,DOM] を持つ。Official Voxelは1モード [Survival] のみ。Sandboxは各ゲームが1モードで genre/tag で分類 |
| **プラットフォームカテゴリ** | 表示上の Official FPS / Official Voxel / Sandbox |
| **Sandbox ハブ** | FPS/Voxel以外の公式ゲーム + UGC を含む拡張ゲーム群。L1 type分岐は増やさない |
| **ルーム** | 1つのゲームモードのインスタンス |
| **ゲームノード** | ルームをホストする Bun プロセス。1プロセス = 1 CPU コア |
| **マッチメイカー** | ルーム一覧と入室チケットを扱うステートレス HTTP サービス。親ジャンル/サブタグフィルタ、ソート、Play Now/Room Selection対応 |
| **ハブ** | ルーム閲覧・参加の Web UI。Header [FPS][Voxel]タブ (Official切替)、Left Sidebar [Sandbox]ボタン |
| **ティック** | サーバのシミュレーション更新 1 回 |
| **スナップショット** | サーバ→クライアントの状態同期パケット |
| **投票** | Official FPSで1マッチ終了時に全プレイヤーが次サブモードを投票で決定 |
| **永続サバイバル** | Official Voxel Survivalは永遠続くMinecraftサバイバル、死んだらリスポーン可能 |

## 作るもの

ブラウザで動作するマルチプレイヤーゲームプラットフォーム。

- **ハブ**から稼働中ルームを一覧・検索して参加できる。Header [FPS][Voxel]タブはOfficialゲーム切替、Left Sidebar [Sandbox]ボタン
- ルームは **2 タイプ**のいずれかに属する（L1分岐は fps|voxel の2つのまま）
  - `voxel` — Minecraft / bloxd.io 的。編集可能なボクセル世界
  - `fps` — Krunker.io 的。静的/編集可能アリーナ
- **Official (公式ゲーム)**: 運営が公式に提供するゲーム群
  - FPS: 1つのゲームに複数モード [FFA,TDM,DOM,etc.]。投票システムで次ルール決定
  - Voxel: モード1つのみ [Survival]。永遠続くMinecraftサバイバル、死んだらリスポーン可能
- **Sandbox**: 標準FPS/Voxel以外の公式ゲーム + UGC。親ジャンル FPS/Voxel、サブタグ Bedwars/Zombie/Athletic等
- Krunker.io のようなエディタで、誰でも FPS マップや voxel ワールドを作れるようにする。エディタは Babylon.js で書き、FPS エディタは `.glb` 読み込みに対応する
- **モバイルは両タイプ対象**（タッチ入力は後続フェーズ）
- **ボイスチャットは理想に含める**（ゲーム同期には使わない。WebRTC メディアは別チャネル。着手時期は未定）
- **ライセンスは MIT**

## ゲーム種別・階層構造 — 2026-09-22 改訂版確定

> ユーザー提供「ゲームプラットフォーム 仕様定義書 (改訂版)」正本。Officialは運営提供、SandboxはUGCだけでなく標準FPS/Voxel以外の公式ゲームも含む。

```
Official (公式ゲーム) — 運営が公式に提供するゲーム群
  ├ FPS: 1つのゲームに複数モード [FFA,TDM,DOM,etc.]
  │     voting_system: 試合終了時に全プレイヤーの投票で次のルールを決定
  │     現行: fps-official-ffa はFFAサブモードの最小実装
  └ Voxel: モード1つのみ [Survival]
        finish_game: 永遠続くMinecraftサバイバル (死んだらリスポーン可能)

Sandbox — 標準FPS/Voxel以外の公式ゲーム + UGC
  ├ FPS: examples [TDM,DOM,Zombie,etc.] (公式の拡張FPSやUGCのFPS)
  └ Voxel: examples [Bedwars,Athletic,etc.] (公式の拡張VoxelやUGCのVoxel)
```

| 表示種別 | 内部マッピング | 説明 | 例 |
|---|---|---|---|
| **Official FPS** | **1ゲーム複数モード** `type=fps`, `source=official`, `modes=[FFA,TDM,DOM,etc.]` | 公式FPSの単一ゲーム。内部にFFA/TDM/DOM等のサブモード。投票で次サブモード決定 | `/fps/official` がFPS公式本体。サブモード `ffa`, `tdm`, `dom` を内包 |
| **Official Voxel** | **1モードのみ** `type=voxel`, `source=official`, `modes=[Survival]` | 公式Voxel。永続サバイバル、死んだらリスポーン | `/voxel/official/survival` が唯一モード |
| **Sandbox** | **公式拡張+UGC** `source=official|ugc` かつ `slug` が標準FPS/Voxel以外。親ジャンル `FPS/Voxel`、サブタグ `Bedwars/Zombie/Athletic` | 標準FPS/Voxel以外の公式ゲーム + ユーザー作成ゲーム。親ジャンルとサブタグでフィルタ | `/fps/official/zombie` (公式拡張), `/voxel/official/bedwars` (公式拡張), `/fps/ugc/*`, `/voxel/ugc/*` をSandboxとして表示 |

- Official FPSは1ゲーム複数モード: `fps-official` が1つのGameModeDefinitionで内部に `subModes: ['ffa','tdm','dom']` を持ち、投票で次サブモード決定。
- Official Voxelは1モードのみ: `voxel-official-survival` のみ。永続サバイバル。
- SandboxはOfficial拡張+UGC: 標準FPS/Voxel以外の公式ゲーム (例: Zombie, Bedwars) もSandboxに含まれる。UGCも含む。親ジャンル FPS/Voxel とサブタグ Bedwars/Zombie/Athletic でフィルタ。

## ナビゲーション & レイアウト — 改訂版

### Header / Navigation Tabs (Officialゲームの切り替え)

```
[Logo] [FPS] [Voxel] [Search] [User]
  FPSタブ: 公式FPS画面を表示
  Voxelタブ: 公式Voxel画面を表示
```

- [FPS]タブ: 公式FPS画面を表示。デフォルト。
- [Voxel]タブ: 公式Voxel画面を表示。Survival永続。
- Officialゲームの切り替え。SandboxはSidebarから。

### Left Sidebar (Krunker.io風UI)

```
[Play]
[Sandbox] <- クリックで Sandbox モーダル
[Settings]
[Shop] etc.
```

- Krunker.io 風の縦ボタン群。
- [Sandbox] ボタンを配置。押下で Sandbox モーダルをオープン。

## メイン画面仕様 (デフォルト: Official FPS) — 改訂版

- ホーム画面の初期表示は Official FPS。
- **Official FPSは1つのゲームに複数モード**: 現行 `fps-official-ffa` はFFAサブモードの最小実装。将来TDM/DOM等を同一ゲーム内サブモードとして追加。
- **Official Voxelは1モードのみ** [Survival]。永遠続くMinecraftサバイバル、死んだらリスポーン可能。
- **1マッチ終了時、次マッチのゲーム形式（FFA,TDM等）を投票で決定**。Official FPSのみ。候補は同一FPS公式ゲーム内のサブモード一覧。
- ヘッダータブで Official Voxel (Survival) への切り替えが可能。

## Sandbox モーダル仕様 — 改訂版

### トリガー

- 左サイドバーの [Sandbox] ボタンをクリック。

### 一覧表示 (カード形式)

```
+---------------------------------------------+
| Sandbox                                [X]  |
| Filter: Parent [FPS][Voxel] Sub [Bedwars][Zombie][Athletic] |
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

- 表示項目: サムネイル、タイトル、作者名、累計プレイ数、簡易説明文。
- SandboxはUGCだけでなく、標準FPS/Voxel以外の公式ゲームも含む。例: 公式Zombie、公式Bedwars等もSandboxに表示。

### フィルター機能 — 改訂版

- **親ジャンル (FPS / Voxel など)**: `type=fps|voxel` でフィルタ。Official拡張もUGCも対象。
- **サブタグ (Bedwars, Zombie, Athletic など)**: `genres` / `tags` でフィルタ。例: Bedwars, Zombie, Athletic。

### ソート機能

- 累計プレイ数順 (`totalPlays` DESC)
- 現在のプレイ人数順（アクティブ数） (`activePlayers` DESC)
- 詳細ページ閲覧数順 (`detailViews` DESC)

ソート元データは Phase 4 では mock、Phase 6 以降 RDB 永続化。

### Sandbox 詳細ページ & ルーム参加フロー — 改訂版

- 遷移: カードをクリックして各ゲームの詳細ページへ遷移。`/sandbox/{id}` → 内部 `/{type}/{source}/{slug}` 解決。
- アクション:
  - **[Play Now] ボタン**: 自動で空きルームを検索して即時参加 (`POST /v1/seek-game` 相当)。
  - **[ルーム選択] ボタン**: ルーム一覧モーダルを開き、手動でサーバーを選択して参加 (`GET /v1/game-list` 相当)。

## ゲームモードの想定例（改訂版: Official 1ゲーム複数モード、Sandboxは公式拡張+UGC）

```
Official (公式ゲーム)
  ├ FPS公式: /fps/official (1ゲーム複数モード) — type=fps, source=official, modes=[FFA,TDM,DOM]
  │   ├ subMode: ffa  <- 現行実装 fps-official-ffa (FFAサブモード)
  │   ├ subMode: tdm  <- TDM (将来、同一ゲーム内)
  │   ├ subMode: dom  <- DOM (将来)
  │   └ voting: FFA→TDM→DOMを投票で決定
  └ Voxel公式: /voxel/official/survival (1モードのみ) — type=voxel, source=official, modes=[Survival]
        finish_game: 永続サバイバル、死んだらリスポーン

Sandbox (標準FPS/Voxel以外の公式ゲーム + UGC) — 親ジャンル FPS/Voxel、サブタグ Bedwars/Zombie/Athletic
  ├ FPSカテゴリ:
  │   ├ /fps/official/zombie   <- 公式拡張: Zombie (Sandbox表示)
  │   ├ /fps/official/tdm      <- 公式拡張: TDMがSandboxにも出る場合 (Official FPSのサブモードとは別に独立ゲームとして)
  │   ├ /fps/ugc/zombie        <- UGC: Zombie
  │   └ /fps/ugc/athletic      <- UGC: Athletic
  └ Voxelカテゴリ:
      ├ /voxel/official/bedwars <- 公式拡張: Bedwars (Sandbox表示)
      ├ /voxel/ugc/bedwars      <- UGC: Bedwars
      └ /voxel/ugc/athletic     <- UGC: Athletic

表示上の /sandbox は公式拡張+UGCの集約ビュー:
  /sandbox                   -> 全 Sandbox 一覧 (公式拡張+UGC)
  /sandbox?parent=fps&tag=zombie -> 親ジャンルFPS + サブタグZombieフィルタ
  /sandbox/{id}              -> 詳細ページ

投票: Official FPSゲーム内で FFA→TDM→DOM 等を投票で決定。Official Voxelは投票対象外 (Survivalのみ、永続)。
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
|---|---|---:|
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
