import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StartOverlay } from '@/components/StartOverlay'

const screenfullMock = vi.hoisted(() => ({
  isEnabled: true,
  isFullscreen: false,
  changeHandler: null as (() => void) | null,
  request: vi.fn<(element?: Element, options?: FullscreenOptions) => Promise<void> | void>(),
  on: vi.fn<(event: string, handler: () => void) => void>(),
  off: vi.fn<(event: string, handler: () => void) => void>(),
}))

vi.mock('screenfull', () => ({
  default: {
    get isEnabled() {
      return screenfullMock.isEnabled
    },
    get isFullscreen() {
      return screenfullMock.isFullscreen
    },
    request: screenfullMock.request,
    on: (event: string, handler: () => void) => {
      screenfullMock.on(event, handler)
      if (event === 'change') screenfullMock.changeHandler = handler
    },
    off: (event: string, handler: () => void) => {
      screenfullMock.off(event, handler)
      if (screenfullMock.changeHandler === handler) screenfullMock.changeHandler = null
    },
  },
}))

describe('StartOverlay', () => {
  beforeEach(() => {
    screenfullMock.isEnabled = true
    screenfullMock.isFullscreen = false
    screenfullMock.changeHandler = null
    screenfullMock.request.mockReset()
    screenfullMock.on.mockClear()
    screenfullMock.off.mockClear()
    document.body.replaceChildren()
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
    vi.spyOn(window, 'focus').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts even when Fullscreen API support is unavailable', () => {
    screenfullMock.isEnabled = false
    render(<StartOverlay />)

    fireEvent.pointerDown(screen.getByRole('button', { name: /start game/i }))

    expect(screenfullMock.request).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /start game/i })).toBeNull()
    expect(window.scrollTo).toHaveBeenCalledWith(0, 1)
    expect(window.focus).toHaveBeenCalledTimes(1)
  })

  it('requests fullscreen on the canvas and ignores rejected promises without blocking start', async () => {
    const canvas = document.createElement('canvas')
    document.body.append(canvas)
    screenfullMock.request.mockReturnValueOnce(Promise.reject(new Error('denied')))
    render(<StartOverlay />)

    fireEvent.pointerDown(screen.getByRole('button', { name: /start game/i }))
    await Promise.resolve()

    expect(screenfullMock.request).toHaveBeenCalledWith(canvas, { navigationUI: 'hide' })
    expect(screen.queryByRole('button', { name: /start game/i })).toBeNull()
  })

  it('reopens only after a real fullscreen enter and removes the change listener on unmount', () => {
    const { unmount } = render(<StartOverlay />)
    const handler = screenfullMock.changeHandler
    if (!handler) throw new Error('screenfull change handler was not installed')

    fireEvent.pointerDown(screen.getByRole('button', { name: /start game/i }))
    expect(screen.queryByRole('button', { name: /start game/i })).toBeNull()

    screenfullMock.isFullscreen = false
    act(() => {
      handler()
    })
    expect(screen.queryByRole('button', { name: /start game/i })).toBeNull()

    screenfullMock.isFullscreen = true
    act(() => {
      handler()
    })
    screenfullMock.isFullscreen = false
    act(() => {
      handler()
    })
    expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument()

    unmount()
    expect(screenfullMock.off).toHaveBeenCalledWith('change', handler)
  })

  it('falls back to document fullscreen when no canvas exists and tolerates synchronous request errors', () => {
    screenfullMock.request.mockImplementationOnce(() => {
      throw new Error('blocked')
    })
    render(<StartOverlay />)

    fireEvent.pointerDown(screen.getByRole('button', { name: /start game/i }))

    expect(screenfullMock.request).toHaveBeenCalledWith(undefined, { navigationUI: 'hide' })
    expect(screen.queryByRole('button', { name: /start game/i })).toBeNull()
  })
})
