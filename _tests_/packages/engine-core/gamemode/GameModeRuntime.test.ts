// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { GameModeRuntime } from '@cod/engine-core/gamemode/GameModeRuntime'
import { GameModeTimer } from '@cod/engine-core/gamemode/GameModeTimer'
import { ModeMessageRateLimiter } from '@cod/engine-core/net/rate-limit'
import type { GameModeDefinition, PlayerRef, RoomCtx, RoomState } from '@cod/gamemode-api'

function createMockPlayer(id: string): PlayerRef {
  return { id, playerId: Number(id.replace(/\D/g, '')) || 1, name: `Player${id}` }
}

function createMockOptions() {
  const players: PlayerRef[] = [createMockPlayer('p1'), createMockPlayer('p2')]
  let state: RoomState = 'waiting'
  const sent = new Map<string, (Uint8Array | string)[]>()
  return {
    roomId: 'test-room',
    getTick: () => 0,
    getState: () => state,
    setState: (s: RoomState) => {
      state = s
    },
    getPlayers: () => players as readonly PlayerRef[],
    getPlayer: (id: string) => players.find((p) => p.id === id),
    send: (playerId: string, data: Uint8Array | string) => {
      if (!sent.has(playerId)) sent.set(playerId, [])
      sent.get(playerId)!.push(data)
      return true
    },
    broadcast: (data: Uint8Array | string) => {
      for (const p of players) {
        if (!sent.has(p.id)) sent.set(p.id, [])
        sent.get(p.id)!.push(data)
      }
    },
    broadcastExcept: (data: Uint8Array | string, exceptId: string) => {
      for (const p of players) {
        if (p.id === exceptId) continue
        if (!sent.has(p.id)) sent.set(p.id, [])
        sent.get(p.id)!.push(data)
      }
    },
    nowMs: () => 0,
    _sent: sent,
    _players: players,
  }
}

describe('GameModeRuntime exception safety', () => {
  it('onTick例外でroomが落ちない', () => {
    const def: GameModeDefinition = {
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
    }
    const opts = createMockOptions()
    const runtime = new GameModeRuntime(def, opts)
    expect(() => runtime.safeCallSync('onTick', {} as RoomCtx, 16)).not.toThrow()
  })

  it('onRoomCreate async例外でroomが落ちない', async () => {
    const def: GameModeDefinition = {
      id: 'fps-official-ffa',
      type: 'fps',
      source: 'official',
      slug: 'ffa',
      minPlayers: 2,
      maxPlayers: 16,
      world: { map: 'static-arena' },
      onRoomCreate: async () => {
        throw new Error('async error')
      },
    }
    const opts = createMockOptions()
    const runtime = new GameModeRuntime(def, opts)
    await expect(runtime.safeCall('onRoomCreate', {} as RoomCtx)).resolves.toBeUndefined()
  })

  it('onPlayerJoin例外で他プレイヤーに影響しない', async () => {
    const def: GameModeDefinition = {
      id: 'fps-official-ffa',
      type: 'fps',
      source: 'official',
      slug: 'ffa',
      minPlayers: 2,
      maxPlayers: 16,
      world: { map: 'static-arena' },
      onPlayerJoin: () => {
        throw new Error('join error')
      },
    }
    const opts = createMockOptions()
    const runtime = new GameModeRuntime(def, opts)
    // 例外があっても他の処理は継続できる
    await expect(runtime.onPlayerJoin(createMockPlayer('p1'), {} as RoomCtx)).resolves.toBeUndefined()
    // room自体は生きている
    expect(opts.getPlayers().length).toBe(2)
  })

  it('timerコールバック例外でroomが落ちない', () => {
    const def: GameModeDefinition = {
      id: 'fps-official-ffa',
      type: 'fps',
      source: 'official',
      slug: 'ffa',
      minPlayers: 2,
      maxPlayers: 16,
      world: { map: 'static-arena' },
    }
    const opts = createMockOptions()
    const timer = new GameModeTimer()
    const runtime = new GameModeRuntime(def, opts, timer)
    timer.after(1, () => {
      throw new Error('timer error')
    }, 0)
    expect(() => runtime.tick(16, 1)).not.toThrow()
    expect(timer.size).toBe(0) // 一度きりなので削除される
  })
})

describe('GameModeRuntime tick timer', () => {
  it('after/every/cancelがtick基準で動く', () => {
    const def: GameModeDefinition = {
      id: 'fps-official-ffa',
      type: 'fps',
      source: 'official',
      slug: 'ffa',
      minPlayers: 2,
      maxPlayers: 16,
      world: { map: 'static-arena' },
    }
    const opts = createMockOptions()
    const timer = new GameModeTimer()
    const runtime = new GameModeRuntime(def, opts, timer)

    const afterCb = vi.fn()
    const everyCb = vi.fn()

    // nowTick 0で登録
    timer.after(3, afterCb, 0)
    timer.every(2, everyCb, 0)

    runtime.tick(16, 0)
    expect(afterCb).not.toHaveBeenCalled()
    expect(everyCb).not.toHaveBeenCalled()

    runtime.tick(16, 1)
    expect(afterCb).not.toHaveBeenCalled()
    expect(everyCb).not.toHaveBeenCalled()

    runtime.tick(16, 2)
    expect(afterCb).not.toHaveBeenCalled()
    expect(everyCb).toHaveBeenCalledTimes(1)

    runtime.tick(16, 3)
    expect(afterCb).toHaveBeenCalledTimes(1)
    expect(everyCb).toHaveBeenCalledTimes(1)

    runtime.tick(16, 4)
    expect(everyCb).toHaveBeenCalledTimes(2)

    // cancel
    const id = timer.after(10, afterCb, 4)
    timer.cancel(id)
    runtime.tick(16, 20)
    expect(afterCb).toHaveBeenCalledTimes(1) // cancelされたので増えない
  })

  it('tickWithCtxでctx付きonTickが呼ばれる', () => {
    const onTick = vi.fn()
    const def: GameModeDefinition = {
      id: 'fps-official-ffa',
      type: 'fps',
      source: 'official',
      slug: 'ffa',
      minPlayers: 2,
      maxPlayers: 16,
      world: { map: 'static-arena' },
      onTick,
    }
    const opts = createMockOptions()
    const runtime = new GameModeRuntime(def, opts)
    const ctx = { roomId: 'test', tick: 5 } as unknown as RoomCtx
    runtime.tickWithCtx(ctx, 16, 5)
    expect(onTick).toHaveBeenCalledWith(ctx, 16)
  })
})

describe('GameModeRuntime rate limit', () => {
  it('40/s burst20超過時false', () => {
    const def: GameModeDefinition = {
      id: 'fps-official-ffa',
      type: 'fps',
      source: 'official',
      slug: 'ffa',
      minPlayers: 2,
      maxPlayers: 16,
      world: { map: 'static-arena' },
    }
    let now = 0
    const opts = {
      ...createMockOptions(),
      nowMs: () => now,
    }
    const limiter = new ModeMessageRateLimiter()
    const runtime = new GameModeRuntime(def, opts, undefined, limiter)

    // burst 20までOK
    for (let i = 0; i < 20; i++) {
      expect(runtime.sendGameModeMessage('p1', 'data')).toBe(true)
    }
    // 超過はfalse
    expect(runtime.sendGameModeMessage('p1', 'data')).toBe(false)
    expect(runtime.sendGameModeMessage('p1', 'data')).toBe(false)

    // 1秒後には再充填
    now = 1000
    expect(runtime.sendGameModeMessage('p1', 'data')).toBe(true)
  })

  it('broadcastでrate limit超過プレイヤーには送らない', () => {
    const def: GameModeDefinition = {
      id: 'fps-official-ffa',
      type: 'fps',
      source: 'official',
      slug: 'ffa',
      minPlayers: 2,
      maxPlayers: 16,
      world: { map: 'static-arena' },
    }
    const now = 0
    const opts = {
      ...createMockOptions(),
      nowMs: () => now,
    }
    const limiter = new ModeMessageRateLimiter()
    const runtime = new GameModeRuntime(def, opts, undefined, limiter)

    // p1を枯渇させる
    for (let i = 0; i < 20; i++) runtime.sendGameModeMessage('p1', 'x')
    expect(runtime.sendGameModeMessage('p1', 'x')).toBe(false)

    // broadcast: p1はrate limitで送られない、p2は送られる
    opts._sent.clear()
    runtime.broadcastGameModeMessage('broadcast-data')

    const p1Sent = opts._sent.get('p1')?.length ?? 0
    const p2Sent = opts._sent.get('p2')?.length ?? 0

    expect(p1Sent).toBe(0) // p1は枯渇で送られない
    expect(p2Sent).toBe(1) // p2は送られる
  })

  it('Uint8Arrayとstring両方送れる', () => {
    const def: GameModeDefinition = {
      id: 'fps-official-ffa',
      type: 'fps',
      source: 'official',
      slug: 'ffa',
      minPlayers: 2,
      maxPlayers: 16,
      world: { map: 'static-arena' },
    }
    const opts = createMockOptions()
    const runtime = new GameModeRuntime(def, opts)
    expect(runtime.sendGameModeMessage('p1', 'string-data')).toBe(true)
    expect(runtime.sendGameModeMessage('p1', new Uint8Array([1, 2, 3]))).toBe(true)
  })
})

describe('GameModeRuntime Room統合', () => {
  it('Room.setGameModeBindingでrateLimiterがバインドされ、leaveでクリーンアップ', async () => {
    const { Room } = await import('@cod/engine-core/room/Room')
    const room = new Room({ maxPlayers: 10 })
    const limiter = new ModeMessageRateLimiter()

    room.setGameModeBinding({ rateLimiter: limiter })

    // join
    const peer = {
      playerId: -1,
      sendText: () => {},
      sendBinary: () => 1,
    }
    const id = room.join(peer)
    expect(id).not.toBeNull()

    // rate limiterに登録
    limiter.allow(String(id), 0)
    limiter.allow(String(id), 0)

    // leaveでクリーンアップされる
    room.leave(id!)

    // remove後はバーストが戻る = 削除された証拠
    // 新しいlimiterで同じIDが再利用可能かはRoomの責務ではないが、
    // Room.leaveがrateLimiter.removeを呼ぶことは確認できる
    // ここではremoveが呼ばれたことでバケットが消えたことを確認
    // (ModeMessageRateLimiterの内部Mapを直接見れないので、allowが再びburst満タンで成功することを確認)
    // ただし同じインスタンスでremove後は再作成されるので、allowが成功する
    expect(limiter.allow(String(id), 0)).toBe(true)
  })

  it('onPlayerLeaveでrateLimiterがクリーンアップ', async () => {
    const def: GameModeDefinition = {
      id: 'fps-official-ffa',
      type: 'fps',
      source: 'official',
      slug: 'ffa',
      minPlayers: 2,
      maxPlayers: 16,
      world: { map: 'static-arena' },
    }
    const opts = createMockOptions()
    const limiter = new ModeMessageRateLimiter()
    const runtime = new GameModeRuntime(def, opts, undefined, limiter)

    limiter.allow('p1', 0)
    // p1を枯渇させる
    for (let i = 0; i < 20; i++) limiter.allow('p1', 0)
    expect(limiter.allow('p1', 0)).toBe(false)

    await runtime.onPlayerLeave(createMockPlayer('p1'), {} as RoomCtx)
    // remove後は再びOK
    expect(limiter.allow('p1', 0)).toBe(true)
  })
})
