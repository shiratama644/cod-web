---
name: networking
description: Bun WebSocket権威サーバー、Channel framing、Input 16B、backpressure、rate limit、SnapshotBroadcasterの実装ノウハウ。
---

# Networking — Bun WS権威サーバーの実装スキル

> 仕様正本: `docs/arch/protocol.md`（バイナリプロトコル・Channel・トランスポート）、`docs/arch/server.md`（Room/TickScheduler/レート制限）、`docs/arch/adr.md` ADR-005,015,016  
> 計画: `docs/planning/PHASE01_PLAN.md` §10.3, `PHASE02_PLAN.md`, `EM01_PLAN.md`

## トランスポートはWebSocketのみ（ADR-005）

- UDP / WebRTC DataChannel / geckos.io / WebTransport は**実装しない**
- `NetTransport` 抽象と Channel 区分は維持、ゲームコードから `WebSocket` を直接参照しない
- Bun `Bun.serve` ネイティブ WSは内部で uWebSockets、追加パッケージ `uWebSockets.js` はbunでは動かない

## Bun.serve 正しい使い方（api-sources.md公式確認）

```ts
Bun.serve({
  port: 8080,
  reusePort: true,
  fetch(req, server) {
    const ok = server.upgrade(req, { data: { ticket, roomId, seatId } });
    if (ok) return;
    return new Response('Upgrade failed', { status: 400 });
  },
  websocket: {
    data: {} as SocketData, // 型はここに置く、generic引数ではない
    message(ws, message) {},
    open(ws) {},
    close(ws, code, reason) {},
    drain(ws) {},
    error(ws, error) {},
    maxPayloadLength: 64 * 1024,
    idleTimeout: 30,
    backpressureLimit: 1024 * 1024,
    closeOnBackpressureLimit: true,
    sendPings: true,
    perMessageDeflate: false, // 必ずfalse
  },
});
```

### ws.send() 戻り値を見る（重要）

| 戻り値 | 意味 | 対応 |
|---:|---|---|
| -1 | キュー済み・バックプレッシャ | チャンク停止、Snapshotのみ、paused Setに追加 |
| 0 | 接続問題で破棄 | 切断 |
| 1+ | 送信バイト数 | 正常 |

- 存在しない `bufferedAmount` に頼らない
- -1は「今回キュー済み」なので以降を pausedにして `drain` まで送らない（テストは初回から-1を返すと0通になる）
- 同一ティック複数送信は `ws.cork()`、全員同一内容（Chat/Join/Leave/RoomState）は `server.publish(roomTopic, buf)`

## Channel framing（PH1-C）

- 高頻度は **Channel 1B + payload**。Input payload 16Bのまま、WS frame 17B
- ブラウザ送信はpayload viewの1B前に余白を持たせ、transportがChannelを書くとpayloadコピー回避
- decodeは type込み先頭から読む、旧 `decodeInput(view,1)` はreserved導入で壊れる

```ts
// 送信
const frame = new Uint8Array(17);
frame[0] = Channel.Unreliable;
frame.set(inputBytes, 1); // 16B
ws.send(frame);

// 受信
function decodeFrame(view: DataView): {channel: number, payload: DataView} {
  const channel = view.getUint8(0);
  return { channel, payload: new DataView(view.buffer, view.byteOffset+1, view.byteLength-1) };
}
```

## Input 16B固定（ADR-015）

- レイアウト: seq u32 / moveX i8 / moveZ i8 / yaw u16(0-2π→0-65535) / pitch i8 / buttons u8 / dtMs u16(ms)
- 長さ不一致は即切断（1002）
- dtMsはミリ秒、60Hzでは通常16-17ms、0.1ms単位(x10)は不採用、clamp 500ms

## レート制限（トークンバケット・ティック基準）

| 対象 | perSec | burst | 超過時 |
|---|---|---:|---|
| input | 90 | 20 | 即切断 |
| blockAction | 20 | 10 | false |
| fireAction | 30 | 10 | false |
| modeMessage | 40 | 20 | false |
| chat | 2 | 4 | false |

- トークンはdecode成功後に消費（壊れたパケットでバーストを削らない）
- Input長さ不正・入力レート超過は即切断、ctx.broadcast/send超過はfalse

## Room / Tick

- Room自身は `setInterval` を持たない、`RoomManager` の5ms単一タイマーから `tickIfDue(nowMs)`
- 遅延が `tickInterval*5` 超えたら追いつかずスキップ（スパイラルオブデス回避）
- `doTick` 順: 入力消費 → `lagComp.record` → `drainEvents` → ティックタイマー → `onTick` → snapshotHzでスナップショット → ワールド差分
- 例外は1ルームのみcatch、他ルームを巻き込まない

## テスト可能化（EM2-A）

- `apps/gameserver/src/index.ts` はトップレベルで `Bun.serve` を呼ぶ副作用。テスト可能化のため `handlers.ts` に純粋関数分離:

```ts
export function createHandlers(deps) {
  return {
    open(ws) {},
    message(ws, message) {},
    drain(ws) {},
    close(ws) {},
    fetch(req, server) {},
  }
}
```

- テストでは `vi.stubGlobal('Bun', {serve})` でモック、ハンドラ分岐をカバー（room full 1013、string無視、ingest成功/失敗、rate-limit超過、ws.data null、drain markWritable、close removePlayer/leave）

## メモリリーク対策（EM01）

- `Room.leave` 時に必ず `Simulation.removePlayer` / `SnapshotBroadcaster.removePlayer` / `LagCompStore.clear` / `RateLimiter.remove` を呼ぶ
- `SnapshotBroadcaster.paused` Setはleave時に削除、backpressure状態のプレイヤーが離脱後も残留しないように
- 回帰テストでleave/clear経路を固定

## 関連

- `docs/arch/protocol.md` §Channel / §Backpressure / §Input
- `docs/arch/server.md` §Room / §入力キュー / §レート制限
- `.agent/logs/2026-09-03_authoritative-server-design-decisions.md`
- `.agent/logs/2026-09-05_ph0-a-16byte-input-binary-reader.md`
- `.agent/logs/2026-09-05_ph0-b-input-rate-limit.md`
- `.agent/logs/2026-09-05_ph0-c-ws-send-backpressure.md`
- `.agent/logs/2026-09-08_ph1-c-channel-framing.md`
- `.agent/logs/2026-09-20_plat-em-em01-bugfix-plan.md`
