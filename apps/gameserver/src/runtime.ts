import { GameModeRuntime } from '@cod/engine-core/gamemode/GameModeRuntime'
import { GameModeTimer } from '@cod/engine-core/gamemode/GameModeTimer'
import { InputRateLimiter, ModeMessageRateLimiter } from '@cod/engine-core/net/rate-limit'
import { SnapshotBroadcaster } from '@cod/engine-core/net/snapshot'
import { Room } from '@cod/engine-core/room/Room'
import { Simulation } from '@cod/engine-core/sim/Simulation'
import type { FpsCtx, PlayerRef, RoomState, Vec3WithYaw } from '@cod/gamemode-api'
import { createLCG } from '@cod/gamemode-api/ctx'
import { createFpsSimProfile, type FpsSimProfile } from '@cod/profile-fps/profile/FpsSimProfile'
import ffaMode from '../../../gamemodes/fps/official/ffa/index.ts'

/** static-arena spawn points (8 points circle, reused from ffa test) */
const STATIC_ARENA_SPAWNS: readonly Vec3WithYaw[] = [
  { x: 0, y: 1, z: 0, yaw: 0 },
  { x: 15, y: 1, z: 0, yaw: 90 },
  { x: -15, y: 1, z: 0, yaw: 270 },
  { x: 0, y: 1, z: 15, yaw: 180 },
  { x: 0, y: 1, z: -15, yaw: 0 },
  { x: 10, y: 1, z: 10, yaw: 135 },
  { x: -10, y: 1, z: -10, yaw: 315 },
  { x: 10, y: 1, z: -10, yaw: 45 },
]

export interface GameServerRuntime {
  readonly profile: FpsSimProfile
  readonly room: Room
  readonly world: ReturnType<FpsSimProfile['createWorld']>
  readonly sim: Simulation<ReturnType<FpsSimProfile['createWorld']>>
  readonly snapshots: SnapshotBroadcaster
  readonly inputRate: InputRateLimiter
  readonly gameModeTimer: GameModeTimer
  readonly gameModeRateLimiter: ModeMessageRateLimiter
  readonly gameModeRuntime: GameModeRuntime
  getRoomState(): RoomState
  setRoomState(s: RoomState): void
  getTick(): number
  getPlayerRef(playerId: number): PlayerRef | undefined
  getPlayerRefs(): readonly PlayerRef[]
  createFpsCtx(): FpsCtx
  getScore(id: string): number
  setScore(id: string, score: number): void
  /** internal maps for handlers (PH3-D) */
  _playerRefs: Map<number, PlayerRef>
  _scores: Map<string, number>
  _weapons: Map<string, string>
  _ammos: Map<string, number>
}

/**
 * gameserver executable が L0+L1+L2+L3 を組み立てる唯一の入口。
 * engine-core は profile-fps / gamemode を import せず、apps/gameserver だけが
 * fps profile + fps-ffa mode を選ぶ。PH3-D 統合。
 */
export function createDefaultServerRuntime(): GameServerRuntime {
  const profile = createFpsSimProfile()
  const room = new Room({ profile })
  const world = profile.createWorld()
  const sim = new Simulation(room, world, profile)
  const snapshots = new SnapshotBroadcaster({ profile })
  const inputRate = new InputRateLimiter()
  const gameModeTimer = new GameModeTimer()
  const gameModeRateLimiter = new ModeMessageRateLimiter()

  let roomState: RoomState = 'waiting'
  const scores = new Map<string, number>()
  const teamScores = new Map<number, number>()
  const playerRefs = new Map<number, PlayerRef>()
  const weapons = new Map<string, string>()
  const ammos = new Map<string, number>()

  const rng = createLCG(0x12345678)
  const random = () => rng()
  const randomInt = (min: number, max: number) => {
    if (min > max) throw new Error('min > max')
    const r = rng()
    return Math.floor(r * (max - min + 1)) + min
  }

  function getPlayerRefs(): readonly PlayerRef[] {
    return [...playerRefs.values()]
  }

  function getPlayerRefByStringId(id: string): PlayerRef | undefined {
    const num = Number(id)
    if (!Number.isNaN(num) && playerRefs.has(num)) {
      return playerRefs.get(num)
    }
    for (const ref of playerRefs.values()) {
      if (ref.id === id) return ref
    }
    return undefined
  }

  function createFpsCtx(): FpsCtx {
    const tick = sim.currentTick()
    const players = getPlayerRefs()
    const ctx: FpsCtx = {
      roomId: 'default',
      tick,
      state: roomState,
      players,
      random,
      randomInt,
      getPlayer: (id: string) => getPlayerRefByStringId(id),
      getPlayers: () => getPlayerRefs(),
      setScore: (playerId: string, score: number) => {
        scores.set(playerId, score)
      },
      getScore: (playerId: string) => scores.get(playerId) ?? 0,
      setTeamScore: (team: number, score: number) => {
        teamScores.set(team, score)
      },
      broadcastHud: (data: unknown) => {
        try {
          const text = JSON.stringify({ kind: 'hud', data })
          room.broadcast(text)
        } catch {}
      },
      send: (playerId: string, data: Uint8Array | string) => {
        try {
          const ref = getPlayerRefByStringId(playerId)
          if (!ref) return false
          if (!gameModeRateLimiter.allow(playerId, Date.now())) return false
          if (typeof data === 'string') {
            return room.sendTo(ref.playerId, data)
          }
          return room.sendBinaryTo(ref.playerId, data)
        } catch {
          return false
        }
      },
      broadcast: (data: Uint8Array | string, exceptId?: string) => {
        try {
          if (typeof data === 'string') {
            if (exceptId) {
              const ref = getPlayerRefByStringId(exceptId)
              if (ref) {
                room.broadcastExcept(ref.playerId, data)
              } else {
                room.broadcast(data)
              }
            } else {
              room.broadcast(data)
            }
          } else {
            const exceptNum = exceptId ? getPlayerRefByStringId(exceptId)?.playerId : undefined
            for (const peer of room.getPeersIterable()) {
              if (exceptNum !== undefined && peer.playerId === exceptNum) continue
              try {
                peer.sendBinary(data as Uint8Array)
              } catch {}
            }
          }
        } catch {}
      },
      broadcastExcept: (data: Uint8Array | string, exceptId: string) => {
        try {
          const ref = getPlayerRefByStringId(exceptId)
          if (typeof data === 'string') {
            if (ref) {
              room.broadcastExcept(ref.playerId, data)
            } else {
              room.broadcast(data)
            }
          } else {
            const exceptNum = ref?.playerId
            for (const peer of room.getPeersIterable()) {
              if (exceptNum !== undefined && peer.playerId === exceptNum) continue
              try {
                peer.sendBinary(data as Uint8Array)
              } catch {}
            }
          }
        } catch {}
      },
      after: (ticks: number, cb: () => void) => gameModeTimer.after(ticks, cb, sim.currentTick()),
      every: (ticks: number, cb: () => void) => gameModeTimer.every(ticks, cb, sim.currentTick()),
      cancel: (id: number) => gameModeTimer.cancel(id),
      setState: (s: RoomState) => {
        roomState = s
      },
      getState: () => roomState,
      giveWeapon: (playerId: string, weaponId: string) => {
        weapons.set(playerId, weaponId)
      },
      setAmmo: (playerId: string, ammo: number) => {
        ammos.set(playerId, ammo)
      },
      getSpawnPoints: () => STATIC_ARENA_SPAWNS,
      getZone: () => undefined,
      raycastWorld: () => undefined,
      raycastPlayers: () => undefined,
    }
    return ctx
  }

  const gameModeRuntime = new GameModeRuntime(
    ffaMode,
    {
      roomId: 'default',
      getTick: () => sim.currentTick(),
      getState: () => roomState,
      setState: (s: RoomState) => {
        roomState = s
      },
      getPlayers: () => getPlayerRefs(),
      getPlayer: (id: string) => getPlayerRefByStringId(id),
      send: (playerId: string, data: Uint8Array | string) => {
        try {
          const ref = getPlayerRefByStringId(playerId)
          if (!ref) return false
          if (!gameModeRateLimiter.allow(playerId, Date.now())) return false
          if (typeof data === 'string') {
            return room.sendTo(ref.playerId, data)
          }
          return room.sendBinaryTo(ref.playerId, data)
        } catch {
          return false
        }
      },
      broadcast: (data: Uint8Array | string) => {
        try {
          if (typeof data === 'string') {
            room.broadcast(data)
          } else {
            for (const peer of room.getPeersIterable()) {
              try {
                peer.sendBinary(data as Uint8Array)
              } catch {}
            }
          }
        } catch {}
      },
      broadcastExcept: (data: Uint8Array | string, exceptId: string) => {
        try {
          const ref = getPlayerRefByStringId(exceptId)
          if (typeof data === 'string') {
            if (ref) {
              room.broadcastExcept(ref.playerId, data)
            } else {
              room.broadcast(data)
            }
          } else {
            const exceptNum = ref?.playerId
            for (const peer of room.getPeersIterable()) {
              if (exceptNum !== undefined && peer.playerId === exceptNum) continue
              try {
                peer.sendBinary(data as Uint8Array)
              } catch {}
            }
          }
        } catch {}
      },
      nowMs: () => Date.now(),
    },
    gameModeTimer,
    gameModeRateLimiter,
  )

  room.setGameModeBinding({ rateLimiter: gameModeRateLimiter })

  const initialCtx = createFpsCtx()
  void gameModeRuntime.onRoomCreate(initialCtx as unknown as import('@cod/gamemode-api').RoomCtx)

  return {
    profile,
    room,
    world,
    sim,
    snapshots,
    inputRate,
    gameModeTimer,
    gameModeRateLimiter,
    gameModeRuntime,
    getRoomState: () => roomState,
    setRoomState: (s: RoomState) => {
      roomState = s
    },
    getTick: () => sim.currentTick(),
    getPlayerRef: (id: number) => playerRefs.get(id),
    getPlayerRefs,
    createFpsCtx,
    getScore: (id: string) => scores.get(id) ?? 0,
    setScore: (id: string, score: number) => {
      scores.set(id, score)
    },
    _playerRefs: playerRefs,
    _scores: scores,
    _weapons: weapons,
    _ammos: ammos,
  }
}
