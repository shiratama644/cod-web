# マッチメイカー

> **現状: 未実装（PH4以降）**。本ファイルは理想形。`apps/matchmaker/` は存在せず、`docs/task-list.md` で PH4以降として管理。
> 2026-09-22 更新: FPS/Voxel/Sandbox 3カテゴリ、genre/tag フィルタ、Sandbox ソート、Play Now / Room Selection フロー対応。

ゲームサーバとは **別プロセス・別デプロイ**。ステートレスで水平スケール。

責務: ルーム一覧、入室チケット（座席予約）、ゲームモード一覧、ノード生死。ゲームモード一覧は `type`（`fps` / `voxel`）と `source`（`official` / `ugc`）と `genres`/`tags` で絞れる。

## プラットフォームカテゴリ対応

| 表示カテゴリ | 内部クエリ |
|---|---|
| FPS (公式) | `type=fps&source=official` |
| Voxel (公式) | `type=voxel&source=official` |
| Sandbox (UGC) | `source=ugc` (+ `genre=bedwars|zombie|athletic` 等) |

- Sandbox は `source=ugc` の集約ビュー。`/sandbox` 表示は `GET /v1/gamemodes?source=ugc` 相当。
- 過去の議論で `boxel` と記載があった箇所は `voxel` のタイポ。`voxel` に訂正済み。

## HTTP

- `GET /v1/gamemodes` — 長期キャッシュ可。query: `type`, `source`, `genre`, `tag`, `search`, `sort` (`totalPlays|activePlayers|detailViews`), `order` (`desc|asc`)。Sandbox モーダルのフィルタ/ソート/検索に使用。
- `GET /v1/game-list` — query: region, type, source, mode, genre, hasSpace, limit（既定 100、最大 500）。`games` はタプル配列。`v` はビルドハッシュ。不一致ならクライアントはリロード、ノードは Hello で拒否。Room Selection モーダル用。
- `POST /v1/seek-game` — roomId 省略時は自動選択。`createIfNone`。200 で `wss` URL + ticket（expires 15s）。409 room_full。**Play Now ボタン**はこれで空きルーム自動マッチ。
- `POST /v1/create-room`
- `POST /v1/node/heartbeat` — ノードが 3 秒ごと。rooms スナップショット。`activePlayers` 集計元。

アカウントは **初期匿名**（表示名 + 一時 uid）。認証方式は後続フェーズ。

## Sandbox ハブ用拡張

### フィルタ

- `genre`: `bedwars`, `zombie`, `athletic`, `survival`, `ffa`, `tdm`, `dom`, `pvp` 等。`GameModeDefinition.genres` にマッチ。
- `tag`: `official`, `ugc`, `pvp`, `pve` 等。`GameModeDefinition.tags` にマッチ。

### ソート

- `sort=totalPlays` — 累計プレイ人数順（Sandbox モーダル）
- `sort=activePlayers` — 現在同時接続数順（heartbeat 集計）
- `sort=detailViews` — 詳細ページ閲覧数順（RDB、Phase 6以降）

Phase 4 では mock データでソート。Phase 6 で RDB 永続化。

### カード表示項目

`GET /v1/gamemodes` の各要素は `SandboxCard` 相当: `thumbnail`, `title`, `creator`, `totalPlays`, `description`, `activePlayers`, `detailViews`, `genres`, `tags`.

## チケット

```
v1.<base64url(payload)>.<base64url(hmac-sha256)>
```

payload: roomId, nodeId, seatId, uid, name, iat, exp。鍵は `TICKET_SECRET`。ノードはマッチメイカーへ問い合わせずに検証する。

満室への同時接続競合を防ぐため座席予約は必須（Colyseus の seat reservation と同思想）。

## Redis

| キー | 型 | TTL |
|---|---|---:|
| `node:{nodeId}` | Hash | 10s |
| `nodes:{region}` | Set | — |
| `room:{roomId}` | Hash | 15s |
| `rooms:{region}:{type}` | ZSet 空き人数 | — |
| `rooms:{region}:{modeId}` | ZSet | — |
| `rooms:{region}:{type}:{source}` | ZSet | — |
| `rooms:{region}:genre:{genre}` | ZSet | — |
| `seat:{roomId}:{seatId}` | String uid, SET NX | 15s |
| `roomseq:{region}` | 採番 | — |
| `stats:{modeId}:totalPlays` | Counter | — |
| `stats:{modeId}:detailViews` | Counter | — |

空きは「残り席が少ない順」で埋める。接続したら seat TTL を外し、退出で削除。15s は未接続チケットの回収。`activePlayers` は `rooms:{region}:*` ZSet の合計で算出。

初期リージョンは **1 拠点**。

## フロー: Play Now / Room Selection

- **Play Now**: クライアント → `POST /v1/seek-game { modeId, hasSpace:true }` → ticket → `wss` 接続。空きルーム自動マッチ。
- **Room Selection**: クライアント → `GET /v1/game-list?modeId={id}&hasSpace=true` → ルーム一覧モーダル表示 → ユーザー選択 → `POST /v1/seek-game { roomId }` → ticket → `wss` 接続。
