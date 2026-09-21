import { afterEach, describe, expect, it, vi } from 'vitest'
import { InputController } from '@/game/input/InputController'
import { INPUT_FLAG_JUMP } from '@cod/protocol/protocol/messages'

function pointerEvent(type: string, props: Partial<PointerEvent> = {}): PointerEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(event, key, { configurable: true, value })
  }
  return event
}

function keyboardEvent(type: string, code: string): KeyboardEvent {
  const event = new KeyboardEvent(type, { code, bubbles: true })
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

  it('handles WASD and arrow keys for movement', () => {
    const controller = new InputController()
    const canvas = document.createElement('canvas')
    document.body.append(canvas)
    controller.attach(canvas)

    window.dispatchEvent(keyboardEvent('keydown', 'KeyW'))
    window.dispatchEvent(keyboardEvent('keydown', 'KeyD'))
    let input = controller.sample(1, 16)
    expect(input.moveZ).toBeGreaterThan(0)
    expect(input.moveX).toBeGreaterThan(0)

    window.dispatchEvent(keyboardEvent('keyup', 'KeyW'))
    input = controller.sample(2, 16)
    expect(input.moveZ).toBe(0)
    expect(input.moveX).toBeGreaterThan(0)

    window.dispatchEvent(keyboardEvent('keydown', 'ArrowUp'))
    input = controller.sample(3, 16)
    expect(input.moveZ).toBeGreaterThan(0)

    controller.dispose()
  })

  it('handles jump via Space and queueJump', () => {
    const controller = new InputController()
    const canvas = document.createElement('canvas')
    document.body.append(canvas)
    controller.attach(canvas)

    window.dispatchEvent(keyboardEvent('keydown', 'Space'))
    let input = controller.sample(1, 16)
    expect(input.flags & INPUT_FLAG_JUMP).toBe(INPUT_FLAG_JUMP)

    // Jump is one-shot
    input = controller.sample(2, 16)
    expect(input.flags & INPUT_FLAG_JUMP).toBe(0)

    controller.queueJump()
    input = controller.sample(3, 16)
    expect(input.flags & INPUT_FLAG_JUMP).toBe(INPUT_FLAG_JUMP)

    controller.dispose()
  })

  it('applies joystick deadzone and normalization', () => {
    const controller = new InputController()

    // Inside deadzone -> 0
    controller.setMoveVector(0.1, 0.1)
    let input = controller.sample(1, 16)
    expect(input.moveX).toBe(0)
    expect(input.moveZ).toBe(0)

    // Outside deadzone -> normalized
    controller.setMoveVector(1, 0)
    input = controller.sample(2, 16)
    expect(input.moveX).toBeCloseTo(1, 1)
    expect(input.moveZ).toBeCloseTo(0, 1)

    // Diagonal should be clamped to length 1
    controller.setMoveVector(1, 1)
    input = controller.sample(3, 16)
    const len = Math.hypot(input.moveX, input.moveZ)
    expect(len).toBeLessThanOrEqual(1.01)

    // Zero vector
    controller.setMoveVector(0, 0)
    input = controller.sample(4, 16)
    expect(input.moveX).toBe(0)
    expect(input.moveZ).toBe(0)

    // Combined keyboard + joystick clamped
    const canvas = document.createElement('canvas')
    document.body.append(canvas)
    controller.attach(canvas)
    window.dispatchEvent(keyboardEvent('keydown', 'KeyW'))
    controller.setMoveVector(0, 1)
    input = controller.sample(5, 16)
    expect(Math.hypot(input.moveX, input.moveZ)).toBeLessThanOrEqual(1.01)
    controller.dispose()
  })

  it('clamps pitch to ±π/2', () => {
    const controller = new InputController()
    const canvas = document.createElement('canvas')
    document.body.append(canvas)
    controller.attach(canvas)

    // Simulate large vertical drag
    canvas.dispatchEvent(
      pointerEvent('pointerdown', { button: 0, clientX: 100, clientY: 100, pointerId: 10, pointerType: 'touch' }),
    )
    // Move 10000 pixels down -> pitch would exceed limit
    window.dispatchEvent(pointerEvent('pointermove', { clientX: 100, clientY: 10100, pointerId: 10, pointerType: 'touch' }))
    controller.consumeLookDelta()
    expect(Math.abs(controller.pitch)).toBeLessThanOrEqual(Math.PI / 2)

    controller.dispose()
  })

  it('ignores touch-ui targets for look', () => {
    const controller = new InputController()
    const canvas = document.createElement('canvas')
    document.body.append(canvas)
    controller.attach(canvas)

    const touchUi = document.createElement('div')
    touchUi.className = 'touch-ui'
    document.body.append(touchUi)

    // Pointerdown on touch-ui should not start look
    touchUi.dispatchEvent(
      pointerEvent('pointerdown', { clientX: 100, clientY: 100, pointerId: 20, pointerType: 'touch' }),
    )
    window.dispatchEvent(pointerEvent('pointermove', { clientX: 150, clientY: 150, pointerId: 20, pointerType: 'touch' }))
    controller.consumeLookDelta()
    expect(controller.yaw).toBe(0)

    controller.dispose()
  })

  it('handles pointer up to end look', () => {
    const controller = new InputController()
    const canvas = document.createElement('canvas')
    document.body.append(canvas)
    controller.attach(canvas)

    canvas.dispatchEvent(
      pointerEvent('pointerdown', { clientX: 100, clientY: 100, pointerId: 30, pointerType: 'touch' }),
    )
    window.dispatchEvent(pointerEvent('pointermove', { clientX: 110, clientY: 100, pointerId: 30, pointerType: 'touch' }))
    controller.consumeLookDelta()
    const yawAfterFirst = controller.yaw

    window.dispatchEvent(pointerEvent('pointerup', { pointerId: 30, pointerType: 'touch' }))
    window.dispatchEvent(pointerEvent('pointermove', { clientX: 200, clientY: 100, pointerId: 30, pointerType: 'touch' }))
    controller.consumeLookDelta()
    // Yaw should not change after pointer up
    expect(controller.yaw).toBe(yawAfterFirst)

    controller.dispose()
  })

  it('requestPointerLock via public method', () => {
    const controller = new InputController()
    const canvas = document.createElement('canvas')
    const requestPointerLock = vi.fn()
    Object.defineProperty(canvas, 'requestPointerLock', { configurable: true, value: requestPointerLock })
    document.body.append(canvas)
    controller.attach(canvas)

    controller.requestPointerLock()
    expect(requestPointerLock).toHaveBeenCalled()

    controller.dispose()
  })

  it('handles pointerlockchange to reset look', () => {
    const controller = new InputController()
    const canvas = document.createElement('canvas')
    document.body.append(canvas)
    controller.attach(canvas)

    // Simulate lock
    setPointerLockElement(canvas)
    expect(controller.isLocked).toBe(true)

    // Simulate unlock
    setPointerLockElement(null)
    expect(controller.isLocked).toBe(false)

    controller.dispose()
  })

  it('ignores non-primary mouse button', () => {
    const controller = new InputController()
    const canvas = document.createElement('canvas')
    const requestPointerLock = vi.fn()
    Object.defineProperty(canvas, 'requestPointerLock', { configurable: true, value: requestPointerLock })
    document.body.append(canvas)
    controller.attach(canvas)

    canvas.dispatchEvent(
      pointerEvent('pointerdown', { button: 2, clientX: 100, clientY: 100, pointerId: 1, pointerType: 'mouse' }),
    )
    expect(requestPointerLock).not.toHaveBeenCalled()

    controller.dispose()
  })

  it('handles touch-action none and dispose removes listeners', () => {
    const controller = new InputController()
    const canvas = document.createElement('canvas')
    document.body.append(canvas)
    controller.attach(canvas)

    expect(canvas.style.touchAction).toBe('none')

    const removeSpy = vi.spyOn(window, 'removeEventListener')
    controller.dispose()
    expect(removeSpy).toHaveBeenCalled()
  })
})
