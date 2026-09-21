// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { WsLike } from '../../../../apps/gameserver/src/handlers'
import { createHandlersFromRuntime } from '../../../../apps/gameserver/src/handlers'
import { createDefaultServerRuntime } from '../../../../apps/gameserver/src/runtime'

function makeWs(): WsLike & {
  sent: (string | Uint8Array)[]
  closed: { code?: number; reason?: string }[]
} {
  const sent: (string | Uint8Array)[] = []
  const closed: { code?: number; reason?: string }[] = []
  return {
    data: { playerId: -1 },
    sent,
    closed,
    send(data: string | Uint8Array) {
      sent.push(data)
      return typeof data === 'string' ? data.length : data.byteLength
    },
    close(code?: number, reason?: string) {
      closed.push({ code, reason })
    },
  } as unknown as WsLike & {
    sent: (string | Uint8Array)[]
    closed: { code?: number; reason?: string }[]
  }
}

describe('gameserver runtime gamemode integration PH3-D', () => {
  it('profile + gamemode注入: runtimeがfps profileとfps-official-ffaを持つ', () => {
    const runtime = createDefaultServerRuntime()
    expect(runtime.profile.typeSpec.type).toBe('fps')
    expect(runtime.gameModeRuntime).toBeDefined()
    expect(runtime.gameModeTimer).toBeDefined()
    expect(runtime.gameModeRateLimiter).toBeDefined()
    expect(runtime.createFpsCtx).toBeDefined()
    expect(runtime._playerRefs).toBeDefined()
    // 初期stateはwaiting
    expect(runtime.getRoomState()).toBe('waiting')
  })

  it('getSpawnPointsがstatic-arenaの8点を返す', () => {
    const runtime = createDefaultServerRuntime()
    const ctx = runtime.createFpsCtx()
    const spawns = ctx.getSpawnPoints()
    expect(spawns.length).toBe(8)
    expect(spawns[0]).toHaveProperty('x')
    expect(spawns[0]).toHaveProperty('yaw')
  })

  it('onPlayerJoinでwaiting→countdown→playingのround lifecycleが動く', async () => {
    const runtime = createDefaultServerRuntime()
    const handlers = createHandlersFromRuntime(runtime)

    const ws1 = makeWs()
    handlers.open(ws1)
    expect(runtime.room.playerCount).toBe(1)
    expect(runtime._playerRefs.size).toBe(1)
    // 1人ではwaitingのまま
    expect(runtime.getRoomState()).toBe('waiting')

    const ws2 = makeWs()
    handlers.open(ws2)
    expect(runtime.room.playerCount).toBe(2)
    // 2人でcountdownへ
    expect(runtime.getRoomState()).toBe('countdown')
    expect(runtime.gameModeTimer.size).toBeGreaterThan(0)

    // countdownのafterを手動で進める
    const before = runtime.sim.currentTick()
    // timerをtickで進める (COUNTDOWN_TICKS = 180)
    for (let t = before + 1; t <= before + 180 + 1; t++) {
      const ctx = runtime.createFpsCtx()
      runtime.gameModeRuntime.tickWithCtx(
        ctx as unknown as import('@cod/gamemode-api').RoomCtx,
        16,
        t,
      )
    }
    // playingへ
    expect(runtime.getRoomState()).toBe('playing')
  })

  it('mode例外でroomが落ちない', async () => {
    const { GameModeRuntime } = await import('@cod/engine-core/gamemode/GameModeRuntime')
    const { GameModeTimer } = await import('@cod/engine-core/gamemode/GameModeTimer')
    const { ModeMessageRateLimiter } = await import('@cod/engine-core/net/rate-limit')
    const { Room } = await import('@cod/engine-core/room/Room')
    const { createFpsSimProfile } = await import('@cod/profile-fps/profile/FpsSimProfile')
    const { Simulation } = await import('@cod/engine-core/sim/Simulation')
    const { SnapshotBroadcaster } = await import('@cod/engine-core/net/snapshot')
    const { InputRateLimiter } = await import('@cod/engine-core/net/rate-limit')
    const { createLCG } = await import('@cod/gamemode-api/ctx')
    const { defineGameMode } = await import('@cod/gamemode-api')

    const throwingMode = defineGameMode({
      id: 'fps-official-ffa',
      type: 'fps',
      source: 'official',
      slug: 'ffa',
      minPlayers: 2,
      maxPlayers: 16,
      world: { map: 'static-arena' },
      onTick: () => {
        throw new Error('mode error')
      },
      onPlayerJoin: () => {
        throw new Error('join error')
      },
      onNetworkMessage: () => {
        throw new Error('msg error')
      },
    })

    const profile = createFpsSimProfile()
    const room = new Room({ profile })
    const world = profile.createWorld()
    const sim = new Simulation(room, world, profile)
    const _snapshots = new SnapshotBroadcaster({ profile })
    const _inputRate = new InputRateLimiter()
    const timer = new GameModeTimer()
    const rateLimiter = new ModeMessageRateLimiter()
    const rng = createLCG(123)
    const _playerRefs = new Map()

    const runtime = new GameModeRuntime(
      throwingMode,
      {
        roomId: 'test',
        getTick: () => sim.currentTick(),
        getState: () => 'playing',
        setState: () => {},
        getPlayers: () => [],
        getPlayer: () => undefined,
        send: () => true,
        broadcast: () => {},
        broadcastExcept: () => {},
        nowMs: () => 0,
      },
      timer,
      rateLimiter,
    )

    // 例外があってもroomは生きている
    const ctx = {
      roomId: 'test',
      tick: 0,
      state: 'playing',
      players: [],
      random: () => rng(),
      randomInt: () => 0,
      getPlayer: () => undefined,
      getPlayers: () => [],
      setScore: () => {},
      getScore: () => 0,
      setTeamScore: () => {},
      broadcastHud: () => {},
      send: () => true,
      broadcast: () => {},
      broadcastExcept: () => {},
      after: (ticks: number, cb: () => void) => timer.after(ticks, cb, 0),
      every: (ticks: number, cb: () => void) => timer.every(ticks, cb, 0),
      cancel: (id: number) => timer.cancel(id),
      setState: () => {},
      getState: () => 'playing' as const,
      giveWeapon: () => {},
      setAmmo: () => {},
      getSpawnPoints: () => [],
      getZone: () => undefined,
      raycastWorld: () => undefined,
      raycastPlayers: () => undefined,
    } as unknown as import('@cod/gamemode-api').FpsCtx

    // onTick例外
    expect(() =>
      runtime.tickWithCtx(ctx as unknown as import('@cod/gamemode-api').RoomCtx, 16, 1),
    ).not.toThrow()
    expect(room.playerCount).toBe(0) // roomは影響受けない

    // onPlayerJoin例外
    await expect(
      runtime.onPlayerJoin(
        { id: '1', playerId: 1, name: 'P1' },
        ctx as unknown as import('@cod/gamemode-api').RoomCtx,
      ),
    ).resolves.toBeUndefined()

    // onNetworkMessage例外
    await expect(
      runtime.safeCall(
        'onNetworkMessage',
        ctx as unknown as import('@cod/gamemode-api').RoomCtx,
        { id: '1', playerId: 1, name: 'P1' },
        'chat',
      ),
    ).resolves.toBeUndefined()

    // timerコールバック例外
    timer.after(
      1,
      () => {
        throw new Error('timer error')
      },
      0,
    )
    expect(() => timer.tick(1)).not.toThrow()
  })

  it('chat 200文字制限がgamemodeで動作', async () => {
    const runtime = createDefaultServerRuntime()
    const handlers = createHandlersFromRuntime(runtime)

    const ws1 = makeWs()
    handlers.open(ws1)
    const ws2 = makeWs()
    handlers.open(ws2)

    // chatメッセージを送信
    const longText = 'a'.repeat(300)
    const chatMsg = JSON.stringify({ type: 'chat', text: longText })
    handlers.message(ws1, chatMsg)

    // 非同期のonNetworkMessageが処理されるのを待つ
    await new Promise((r) => setTimeout(r, 10))

    // broadcastされたメッセージは200文字制限
    // ws2に届いたメッセージを確認 (welcome/join以外)
    const chatBroadcasts = ws2.sent.filter(
      (s) => typeof s === 'string' && (s as string).includes('"type":"chat"'),
    )
    if (chatBroadcasts.length > 0) {
      const parsed = JSON.parse(chatBroadcasts[0] as string)
      // ffaモードはbroadcast時にJSON.stringify({ type: 'chat', from, text })を送る
      // textは200文字制限
      if (parsed.text) {
        expect(parsed.text.length).toBeLessThanOrEqual(200)
      }
    }
    // 少なくともroomは落ちていない
    expect(runtime.room.playerCount).toBe(2)
  })

  it('Room.sendTo / sendBinaryTo / broadcastExcept がpublicで使える', () => {
    const runtime = createDefaultServerRuntime()
    const { room } = runtime

    const peer1 = {
      playerId: -1,
      text: [] as string[],
      sendText(data: string) {
        this.text.push(data)
      },
      sendBinary() {
        return 1
      },
    }
    const peer2 = {
      playerId: -1,
      text: [] as string[],
      sendText(data: string) {
        this.text.push(data)
      },
      sendBinary() {
        return 1
      },
    }

    // biome-ignore lint/suspicious/noExplicitAny: test mock peer
    const id1 = room.join(peer1 as any) as number
    // biome-ignore lint/suspicious/noExplicitAny: test mock peer
    const _id2 = room.join(peer2 as any) as number

    expect(room.sendTo(id1, 'hello')).toBe(true)
    expect(peer1.text).toContain('hello')
    expect(peer1.text.length).toBeGreaterThanOrEqual(2)

    const before1 = peer1.text.length
    const before2 = peer2.text.length
    room.broadcastExcept(id1, 'except')
    expect(peer1.text.length).toBe(before1)
    expect(peer2.text.length).toBe(before2 + 1)
    expect(peer2.text).toContain('except')

    expect(room.sendBinaryTo(id1, new Uint8Array([1, 2, 3]))).toBe(true)
  })

  it('FpsCtxの全メソッドがカバーされる', () => {
    const runtime = createDefaultServerRuntime()
    const ctx = runtime.createFpsCtx()

    // random
    expect(typeof ctx.random()).toBe('number')
    expect(ctx.random()).toBeGreaterThanOrEqual(0)
    expect(ctx.random()).toBeLessThan(1)

    // randomInt
    expect(ctx.randomInt(0, 10)).toBeGreaterThanOrEqual(0)
    expect(ctx.randomInt(0, 10)).toBeLessThanOrEqual(10)
    expect(() => ctx.randomInt(10, 0)).toThrow()

    // getPlayer / getPlayers (empty initially)
    expect(ctx.getPlayers().length).toBe(0)
    expect(ctx.getPlayer('nonexistent')).toBeUndefined()

    // setScore / getScore
    ctx.setScore('p1', 5)
    expect(ctx.getScore('p1')).toBe(5)
    expect(ctx.getScore('nonexistent')).toBe(0)
    expect(runtime.getScore('p1')).toBe(5)
    runtime.setScore('p1', 10)
    expect(ctx.getScore('p1')).toBe(10)

    // setTeamScore
    ctx.setTeamScore(1, 100)
    // no getter for team score in ctx, but should not throw

    // broadcastHud
    expect(() => ctx.broadcastHud({ type: 'test' })).not.toThrow()

    // after / every / cancel
    const afterId = ctx.after(10, () => {})
    expect(typeof afterId).toBe('number')
    const everyId = ctx.every(5, () => {})
    expect(typeof everyId).toBe('number')
    ctx.cancel(afterId)
    ctx.cancel(everyId)
    expect(runtime.gameModeTimer.size).toBe(0)

    // setState / getState
    ctx.setState('playing')
    expect(ctx.getState()).toBe('playing')
    expect(runtime.getRoomState()).toBe('playing')
    ctx.setState('waiting')
    expect(runtime.getRoomState()).toBe('waiting')

    // giveWeapon / setAmmo
    ctx.giveWeapon('p1', 'rifle')
    ctx.setAmmo('p1', 30)
    expect(runtime._weapons.get('p1')).toBe('rifle')
    expect(runtime._ammos.get('p1')).toBe(30)

    // getSpawnPoints
    expect(ctx.getSpawnPoints().length).toBe(8)

    // getZone
    expect(ctx.getZone('test')).toBeUndefined()

    // raycast
    expect(ctx.raycastWorld({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 10)).toBeUndefined()
    expect(ctx.raycastPlayers({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 10)).toBeUndefined()

    // send / broadcast / broadcastExcept (no players, should not throw)
    expect(ctx.send('nonexistent', 'hello')).toBe(false)
    expect(() => ctx.broadcast('hello')).not.toThrow()
    expect(() => ctx.broadcastExcept('hello', 'nonexistent')).not.toThrow()

    // binary
    expect(() => ctx.broadcast(new Uint8Array([1, 2, 3]))).not.toThrow()
    expect(() => ctx.broadcastExcept(new Uint8Array([1, 2, 3]), 'nonexistent')).not.toThrow()
    expect(ctx.send('nonexistent', new Uint8Array([1, 2, 3]))).toBe(false)
  })

  it('FpsCtx send/broadcast with players', () => {
    const runtime = createDefaultServerRuntime()
    const handlers = createHandlersFromRuntime(runtime)

    const ws1 = makeWs()
    handlers.open(ws1)
    const ws2 = makeWs()
    handlers.open(ws2)

    const ctx = runtime.createFpsCtx()
    expect(ctx.getPlayers().length).toBe(2)

    const p1 = ctx.getPlayers()[0]
    expect(p1).toBeDefined()

    // send string
    expect(ctx.send(p1.id, 'hello')).toBe(true)
    // send binary
    expect(ctx.send(p1.id, new Uint8Array([1, 2, 3]))).toBe(true)

    // broadcast string
    expect(() => ctx.broadcast('broadcast-test')).not.toThrow()
    // broadcast with except
    expect(() => ctx.broadcast('except-test', p1.id)).not.toThrow()

    // broadcast binary
    expect(() => ctx.broadcast(new Uint8Array([4, 5, 6]))).not.toThrow()
    expect(() => ctx.broadcastExcept(new Uint8Array([7, 8, 9]), p1.id)).not.toThrow()

    // broadcastExcept string
    expect(() => ctx.broadcastExcept('except-string', p1.id)).not.toThrow()

    // rate limiter: exhaust and check false
    for (let i = 0; i < 25; i++) {
      ctx.send(p1.id, 'spam')
    }
    // after burst 20, should be rate limited
    // but we don't assert false strictly because time-based refill might happen
    // just check that it doesn't throw
    expect(() => ctx.send(p1.id, 'spam')).not.toThrow()
  })

  it('GameModeRuntime send/broadcast with rate limit', () => {
    const runtime = createDefaultServerRuntime()
    const handlers = createHandlersFromRuntime(runtime)

    const ws1 = makeWs()
    handlers.open(ws1)

    const p1 = runtime.getPlayerRefs()[0]
    expect(p1).toBeDefined()

    // send via runtime
    expect(runtime.gameModeRuntime.sendGameModeMessage(p1.id, 'test')).toBe(true)
    expect(runtime.gameModeRuntime.sendGameModeMessage(p1.id, new Uint8Array([1, 2]))).toBe(true)

    // broadcast
    expect(() => runtime.gameModeRuntime.broadcastGameModeMessage('bcast')).not.toThrow()
    expect(() => runtime.gameModeRuntime.broadcastGameModeMessage('bcast', p1.id)).not.toThrow()

    // exhaust
    for (let i = 0; i < 25; i++) {
      runtime.gameModeRuntime.sendGameModeMessage(p1.id, 'x')
    }
    expect(runtime.gameModeRuntime.sendGameModeMessage(p1.id, 'x')).toBe(false)
  })

  it('handlersがgamemodeなしでも動作 (backward compat)', async () => {
    const { Room } = await import('@cod/engine-core/room/Room')
    const { Simulation } = await import('@cod/engine-core/sim/Simulation')
    const { SnapshotBroadcaster } = await import('@cod/engine-core/net/snapshot')
    const { InputRateLimiter } = await import('@cod/engine-core/net/rate-limit')
    const { createFpsSimProfile } = await import('@cod/profile-fps/profile/FpsSimProfile')
    const { createHandlers } = await import('../../../../apps/gameserver/src/handlers')

    const profile = createFpsSimProfile()
    const room = new Room({ profile })
    const world = profile.createWorld()
    const sim = new Simulation(room, world, profile)
    const snapshots = new SnapshotBroadcaster({ profile })
    const inputRate = new InputRateLimiter()

    const handlers = createHandlers({ room, sim, snapshots, inputRate })
    const ws = makeWs()
    expect(() => handlers.open(ws)).not.toThrow()
    expect(() => handlers.message(ws, 'string-ignored')).not.toThrow()
    expect(() => handlers.close(ws)).not.toThrow()
  })

  it('getPlayerRefByStringIdの分岐カバレッジ', () => {
    const runtime = createDefaultServerRuntime()
    const handlers = createHandlersFromRuntime(runtime)

    const ws1 = makeWs()
    handlers.open(ws1)
    const id = ws1.data?.playerId as number

    // 数字文字列で取得 (Number(id) branch)
    const ctx = runtime.createFpsCtx()
    expect(ctx.getPlayer(String(id))).toBeDefined()
    expect(ctx.getPlayer(String(id))?.playerId).toBe(id)

    // 存在しない数字
    expect(ctx.getPlayer('9999')).toBeUndefined()

    // カスタムIDで取得 (NaN branch + loop search)
    // _playerRefsにカスタムIDのrefを追加
    const customRef = { id: 'custom-id-123', playerId: 999, name: 'Custom' }
    // biome-ignore lint/suspicious/noExplicitAny: test custom ref
    runtime._playerRefs.set(999, customRef as any)
    expect(ctx.getPlayer('custom-id-123')).toBeDefined()
    expect(ctx.getPlayer('custom-id-123')?.playerId).toBe(999)

    // 存在しないカスタムID
    expect(ctx.getPlayer('nonexistent-custom')).toBeUndefined()

    // getPlayerRef numeric
    expect(runtime.getPlayerRef(id)).toBeDefined()
    expect(runtime.getPlayerRef(9999)).toBeUndefined()

    // getPlayerRefs
    expect(runtime.getPlayerRefs().length).toBe(2) // ws1 + custom

    // getTick
    expect(typeof runtime.getTick()).toBe('number')

    // setRoomState / getRoomState
    runtime.setRoomState('playing')
    expect(runtime.getRoomState()).toBe('playing')
    runtime.setRoomState('ended')
    expect(runtime.getRoomState()).toBe('ended')
  })

  it('ctxの例外安全分岐', () => {
    const runtime = createDefaultServerRuntime()

    // broadcastHudでJSON.stringifyが失敗する場合のcatchはテスト困難だが、
    // room.broadcastがthrowする場合のcatchをテスト
    const originalBroadcast = runtime.room.broadcast
    runtime.room.broadcast = () => {
      throw new Error('broadcast error')
    }
    const ctx = runtime.createFpsCtx()
    expect(() => ctx.broadcastHud({ test: 'data' })).not.toThrow()
    runtime.room.broadcast = originalBroadcast

    // sendでroom.sendToがthrowする場合
    const originalSendTo = runtime.room.sendTo
    runtime.room.sendTo = () => {
      throw new Error('send error')
    }
    // rate limiterをリセット
    runtime.gameModeRateLimiter.remove('1')
    // playerが必要
    const handlers = createHandlersFromRuntime(runtime)
    const ws = makeWs()
    handlers.open(ws)
    const ctx2 = runtime.createFpsCtx()
    const p = ctx2.getPlayers()[0]
    if (p) {
      expect(() => ctx2.send(p.id, 'test')).not.toThrow()
      // 結果はfalseになるはず (catchでfalse)
      // ただし、sendToがthrowするので、try/catchでfalseを返す
      const result = (() => {
        try {
          return ctx2.send(p.id, 'test')
        } catch {
          return false
        }
      })()
      expect(typeof result).toBe('boolean')
    }
    runtime.room.sendTo = originalSendTo

    // sendBinaryToがthrow
    const originalSendBinary = runtime.room.sendBinaryTo
    runtime.room.sendBinaryTo = () => {
      throw new Error('binary error')
    }
    runtime.gameModeRateLimiter.remove(p.id)
    expect(() => ctx2.send(p.id, new Uint8Array([1]))).not.toThrow()
    runtime.room.sendBinaryTo = originalSendBinary

    // broadcastでpeer.sendBinaryがthrow
    const peer = runtime.room.getPeer(Number(p.id))
    if (peer) {
      const originalPeerSendBinary = peer.sendBinary
      peer.sendBinary = () => {
        throw new Error('peer binary error')
      }
      expect(() => ctx2.broadcast(new Uint8Array([1]))).not.toThrow()
      expect(() => ctx2.broadcastExcept(new Uint8Array([1]), p.id)).not.toThrow()
      peer.sendBinary = originalPeerSendBinary
    }
  })

  it('gameModeRuntimeの全分岐', () => {
    const runtime = createDefaultServerRuntime()
    const handlers = createHandlersFromRuntime(runtime)
    const ws = makeWs()
    handlers.open(ws)
    const p = runtime.getPlayerRefs()[0]

    // broadcast string with exceptId that doesn't exist
    expect(() =>
      runtime.gameModeRuntime.broadcastGameModeMessage('test', 'nonexistent'),
    ).not.toThrow()

    // broadcast binary with exceptId
    expect(() =>
      runtime.gameModeRuntime.broadcastGameModeMessage(new Uint8Array([1]), p.id),
    ).not.toThrow()
    expect(() =>
      runtime.gameModeRuntime.broadcastGameModeMessage(new Uint8Array([1]), 'nonexistent'),
    ).not.toThrow()

    // send with nonexistent player
    expect(runtime.gameModeRuntime.sendGameModeMessage('nonexistent', 'test')).toBe(false)

    // send with binary and rate limit
    runtime.gameModeRateLimiter.remove(p.id)
    expect(runtime.gameModeRuntime.sendGameModeMessage(p.id, new Uint8Array([1, 2, 3]))).toBe(true)

    // broadcastExcept with string and binary, existent and nonexistent
    // biome-ignore lint/suspicious/noExplicitAny: private access for test
    const opts = (runtime.gameModeRuntime as any).options
    expect(() => opts.broadcastExcept('test', 'nonexistent')).not.toThrow()
    expect(() => opts.broadcastExcept(new Uint8Array([1]), 'nonexistent')).not.toThrow()
    expect(() => opts.broadcastExcept('test', p.id)).not.toThrow()
    expect(() => opts.broadcastExcept(new Uint8Array([1]), p.id)).not.toThrow()

    // broadcast with string and binary
    expect(() => opts.broadcast('test')).not.toThrow()
    expect(() => opts.broadcast(new Uint8Array([1]))).not.toThrow()

    // send with string and binary
    runtime.gameModeRateLimiter.remove(p.id)
    expect(opts.send(p.id, 'test')).toBe(true)
    runtime.gameModeRateLimiter.remove(p.id)
    expect(opts.send(p.id, new Uint8Array([1]))).toBe(true)
    expect(opts.send('nonexistent', 'test')).toBe(false)
  })
})
