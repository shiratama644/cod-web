import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TouchControls } from '@/components/TouchControls'
import type { InputController } from '@/game/input/InputController'

type NippleHandler = (event: { data?: { vector?: { x: number; y: number } } }) => void

const nippleMock = vi.hoisted(() => ({
  handlers: new Map<string, NippleHandler[]>(),
  create: vi.fn(),
  destroy: vi.fn(),
}))

vi.mock('nipplejs', () => ({
  default: {
    create: nippleMock.create,
  },
}))

function inputStub(): InputController {
  return {
    setMoveVector: vi.fn<(x: number, z: number) => void>(),
    queueJump: vi.fn<() => void>(),
  } as unknown as InputController
}

function setCoarsePointer(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn<(query: string) => MediaQueryList>().mockReturnValue({
      matches,
      media: '(pointer: coarse)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  })
}

function setMaxTouchPoints(points: number): void {
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: points })
}

function removeOntouchstartMarker(): void {
  Reflect.deleteProperty(window, 'ontouchstart')
  Reflect.deleteProperty(Window.prototype, 'ontouchstart')
}

function installNippleManager(): void {
  nippleMock.create.mockReturnValue({
    on: (event: string, handler: NippleHandler) => {
      const handlers = nippleMock.handlers.get(event) ?? []
      handlers.push(handler)
      nippleMock.handlers.set(event, handlers)
    },
    destroy: nippleMock.destroy,
  })
}

function emitNipple(event: string, data?: { vector?: { x: number; y: number } }): void {
  for (const handler of nippleMock.handlers.get(event) ?? []) handler({ data })
}

describe('TouchControls', () => {
  beforeEach(() => {
    nippleMock.handlers.clear()
    nippleMock.create.mockReset()
    nippleMock.destroy.mockClear()
    installNippleManager()
    setCoarsePointer(false)
    setMaxTouchPoints(0)
    removeOntouchstartMarker()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not create mobile controls on non-touch devices', () => {
    render(<TouchControls input={inputStub()} />)

    expect(screen.queryByText('JUMP')).toBeNull()
    expect(nippleMock.create).not.toHaveBeenCalled()
  })

  it('creates a static joystick on coarse pointer devices and clamps analog movement', () => {
    setCoarsePointer(true)
    const input = inputStub()
    render(<TouchControls input={input} />)

    const zone = document.querySelector('.joystick-zone')
    expect(zone).toBeInstanceOf(HTMLDivElement)
    expect(nippleMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        zone,
        mode: 'static',
        threshold: 0.15,
        restJoystick: true,
      }),
    )

    emitNipple('move', { vector: { x: 1.5, y: -2 } })
    expect(input.setMoveVector).toHaveBeenLastCalledWith(1, -1)
  })

  it('resets movement on end, hidden, removed, and component unmount cleanup', () => {
    setCoarsePointer(true)
    const input = inputStub()
    const { unmount } = render(<TouchControls input={input} />)

    emitNipple('end')
    emitNipple('hidden')
    emitNipple('removed')
    unmount()

    expect(input.setMoveVector).toHaveBeenCalledWith(0, 0)
    expect(input.setMoveVector).toHaveBeenCalledTimes(4)
    expect(nippleMock.destroy).toHaveBeenCalledTimes(1)
  })

  it('queues jump and keeps the pointer event inside the touch UI', () => {
    setMaxTouchPoints(1)
    const input = inputStub()
    render(<TouchControls input={input} />)

    const jump = screen.getByText('JUMP')
    fireEvent.pointerDown(jump)

    expect(input.queueJump).toHaveBeenCalledTimes(1)
  })
})
