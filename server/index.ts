/**
 * 権威ゲームサーバー（bun・ヘッドレス）。
 *
 * Phase 1: bun ネイティブ WebSocket（uWS コア）で単一デフォルトルームを運用する。
 *   - 接続時にプレイヤーを Room に参加させ playerId を払い出す。
 *   - 60Hz 固定シミュレーション（アキュムレータ）で shared の `stepPlayer` を権威実行。
 *   - 入力パケット（バイナリ・60Hz）を受信してシムへ渡す。
 *   - スナップショット送信（30Hz）は P1-E で接続する。
 *
 * レンダラー（WebGPU/WebGL）/ React / DOM は一切使わない。衝突・移動は
 * shared の純粋ロジック（three core/math + three-mesh-bvh、CPU のみ）を使う。
 */

import { ProtocolError } from '../shared/protocol/binary'
import { decodeInput } from '../shared/protocol/packer'
import { Room, type Peer } from './room/Room'
import { Simulation } from './sim/Simulation'
import { SnapshotBroadcaster } from './net/snapshot'
import { InputRateLimiter } from './net/rate-limit'
import { buildServerWorld } from './physics/world'

const PORT = Number(process.env.PORT ?? 8080)
const HOST = '0.0.0.0'

/** WebSocket の data に乗せる接続ごとの状態。 */
interface SocketData {
  playerId: number
}

const room = new Room()
const world = buildServerWorld()
const sim = new Simulation(room, world)
const snapshots = new SnapshotBroadcaster()
const inputRate = new InputRateLimiter()

const server = Bun.serve<SocketData>({
  port: PORT,
  hostname: HOST,
  fetch(req, server) {
    // WebSocket アップグレード（接続ごとの data 初期値）
    if (server.upgrade(req, { data: { playerId: -1 } })) {
      return // アップグレード成功時は Response 不要
    }
    // 通常 HTTP は簡単なヘルスチェック応答のみ
    return new Response('cod-web game server (bun) — connect via WebSocket', {
      status: 200,
    })
  },
  websocket: {
    maxPayloadLength: 64 * 1024,
    idleTimeout: 30,
    backpressureLimit: 1024 * 1024,
    closeOnBackpressureLimit: true,
    sendPings: true,
    perMessageDeflate: false,
    open(ws) {
      const peer: Peer = {
        playerId: -1,
        sendText: (data) => {
          ws.send(data)
        },
        sendBinary: (data) => {
          const u8 =
            data instanceof Uint8Array
              ? data
              : new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength)
          return ws.send(u8)
        },
        disconnect: (code, reason) => {
          ws.close(code, reason)
        },
      }
      const id = room.join(peer)
      if (id === null) {
        ws.send(JSON.stringify({ kind: 'full' }))
        ws.close(1013, 'room full')
        return
      }
      peer.playerId = id
      ws.data = { playerId: id }
      console.log(`[server] player joined: id=${id} (room=${room.playerCount})`)
    },
    message(ws, message) {
      try {
        if (typeof message === 'string') {
          // 制御テキストメッセージは現状なし（welcome/join/leave はサーバー発）。
          return
        }
        const view = toDataView(message)
        const input = decodeInput(view)
        const playerId = ws.data?.playerId
        if (playerId != null && playerId > 0) {
          if (!inputRate.allow(playerId, performance.now())) {
            throw new ProtocolError('input rate exceeded')
          }
          sim.receiveInput(playerId, input)
        }
      } catch (err) {
        const code = err instanceof ProtocolError ? err.closeCode : 1002
        ws.close(code, 'protocol')
      }
    },
    drain(ws) {
      const id = ws.data?.playerId
      if (id != null && id > 0) snapshots.markWritable(id)
    },
    close(ws) {
      const id = ws.data?.playerId
      if (id != null && id > 0) {
        inputRate.remove(id)
        room.leave(id)
        console.log(`[server] player left: id=${id} (room=${room.playerCount})`)
      }
    },
  },
})

// ── 60Hz 固定シミュレーションループ ──
// Simulation がアキュムレータで固定 1/60 ステップに分解し、ステップを進める。
// 各シム tick でスナップショット送信を試み、broadcaster が 1 tick おき（30Hz）に
// ブロードキャストする。
const TICK_HZ = 60
setInterval(() => {
  const before = sim.currentTick()
  sim.update(performance.now())
  const after = sim.currentTick()
  // この回で進んだ各 tick について送信判定（通常 0〜1 tick）。
  for (let t = before + 1; t <= after; t++) {
    snapshots.maybeSend(room, t)
  }
}, 1000 / TICK_HZ)

/** Bun の Buffer（Uint8Array）をコピーせず DataView にする。 */
function toDataView(buf: ArrayBuffer | Uint8Array): DataView {
  if (buf instanceof ArrayBuffer) return new DataView(buf)
  return new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
}

console.log(`[server] cod-web game server listening on ws://${HOST}:${server.port}`)

export { room, sim }
