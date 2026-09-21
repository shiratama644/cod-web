/**
 * ゲームサーバーの WebSocket ハンドラ（テスト可能に分離）。
 *
 * Bun.serve の副作用を index.ts に残し、純粋なハンドラロジックをここで
 * export して unit test から呼べるようにする。
 */

import { ingestInput } from '@cod/engine-core/net/ingest'
import { ProtocolError } from '@cod/protocol/protocol/binary'
import type { Room, Peer } from '@cod/engine-core/room/Room'
import type { Simulation } from '@cod/engine-core/sim/Simulation'
import type { SnapshotBroadcaster } from '@cod/engine-core/net/snapshot'
import type { InputRateLimiter } from '@cod/engine-core/net/rate-limit'

export interface SocketData {
  playerId: number
}

export interface ServerDeps {
  room: Room
  // biome-ignore lint/suspicious/noExplicitAny: Simulation generic needs any for compatibility across profiles
  sim: Simulation<any>
  snapshots: SnapshotBroadcaster
  inputRate: InputRateLimiter
}

export interface WsLike {
  data: SocketData | null | undefined
  send: (data: string | Uint8Array) => number
  close: (code?: number, reason?: string) => void
}

export function createHandlers(deps: ServerDeps) {
  const { room, sim, snapshots, inputRate } = deps

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
  }

  function message(ws: WsLike, msg: string | ArrayBuffer | Uint8Array): void {
    try {
      if (typeof msg === 'string') {
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
      inputRate.remove(id)
      sim.removePlayer(id)
      snapshots.removePlayer(id)
      room.leave(id)
    }
  }

  function fetchHandler(req: Request, server: { upgrade: (req: Request, opts: { data: SocketData }) => boolean }): Response | undefined {
    if (server.upgrade(req, { data: { playerId: -1 } })) {
      return
    }
    return new Response('cod-web game server (bun) — connect via WebSocket', {
      status: 200,
    })
  }

  return { open, message, drain, close, fetch: fetchHandler }
}
