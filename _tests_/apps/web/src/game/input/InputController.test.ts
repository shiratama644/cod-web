import { afterEach, describe, expect, it, vi } from 'vitest'
import { InputController } from '@/game/input/InputController'

function pointerEvent(type: string, props: Partial<PointerEvent> = {}): PointerEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(event, key, { configurable: true, value })
  }
  return event
}

function setPointerLockElement(el: Element | null): void {
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, value: el })
  document.dispatchEvent(new Event('pointerlockchange'))
}

describe('InputController', () => {
  afterEach(() => {
    setPointerLockElement(null)
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  it('tries raw pointer lock first and falls back to normal pointer lock on NotSupportedError', async () => {
    const controller = new InputController()
    const canvas = document.createElement('canvas')
    const notSupported = new DOMException('raw movement is not supported', 'NotSupportedError')
    const requestPointerLock = vi
      .fn<(options?: PointerLockOptions) => Promise<void> | void>()
      .mockReturnValueOnce(Promise.reject(notSupported))
      .mockReturnValueOnce(undefined)

    Object.defineProperty(canvas, 'requestPointerLock', { configurable: true, value: requestPointerLock })
    document.body.append(canvas)
    controller.attach(canvas)

    canvas.dispatchEvent(
      pointerEvent('pointerdown', { button: 0, clientX: 100, clientY: 100, pointerId: 1, pointerType: 'mouse' }),
    )
    await Promise.resolve()

    expect(requestPointerLock).toHaveBeenCalledTimes(2)
    expect(requestPointerLock).toHaveBeenNthCalledWith(1, { unadjustedMovement: true })
    expect(requestPointerLock).toHaveBeenNthCalledWith(2)
    controller.dispose()
  })

  it('queues drag look deltas and applies them only when consumed at frame start', () => {
    const controller = new InputController()
    const canvas = document.createElement('canvas')
    document.body.append(canvas)
    controller.attach(canvas)

    canvas.dispatchEvent(
      pointerEvent('pointerdown', { button: 0, clientX: 100, clientY: 100, pointerId: 7, pointerType: 'touch' }),
    )
    window.dispatchEvent(pointerEvent('pointermove', { clientX: 130, clientY: 110, pointerId: 7, pointerType: 'touch' }))

    expect(controller.yaw).toBe(0)
    expect(controller.pitch).toBe(0)

    controller.consumeLookDelta()
    expect(controller.yaw).toBeCloseTo(-30 * 0.0022)
    expect(controller.pitch).toBeCloseTo(-10 * 0.0022)
    controller.dispose()
  })

  it('queues pointer-lock movement deltas and samples the consumed yaw/pitch', () => {
    const controller = new InputController()
    const canvas = document.createElement('canvas')
    Object.defineProperty(canvas, 'requestPointerLock', { configurable: true, value: vi.fn() })
    document.body.append(canvas)
    controller.attach(canvas)
    setPointerLockElement(canvas)

    window.dispatchEvent(pointerEvent('pointermove', { movementX: -5, movementY: 8, pointerType: 'mouse' }))

    expect(controller.yaw).toBe(0)
    expect(controller.pitch).toBe(0)

    controller.consumeLookDelta()
    const input = controller.sample(1, 16)
    expect(input.yaw).toBeCloseTo(5 * 0.0022)
    expect(input.pitch).toBeCloseTo(-8 * 0.0022)
    controller.dispose()
  })
})
