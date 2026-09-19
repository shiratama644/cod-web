// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { SIM_DT } from '@cod/protocol/protocol/constants'
import type { PlayerInput } from '@cod/protocol/protocol/messages'
import { createPlaneWorld } from '@cod/profile-fps/sim/collisionWorld'
import { stepPlayer } from '@cod/profile-fps/sim/movement'
import { createFpsSimProfile } from '@cod/profile-fps/profile/FpsSimProfile'
import { createPlayerState } from '@cod/protocol/types'

/**
 * Deterministic RNG (xoshiro128** simplified as LCG for test).
 * Not used in SimProfile.step, only in test to generate input sequences.
 */
function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function randomInput(rng: () => number, seq: number): PlayerInput {
  // moveX/Z in -1..1, yaw in -PI..PI, occasional jump
  const moveX = rng() * 2 - 1
  const moveZ = rng() * 2 - 1
  const yaw = (rng() * 2 - 1) * Math.PI
  const pitch = (rng() * 2 - 1) * 0.5
  const flags = rng() < 0.1 ? 1 : 0 // 10% jump
  return {
    seq,
    moveX,
    moveZ,
    yaw,
    pitch,
    flags,
    dtMs: Math.round(SIM_DT * 1000),
  }
}

function cloneState(s: ReturnType<typeof createPlayerState>) {
  return { ...s }
}

describe('FpsSimProfile determinism - lightweight smoke (PH2-E)', () => {
  it('same initial state + same input stream => same final state (100 ticks x 10 scenarios)', () => {
    const scenarios = 10
    const ticks = 100

    for (let sc = 0; sc < scenarios; sc++) {
      const seed = 12345 + sc * 1000
      const rng = makeRng(seed)

      const profileA = createFpsSimProfile({ createWorld: () => createPlaneWorld() })
      const profileB = createFpsSimProfile({ createWorld: () => createPlaneWorld() })
      const worldA = profileA.createWorld()
      const worldB = profileB.createWorld()

      const a = profileA.createPlayerState(1)
      const b = profileB.createPlayerState(1)

      // Same spawn
      a.x = 0
      a.y = 5
      a.z = 0
      b.x = 0
      b.y = 5
      b.z = 0

      for (let t = 0; t < ticks; t++) {
        const inp = randomInput(rng, t + 1)
        // Use same input for both, but need deterministic RNG reset? Use same inp
        // Clone input for B to avoid mutation side effects
        const inpB = { ...inp }
        profileA.stepPlayer(a, inp, SIM_DT, worldA)
        profileB.stepPlayer(b, inpB, SIM_DT, worldB)
      }

      expect(b.x).toBeCloseTo(a.x, 10)
      expect(b.y).toBeCloseTo(a.y, 10)
      expect(b.z).toBeCloseTo(a.z, 10)
      expect(b.vx).toBeCloseTo(a.vx, 10)
      expect(b.vy).toBeCloseTo(a.vy, 10)
      expect(b.vz).toBeCloseTo(a.vz, 10)
      expect(b.yaw).toBeCloseTo(a.yaw, 10)
    }
  })

  it('stepPlayer is pure: same state snapshot => same result (direct)', () => {
    const world = createPlaneWorld()
    const s1 = createPlayerState(1, 0, 5, 0)
    const s2 = cloneState(s1)
    const inp: PlayerInput = {
      seq: 1,
      moveX: 0.5,
      moveZ: -0.7,
      yaw: 0.3,
      pitch: 0.1,
      flags: 0,
      dtMs: Math.round(SIM_DT * 1000),
    }
    stepPlayer(s1, inp, SIM_DT, world)
    stepPlayer(s2, { ...inp }, SIM_DT, world)
    expect(s2).toEqual(s1)
  })
})

describe('FpsSimProfile determinism - profile factory isolation', () => {
  it('different profile instances with same world factory produce same results', () => {
    const factory = () => createPlaneWorld()
    const p1 = createFpsSimProfile({ createWorld: factory })
    const p2 = createFpsSimProfile({ createWorld: factory })
    const w1 = p1.createWorld()
    const w2 = p2.createWorld()
    const a = p1.createPlayerState(1)
    const b = p2.createPlayerState(1)
    const inp: PlayerInput = {
      seq: 1,
      moveX: 1,
      moveZ: 0,
      yaw: 0,
      pitch: 0,
      flags: 0,
      dtMs: Math.round(SIM_DT * 1000),
    }
    p1.stepPlayer(a, inp, SIM_DT, w1)
    p2.stepPlayer(b, { ...inp }, SIM_DT, w2)
    expect(b.x).toBeCloseTo(a.x, 10)
    expect(b.z).toBeCloseTo(a.z, 10)
  })
})
