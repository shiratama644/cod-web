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

import { decodeInput, readMessageType } from '../shared/protocol/packer'
import { MSG_C2S_INPUT } from '../shared/protocol/constants'
import { Room, type Peer } from './room/Room'
import { Simulation } from './sim/Simulation'
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
    open(ws) {
      const peer: Peer = {
        playerId: -1,
        sendText: (data) => ws.send(data),
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
      if (typeof message === 'string') {
        // 制御テキストメッセージは現状なし（welcome/join/leave はサーバー発）。
        return
      }
      // バイナリ: 入力パケット（Input Packet）。
      const bytes = message instanceof ArrayBuffer ? message : toArrayBuffer(message)
      const view = new DataView(bytes)
      if (readMessageType(view) !== MSG_C2S_INPUT) return
      const input = decodeInput(view, 1)
      const playerId = ws.data?.playerId
      if (playerId != null && playerId > 0) sim.receiveInput(playerId, input)
    },
    close(ws) {
      const id = ws.data?.playerId
      if (id != null && id > 0) {
        room.leave(id)
        console.log(`[server] player left: id=${id} (room=${room.playerCount})`)
      }
    },
  },
})

// ── 60Hz 固定シミュレーションループ（アキュムレータは Simulation が管理） ──
// スナップショット送信（30Hz）は P1-E でこのループに接続する。
const TICK_MS = 1000 / 60
setInterval(() => {
  sim.update(performance.now())
}, TICK_MS)

/** Bun の Buffer（Uint8Array）を ArrayBuffer へ変換する。 */
function toArrayBuffer(buf: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (buf instanceof ArrayBuffer) return buf
  // Bun の WebSocket メッセージは Buffer/Uint8Array になることがある。
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

console.log(`[server] cod-web game server listening on ws://${HOST}:${server.port}`)

export { room, sim }
