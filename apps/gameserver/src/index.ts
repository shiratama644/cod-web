/**
 * 権威ゲームサーバー（bun・ヘッドレス）。
 *
 * Phase 3-D: profile + gamemode 注入 (fps-ffa) + 例外安全
 *   - 接続時にプレイヤーを Room に参加させ playerId を払い出す。
 *   - 固定シミュレーション（アキュムレータ）で profile の `stepPlayer` を権威実行。
 *   - 入力パケット（バイナリ・60Hz）を受信してシムへ渡す。
 *   - スナップショット送信は SnapshotBroadcaster が Channel.Unreliable で行う。
 *   - gamemode hooks (onTick, onPlayerJoin/Leave, onNetworkMessage) を例外安全に実行。
 *
 * レンダラー（Babylon/WebGL）/ React / DOM は一切使わない。衝突・移動は
 * profile-fps の純粋ロジック（three core/math + three-mesh-bvh、CPU のみ）を使う。
 */

import { createHandlersFromRuntime, type SocketData } from './handlers'
import { createDefaultServerRuntime } from './runtime'

const PORT = Number(process.env.PORT ?? 8080)
const HOST = '0.0.0.0'

const runtime = createDefaultServerRuntime()
const { profile, room, sim, snapshots, gameModeRuntime } = runtime

const handlers = createHandlersFromRuntime(runtime)

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
        console.log(
          `[server] player joined: id=${id} (room=${room.playerCount}) state=${runtime.getRoomState()}`,
        )
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
        console.log(
          `[server] player left: id=${id} (room=${room.playerCount}) state=${runtime.getRoomState()}`,
        )
      }
    },
  },
})

// ── profile の simHz に基づく固定シミュレーションループ ──
// Simulation がアキュムレータで固定ステップに分解し、ステップを進める。
// 各シム tick でスナップショット送信を試み、broadcaster が profile の snapshotHz
// に基づいてブロードキャストする。
// PH3-D: gamemode timer + onTick も tick 基準で実行 (例外安全)
setInterval(() => {
  const before = sim.currentTick()
  const steps = sim.update(performance.now())
  const after = sim.currentTick()

  // この回で進んだ各 tick について送信判定 + gamemode tick
  for (let t = before + 1; t <= after; t++) {
    snapshots.maybeSend(room, t)
    try {
      const ctx = runtime.createFpsCtx()
      const dtMs = 1000 / profile.typeSpec.simHz
      gameModeRuntime.tickWithCtx(ctx as unknown as import('@cod/gamemode-api').RoomCtx, dtMs, t)
    } catch {
      // 例外は握りつぶす、roomは落ちない
    }
  }

  if (steps === 0) {
    try {
      const ctx = runtime.createFpsCtx()
      const dtMs = 1000 / profile.typeSpec.simHz
      gameModeRuntime.tickWithCtx(
        ctx as unknown as import('@cod/gamemode-api').RoomCtx,
        dtMs,
        after,
      )
    } catch {
      // ignore
    }
  }
}, 1000 / profile.typeSpec.simHz)

console.log(
  `[server] cod-web game server listening on ws://${HOST}:${server.port} mode=${profile.typeSpec.type} gamemode=fps-official-ffa`,
)

export { room, runtime, sim }
