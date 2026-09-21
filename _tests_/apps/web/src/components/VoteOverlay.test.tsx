// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { VoteOverlay } from '@/components/VoteOverlay.tsx'
import { useGameStore } from '@/store/gameStore.ts'

const mockSession = {
  roomId: 'room-fps-1',
  gameId: 'fps-official',
  options: [
    { subMode: 'ffa', label: 'FFA', votes: 2 },
    { subMode: 'tdm', label: 'TDM', votes: 5 },
    { subMode: 'dom', label: 'DOM', votes: 1 },
  ],
  endsAtMs: Date.now() + 30000,
  voters: new Set(['p1', 'p2']),
}

describe('VoteOverlay — PH4-F 投票システム入口 Official FPS 1ゲーム複数モード', () => {
  beforeEach(() => {
    useGameStore.setState({ voteSession: null })
  })

  it('does not render when no session', () => {
    render(<VoteOverlay session={null} />)
    expect(screen.queryByTestId('vote-overlay')).toBeNull()
  })

  it('renders with session from props', () => {
    render(<VoteOverlay session={mockSession} />)
    expect(screen.getByTestId('vote-overlay')).toBeTruthy()
    expect(screen.getByTestId('vote-overlay-panel')).toBeTruthy()
    expect(screen.getByTestId('vote-option-ffa')).toBeTruthy()
    expect(screen.getByTestId('vote-option-tdm')).toBeTruthy()
    expect(screen.getByTestId('vote-option-dom')).toBeTruthy()
  })

  it('shows Official FPS 1ゲーム複数モード header and Voxel対象外 note', () => {
    render(<VoteOverlay session={mockSession} />)
    expect(screen.getByText(/次のモードを投票/)).toBeTruthy()
    expect(screen.getByTestId('vote-info').textContent).toContain('Official Voxelは投票対象外')
    expect(screen.getByTestId('vote-info').textContent).toContain('Survival永続')
  })

  it('shows timer and total votes', () => {
    render(<VoteOverlay session={mockSession} />)
    expect(screen.getByTestId('vote-timer').textContent).toContain('残り時間')
    expect(screen.getByTestId('vote-total').textContent).toContain('総投票数: 8')
  })

  it('vote button increments votes via store when no onVote', () => {
    useGameStore.setState({ voteSession: mockSession })
    render(<VoteOverlay />)
    const ffaBtn = screen.getByTestId('vote-option-ffa')
    expect(ffaBtn.textContent).toContain('(2)')
    fireEvent.click(ffaBtn)
    const updated = useGameStore.getState().voteSession
    expect(updated?.options.find((o) => o.subMode === 'ffa')?.votes).toBe(3)
  })

  it('calls onVote when controlled', () => {
    const onVote = vi.fn()
    render(<VoteOverlay session={mockSession} onVote={onVote} />)
    fireEvent.click(screen.getByTestId('vote-option-tdm'))
    expect(onVote).toHaveBeenCalledWith('tdm')
  })

  it('close button clears session via store', () => {
    useGameStore.setState({ voteSession: mockSession })
    render(<VoteOverlay />)
    fireEvent.click(screen.getByTestId('vote-close'))
    expect(useGameStore.getState().voteSession).toBeNull()
  })

  it('shows results sorted by votes desc', () => {
    render(<VoteOverlay session={mockSession} />)
    const results = screen.getByTestId('vote-results')
    expect(results.textContent).toContain('TDM: 5')
    // TDM should be first (5 votes)
    expect(results.textContent?.indexOf('TDM')).toBeLessThan(results.textContent?.indexOf('FFA') ?? 999)
  })

  it('renders from store when no prop', () => {
    useGameStore.setState({ voteSession: mockSession })
    render(<VoteOverlay />)
    expect(screen.getByTestId('vote-overlay')).toBeTruthy()
  })
})
