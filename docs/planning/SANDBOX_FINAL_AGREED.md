# Sandbox 最終合意仕様書 (2026-09-22 再送版反映)

> ユーザー再送「ゲームプラットフォーム 仕様定義書」改行修正版を正本として合意。元: ユーザー提供テキスト + ask_user回答。
> 状態: **合意済み (Agreed)**。arch反映済み (product.md/editor.md/types.md/matchmaker.md/client.md/architecture.md)。
> Phase 4計画: PHASE04_PLAN.md

## 原文 (ユーザー提供 最終版)

```
# ゲームプラットフォーム 仕様定義書

1. ゲームカテゴリ定義:
  - FPS (公式対戦):
      modes: [FFA, TDM, DOM, etc.]
  - Voxel (公式サバイバル):
      modes: [Survival]
  - Sandbox (UGC / ユーザー生成コンテンツ):
      modes: [Bedwars, Zombie, Athletic, etc.]

2. 画面レイアウト & ナビゲーション:
  - Header / Navigation Tabs:
      - [FPS] タブと [Voxel] タブの切り替えが可能。
  - Left Sidebar (Krunker.io風ボタン群):
      - 各種メニューボタンを配置。
      - 「Sandbox」ボタンを配置。

3. メイン画面仕様 (デフォルト: FPS):
  - サイトアクセス時の初期表示（ホームページ）は FPS ゲーム画面。
  - 1マッチ終了時、全プレイヤーによる投票システムで「次の試合形式（ゲームモード）」を決定する。

4. Sandbox (UGC) モーダル仕様:
  - トリガー:
      - 左サイドバーの「Sandbox」ボタン押下時にオープン。
  - コンテンツリスト表示 (カード形式):
      - 各カードの表示項目:
          - サムネイル画像
          - タイトル
          - 作者名 (Creator)
          - 累計プレイ数
          - 簡易説明文
  - フィルター機能:
      - カテゴリ別フィルタリング (Bedwars, Zombie, Athletic など)。
  - ソート機能:
      - 累計プレイ人数順
      - 現在の同時接続 (アクティブ) プレイヤー数順
      - 詳細ページ閲覧数順

5. 詳細ページ & ルーム参加フロー:
  - 遷移:
      - Sandboxモーダル内の各ゲームカードをクリックで該当ゲームの「詳細ページ」へ遷移。
  - アクションボタン:
      - [Play Now] ボタン:
          - 空き枠のある既存ルームへ自動マッチングして即時参加。
      - [ルーム選択] ボタン:
          - ルーム一覧モーダルを表示し、プレイヤーが任意のサーバー/ルームを手動選択して参加可能。
```

## 合意解釈

| 項目 | 解釈 | arch反映 |
|---|---|---|
| FPS (公式対戦) modes [FFA,TDM,DOM] | type=fps, source=official | product.md, editor.md, types.md |
| Voxel (公式サバイバル) modes [Survival] | type=voxel, source=official | product.md, editor.md |
| Sandbox (UGC) modes [Bedwars,Zombie,Athletic] | source=ugc (fps/voxel両方) の表示集約 | product.md, editor.md, matchmaker.md |
| Header [FPS][Voxel] タブ切替 | React Headerコンポーネント、デフォルトFPS | client.md, product.md |
| Left Sidebar Krunker風 + Sandboxボタン | LeftSidebarコンポーネント、Sandboxボタンでモーダル | client.md, product.md |
| メイン画面デフォルトFPS | App.tsx GameCanvas + HUDが初期表示 | client.md, product.md |
| 投票システム | onRoundEnd後に全プレイヤー投票で次モード決定、VoteOverlay | types.md, client.md, product.md |
| Sandboxモーダル トリガー Sidebar Sandboxボタン | LeftSidebar → SandboxModal open | client.md |
| カード thumbnail/title/creator/plays/desc | SandboxCard型、display/stats | types.md, editor.md |
| フィルタ Bedwars/Zombie/Athletic | genresフィルタ | types.md, editor.md, matchmaker.md |
| ソート 累計プレイ/アクティブ/閲覧数 | totalPlays/activePlayers/detailViewsソート | types.md, matchmaker.md |
| 詳細ページ遷移 カードクリック | /sandbox/{id} → 内部 /{type}/ugc/{slug} | editor.md, client.md |
| Play Now 自動マッチング | POST /v1/seek-game 相当 mock | matchmaker.md, client.md |
| ルーム選択 モーダル手動選択 | GET /v1/game-list 相当 mock | matchmaker.md, client.md |
| boxel | voxel のタイポ、`voxel` に訂正。エイリアス機能としては扱わない | - |

## 技術制約維持 (D2等)

- L1 type分岐は fps|voxelの2つのまま。Sandboxは表示上のグルーピングでL1分岐を増やさない。
- gamemodes/* → @cod/gamemode-sdkのみ (Biome維持)
- engine-core → profile-* 禁止 (Biome維持)
- 決定論・ゼロアロケ・例外安全維持
- `boxel` は `voxel` のタイポで `voxel` に訂正。エイリアス機能としては扱わない
- matchmaker本実装はPhase 4 mock、Redis/HMACはPhase 5以降
- voxel本実装、AOI、delta snapshot、QuickJS、GLBエディタ本実装はPhase 5以降

## Phase 4 実装対応

| Phase 4 Subtask | 対応仕様 |
|---|---|
| PH4-A genres/tags/display/stats | GameModeDefinition拡張、ffa拡張 |
| PH4-B Header FPS/Voxelタブ | Headerコンポーネント、activeTab state |
| PH4-C Left Sidebar + Sandboxボタン | LeftSidebar、sandboxOpen state |
| PH4-D Sandboxモーダル カード+フィルタ+ソート mock | sandbox.ts filter/sort、matchmaker-mock.ts mockGameModes、SandboxModal |
| PH4-E 詳細ページ + Play Now/Room Selection mock | SandboxDetailPage、RoomSelectionModal、mockRooms/fetchGameList/seekGame |
| PH4-F 投票システム入口 mock | VoteOverlay、voteSession、FFA/TDM/DOM候補、多数決 |

## 参照

- product.md: プラットフォームカテゴリ、ナビゲーション、メイン画面、Sandboxハブ仕様
- editor.md: 階層モデル、Genre/Tag拡張、Sandbox表示マッピング、ルーティング
- types.md: GameModeDefinition拡張、SandboxCard/Filter/Sort、Voting、
- matchmaker.md: フィルタ/ソート、Play Now/Room Selectionフロー、Redis拡張
- client.md: Header/Sidebar/Sandboxモーダル/詳細ページ/投票UI
- architecture.md: L3表示集約、SandboxはL1分岐増やさない
- PHASE04_PLAN.md: Phase 4詳細計画
