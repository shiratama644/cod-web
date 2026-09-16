// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { SNAPSHOT_PLAYER_BYTES, snapshotPayloadBytes } from '@cod/protocol/protocol/constants'
import { INPUT_FLAG_JUMP, type Snapshot } from '@cod/protocol/protocol/messages'
import { decodeSnapshot, encodeSnapshot } from '@cod/protocol/protocol/packer'
import { TYPE_SPECS } from '@cod/protocol/protocol/type-specs'
import {
  createFpsSimProfile,
  fpsSnapshotPayloadBytes,
  writeFpsSnapshot,
} from '@cod/profile-fps/profile/FpsSimProfile'
import type { PlayerState } from '@cod/protocol/types'

function view(byteLength = 256): DataView {
  return new DataView(new ArrayBuffer(byteLength))
}

function decode(view: DataView, byteLength: number): Snapshot {
  return decodeSnapshot(view, byteLength)
}

function player(partial: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 1,
    x: 1.25,
    y: 2.5,
    z: -3.75,
    vx: 4,
    vy: -5,
    vz: 6,
    yaw: Math.PI / 4,
    pitch: 0.2,
    grounded: true,
    lastInputSeq: 10,
    ...partial,
  }
}

describe('FpsSimProfile', () => {
  it('bundles fps world, player spawn, idle input, and step through the SimProfile contract', () => {
    const profile = createFpsSimProfile()
    expect(profile.typeSpec).toBe(TYPE_SPECS.fps)

    const world = profile.createWorld()
    expect(world.sampleFloor(0, 0, 5, 10)).toBeCloseTo(0, 5)

    const spawned = profile.createPlayerState(7)
    expect(spawned).toMatchObject({ id: 7, x: 0, y: 5, z: 0, lastInputSeq: 0 })

    const idle = profile.createIdleInput({ ...spawned, yaw: 1.2, pitch: -0.3, lastInputSeq: 42 }, 17)
    expect(idle).toEqual({
      seq: 42,
      moveX: 0,
      moveZ: 0,
      yaw: 1.2,
      pitch: -0.3,
      flags: 0,
      dtMs: 17,
    })

    const beforeY = spawned.y
    profile.stepPlayer(spawned, { ...idle, seq: 43, flags: INPUT_FLAG_JUMP }, 1 / 60, world)
    expect(spawned.lastInputSeq).toBe(43)
    expect(spawned.y).toBeLessThan(beforeY)
  })

  it('lets tests inject a lightweight world factory without changing the profile contract', () => {
    const fakeWorld = {
      sampleFloor: () => null,
      castWall: () => null,
    }
    const profile = createFpsSimProfile({ createWorld: () => fakeWorld })
    expect(profile.createWorld()).toBe(fakeWorld)
  })

  it('writes the current fps snapshot payload layout and includes vy', () => {
    const profile = createFpsSimProfile()
    const players = [player(), player({ id: 2, y: 9, vy: 1.5, lastInputSeq: 20 })]
    const output = view()

    const bytes = profile.writeSnapshot({
      view: output,
      serverTick: 123,
      lastAckSeq: players[1]?.lastInputSeq ?? 0,
      players,
    })
    const snapshot = decode(output, bytes)

    expect(bytes).toBe(snapshotPayloadBytes(players.length))
    expect(bytes).toBe(fpsSnapshotPayloadBytes(players.length))
    expect(bytes).toBe(1 + 4 + 4 + players.length * SNAPSHOT_PLAYER_BYTES)
    expect(snapshot.serverTick).toBe(123)
    expect(snapshot.lastAckSeq).toBe(20)
    expect(snapshot.players).toHaveLength(2)
    expect(snapshot.players[1]?.vy).toBeCloseTo(1.5, 5)
  })

  it('matches the existing protocol encoder byte-for-byte', () => {
    const players = [player(), player({ id: 2, x: -8.5, vy: 0.33, yaw: Math.PI })]
    const snapshot = {
      serverTick: 77,
      lastAckSeq: 11,
      players: players.map(({ id, x, y, z, vx, vy, vz, yaw }) => ({ id, x, y, z, vx, vy, vz, yaw })),
    }
    const expected = view()
    const actual = view()

    const expectedBytes = encodeSnapshot(expected, snapshot)
    const actualBytes = writeFpsSnapshot({
      view: actual,
      serverTick: snapshot.serverTick,
      lastAckSeq: snapshot.lastAckSeq,
      players,
    })

    expect(actualBytes).toBe(expectedBytes)
    expect(new Uint8Array(actual.buffer, 0, actualBytes)).toEqual(
      new Uint8Array(expected.buffer, 0, expectedBytes),
    )
  })
})
