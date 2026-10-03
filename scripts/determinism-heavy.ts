/**
 * Heavy determinism check: 1000 ticks x 100 scenarios.
 * Lightweight smoke (100x10) lives in unit tests; this script is for local/CI heavy verification.
 *
 * Usage: bun run scripts/determinism-heavy.ts
 * Exit 0 = pass, Exit 1 = fail
 */

import { SIM_DT } from '../packages/protocol/src/protocol/constants.ts'
import type { PlayerInput } from '../packages/protocol/src/protocol/messages.ts'
import { createPlaneWorld } from '../packages/profile-fps/src/sim/collisionWorld.ts'
import { createFpsSimProfile } from '../packages/profile-fps/src/profile/FpsSimProfile.ts'

function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

function randomInput(rng: () => number, seq: number): PlayerInput {
  const moveX = rng() * 2 - 1
  const moveZ = rng() * 2 - 1
  const yaw = (rng() * 2 - 1) * Math.PI
  const pitch = (rng() * 2 - 1) * 0.5
  const flags = rng() < 0.1 ? 1 : 0
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

const SCENARIOS = 100
const TICKS = 1000
const TOLERANCE = 1e-10

let failed = 0

console.log(`🔍 Heavy determinism: ${SCENARIOS} scenarios x ${TICKS} ticks`)

for (let sc = 0; sc < SCENARIOS; sc++) {
  const seed = 12345 + sc * 1000
  const rng = makeRng(seed)

  const profileA = createFpsSimProfile({ createWorld: () => createPlaneWorld() })
  const profileB = createFpsSimProfile({ createWorld: () => createPlaneWorld() })
  const worldA = profileA.createWorld()
  const worldB = profileB.createWorld()

  const a = profileA.createPlayerState(1)
  const b = profileB.createPlayerState(1)

  a.x = 0
  a.y = 5
  a.z = 0
  b.x = 0
  b.y = 5
  b.z = 0

  for (let t = 0; t < TICKS; t++) {
    const inp = randomInput(rng, t + 1)
    const inpB = { ...inp }
    profileA.stepPlayer(a, inp, SIM_DT, worldA)
    profileB.stepPlayer(b, inpB, SIM_DT, worldB)
  }

  const dx = Math.abs(a.x - b.x)
  const dy = Math.abs(a.y - b.y)
  const dz = Math.abs(a.z - b.z)
  const dvx = Math.abs(a.vx - b.vx)
  const dvy = Math.abs(a.vy - b.vy)
  const dvz = Math.abs(a.vz - b.vz)
  const dyaw = Math.abs(a.yaw - b.yaw)

  const ok =
    dx < TOLERANCE &&
    dy < TOLERANCE &&
    dz < TOLERANCE &&
    dvx < TOLERANCE &&
    dvy < TOLERANCE &&
    dvz < TOLERANCE &&
    dyaw < TOLERANCE

  if (!ok) {
    console.error(
      `❌ Scenario ${sc} (seed ${seed}) mismatch: dx=${dx} dy=${dy} dz=${dz} dvx=${dvx} dvy=${dvy} dvz=${dvz} dyaw=${dyaw}`,
    )
    console.error(`   A: x=${a.x} y=${a.y} z=${a.z} vx=${a.vx} vy=${a.vy} vz=${a.vz} yaw=${a.yaw}`)
    console.error(`   B: x=${b.x} y=${b.y} z=${b.z} vx=${b.vx} vy=${b.vy} vz=${b.vz} yaw=${b.yaw}`)
    failed++
    break
  }

  if ((sc + 1) % 10 === 0) {
    console.log(`  ${sc + 1}/${SCENARIOS} scenarios passed`)
  }
}

if (failed === 0) {
  console.log(`✅ Heavy determinism passed: ${SCENARIOS} scenarios x ${TICKS} ticks identical within ${TOLERANCE}`)
  process.exit(0)
} else {
  console.error(`❌ Heavy determinism failed: ${failed} scenarios mismatched`)
  process.exit(1)
}
