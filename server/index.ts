/**
 * 権威ゲームサーバー（bun・ヘッドレス）。
 *
 * Phase 1: bun ネイティブ WebSocket（uWS コア）で単一デフォルトルームを運用する。
 *   - 接続時にプレイヤーを Room に参加させ playerId を払い出す。
 *   - 60Hz 固定シミュレーション・30Hz スナップショット送信は P1-D/E で接続する。
 *
 * レンダラー（WebGPU/WebGL）/ React / DOM は一切使わない。衝突・移動は
 * shared の純粋ロジック（three core/math + three-mesh-bvh、CPU のみ）を使う。
 */

import { Room, type Peer } from './room/Room'

const PORT = Number(process.env.PORT ?? 8080)
const HOST = '0.0.0.0'

/** WebSocket の data に乗せる接続ごとの状態。 */
interface SocketData {
  playerId: number
}

const room = new Room()

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
        // 満員
        ws.send(JSON.stringify({ kind: 'full' }))
        ws.close(1013, 'room full')
        return
      }
      peer.playerId = id
      ws.data = { playerId: id }
      // 制御メッセージ（welcome/join/leave）は信頼テキスト。後でバイナリ処理を接続する。
      console.log(`[server] player joined: id=${id} (room=${room.playerCount})`)
    },
    message(ws, message) {
      // バイナリ入力（Input Packet）は P1-D で処理する。Phase 1 のこの段階では
      // テキスト制御メッセージのみ想定し、バイナリは無視する。
      if (typeof message === 'string') {
        // 現状、クライアントからのテキスト制御は無し。
        return
      }
      // message: ArrayBuffer | Buffer — P1-D で入力パケットを消費する。
      void message
      void ws
    },
    close(ws) {
      const id = ws.data?.playerId
      if (id != null) {
        room.leave(id)
        console.log(`[server] player left: id=${id} (room=${room.playerCount})`)
      }
    },
  },
})

console.log(`[server] cod-web game server listening on ws://${HOST}:${server.port}`)

export { room }
