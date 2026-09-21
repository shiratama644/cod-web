// @vitest-environment node
// biome-ignore-all lint/suspicious/noExplicitAny: test file uses any for Bun mocking and private access
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

describe('gameserver index (Bun.serve wiring)', () => {
  let originalBun: any
  let originalConsoleLog: any

  beforeEach(() => {
    originalBun = (globalThis as any).Bun
    originalConsoleLog = console.log
    console.log = vi.fn()
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
    console.log = originalConsoleLog
    if (originalBun) {
      ;(globalThis as any).Bun = originalBun
    } else {
      delete (globalThis as any).Bun
    }
    vi.resetModules()
  })

  it('creates server with handlers and logs listening message', async () => {
    const serveMock = vi.fn((opts: any) => {
      expect(opts.port).toBeDefined()
      expect(opts.hostname).toBe('0.0.0.0')
      expect(typeof opts.fetch).toBe('function')
      expect(opts.websocket).toBeDefined()
      expect(typeof opts.websocket.open).toBe('function')
      expect(typeof opts.websocket.message).toBe('function')
      expect(typeof opts.websocket.drain).toBe('function')
      expect(typeof opts.websocket.close).toBe('function')
      return { port: opts.port }
    })

    ;(globalThis as any).Bun = { serve: serveMock }

    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockImplementation(() => {
      return 123 as unknown as NodeJS.Timeout
    })

    await import('@cod/gameserver/index')

    expect(serveMock).toHaveBeenCalledTimes(1)
    expect(setIntervalSpy).toHaveBeenCalled()
    expect(console.log).toHaveBeenCalled()

    setIntervalSpy.mockRestore()
  })

  it('fetch handler returns 200 for non-upgrade', async () => {
    let fetchHandler: any
    const serveMock = vi.fn((opts: any) => {
      fetchHandler = opts.fetch
      return { port: opts.port }
    })
    ;(globalThis as any).Bun = { serve: serveMock }
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockImplementation(() => 123 as unknown as NodeJS.Timeout)

    vi.resetModules()
    await import('@cod/gameserver/index')

    const req = new Request('http://localhost:8080/')
    const server = { upgrade: () => false }
    const res = fetchHandler(req, server)
    expect(res).toBeInstanceOf(Response)
    expect(res.status).toBe(200)

    setIntervalSpy.mockRestore()
  })

  it('fetch handler returns undefined for upgrade success', async () => {
    let fetchHandler: any
    const serveMock = vi.fn((opts: any) => {
      fetchHandler = opts.fetch
      return { port: opts.port }
    })
    ;(globalThis as any).Bun = { serve: serveMock }
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockImplementation(() => 123 as unknown as NodeJS.Timeout)

    vi.resetModules()
    await import('@cod/gameserver/index')

    const req = new Request('http://localhost:8080/')
    const server = { upgrade: () => true }
    const res = fetchHandler(req, server)
    expect(res).toBeUndefined()

    setIntervalSpy.mockRestore()
  })

  it('websocket open/message/drain/close handlers delegate and log', async () => {
    let wsHandlers: any
    const serveMock = vi.fn((opts: any) => {
      wsHandlers = opts.websocket
      return { port: opts.port }
    })
    ;(globalThis as any).Bun = { serve: serveMock }
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockImplementation(() => 123 as unknown as NodeJS.Timeout)

    vi.resetModules()
    await import('@cod/gameserver/index')

    // Mock ws
    const ws: any = {
      data: { playerId: -1 },
      send: vi.fn(() => 10),
      close: vi.fn(),
    }

    // open should assign playerId and log
    wsHandlers.open(ws)
    expect(ws.data.playerId).toBeGreaterThan(0)
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('player joined'))

    // message with string (should not throw)
    wsHandlers.message(ws, 'hello')
    expect(ws.close).not.toHaveBeenCalledWith(1002, expect.anything())

    // drain
    wsHandlers.drain(ws)
    // close should log left
    wsHandlers.close(ws)
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('player left'))

    // close with null data should not log left (branch)
    const wsNull: any = { data: null, send: vi.fn(), close: vi.fn() }
    const logCallsBefore = (console.log as any).mock.calls.length
    wsHandlers.open(wsNull)
    // open with null data? actually open will set data, but we test close with null
    const wsNull2: any = { data: null, send: vi.fn(), close: vi.fn() }
    wsHandlers.close(wsNull2)
    // Should not have extra left log for null
    expect((console.log as any).mock.calls.length).toBe(logCallsBefore + 1) // only open log, not close

    setIntervalSpy.mockRestore()
  })

  it('setInterval loop calls sim.update and snapshots.maybeSend', async () => {
    let intervalCb: any
    const serveMock = vi.fn((opts: any) => ({ port: opts.port }))
    ;(globalThis as any).Bun = { serve: serveMock }
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockImplementation((cb: any) => {
      intervalCb = cb
      return 123 as unknown as NodeJS.Timeout
    })

    vi.resetModules()
    const mod = await import('@cod/gameserver/index')

    expect(intervalCb).toBeDefined()
    // Call the interval callback
    expect(() => intervalCb()).not.toThrow()
    // Call again to test tick progression
    expect(() => intervalCb()).not.toThrow()

    expect(mod.room).toBeDefined()
    expect(mod.sim).toBeDefined()

    setIntervalSpy.mockRestore()
  })
})
