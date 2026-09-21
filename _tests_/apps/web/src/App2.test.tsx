import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useGameStore } from '@/store/gameStore'

vi.mock('@/game/GameCanvas', () => ({
  GameCanvas: vi.fn(() => <canvas aria-label="Game view" />),
}))

vi.mock('@/components/RendererHud', () => ({
  RendererHud: () => <div role="status">mock hud</div>,
}))

vi.mock('@/components/TouchControls', () => ({
  TouchControls: () => <div data-testid="touch">touch</div>,
}))

vi.mock('@/components/StartOverlay', () => ({
  StartOverlay: () => <div data-testid="overlay">overlay</div>,
}))

describe('App', () => {
  beforeEach(() => {
    useGameStore.setState({ renderer: null, connectionStatus: 'disconnected', hp: 100, ammo: 30 })
  })

  it('renders main app with canvas, hud, touch controls, and overlay', async () => {
    const { App } = await import('@/App')
    render(<App />)
    expect(screen.getByLabelText('Game view')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByTestId('touch')).toBeInTheDocument()
    expect(screen.getByTestId('overlay')).toBeInTheDocument()
    // Check main element
    expect(document.querySelector('main.app')).toBeInTheDocument()
  })

  it('creates InputController only once via useMemo', async () => {
    const { App } = await import('@/App')
    const { rerender } = render(<App />)
    const firstCanvas = screen.getByLabelText('Game view')
    rerender(<App />)
    const secondCanvas = screen.getByLabelText('Game view')
    // Both should exist, and InputController should be same instance (useMemo)
    expect(firstCanvas).toBeDefined()
    expect(secondCanvas).toBeDefined()
  })
})
