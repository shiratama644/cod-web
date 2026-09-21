/**
 * ゲームサーバーの WebSocket ハンドラ（テスト可能に分離）。
 *
 * Bun.serve の副作用を index.ts に残し、純粋なハンドラロジックをここで
 * export して unit test から呼べるようにする。
 * PH3-D: gamemode 統合 (profile + ffa) + 例外安全
 */

import type { GameModeRuntime } from '@cod/engine-core/gamemode/GameModeRuntime'
import { ingestInput } from '@cod/engine-core/net/ingest'
import type { InputRateLimiter } from '@cod/engine-core/net/rate-limit'
import type { SnapshotBroadcaster } from '@cod/engine-core/net/snapshot'
import type { Peer, Room } from '@cod/engine-core/room/Room'
import type { Simulation } from '@cod/engine-core/sim/Simulation'
import type { FpsCtx, PlayerRef } from '@cod/gamemode-api'
import { ProtocolError } from '@cod/protocol/protocol/binary'
import type { GameServerRuntime } from './runtime'

export interface SocketData {
  playerId: number
}

export interface ServerDeps {
  room: Room
  // biome-ignore lint/suspicious/noExplicitAny: Simulation generic needs any for compatibility across profiles
  sim: Simulation<any>
  snapshots: SnapshotBroadcaster
  inputRate: InputRateLimiter
  /** PH3-D: gamemode runtime (optional for backward compat with old tests) */
  gameModeRuntime?: GameModeRuntime
  /** PH3-D: ctx factory */
  createFpsCtx?: () => FpsCtx
  /** PH3-D: playerRefs map (for ctx) */
  _playerRefs?: Map<number, PlayerRef>
}

export interface WsLike {
  data: SocketData | null | undefined
  send: (data: string | Uint8Array) => number
  close: (code?: number, reason?: string) => void
}

export function createHandlers(deps: ServerDeps) {
  const { room, sim, snapshots, inputRate, gameModeRuntime, createFpsCtx, _playerRefs } = deps

  function open(ws: WsLike): void {
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

    // PH3-D: PlayerRef登録 + onPlayerJoin
    if (_playerRefs) {
      const ref: PlayerRef = {
        id: String(id),
        playerId: id,
        name: `Player${id}`,
      }
      _playerRefs.set(id, ref)

      if (gameModeRuntime && createFpsCtx) {
        try {
          const ctx = createFpsCtx()
          void gameModeRuntime.onPlayerJoin(
            ref,
            ctx as unknown as import('@cod/gamemode-api').RoomCtx,
          )
        } catch {
          // ignore, roomは落ちない
        }
      }
    }
  }

  function message(ws: WsLike, msg: string | ArrayBuffer | Uint8Array): void {
    try {
      if (typeof msg === 'string') {
        // PH3-D: 文字列は制御JSONまたはgamemode message (chat)
        if (gameModeRuntime && createFpsCtx && _playerRefs) {
          const playerId = ws.data?.playerId
          if (playerId != null && playerId > 0) {
            const ref = _playerRefs.get(playerId)
            if (ref) {
              try {
                const ctx = createFpsCtx()
                void gameModeRuntime.safeCall(
                  'onNetworkMessage',
                  ctx as unknown as import('@cod/gamemode-api').RoomCtx,
                  ref,
                  msg,
                )
              } catch {
                // ignore
              }
            }
          }
        }
        return
      }
      const input = ingestInput(msg as ArrayBuffer | Uint8Array)
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
  }

  function drain(ws: WsLike): void {
    const id = ws.data?.playerId
    if (id != null && id > 0) snapshots.markWritable(id)
  }

  function close(ws: WsLike): void {
    const id = ws.data?.playerId
    if (id != null && id > 0) {
      // PH3-D: onPlayerLeave (room.leave前に呼ぶことでplayersに含まれる状態で呼べる)
      if (gameModeRuntime && createFpsCtx && _playerRefs) {
        const ref = _playerRefs.get(id)
        if (ref) {
          try {
            const ctx = createFpsCtx()
            void gameModeRuntime.onPlayerLeave(
              ref,
              ctx as unknown as import('@cod/gamemode-api').RoomCtx,
            )
          } catch {
            // ignore
          }
          _playerRefs.delete(id)
        }
      }

      inputRate.remove(id)
      sim.removePlayer(id)
      snapshots.removePlayer(id)
      room.leave(id)
    }
  }

  function fetchHandler(
    req: Request,
    server: { upgrade: (req: Request, opts: { data: SocketData }) => boolean },
  ): Response | undefined {
    if (server.upgrade(req, { data: { playerId: -1 } })) {
      return
    }
    return new Response('cod-web game server (bun) — connect via WebSocket', {
      status: 200,
    })
  }

  return { open, message, drain, close, fetch: fetchHandler }
}

/** PH3-D: GameServerRuntime から handlers を生成するヘルパー */
export function createHandlersFromRuntime(runtime: GameServerRuntime) {
  return createHandlers({
    room: runtime.room,
    sim: runtime.sim,
    snapshots: runtime.snapshots,
    inputRate: runtime.inputRate,
    gameModeRuntime: runtime.gameModeRuntime,
    createFpsCtx: runtime.createFpsCtx,
    _playerRefs: runtime._playerRefs,
  })
}
