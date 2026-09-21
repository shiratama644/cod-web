// biome-ignore-all lint/suspicious/noExplicitAny: test file uses any for Babylon mocks
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { InputController } from '@/game/input/InputController'
import { gameStoreApi, useGameStore } from '@/store/gameStore'

const { mockEngine, mockScene, mockCamera, mockMesh, mockMaterial, mockLight, mockClient, mockVector3 } = vi.hoisted(() => {
  const mockEngine = {
    setHardwareScalingLevel: vi.fn(),
    resize: vi.fn(),
    runRenderLoop: vi.fn((cb: () => void) => {
      ;(mockEngine as any)._cb = cb
    }),
    stopRenderLoop: vi.fn(),
    getDeltaTime: vi.fn(() => 16),
    dispose: vi.fn(),
  }
  const mockScene = {
    clearColor: null as any,
    activeCamera: null as any,
    render: vi.fn(),
    dispose: vi.fn(),
  }
  const mockCamera = {
    minZ: 0,
    maxZ: 0,
    position: {
      copyFrom: vi.fn(),
      set: vi.fn(),
    },
    rotation: {
      set: vi.fn(),
    },
  }
  const mockLight = {
    intensity: 0,
    groundColor: null as any,
    position: null as any,
  }
  const mockMesh = {
    position: {
      set: vi.fn(),
      copyFrom: vi.fn(),
      y: 0,
    },
    rotation: { y: 0 },
    material: null as any,
    freezeWorldMatrix: vi.fn(),
    dispose: vi.fn(),
  }
  const mockMaterial = {
    diffuseColor: null as any,
    specularColor: null as any,
    freeze: vi.fn(),
  }
  const mockClient = {
    setInput: vi.fn(),
    connect: vi.fn(),
    frame: vi.fn(),
    dispose: vi.fn(),
    onStatusChange: null as any,
    renderSelf: vi.fn(() => ({ x: 1, y: 5, z: 2, yaw: 0.5, pitch: 0.1 })),
    remotes: new Map([
      [2, { x: 10, y: 5, z: 10, yaw: 1.0 }],
      [3, { x: 20, y: 5, z: 20, yaw: 2.0 }],
    ]),
  }
  const mockVector3 = class {
    x: number
    y: number
    z: number
    constructor(x = 0, y = 0, z = 0) {
      this.x = x
      this.y = y
      this.z = z
    }
    set(x: number, y: number, z: number) {
      this.x = x
      this.y = y
      this.z = z
    }
    copyFrom(v: any) {
      this.x = v.x
      this.y = v.y
      this.z = v.z
    }
  }
  return { mockEngine, mockScene, mockCamera, mockMesh, mockMaterial, mockLight, mockClient, mockVector3 }
})

vi.mock('@/game/babylon/babylonDeps', () => ({
  createEngine: vi.fn(() => mockEngine),
  createScene: vi.fn(() => mockScene),
  createFreeCamera: vi.fn(() => mockCamera),
  createHemisphericLight: vi.fn(() => ({ ...mockLight })),
  createDirectionalLight: vi.fn(() => ({ ...mockLight })),
  createBox: vi.fn(() => ({ ...mockMesh, position: { ...mockMesh.position, set: vi.fn(), y: 0 } })),
  createCapsule: vi.fn(() => ({ ...mockMesh, position: { ...mockMesh.position, copyFrom: vi.fn() } })),
  createStandardMaterial: vi.fn(() => ({ ...mockMaterial })),
  createColor3: vi.fn((r: number, g: number, b: number) => ({ r, g, b })),
  createColor4: vi.fn((r: number, g: number, b: number, a: number) => ({ r, g, b, a })),
  createVector3: vi.fn((x = 0, y = 0, z = 0) => new mockVector3(x, y, z)),
  Color3: {
    Black: vi.fn(() => ({ r: 0, g: 0, b: 0 })),
  },
  Color4: class {
    constructor(public r: number, public g: number, public b: number, public a: number) {}
  },
  Vector3: mockVector3,
}))

vi.mock('@/game/net/GameClient', () => {
  return {
    GameClient: vi.fn(function (this: any) {
      return mockClient
    }),
  }
})

describe('BabylonGame', () => {
  let canvas: HTMLCanvasElement
  let input: InputController

  beforeEach(() => {
    useGameStore.setState({ renderer: null, connectionStatus: 'disconnected', hp: 100, ammo: 30 })
    canvas = document.createElement('canvas')
    input = new InputController()
    vi.spyOn(input, 'attach').mockImplementation(() => {})
    vi.spyOn(input, 'consumeLookDelta').mockImplementation(() => {})
    vi.spyOn(input, 'dispose').mockImplementation(() => {})
    mockEngine.setHardwareScalingLevel.mockClear()
    mockEngine.runRenderLoop.mockClear()
    mockEngine.stopRenderLoop.mockClear()
    mockEngine.dispose.mockClear()
    mockScene.render.mockClear()
    mockScene.dispose.mockClear()
    mockCamera.position.copyFrom.mockClear()
    mockCamera.rotation.set.mockClear()
    mockClient.setInput.mockClear()
    mockClient.connect.mockClear()
    mockClient.frame.mockClear()
    mockClient.dispose.mockClear()
    mockClient.renderSelf.mockClear()
    mockEngine.runRenderLoop.mockImplementation((cb: () => void) => {
      ;(mockEngine as any)._cb = cb
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('constructor creates engine, scene, camera, lighting and static map', async () => {
    const { BabylonGame } = await import('@/game/babylon/BabylonGame')
    const game = new BabylonGame(canvas, input)
    expect(game).toBeDefined()
    expect(mockEngine.setHardwareScalingLevel).toHaveBeenCalled()
    game.dispose()
  })

  it('start attaches input, connects client, sets renderer, and runs render loop', async () => {
    const { BabylonGame } = await import('@/game/babylon/BabylonGame')
    const game = new BabylonGame(canvas, input)
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

    game.start()

    expect(input.attach).toHaveBeenCalledWith(canvas)
    expect(gameStoreApi.getState().renderer).toBe('babylon-webgl')
    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(mockEngine.runRenderLoop).toHaveBeenCalled()

    const cb = (mockEngine as any)._cb as () => void
    expect(cb).toBeDefined()
    cb()

    expect(input.consumeLookDelta).toHaveBeenCalled()
    expect(mockScene.render).toHaveBeenCalled()

    game.dispose()
    addEventListenerSpy.mockRestore()
  })

  it('renderPlayers creates remote meshes and updates camera', async () => {
    const { BabylonGame } = await import('@/game/babylon/BabylonGame')
    const game = new BabylonGame(canvas, input)
    game.start()

    const cb = (mockEngine as any)._cb as () => void
    cb()
    cb()

    expect(mockCamera.position.copyFrom).toHaveBeenCalled()
    expect(mockCamera.rotation.set).toHaveBeenCalled()

    game.dispose()
  })

  it('dispose cleans up engine, scene, input, client, and removes resize listener', async () => {
    const { BabylonGame } = await import('@/game/babylon/BabylonGame')
    const game = new BabylonGame(canvas, input)
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    game.start()
    game.dispose()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    expect(mockEngine.stopRenderLoop).toHaveBeenCalled()
    expect(input.dispose).toHaveBeenCalled()
    expect(mockScene.dispose).toHaveBeenCalled()
    expect(mockEngine.dispose).toHaveBeenCalled()
    expect(gameStoreApi.getState().connectionStatus).toBe('disconnected')
    removeEventListenerSpy.mockRestore()
  })

  it('grace period disposes old remote meshes', async () => {
    const { BabylonGame } = await import('@/game/babylon/BabylonGame')
    const game = new BabylonGame(canvas, input)

    const anyGame = game as any
    const oldMesh = { dispose: vi.fn(), position: { copyFrom: vi.fn() }, rotation: { y: 0 } }
    anyGame.remotes.set(99, { mesh: oldMesh, lastSeenMs: 0, mark: 0 })
    anyGame.frameMark = 1
    anyGame.renderPlayers(1000)

    expect(oldMesh.dispose).toHaveBeenCalled()
    expect(anyGame.remotes.has(99)).toBe(false)

    game.dispose()
  })

  it('does not render after dispose', async () => {
    const { BabylonGame } = await import('@/game/babylon/BabylonGame')
    const game = new BabylonGame(canvas, input)
    game.start()
    const cb = (mockEngine as any)._cb as () => void
    game.dispose()
    mockScene.render.mockClear()
    cb()
    expect(mockScene.render).not.toHaveBeenCalled()
  })
})
