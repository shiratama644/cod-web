// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RoomSelectionModal } from '@/components/RoomSelectionModal.tsx'
import { useGameStore } from '@/store/gameStore.ts'
import { mockRooms } from '@/lib/matchmaker-mock.ts'

describe('RoomSelectionModal — PH4-E ルーム一覧モーダル手動選択', () => {
  beforeEach(() => {
    useGameStore.setState({
      roomSelectionOpen: true,
      selectedSandboxCardId: 'fps-official-zombie',
    })
  })

  it('renders rooms', () => {
    render(<RoomSelectionModal open={true} />)
    expect(screen.getByTestId('room-selection-modal')).toBeTruthy()
    expect(screen.getByTestId('room-list')).toBeTruthy()
    // mockRooms filtered by fps-official-zombie should be 2
    expect(screen.getByTestId('room-item-room-fps-1')).toBeTruthy()
  })

  it('does not render when closed', () => {
    render(<RoomSelectionModal open={false} />)
    expect(screen.queryByTestId('room-selection-modal')).toBeNull()
  })

  it('Join button calls onJoin and closes modals', () => {
    const onJoin = vi.fn()
    render(<RoomSelectionModal open={true} onJoin={onJoin} />)
    fireEvent.click(screen.getByTestId('join-room-fps-1'))
    expect(onJoin).toHaveBeenCalled()
    expect(useGameStore.getState().roomSelectionOpen).toBe(false)
    expect(useGameStore.getState().selectedSandboxCardId).toBeNull()
  })

  it('close button closes modal', () => {
    render(<RoomSelectionModal open={true} />)
    fireEvent.click(screen.getByTestId('room-selection-close'))
    expect(useGameStore.getState().roomSelectionOpen).toBe(false)
  })

  it('shows empty when no rooms', () => {
    render(<RoomSelectionModal open={true} rooms={[]} />)
    expect(screen.getByTestId('room-empty')).toBeTruthy()
  })

  it('renders all rooms when no selectedId', () => {
    useGameStore.setState({ selectedSandboxCardId: null })
    render(<RoomSelectionModal open={true} />)
    expect(screen.getByTestId(`room-item-${mockRooms[0].roomId}`)).toBeTruthy()
  })
})
