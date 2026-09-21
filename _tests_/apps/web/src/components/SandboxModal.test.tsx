// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SandboxModal } from '@/components/SandboxModal.tsx'
import { useGameStore } from '@/store/gameStore.ts'

describe('SandboxModal — PH4-D 親ジャンル+サブタグフィルタ+ソート mock 公式拡張+UGC', () => {
  beforeEach(() => {
    useGameStore.setState({
      sandboxOpen: true,
      sandboxParentGenre: 'all',
      sandboxSubTag: 'all',
      sandboxSort: 'totalPlays',
      sandboxSearch: '',
      selectedSandboxCardId: null,
    })
  })

  it('renders modal with cards when open', () => {
    render(<SandboxModal open={true} />)
    expect(screen.getByTestId('sandbox-modal')).toBeTruthy()
    expect(screen.getByTestId('sandbox-card-grid')).toBeTruthy()
    // MOCK_CARDS 6 cards
    expect(screen.getByTestId('sandbox-card-fps-official-zombie')).toBeTruthy()
    expect(screen.getByTestId('sandbox-card-voxel-official-bedwars')).toBeTruthy()
  })

  it('does not render when closed', () => {
    render(<SandboxModal open={false} />)
    expect(screen.queryByTestId('sandbox-modal')).toBeNull()
  })

  it('filters by parentGenre FPS', () => {
    render(<SandboxModal open={true} />)
    fireEvent.click(screen.getByTestId('filter-parent-fps'))
    expect(useGameStore.getState().sandboxParentGenre).toBe('fps')
    // After filter, only fps cards should be visible
    expect(screen.getByTestId('sandbox-card-fps-official-zombie')).toBeTruthy()
    expect(screen.queryByTestId('sandbox-card-voxel-official-bedwars')).toBeNull()
  })

  it('filters by subTag Bedwars/Zombie/Athletic', () => {
    render(<SandboxModal open={true} />)
    fireEvent.click(screen.getByTestId('filter-subtag-zombie'))
    expect(useGameStore.getState().sandboxSubTag).toBe('zombie')
    expect(screen.getByTestId('sandbox-card-fps-official-zombie')).toBeTruthy()
    expect(screen.queryByTestId('sandbox-card-voxel-official-bedwars')).toBeNull()

    fireEvent.click(screen.getByTestId('filter-subtag-bedwars'))
    expect(screen.getByTestId('sandbox-card-voxel-official-bedwars')).toBeTruthy()
  })

  it('sorts by plays/active/views', () => {
    render(<SandboxModal open={true} />)
    const select = screen.getByTestId('sandbox-sort-select') as HTMLSelectElement
    expect(select.value).toBe('totalPlays')
    fireEvent.change(select, { target: { value: 'activePlayers' } })
    expect(useGameStore.getState().sandboxSort).toBe('activePlayers')
  })

  it('shows card fields thumbnail/title/creator/plays/desc Official含む', () => {
    render(<SandboxModal open={true} />)
    const card = screen.getByTestId('sandbox-card-fps-official-zombie')
    expect(card.textContent).toContain('Zombie (Official拡張)')
    expect(card.textContent).toContain('Official')
    expect(card.textContent).toContain('Plays:')
    expect(card.textContent).toContain('Official Zombie')

    const ugcCard = screen.getByTestId('sandbox-card-fps-ugc-zombie-1')
    expect(ugcCard.textContent).toContain('Zombiemaster')
  })

  it('selects card on click and calls onSelectCard', () => {
    const onSelectCard = vi.fn()
    render(<SandboxModal open={true} onSelectCard={onSelectCard} />)
    fireEvent.click(screen.getByTestId('sandbox-card-fps-official-zombie'))
    expect(useGameStore.getState().selectedSandboxCardId).toBe('fps-official-zombie')
    expect(onSelectCard).toHaveBeenCalled()
  })

  it('close button calls onClose or store', () => {
    render(<SandboxModal open={true} />)
    fireEvent.click(screen.getByTestId('sandbox-close'))
    expect(useGameStore.getState().sandboxOpen).toBe(false)
  })
})
