# マッチメイカー

ゲームサーバとは **別プロセス・別デプロイ**。ステートレスで水平スケール。

責務: ルーム一覧、入室チケット（座席予約）、ゲームモード一覧、ノード生死。

## HTTP

- `GET /v1/gamemodes` — 長期キャッシュ可
- `GET /v1/game-list` — query: region, type, mode, hasSpace, limit（既定 100、最大 500）。`games` はタプル配列。`v` はビルドハッシュ。不一致ならクライアントはリロード、ノードは Hello で拒否
- `POST /v1/seek-game` — roomId 省略時は自動選択。`createIfNone`。200 で `wss` URL + ticket（expires 15s）。409 room_full
- `POST /v1/create-room`
- `POST /v1/node/heartbeat` — ノードが 3 秒ごと。rooms スナップショット

アカウントは **初期匿名**（表示名 + 一時 uid）。認証方式は後続フェーズ。

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
| `seat:{roomId}:{seatId}` | String uid, SET NX | 15s |
| `roomseq:{region}` | 採番 | — |

空きは「残り席が少ない順」で埋める。接続したら seat TTL を外し、退出で削除。15s は未接続チケットの回収。

初期リージョンは **1 拠点**。
