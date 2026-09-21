# Sandbox 最終合意仕様書 (2026-09-22 改訂版反映)

> ユーザー提供「ゲームプラットフォーム 仕様定義書 (改訂版)」を正本として合意。元: ユーザー提供テキスト + 2026-09-22改訂版。
> 状態: **合意済み (Agreed)**。arch反映済み (product.md/editor.md/types.md/matchmaker.md/client.md/architecture.md) 改訂版。
> Phase 4計画: PHASE04_PLAN.md 改訂版

## 原文 (ユーザー提供 最終改訂版)

```
# ゲームプラットフォーム 仕様定義書 (改訂版)

1. ゲームカテゴリ定義:
  Official (公式ゲーム) — 運営が公式に提供するゲーム群:
    FPS: 1つのゲームに複数モード [FFA,TDM,DOM,etc.] — 投票で次ルール決定
      /fps/official (1ゲーム) subModes: ffa, tdm, dom
      RoomState: waiting -> countdown -> playing(ffa) -> ended -> voting -> playing(tdm)
    Voxel: 1モードのみ [Survival] — 永続サバイバル、死んだらリスポーン
      /voxel/official/survival (1モード永続) finish_game無し

  Sandbox — 標準FPS/Voxel以外の公式ゲーム + UGC (親ジャンル FPS/Voxel + サブタグ):
    FPS: examples [TDM,DOM,Zombie,etc.] (公式拡張 + UGC)
      /fps/official/zombie (公式拡張), /fps/ugc/zombie (UGC)
    Voxel: examples [Bedwars,Athletic,etc.] (公式拡張 + UGC)
      /voxel/official/bedwars (公式拡張), /voxel/ugc/bedwars (UGC)

2. 画面レイアウト & ナビゲーション:
  - Header / Navigation Tabs (Officialゲームの切り替え):
      - [FPS] タブと [Voxel] タブの切り替えが可能。
      - [FPS]タブ: 公式FPS画面を表示。1ゲーム複数モード [FFA,TDM,DOM]、投票で次決定。
      - [Voxel]タブ: 公式Voxel画面を表示。1モードのみ [Survival]、永続サバイバル。
  - Left Sidebar (Krunker.io風ボタン群):
      - 各種メニューボタンを配置。
      - 「Sandbox」ボタンを配置。押下で Sandbox モーダル (公式拡張+UGC)。

3. メイン画面仕様 (デフォルト: Official FPS):
  - サイトアクセス時の初期表示（ホームページ）は Official FPS ゲーム画面。
  - Official FPSは1つのゲームに複数モード [FFA,TDM,DOM,etc.] を持つ。
  - 1マッチ終了時、全プレイヤーによる投票システムで「次の試合形式（サブモード）」を決定する。Official FPSのみ。
  - Official Voxelは1モードのみ [Survival]、永続サバイバル、死んだらリスポーン可能、finish_game無し。

4. Sandbox (公式拡張+UGC) モーダル仕様:
  - トリガー:
      - 左サイドバーの「Sandbox」ボタン押下時にオープン。
  - コンテンツリスト表示 (カード形式):
      - 各カードの表示項目:
          - サムネイル画像
          - タイトル
          - 作者名 (Creator) — Official または ユーザー名 (SandboxはUGCだけでなく公式拡張も含む)
          - 累計プレイ数
          - 簡易説明文
  - フィルター機能:
      - 親ジャンル (FPS / Voxel など)
      - サブタグ (Bedwars, Zombie, Athletic など)
  - ソート機能:
      - 累計プレイ数順 (totalPlays)
      - 現在の同時接続 (アクティブ) プレイヤー数順 (activePlayers)
      - 詳細ページ閲覧数順 (detailViews)

5. 詳細ページ & ルーム参加フロー:
  - 遷移:
      - Sandboxモーダル内の各ゲームカードをクリックで該当ゲームの「詳細ページ」へ遷移。/sandbox/{id} → 内部 /{type}/{source}/{slug} 解決。公式拡張 (例: /fps/official/zombie) もUGCも対象。
  - アクションボタン:
      - [Play Now] ボタン:
          - 空き枠のある既存ルームへ自動マッチングして即時参加。
      - [ルーム選択] ボタン:
          - ルーム一覧モーダルを表示し、プレイヤーが任意のサーバー/ルームを手動選択して参加可能。
```

## 合意解釈 — 改訂版

| 項目 | 解釈 | arch反映 |
|---|---|---:|
| Official FPS 1ゲーム複数モード [FFA,TDM,DOM]投票 | type=fps, source=official, 1ゲーム fps-official, subModes [ffa,tdm,dom], votingで次決定 | product.md, editor.md, types.md, matchmaker.md, client.md |
| Official Voxel 1モード [Survival]永続 | type=voxel, source=official, 1モード survival, finish_game無し, 死んだらリスポーン | product.md, editor.md, types.md |
| Sandboxは標準FPS/Voxel以外の公式ゲーム + UGC | source=official|ugc かつ標準以外。例: /fps/official/zombie (公式拡張), /voxel/official/bedwars (公式拡張), /fps/ugc/*, /voxel/ugc/* | product.md, editor.md, types.md, matchmaker.md |
| Header [FPS][Voxel] Official切替 | React Headerコンポーネント、[FPS]タブ Official FPS 1ゲーム複数モード、[Voxel]タブ Official Voxel Survival永続、デフォルトFPS | client.md, product.md |
| Left Sidebar Krunker風 + Sandboxボタン 公式拡張+UGC | LeftSidebarコンポーネント、Sandboxボタンでモーダル (公式拡張+UGC) | client.md, product.md |
| メイン画面デフォルト Official FPS | App.tsx GameCanvas + HUDが初期表示、Official FPS 1ゲーム複数モード | client.md, product.md |
| 投票システム Official FPS 1ゲーム複数モード | onRoundEnd後に全プレイヤー投票で次サブモード FFA/TDM/DOM決定、VoteOverlay、Official Voxelは投票対象外 | types.md, client.md, product.md |
| Sandboxモーダル トリガー Sidebar Sandboxボタン 公式拡張+UGC | LeftSidebar → SandboxModal open、公式拡張+UGC | client.md |
| カード thumbnail/title/creator/plays/desc creator Official含む | SandboxCard型、display/stats、source official|ugc、creator Officialまたはユーザー名 | types.md, editor.md |
| 親ジャンル FPS/Voxelフィルタ | parentGenre filter fps|voxel | types.md, editor.md, matchmaker.md |
| サブタグ Bedwars/Zombie/Athleticフィルタ | genres(サブタグ)フィルタ bedwars/zombie/athletic/tdm/dom | types.md, editor.md, matchmaker.md |
| ソート 累計プレイ/アクティブ/閲覧数 | totalPlays/activePlayers/detailViewsソート | types.md, matchmaker.md |
| 詳細ページ遷移 カードクリック 公式拡張+UGC | /sandbox/{id} → 内部 /{type}/official|ugc/{slug} | editor.md, client.md |
| Play Now 自動マッチング | POST /v1/seek-game 相当 mock、公式拡張+UGC | matchmaker.md, client.md |
| ルーム選択 モーダル手動選択 | GET /v1/game-list 相当 mock、公式拡張+UGC | matchmaker.md, client.md |
| boxel | voxel のタイポ、`voxel` に訂正。エイリアス機能としては扱わない | - |

## 技術制約維持 (D2等) — 改訂版

- L1 type分岐は fps|voxelの2つのまま。Sandboxは公式拡張+UGC表示上のグルーピングでL1分岐を増やさない。Official FPSは1ゲーム複数モードだがL1分岐ではない。
- gamemodes/* → @cod/gamemode-sdkのみ (Biome維持)
- engine-core → profile-* 禁止 (Biome維持)
- 決定論・ゼロアロケ・例外安全維持
- `boxel` は `voxel` のタイポで `voxel` に訂正。エイリアス機能としては扱わない
- matchmaker本実装はPhase 4 mock、Redis/HMACはPhase 5以降
- voxel本実装、AOI、delta snapshot、QuickJS、GLBエディタ本実装はPhase 5以降
- Official FPSのTDM/DOMサブモード本実装、Official Voxel Survival永続本実装はPhase 5以降

## Phase 4 実装対応 — 改訂版

| Phase 4 Subtask | 対応仕様 |
|---|---:|
| PH4-A parentGenre/subTag/subModes/display/stats/category | GameModeDefinition拡張 parentGenre/genres(サブタグ)/tags/display/stats/subModes/currentSubMode/category、ffa拡張 Official FPSのFFAサブモード |
| PH4-B Header Official FPS/Voxelタブ | Headerコンポーネント [FPS][Voxel] Official切替、activeTab state |
| PH4-C Left Sidebar + Sandboxボタン 公式拡張+UGC | LeftSidebar、sandboxOpen state、公式拡張+UGC |
| PH4-D Sandboxモーダル 親ジャンル+サブタグフィルタ+ソート mock 公式拡張+UGC | sandbox.ts parentGenre+subTag filter/sort、matchmaker-mock.ts mockGameModes 公式拡張+UGC、SandboxModal カード Official含む |
| PH4-E 詳細ページ + Play Now/Room Selection mock 公式拡張+UGC | SandboxDetailPage、RoomSelectionModal、mockRooms/fetchGameList/seekGame、公式拡張+UGC |
| PH4-F 投票システム入口 Official FPS 1ゲーム複数モード mock | VoteOverlay、voteSession subMode投票、FFA/TDM/DOM候補、多数決、Official Voxel投票対象外 |

## 参照 — 改訂版

- product.md: プラットフォームカテゴリ (Official FPS 1ゲーム複数モード + Voxel 1モード永続、Sandbox公式拡張+UGC)、ナビゲーション (Header Official切替、Sidebar Sandbox)、メイン画面 (Official FPS投票)、Sandboxハブ仕様 (親ジャンル+サブタグ)
- editor.md: 階層モデル (Official 1ゲーム複数モード + Voxel永続 + Sandbox公式拡張+UGC)、Genre/Tag拡張 (parentGenre + SubTag)、Sandbox表示マッピング (公式拡張+UGC)、ルーティング (Official 1ゲーム複数モード)
- types.md: GameModeDefinition拡張 (parentGenre, genres=サブタグ, subModes, category, VoteはsubMode, Voxel永続)、SandboxCard/Filter/Sort (親ジャンル+サブタグ、公式拡張+UGC)
- matchmaker.md: 親ジャンル+サブタグフィルタ、Official FPS投票、Sandbox公式拡張+UGC、Play Now/Room Selectionフロー、Redis拡張
- client.md: Header Official切替/Sidebar Sandbox公式拡張+UGC/Sandboxモーダル親ジャンル+サブタグ/詳細ページ/投票UI Official FPS subMode
- architecture.md: L3表示集約、SandboxはL1分岐増やさない、Official FPS 1ゲーム複数モード + Voxel永続 + Sandbox公式拡張+UGC
- PHASE04_PLAN.md 改訂版: Phase 4詳細計画 (Official 1ゲーム複数モード + Voxel永続 + Sandbox公式拡張+UGC + 親ジャンル+サブタグ)
