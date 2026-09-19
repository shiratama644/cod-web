# プロダクト定義

## 用語

| 用語 | 意味 |
|---|---|
| **タイプ（Game Type）** | `voxel` または `fps`。シミュレーションの根本的なパラダイム |
| **Sim Profile** | タイプごとのシミュレーション実装 |
| **コンテンツソース（Content Source）** | `official` または `ugc`。タイプではなく、運営/ユーザー作成の区分 |
| **ゲームモード** | ルールの単位。1つのタイプと1つの source に属する。例: `/fps/official/pvp`, `/voxel/ugc/athletic` |
| **ルーム** | 1つのゲームモードのインスタンス |
| **ゲームノード** | ルームをホストする Bun プロセス。1プロセス = 1 CPU コア |
| **マッチメイカー** | ルーム一覧と入室チケットを扱うステートレス HTTP サービス |
| **ハブ** | ルーム閲覧・参加の Web UI |
| **ティック** | サーバのシミュレーション更新 1 回 |
| **スナップショット** | サーバ→クライアントの状態同期パケット |

## 作るもの

ブラウザで動作するマルチプレイヤーゲームプラットフォーム。

- **ハブ**から稼働中ルームを一覧・検索して参加できる
- ルームは **2 タイプ**のいずれかに属する
  - `voxel` — Minecraft / bloxd.io 的。編集可能なボクセル世界。公式 survival / bedwars と UGC world
  - `fps` — Krunker.io 的。静的/編集可能アリーナ。公式 pvp / zombie と UGC map
- 各タイプ内に `official` と `ugc` の **コンテンツソース**がある。`official` / `ugc` を 3 種類目の type にしない
- Krunker.io のようなエディタで、誰でも FPS マップや voxel ワールドを作れるようにする。エディタは Babylon.js で書き、FPS エディタは `.glb` 読み込みに対応する
- **モバイルは両タイプ対象**（タッチ入力は後続フェーズ）
- **ボイスチャットは理想に含める**（ゲーム同期には使わない。WebRTC メディアは別チャネル。着手時期は未定）
- **ライセンスは MIT**

## ゲームモードの想定例

```
fps タイプ
  ├ /fps/official/pvp        公式 PvP
  ├ /fps/official/zombie     公式 PvE / Zombie
  └ /fps/ugc/athletic        ユーザー作成アスレチック等

voxel タイプ
  ├ /voxel/official/survival 公式 Survival。Minecraft 風地形生成を独自実装
  ├ /voxel/official/bedwars  公式 Bedwars
  └ /voxel/ugc/athletic      ユーザー作成アスレチック等
```

詳細な階層・エディタ方針は [`editor.md`](./editor.md)。

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
| 未実装: `packages/profile-voxel/`, `packages/gamemode-sdk/`, `packages/shared-types/`, `apps/matchmaker/`, `gamemodes/` | **未実装** | 理想構成。PH2ではfps先行、voxelは契約のみ。matchmakerはPH4以降 |

## 初期スコープで決めた運用（詳細は [adr.md](./adr.md)）

- アカウント: **初期は匿名**（表示名＋一時 uid）。認証はマッチメイカー以降
- voxel ワールド: **保存して再開できる**（方式はフェーズ 4 で詳細化）
- プレーヤー同士の衝突: **すり抜け**（voxel-physics-engine の制約を受容）
- FPS マップ配信: **CDN**。公式/UGC とも `/fps/{official|ugc}/{slug}` で参照し、GLB 読み込み対応エディタで作成する
- チャンク: 当面サーバがメモリに保持
- 初期リージョン: **1 拠点**
- ランキング・統計の RDB: 後続
