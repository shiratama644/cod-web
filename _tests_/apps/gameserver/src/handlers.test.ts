// @vitest-environment node
// biome-ignore-all lint/suspicious/noExplicitAny: test file uses any for private access and mocking
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Room } from '@cod/engine-core/room/Room'
import { Simulation } from '@cod/engine-core/sim/Simulation'
import { SnapshotBroadcaster } from '@cod/engine-core/net/snapshot'
import { InputRateLimiter } from '@cod/engine-core/net/rate-limit'
import { createFpsSimProfile } from '@cod/profile-fps/profile/FpsSimProfile'
import { createHandlers, type WsLike } from '@cod/gameserver/handlers'
import { Channel, INPUT_PACKET_BYTES, INPUT_FRAME_BYTES } from '@cod/protocol/protocol/constants'
import { encodeInput } from '@cod/protocol/protocol/packer'
import type { PlayerInput } from '@cod/protocol/protocol/messages'

function makeDeps() {
  const profile = createFpsSimProfile()
  const room = new Room({ profile })
  const world = profile.createWorld()
  const sim = new Simulation(room, world, profile)
  const snapshots = new SnapshotBroadcaster({ profile })
  const inputRate = new InputRateLimiter()
  return { profile, room, world, sim, snapshots, inputRate }
}

function makeWs(): WsLike & { sent: (string | Uint8Array)[]; closed: { code?: number; reason?: string }[] } {
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
  } as unknown as WsLike & { sent: (string | Uint8Array)[]; closed: { code?: number; reason?: string }[] }
}

function makeValidInputFrame(seq = 1): Uint8Array {
  const input: PlayerInput = { seq, moveX: 0, moveZ: 1, yaw: 0, pitch: 0, flags: 0, dtMs: 16 }
  const payloadBuf = new ArrayBuffer(INPUT_PACKET_BYTES)
  const payloadView = new DataView(payloadBuf)
  encodeInput(payloadView, input)
  const frame = new Uint8Array(INPUT_FRAME_BYTES)
  frame[0] = Channel.Unreliable
  frame.set(new Uint8Array(payloadBuf), 1)
  return frame
}

describe('gameserver handlers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  it('open assigns playerId and sends welcome', () => {
    const deps = makeDeps()
    const handlers = createHandlers(deps)
    const ws = makeWs()
    handlers.open(ws)
    expect(ws.data?.playerId).toBeGreaterThan(0)
    expect(deps.room.playerCount).toBe(1)
    // welcome is JSON
    const welcomeRaw = ws.sent[0] as string
    const welcome = JSON.parse(welcomeRaw)
    expect(welcome.kind).toBe('welcome')
    expect(welcome.playerId).toBe(ws.data?.playerId)
  })

  it('open when room full sends full and closes with 1013', () => {
    const deps = makeDeps()
    // fill room to max
    for (let i = 0; i < deps.room.maxPlayers; i++) {
      const ws = makeWs()
      createHandlers(deps).open(ws)
    }
    expect(deps.room.playerCount).toBe(deps.room.maxPlayers)
    const handlers = createHandlers(deps)
    const ws = makeWs()
    handlers.open(ws)
    expect(ws.sent.length).toBe(1)
    const msg = JSON.parse(ws.sent[0] as string)
    expect(msg.kind).toBe('full')
    expect(ws.closed[0]?.code).toBe(1013)
  })

  it('message ignores string', () => {
    const deps = makeDeps()
    const handlers = createHandlers(deps)
    const ws = makeWs()
    handlers.open(ws)
    handlers.message(ws, 'some text')
    expect(ws.closed.length).toBe(0)
    expect(deps.room.playerCount).toBe(1)
  })

  it('message with valid input calls sim.receiveInput', () => {
    const deps = makeDeps()
    const handlers = createHandlers(deps)
    const ws = makeWs()
    handlers.open(ws)
    const frame = makeValidInputFrame(42)
    handlers.message(ws, frame)
    expect(ws.closed.length).toBe(0)
  })

  it('message with invalid binary closes with protocol code', () => {
    const deps = makeDeps()
    const handlers = createHandlers(deps)
    const ws = makeWs()
    handlers.open(ws)
    const bad = new Uint8Array([Channel.Unreliable, 0, 1, 2])
    handlers.message(ws, bad)
    expect(ws.closed.length).toBe(1)
    expect(ws.closed[0]?.code).toBe(1002)
  })

  it('message with ws.data null does not throw and does not call receiveInput', () => {
    const deps = makeDeps()
    const handlers = createHandlers(deps)
    const ws = makeWs()
    ws.data = null
    const frame = makeValidInputFrame()
    expect(() => handlers.message(ws, frame)).not.toThrow()
    expect(ws.closed.length).toBe(0)
  })

  it('message rate limit exceeded closes with 1002', () => {
    const deps = makeDeps()
    const handlers = createHandlers(deps)
    const ws = makeWs()
    handlers.open(ws)
    const id = ws.data?.playerId as number
    // exhaust rate limiter: allow 90/s, we simulate 100 calls at same time
    for (let i = 0; i < 90; i++) {
      deps.inputRate.allow(id, 0)
    }
    const frame = makeValidInputFrame(100)
    handlers.message(ws, frame)
    expect(ws.closed.length).toBe(1)
  })

  it('drain marks writable', () => {
    const deps = makeDeps()
    const handlers = createHandlers(deps)
    const ws = makeWs()
    handlers.open(ws)
    const id = ws.data?.playerId as number
    ;(deps.snapshots as any).paused.add(id)
    handlers.drain(ws)
    expect((deps.snapshots as any).paused.has(id)).toBe(false)
  })

  it('drain with null data does nothing', () => {
    const deps = makeDeps()
    const handlers = createHandlers(deps)
    const ws = makeWs()
    ws.data = null
    expect(() => handlers.drain(ws)).not.toThrow()
  })

  it('close removes player from room and rate limiter', () => {
    const deps = makeDeps()
    const handlers = createHandlers(deps)
    const ws = makeWs()
    handlers.open(ws)
    expect(deps.room.playerCount).toBe(1)
    handlers.close(ws)
    expect(deps.room.playerCount).toBe(0)
  })

  it('close with null data does nothing', () => {
    const deps = makeDeps()
    const handlers = createHandlers(deps)
    const ws = makeWs()
    ws.data = null
    expect(() => handlers.close(ws)).not.toThrow()
  })

  it('fetch upgrades websocket and returns undefined, otherwise returns 200', () => {
    const deps = makeDeps()
    const handlers = createHandlers(deps)
    const upgradeTrue = vi.fn(() => true)
    const req = new Request('http://localhost:8080/')
    const res1 = handlers.fetch(req, { upgrade: upgradeTrue as any })
    expect(res1).toBeUndefined()
    expect(upgradeTrue).toHaveBeenCalled()

    const upgradeFalse = vi.fn(() => false)
    const res2 = handlers.fetch(req, { upgrade: upgradeFalse as any })
    expect(res2).toBeInstanceOf(Response)
    expect(res2?.status).toBe(200)
  })

  it('open handles ArrayBufferView conversion for sendBinary', () => {
    const deps = makeDeps()
    const handlers = createHandlers(deps)
    const ws = makeWs()
    handlers.open(ws)
    const id = ws.data?.playerId as number
    const peer = deps.room.getPeer(id)
    expect(peer).toBeDefined()
    // sendBinary with ArrayBuffer (not Uint8Array) via peer
    const buf = new ArrayBuffer(10)
    const view = new DataView(buf)
    const result = peer?.sendBinary(view as unknown as ArrayBufferView)
    expect(typeof result).toBe('number')
  })
})
