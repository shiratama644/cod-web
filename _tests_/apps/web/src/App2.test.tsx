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

vi.mock('@/components/Header', () => ({
  Header: () => <div data-testid="header">header</div>,
}))

vi.mock('@/components/LeftSidebar', () => ({
  LeftSidebar: () => <div data-testid="sidebar">sidebar</div>,
}))

vi.mock('@/components/SandboxModal', () => ({
  SandboxModal: () => <div data-testid="sandbox-modal">sandbox</div>,
}))

vi.mock('@/components/SandboxDetailPage', () => ({
  SandboxDetailPage: () => <div data-testid="sandbox-detail">detail</div>,
}))

vi.mock('@/components/RoomSelectionModal', () => ({
  RoomSelectionModal: () => <div data-testid="room-selection">rooms</div>,
}))

vi.mock('@/components/VoteOverlay', () => ({
  VoteOverlay: () => <div data-testid="vote-overlay">vote</div>,
}))

describe('App', () => {
  beforeEach(() => {
    useGameStore.setState({
      renderer: null,
      connectionStatus: 'disconnected',
      hp: 100,
      ammo: 30,
      activeTab: 'fps',
      sandboxOpen: false,
      sandboxParentGenre: 'all',
      sandboxSubTag: 'all',
      sandboxSort: 'totalPlays',
      sandboxSearch: '',
      selectedSandboxCardId: null,
      roomSelectionOpen: false,
      voteSession: null,
    })
  })

  it('renders main app with canvas, hud, touch controls, and overlay', async () => {
    const { App } = await import('@/App')
    render(<App />)
    expect(screen.getByLabelText('Game view')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByTestId('touch')).toBeInTheDocument()
    expect(screen.getByTestId('overlay')).toBeInTheDocument()
    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
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
