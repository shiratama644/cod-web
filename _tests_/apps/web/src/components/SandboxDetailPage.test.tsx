// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SandboxDetailPage } from '@/components/SandboxDetailPage.tsx'
import { useGameStore } from '@/store/gameStore.ts'
import { MOCK_CARDS } from '@/lib/sandbox.ts'

describe('SandboxDetailPage — PH4-E 詳細ページ + Play Now/Room Selection', () => {
  beforeEach(() => {
    useGameStore.setState({
      selectedSandboxCardId: 'fps-official-zombie',
      roomSelectionOpen: false,
    })
  })

  it('renders detail for selected card', () => {
    render(<SandboxDetailPage />)
    expect(screen.getByTestId('sandbox-detail')).toBeTruthy()
    expect(screen.getByTestId('detail-title').textContent).toContain('Zombie (Official拡張)')
    expect(screen.getByTestId('detail-creator').textContent).toContain('Official')
    expect(screen.getByTestId('detail-internal').textContent).toContain('/fps/official/zombie')
    expect(screen.getByTestId('detail-internal').textContent).toContain('/sandbox/fps-official-zombie')
  })

  it('shows Play Now and Room Selection buttons', () => {
    render(<SandboxDetailPage />)
    expect(screen.getByTestId('play-now-btn')).toBeTruthy()
    expect(screen.getByTestId('room-selection-btn')).toBeTruthy()
  })

  it('Play Now closes detail and calls onPlayNow', () => {
    const onPlayNow = vi.fn()
    render(<SandboxDetailPage onPlayNow={onPlayNow} />)
    fireEvent.click(screen.getByTestId('play-now-btn'))
    expect(onPlayNow).toHaveBeenCalled()
    expect(useGameStore.getState().selectedSandboxCardId).toBeNull()
  })

  it('Room Selection opens modal via store', () => {
    render(<SandboxDetailPage />)
    fireEvent.click(screen.getByTestId('room-selection-btn'))
    expect(useGameStore.getState().roomSelectionOpen).toBe(true)
  })

  it('close button clears selected', () => {
    render(<SandboxDetailPage />)
    fireEvent.click(screen.getByTestId('detail-close'))
    expect(useGameStore.getState().selectedSandboxCardId).toBeNull()
  })

  it('renders with controlled card prop', () => {
    render(<SandboxDetailPage card={MOCK_CARDS[1]} />)
    expect(screen.getByTestId('detail-title').textContent).toContain('Bedwars (Official拡張)')
  })

  it('returns null when no card selected', () => {
    useGameStore.setState({ selectedSandboxCardId: null })
    render(<SandboxDetailPage />)
    expect(screen.queryByTestId('sandbox-detail')).toBeNull()
  })
})
