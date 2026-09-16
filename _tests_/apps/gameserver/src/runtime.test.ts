// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { Channel } from '@cod/protocol/protocol/constants'
import { decodeFrame } from '@cod/protocol/protocol/framing'
import { decodeSnapshot } from '@cod/protocol/protocol/packer'
import type { Peer } from '@cod/engine-core/room/Room'
import { createDefaultServerRuntime } from '../../../../apps/gameserver/src/runtime'

interface TestPeer extends Peer {
  binary: Uint8Array[]
  text: string[]
}

function makePeer(): TestPeer {
  return {
    playerId: -1,
    binary: [],
    text: [],
    sendText(data) {
      this.text.push(data)
    },
    sendBinary(data) {
      const src =
        data instanceof Uint8Array ? data : new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      this.binary.push(Uint8Array.from(src))
      return data.byteLength
    },
  }
}

describe('gameserver runtime assembly', () => {
  it('assembles Room / Simulation / SnapshotBroadcaster from createFpsSimProfile', () => {
    const runtime = createDefaultServerRuntime()
    expect(runtime.profile.typeSpec.type).toBe('fps')
    expect(runtime.room.maxPlayers).toBe(runtime.profile.typeSpec.maxPlayers)

    const peer = makePeer()
    const id = runtime.room.join(peer) as number
    expect(id).toBe(1)
    expect(runtime.room.getPlayer(id)).toMatchObject({ id, x: 0, y: 5, z: 0 })

    runtime.sim.step()
    expect(runtime.sim.currentTick()).toBe(1)
    expect(runtime.room.getPlayer(id)?.y).toBeLessThan(5)

    expect(runtime.snapshots.maybeSend(runtime.room, 1)).toBeGreaterThan(0)
    const packet = peer.binary[0]
    if (!packet) throw new Error('no snapshot')
    const frame = decodeFrame(new DataView(packet.buffer, packet.byteOffset, packet.byteLength))
    expect(frame.channel).toBe(Channel.Unreliable)
    const snapshot = decodeSnapshot(frame.payload, frame.payload.byteLength)
    expect(snapshot.players[0]?.id).toBe(id)
  })
})
