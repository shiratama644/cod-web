/**
 * 権威ゲームサーバー（bun・ヘッドレス）。
 *
 * Phase 1: bun ネイティブ WebSocket（uWS コア）で単一デフォルトルームを運用する。
 *   - 接続時にプレイヤーを Room に参加させ playerId を払い出す。
 *   - 固定シミュレーション（アキュムレータ）で profile の `stepPlayer` を権威実行。
 *   - 入力パケット（バイナリ・60Hz）を受信してシムへ渡す。
 *   - スナップショット送信は SnapshotBroadcaster が Channel.Unreliable で行う。
 *
 * レンダラー（Babylon/WebGL）/ React / DOM は一切使わない。衝突・移動は
 * profile-fps の純粋ロジック（three core/math + three-mesh-bvh、CPU のみ）を使う。
 */

import { createDefaultServerRuntime } from './runtime'
import { createHandlers, type SocketData } from './handlers'

const PORT = Number(process.env.PORT ?? 8080)
const HOST = '0.0.0.0'

const { profile, room, sim, snapshots, inputRate } = createDefaultServerRuntime()

const handlers = createHandlers({ room, sim, snapshots, inputRate })

const server = Bun.serve<SocketData>({
  port: PORT,
  hostname: HOST,
  fetch: handlers.fetch,
  websocket: {
    maxPayloadLength: 64 * 1024,
    idleTimeout: 30,
    backpressureLimit: 1024 * 1024,
    closeOnBackpressureLimit: true,
    sendPings: true,
    perMessageDeflate: false,
    open(ws) {
      handlers.open(ws as unknown as Parameters<typeof handlers.open>[0])
      const id = (ws as unknown as { data?: SocketData }).data?.playerId
      if (id != null && id > 0) {
        console.log(`[server] player joined: id=${id} (room=${room.playerCount})`)
      }
    },
    message(ws, message) {
      handlers.message(
        ws as unknown as Parameters<typeof handlers.message>[0],
        message as string | ArrayBuffer | Uint8Array,
      )
    },
    drain(ws) {
      handlers.drain(ws as unknown as Parameters<typeof handlers.drain>[0])
    },
    close(ws) {
      const id = (ws as unknown as { data?: SocketData }).data?.playerId
      handlers.close(ws as unknown as Parameters<typeof handlers.close>[0])
      if (id != null && id > 0) {
        console.log(`[server] player left: id=${id} (room=${room.playerCount})`)
      }
    },
  },
})

// ── profile の simHz に基づく固定シミュレーションループ ──
// Simulation がアキュムレータで固定ステップに分解し、ステップを進める。
// 各シム tick でスナップショット送信を試み、broadcaster が profile の snapshotHz
// に基づいてブロードキャストする。
setInterval(() => {
  const before = sim.currentTick()
  sim.update(performance.now())
  const after = sim.currentTick()
  // この回で進んだ各 tick について送信判定（通常 0〜1 tick）。
  for (let t = before + 1; t <= after; t++) {
    snapshots.maybeSend(room, t)
  }
}, 1000 / profile.typeSpec.simHz)

console.log(`[server] cod-web game server listening on ws://${HOST}:${server.port}`)

export { room, sim }
