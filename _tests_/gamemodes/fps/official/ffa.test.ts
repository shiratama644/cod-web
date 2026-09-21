// @vitest-environment node

import type { FpsCtx, PlayerRef, RoomState } from '@cod/gamemode-api'
import { describe, expect, it, vi } from 'vitest'
import ffaMode from '../../../../gamemodes/fps/official/ffa/index.ts'
import pvpMode from '../../../../gamemodes/fps/official/pvp/index.ts'

function createMockPlayer(id: string): PlayerRef {
  return { id, playerId: Number(id.replace(/\D/g, '')) || 1, name: `Player${id}` }
}

function createMockCtx(overrides: Partial<FpsCtx> = {}): FpsCtx & {
  _state: RoomState
  _scores: Map<string, number>
  _hud: unknown[]
  _broadcast: (string | Uint8Array)[]
  _afterCbs: Array<{ ticks: number; cb: () => void }>
  _spawnPoints: Array<{ x: number; y: number; z: number; yaw: number }>
  tick: number
} {
  let state: RoomState = 'waiting'
  const scores = new Map<string, number>()
  const hud: unknown[] = []
  const broadcast: (string | Uint8Array)[] = []
  const afterCbs: Array<{ ticks: number; cb: () => void }> = []
  const spawnPoints = [
    { x: 0, y: 0, z: 0, yaw: 0 },
    { x: 10, y: 0, z: 10, yaw: 90 },
    { x: -10, y: 0, z: -10, yaw: 180 },
  ]

  const ctx = {
    roomId: 'test-room',
    tick: 0,
    state,
    players: [] as PlayerRef[],
    random: () => 0.5,
    randomInt: (min: number, max: number) => Math.floor(0.5 * (max - min + 1)) + min,
    getPlayer: (id: string) => (ctx.players as PlayerRef[]).find((p) => p.id === id),
    getPlayers: () => ctx.players as readonly PlayerRef[],
    setScore: (id: string, score: number) => scores.set(id, score),
    getScore: (id: string) => scores.get(id) ?? 0,
    setTeamScore: () => {},
    broadcastHud: (data: unknown) => hud.push(data),
    send: () => true,
    broadcast: (data: string | Uint8Array) => broadcast.push(data),
    broadcastExcept: (data: string | Uint8Array) => broadcast.push(data),
    after: (ticks: number, cb: () => void) => {
      afterCbs.push({ ticks, cb })
      return afterCbs.length
    },
    every: (ticks: number, cb: () => void) => {
      afterCbs.push({ ticks, cb })
      return afterCbs.length
    },
    cancel: () => {},
    setState: (s: RoomState) => {
      state = s
      ctx._state = s
      ;(ctx as unknown as { state: RoomState }).state = s
    },
    getState: () => state,
    giveWeapon: vi.fn(),
    setAmmo: vi.fn(),
    getSpawnPoints: () => spawnPoints,
    getZone: () => undefined,
    raycastWorld: () => undefined,
    raycastPlayers: () => undefined,
    // test helpers
    _state: state,
    _scores: scores,
    _hud: hud,
    _broadcast: broadcast,
    _afterCbs: afterCbs,
    _spawnPoints: spawnPoints,
    ...overrides,
  } as unknown as FpsCtx & {
    _state: RoomState
    _scores: Map<string, number>
    _hud: unknown[]
    _broadcast: (string | Uint8Array)[]
    _afterCbs: Array<{ ticks: number; cb: () => void }>
    _spawnPoints: Array<{ x: number; y: number; z: number; yaw: number }>
    tick: number
  }

  return ctx
}

describe('fps-ffa minimal mode', () => {
  it('idがfps-official-ffaでtype fps, source official, slug ffa, map static-arena', () => {
    expect(ffaMode.id).toBe('fps-official-ffa')
    expect(ffaMode.type).toBe('fps')
    expect(ffaMode.source).toBe('official')
    expect(ffaMode.slug).toBe('ffa')
    expect(ffaMode.minPlayers).toBe(2)
    expect(ffaMode.maxPlayers).toBe(16)
    expect((ffaMode.world as { map: string }).map).toBe('static-arena')
  })

  it('pvpはffaのエイリアスで同じid', () => {
    expect(pvpMode.id).toBe('fps-official-ffa')
    expect(pvpMode).toBe(ffaMode) // 同一オブジェクト
  })

  it('onRoomCreateでwaiting状態', () => {
    const ctx = createMockCtx()
    ffaMode.onRoomCreate?.(ctx)
    expect(ctx._state).toBe('waiting')
  })

  it('waiting→countdown→playingのround lifecycle', () => {
    const ctx = createMockCtx()
    ctx.players = [] as unknown as readonly PlayerRef[]
    const p1 = createMockPlayer('p1')
    const p2 = createMockPlayer('p2')

    // 最初waiting
    ffaMode.onRoomCreate?.(ctx)
    expect(ctx._state).toBe('waiting')

    // p1 join: まだ1人なのでwaitingのまま
    ;(ctx as { players: PlayerRef[] }).players = [p1] as unknown as readonly PlayerRef[]
    ffaMode.onPlayerJoin?.(ctx, p1)
    expect(ctx._state).toBe('waiting')

    // p2 join: 2人でcountdownへ
    ;(ctx as { players: PlayerRef[] }).players = [p1, p2] as unknown as readonly PlayerRef[]
    ffaMode.onPlayerJoin?.(ctx, p2)
    expect(ctx._state).toBe('countdown')
    expect(ctx._hud.some((h: unknown) => (h as { type: string }).type === 'countdown')).toBe(true)
    expect(ctx._afterCbs.length).toBeGreaterThan(0)

    // countdownのafterコールバックを実行 -> playingへ
    const countdownCb = ctx._afterCbs[ctx._afterCbs.length - 1].cb
    countdownCb()
    expect(ctx._state).toBe('playing')
    expect(ctx._hud.some((h: unknown) => (h as { type: string }).type === 'roundStart')).toBe(true)
  })

  it('spawn選択でgetSpawnPointsとrandomIntが使われる', () => {
    const getSpawnPoints = vi.fn(() => [
      { x: 0, y: 0, z: 0, yaw: 0 },
      { x: 10, y: 0, z: 10, yaw: 90 },
    ])
    const randomInt = vi.fn(() => 1)
    const ctx = createMockCtx({ getSpawnPoints, randomInt } as Partial<FpsCtx>)
    const player = createMockPlayer('p1')
    ffaMode.onPlayerSpawn?.(ctx, player)
    expect(getSpawnPoints).toHaveBeenCalled()
    expect(randomInt).toHaveBeenCalled()
    expect(ctx.giveWeapon).toHaveBeenCalledWith('p1', 'rifle')
    expect(ctx.setAmmo).toHaveBeenCalledWith('p1', 30)
    expect(ctx._hud.some((h: unknown) => (h as { type: string }).type === 'spawn')).toBe(true)
  })

  it('kill→score加算', () => {
    const ctx = createMockCtx()
    const killer = createMockPlayer('killer')
    const victim = createMockPlayer('victim')
    ctx._scores.set('killer', 0)
    ;(ctx as { players: PlayerRef[] }).players = [killer, victim] as unknown as readonly PlayerRef[]

    ffaMode.onPlayerDeath?.(ctx, victim, killer)
    expect(ctx._scores.get('killer')).toBe(1)
    expect(ctx._hud.some((h: unknown) => (h as { type: string }).type === 'score')).toBe(true)
  })

  it('death→respawn 3s後にafterでリスポーン', () => {
    const ctx = createMockCtx()
    const player = createMockPlayer('p1')
    ;(ctx as { players: PlayerRef[] }).players = [player] as unknown as readonly PlayerRef[]
    // getPlayerがplayerを返すように
    ctx.getPlayer = (id: string) => (id === 'p1' ? player : undefined)
    let state: RoomState = 'playing'
    ctx.getState = () => state
    ctx.setState = (s: RoomState) => {
      state = s
      ctx._state = s
    }

    ffaMode.onPlayerDeath?.(ctx, player, undefined)
    expect(ctx._afterCbs.length).toBe(1)
    expect(ctx._afterCbs[0].ticks).toBe(60 * 3)

    // afterコールバック実行
    const beforeHudCount = ctx._hud.length
    ctx._afterCbs[0].cb()
    // respawnでgiveWeapon/setAmmoが呼ばれる
    expect(ctx.giveWeapon).toHaveBeenCalled()
    expect(ctx._hud.length).toBeGreaterThan(beforeHudCount)
  })

  it('10キルで勝利しendedへ', () => {
    const ctx = createMockCtx()
    const killer = createMockPlayer('killer')
    const victim = createMockPlayer('victim')
    ctx._scores.set('killer', 9)
    ;(ctx as { players: PlayerRef[] }).players = [killer, victim] as unknown as readonly PlayerRef[]
    ;(ctx as unknown as { _state: RoomState })._state = 'playing'
    // setStateがstateを更新するように
    let state: RoomState = 'playing'
    ctx.getState = () => state
    ctx.setState = (s: RoomState) => {
      state = s
      ctx._state = s
    }

    ffaMode.onPlayerDeath?.(ctx, victim, killer)
    expect(ctx._scores.get('killer')).toBe(10)
    expect(state).toBe('ended')
    expect(ctx._hud.some((h: unknown) => (h as { type: string }).type === 'roundEnd')).toBe(true)
  })

  it('playing中にplayers<2でendedへ', () => {
    const ctx = createMockCtx()
    let state: RoomState = 'playing'
    ctx.getState = () => state
    ctx.setState = (s: RoomState) => {
      state = s
      ctx._state = s
    }
    ctx.players = [createMockPlayer('p1')] as unknown as readonly PlayerRef[]
    const leaving = createMockPlayer('p2')

    ffaMode.onPlayerLeave?.(ctx, leaving)
    expect(state).toBe('ended')
  })

  it('onNetworkMessageでchat 200文字制限', () => {
    const ctx = createMockCtx()
    const player = createMockPlayer('p1')
    const longText = 'a'.repeat(300)
    const msg = JSON.stringify({ type: 'chat', text: longText })
    ffaMode.onNetworkMessage?.(ctx, player, msg)
    expect(ctx._broadcast.length).toBe(1)
    const broadcasted = JSON.parse(ctx._broadcast[0] as string)
    expect(broadcasted.text.length).toBe(200)
  })

  it('static-arenaマップを再利用', () => {
    expect((ffaMode.world as { map: string }).map).toBe('static-arena')
  })
})
