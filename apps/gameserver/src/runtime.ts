import { InputRateLimiter } from '@cod/engine-core/net/rate-limit'
import { SnapshotBroadcaster } from '@cod/engine-core/net/snapshot'
import { Room } from '@cod/engine-core/room/Room'
import { Simulation } from '@cod/engine-core/sim/Simulation'
import { createFpsSimProfile, type FpsSimProfile } from '@cod/profile-fps/profile/FpsSimProfile'

export interface GameServerRuntime {
  readonly profile: FpsSimProfile
  readonly room: Room
  readonly world: ReturnType<FpsSimProfile['createWorld']>
  readonly sim: Simulation<ReturnType<FpsSimProfile['createWorld']>>
  readonly snapshots: SnapshotBroadcaster
  readonly inputRate: InputRateLimiter
}

/**
 * gameserver executable が L0+L1+L2 を組み立てる唯一の入口。
 *
 * engine-core は profile-fps を import せず、apps/gameserver だけが fps profile を選ぶ。
 */
export function createDefaultServerRuntime(): GameServerRuntime {
  const profile = createFpsSimProfile()
  const room = new Room({ profile })
  const world = profile.createWorld()
  const sim = new Simulation(room, world, profile)
  const snapshots = new SnapshotBroadcaster({ profile })
  const inputRate = new InputRateLimiter()
  return { profile, room, world, sim, snapshots, inputRate }
}
