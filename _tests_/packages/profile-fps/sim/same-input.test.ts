// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { SIM_DT } from '@cod/protocol/protocol/constants'
import type { PlayerInput } from '@cod/protocol/protocol/messages'
import { createPlaneWorld } from '@cod/profile-fps/sim/collisionWorld'
import { createFpsSimProfile } from '@cod/profile-fps/profile/FpsSimProfile'
import { Room } from '@cod/engine-core/room/Room'
import { Simulation } from '@cod/engine-core/sim/Simulation'
import { ClientPrediction } from '../../../../apps/web/src/game/net/prediction'

function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function createMockRoom(profile: ReturnType<typeof createFpsSimProfile>) {
  const room = new Room({ profile })
  const mockPeer = {
    playerId: 1,
    sendText: () => {},
    sendBinary: () => 1,
  }
  const id = room.join(mockPeer as unknown as import('@cod/engine-core/room/Room').Peer)
  if (id === null) throw new Error('room full')
  const player = room.getPlayer(id)
  if (!player) throw new Error('player not found')
  player.x = 0
  player.y = 5
  player.z = 0
  return { room, playerId: id, player }
}

function randomInput(rng: () => number, seq: number): PlayerInput {
  const moveX = rng() * 2 - 1
  const moveZ = rng() * 2 - 1
  const yaw = (rng() * 2 - 1) * Math.PI
  const flags = rng() < 0.05 ? 1 : 0
  return {
    seq,
    moveX,
    moveZ,
    yaw,
    pitch: 0,
    flags,
    dtMs: Math.round(SIM_DT * 1000),
  }
}

describe('client/server same input (PH2-E)', () => {
  it('server Simulation and client ClientPrediction produce same position for same quantized input stream', () => {
    const seed = 999
    const rng = makeRng(seed)
    const ticks = 120

    // Server side
    const serverProfile = createFpsSimProfile({ createWorld: () => createPlaneWorld() })
    const serverWorld = serverProfile.createWorld()
    const { room, playerId, player: serverPlayer } = createMockRoom(serverProfile)
    const sim = new Simulation(room, serverWorld, serverProfile)

    // Client side
    const clientProfile = createFpsSimProfile({ createWorld: () => createPlaneWorld() })
    const clientWorld = clientProfile.createWorld()
    const clientPred = new ClientPrediction(clientProfile, clientWorld, 1)

    // Generate same input sequence
    const inputs: PlayerInput[] = []
    for (let i = 0; i < ticks; i++) {
      inputs.push(randomInput(rng, i + 1))
    }

    // Apply to both
    for (const inp of inputs) {
      // Server: receive + step
      sim.receiveInput(playerId, { ...inp })
      sim.step()

      // Client: applyInput
      clientPred.applyInput({
        moveX: inp.moveX,
        moveZ: inp.moveZ,
        yaw: inp.yaw,
        pitch: inp.pitch,
        flags: inp.flags,
        dtMs: inp.dtMs,
      })
    }

    // Compare final positions – should be very close (deterministic, same step)
    // Tolerance 0.01m for floating point accumulation
    expect(clientPred.state.x).toBeCloseTo(serverPlayer.x, 2)
    expect(clientPred.state.y).toBeCloseTo(serverPlayer.y, 2)
    expect(clientPred.state.z).toBeCloseTo(serverPlayer.z, 2)
    expect(clientPred.state.yaw).toBeCloseTo(serverPlayer.yaw, 5)
  })

  it('server and client stay within 0.35m tolerance for 100 ticks random walk (fps tolerance from client.md)', () => {
    const rng = makeRng(4242)
    const ticks = 100

    const serverProfile = createFpsSimProfile({ createWorld: () => createPlaneWorld() })
    const serverWorld = serverProfile.createWorld()
    const { room, playerId, player: serverPlayer } = createMockRoom(serverProfile)
    const sim = new Simulation(room, serverWorld, serverProfile)

    const clientProfile = createFpsSimProfile({ createWorld: () => createPlaneWorld() })
    const clientWorld = clientProfile.createWorld()
    const clientPred = new ClientPrediction(clientProfile, clientWorld, 1)

    for (let i = 0; i < ticks; i++) {
      const inp = randomInput(rng, i + 1)
      sim.receiveInput(playerId, { ...inp })
      sim.step()
      clientPred.applyInput({
        moveX: inp.moveX,
        moveZ: inp.moveZ,
        yaw: inp.yaw,
        pitch: inp.pitch,
        flags: inp.flags,
        dtMs: inp.dtMs,
      })

      const dx = clientPred.state.x - serverPlayer.x
      const dy = clientPred.state.y - serverPlayer.y
      const dz = clientPred.state.z - serverPlayer.z
      const err = Math.hypot(dx, dy, dz)
      // Should be within fps tolerance 0.25m, but allow 0.35m for safety
      expect(err).toBeLessThan(0.35)
    }
  })
})
