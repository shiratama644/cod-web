# ゲームノード（Bun WebSocket）

シグネチャは [Bun WebSockets 公式](https://bun.com/docs/runtime/http/websockets) で確認済み。推測で書かない。

## Bun.serve

```ts
Bun.serve({
  port: 8080,
  reusePort: true, // 複数プロセスで1ポート
  fetch(req, server) {
    const ok = server.upgrade(req, { data: { ticket, roomId, seatId } });
    if (ok) return;
    return new Response('Upgrade failed', { status: 400 });
  },
  websocket: {
    message(ws, message) {},
    open(ws) {},
    close(ws, code, reason) {},
    drain(ws) {},
    error(ws, error) {},
    maxPayloadLength: 64 * 1024,
    idleTimeout: 30,                 // 公式デフォルトは 120。本プロジェクトは 30
    backpressureLimit: 1024 * 1024,  // 公式デフォルト 16MB。本プロジェクトは 1MB
    closeOnBackpressureLimit: true,  // 公式デフォルト false
    sendPings: true,                 // 公式デフォルト true。明示する
    perMessageDeflate: false,        // 必ず false
  },
});
```

`ws.send(message, compress?): number`

| 戻り値 | 意味 | 対応 |
|---:|---|---|
| -1 | キュー済み・バックプレッシャ | チャンク停止。スナップショットのみ |
| 0 | 接続問題で破棄 | 切断 |
| 1+ | 送信バイト数 | 正常 |

現行コードが存在しない `ws.bufferedAmount` を読む、または `send` 戻り値を捨てる場合は修正する。

同一ティックの複数送信は `ws.cork()`。全員同一内容（Chat, Join, Leave, RoomState, mode broadcast）は `server.publish(roomTopic, buf)`。スナップショットは受信者ごとに違うので pub/sub 不可。

## Room

ルーム自身は `setInterval` を持たない。`RoomManager` の 5ms 単一タイマーから `tickIfDue(nowMs)`。

遅延が `tickInterval * 5` を超えたら追いつかずスキップ（スパイラルオブデス回避）。

`doTick` 順: 入力消費 → `lagComp.record` → `drainEvents` → ティックタイマー → `onTick` → snapshotHz でスナップショット → ワールド差分。

**ゼロアロケーション:** `doTick` 内で `new`、`[]`/`{}` リテラル、`.slice/.map/.filter`、クロージャ生成、ベクトルの都度オブジェクト返却をしない。送信は `subarray()`（コピーしない）。現行の毎送信 `buffer.slice()` は置換対象。

1 ルームの例外は catch し、他ルームを巻き込まない。

## 入力キュー

リングバッファ。上限 32（溢れは破棄、切断しない）。`targetDepth` をジッタから 1–8 に適応。空なら前回入力のボタンを離してリピート。溜まりすぎなら 2 個消費。

サーバは 1 秒ごとに TimeSync（serverTick + serverTimeMs）。クライアントは RTT/2 でサーバ時刻を推定。

## レート制限（トークンバケット・ティック基準）

| 対象 | perSec | burst |
|---|---:|---:|
| input | 90 | 20 |
| blockAction | 20 | 10 |
| fireAction | 30 | 10 |
| modeMessage | 40 | 20 |
| chat | 2 | 4 |
| ctx.broadcast | 10 | 5 |
| ctx.send（人あたり） | 20 | 10 |

ハード上限: modeMessage id 16 文字、data 2048B、setBlock/tick 4096、fillBox/tick 65536（超過は次ティックへ分割）、onTick 8ms を 5 連続でモード停止、chat 200 文字。

Input 長さ不正・入力レート超過は **即切断**。ctx.broadcast/send 超過は `false`（例外にしない）。

## メッセージハンドラ

1. 文字列は制御 JSON のみ。4KB 超は 1009
2. 空バッファは 1002
3. 未認証は Hello のみ
4. 固定長は厳密一致
5. 全体 try/catch。type 帯で common / voxel profile / fps profile
6. 不明 type は 1002
