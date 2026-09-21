# マッチメイカー — 改訂版

> **現状: 未実装（PH4以降）**。本ファイルは理想形。`apps/matchmaker/` は存在せず、`docs/task-list.md` で PH4以降として管理。
> 2026-09-22 改訂版: OfficialはFPS 1ゲーム複数モード (FFA/TDM/DOM投票) + Voxel 1モード永続 (Survival)、Sandboxは標準FPS/Voxel以外の公式ゲーム + UGC、親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic。

ゲームサーバとは **別プロセス・別デプロイ**。ステートレスで水平スケール。

責務: ルーム一覧、入室チケット（座席予約）、ゲームモード一覧、ノード生死。OfficialとSandboxの一覧を提供。

## ゲーム種別・階層構造 — 改訂版

```
Official (公式ゲーム):
  FPS: 1ゲーム複数モード [FFA,TDM,DOM,etc.] — 投票で次モード決定。例: /fps/official (subModes ffa/tdm/dom)
  Voxel: 1モードのみ [Survival] — 永続サバイバル、死んだらリスポーン。例: /voxel/official/survival

Sandbox (公式拡張+UGC):
  FPS: examples [TDM,DOM,Zombie,etc.] — 公式拡張 + UGCのFPS。例: /fps/official/zombie (公式拡張), /fps/ugc/zombie
  Voxel: examples [Bedwars,Athletic,etc.] — 公式拡張 + UGCのVoxel。例: /voxel/official/bedwars (公式拡張), /voxel/ugc/bedwars
```

| 表示種別 | 内部クエリ |
|---|---|
| Official FPS (1ゲーム複数モード) | `type=fps&source=official&category=Official` — 1ゲーム `fps-official`、subModes ffa/tdm/dom、投票 |
| Official Voxel (1モード永続) | `type=voxel&source=official&category=Official` — Survival永続 |
| Sandbox (公式拡張+UGC) | `category=Sandbox` — 親ジャンル FPS/Voxel + サブタグ。公式拡張 (zombie, bedwars) + UGC |

- SandboxはUGCだけでなく、標準FPS/Voxel以外の公式ゲームも含む。例: 公式Zombie、公式Bedwars等はSandbox表示。
- Official FPSは1ゲーム複数モード、投票で次サブモード決定。
- Official Voxelは1モードのみ、永続サバイバル。

## HTTP — 改訂版

- `GET /v1/gamemodes` — query: `category` (Official|Sandbox), `type` (fps|voxel), `source` (official|ugc), `parentGenre` (fps|voxel), `subTag` (bedwars|zombie|athletic|ffa|tdm|dom|survival), `search`, `sort` (totalPlays|activePlayers|detailViews), `order`。Sandboxモーダルの親ジャンル+サブタグフィルタ/ソートに使用。
- `GET /v1/game-list` — query: region, type, source, category, mode, parentGenre, subTag, hasSpace, limit。Room Selectionモーダル用。
- `POST /v1/seek-game` — roomId省略時は自動選択。Play Nowボタンで空きルーム自動マッチ。
- `POST /v1/create-room`
- `POST /v1/node/heartbeat` — ノードが3秒ごと。roomsスナップショット。activePlayers集計元。
- `GET /v1/official/fps/submodes` — Official FPSのサブモード一覧 [FFA,TDM,DOM,etc.]、投票用。
- `POST /v1/official/fps/vote` — Official FPSの投票。subMode指定。

## Sandbox ハブ用 — 改訂版 (親ジャンル+サブタグ)

### フィルタ — 改訂版

- **親ジャンル**: `fps`, `voxel`。FPSカテゴリ、Voxelカテゴリ。
- **サブタグ**: `bedwars`, `zombie`, `athletic`, `tdm`, `dom`, `ffa`, `survival`, `pvp`, `pve` 等。`genres`/`tags`にマッチ。

例:
- `parentGenre=fps&subTag=zombie` → FPSのZombieゲーム (公式拡張 + UGC)
- `parentGenre=voxel&subTag=bedwars` → VoxelのBedwarsゲーム (公式拡張 + UGC)

### ソート

- `sort=totalPlays` — 累計プレイ数順
- `sort=activePlayers` — 現在同時接続数順
- `sort=detailViews` — 詳細ページ閲覧数順

Phase 4 mock、Phase 6 RDB永続化。

### カード表示項目

`GET /v1/gamemodes?category=Sandbox` の各要素は `SandboxCard` 相当: `thumbnail`, `title`, `creator` (Officialまたはユーザー名), `totalPlays`, `description`, `parentGenre`, `genres` (サブタグ), `tags`.

SandboxはUGCだけでなく公式拡張も含むため、creatorは Official または ユーザー名。

## チケット

```
v1.<base64url(payload)>.<base64url(hmac-sha256)>
```

payload: roomId, nodeId, seatId, uid, name, iat, exp。鍵は `TICKET_SECRET`。

## Redis — 改訂版

| キー | 型 | TTL |
|---|---|---:|
| `node:{nodeId}` | Hash | 10s |
| `nodes:{region}` | Set | — |
| `room:{roomId}` | Hash | 15s |
| `rooms:{region}:{type}` | ZSet 空き人数 | — |
| `rooms:{region}:{modeId}` | ZSet | — |
| `rooms:{region}:{type}:{source}` | ZSet | — |
| `rooms:{region}:category:{category}` | ZSet | — |
| `rooms:{region}:parent:{parentGenre}` | ZSet | — |
| `rooms:{region}:subtag:{subTag}` | ZSet | — |
| `seat:{roomId}:{seatId}` | String uid, SET NX | 15s |
| `roomseq:{region}` | 採番 | — |
| `stats:{modeId}:totalPlays` | Counter | — |
| `stats:{modeId}:detailViews` | Counter | — |
| `official:fps:submodes` | Set | — |
| `official:fps:currentSubMode` | String | — |

## フロー — 改訂版

### Official FPS: 1ゲーム複数モード + 投票

- クライアント → `GET /v1/official/fps/submodes` → [FFA,TDM,DOM]一覧
- マッチ終了 → `POST /v1/official/fps/vote { subMode }` → 集計 → winner決定 → 次サブモードで新ラウンド
- ルームは常に `fps-official`、内部 `currentSubMode` が ffa/tdm/dom を保持

### Official Voxel: 1モード永続

- クライアント → `GET /v1/gamemodes?category=Official&type=voxel` → Survivalのみ
- 永続サバイバル、死んだらリスポーン、finish_game無し、投票無し

### Sandbox: Play Now / Room Selection (公式拡張+UGC)

- **Play Now**: クライアント → `POST /v1/seek-game { category=Sandbox, parentGenre, subTag, hasSpace:true }` → ticket → `wss` 接続。自動マッチ。
- **Room Selection**: クライアント → `GET /v1/game-list?category=Sandbox&parentGenre=fps&subTag=zombie&hasSpace=true` → ルーム一覧モーダル → 選択 → `POST /v1/seek-game { roomId }` → ticket → `wss` 接続。
- Sandboxは公式拡張 (例: /fps/official/zombie) + UGC (例: /fps/ugc/zombie) の両方を含む。
