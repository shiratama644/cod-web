// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { TYPE_SPECS } from '@cod/protocol/protocol/type-specs'
import {
  type SimProfile,
  type SnapshotWriteArgs,
  profileSnapshotEveryTicks,
  profileStepSeconds,
} from '@cod/engine-core/profile/SimProfile'

interface MockWorld {
  gravity: number
}

interface MockPlayerState {
  id: number
  y: number
  vy: number
  lastInputSeq: number
}

interface MockInput {
  seq: number
  jump: boolean
  dtMs: number
}

function createMockProfile(): SimProfile<MockWorld, MockPlayerState, MockInput> {
  return {
    typeSpec: TYPE_SPECS.fps,
    createWorld: () => ({ gravity: -10 }),
    createPlayerState: (playerId) => ({ id: playerId, y: 1, vy: 0, lastInputSeq: 0 }),
    createIdleInput: (player, dtMs) => ({ seq: player.lastInputSeq, jump: false, dtMs }),
    stepPlayer(player, input, dtSec, world) {
      if (input.jump) player.vy = 5
      player.vy += world.gravity * dtSec
      player.y += player.vy * dtSec
      if (input.seq > player.lastInputSeq) player.lastInputSeq = input.seq
      return player
    },
    writeSnapshot(args: SnapshotWriteArgs<MockPlayerState>) {
      args.view.setUint8(0, args.players.length)
      args.view.setUint32(1, args.serverTick, true)
      args.view.setUint32(5, args.lastAckSeq, true)
      return 9
    },
  }
}

describe('SimProfile contract', () => {
  it('lets engine-core depend on injected behavior instead of a concrete profile package', () => {
    const profile = createMockProfile()
    const world = profile.createWorld()
    const player = profile.createPlayerState(7)
    const dtSec = profileStepSeconds(profile)

    profile.stepPlayer(player, { seq: 1, jump: true, dtMs: Math.round(dtSec * 1000) }, dtSec, world)
    profile.stepPlayer(player, profile.createIdleInput(player, Math.round(dtSec * 1000)), dtSec, world)

    expect(player.id).toBe(7)
    expect(player.lastInputSeq).toBe(1)
    expect(player.y).toBeGreaterThan(1)
    expect(profileSnapshotEveryTicks(profile)).toBe(2)
  })

  it('defines snapshot writing as a profile boundary', () => {
    const profile = createMockProfile()
    const view = new DataView(new ArrayBuffer(16))
    const bytes = profile.writeSnapshot({
      view,
      serverTick: 123,
      lastAckSeq: 9,
      players: [profile.createPlayerState(1), profile.createPlayerState(2)],
    })

    expect(bytes).toBe(9)
    expect(view.getUint8(0)).toBe(2)
    expect(view.getUint32(1, true)).toBe(123)
    expect(view.getUint32(5, true)).toBe(9)
  })
})
