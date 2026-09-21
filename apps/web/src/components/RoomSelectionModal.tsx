import { useGameStore } from '../store/gameStore.ts'
import { fetchGameList, mockRooms, seekGame, type RoomSummary } from '../lib/matchmaker-mock.ts'

export interface RoomSelectionModalProps {
  open?: boolean
  rooms?: RoomSummary[]
  onClose?: () => void
  onJoin?: (roomId: string, result: { ticket: string; roomId: string }) => void
}

/**
 * RoomSelectionModal — ルーム一覧モーダル手動選択 (PH4-E)
 *
 * - GET /v1/game-list 相当 mock
 * - 手動でサーバーを選択して参加
 */
export function RoomSelectionModal({ open: controlledOpen, rooms: controlledRooms, onClose, onJoin }: RoomSelectionModalProps) {
  const storeOpen = useGameStore((s) => s.roomSelectionOpen)
  const setRoomSelectionOpen = useGameStore((s) => s.setRoomSelectionOpen)
  const selectedId = useGameStore((s) => s.selectedSandboxCardId)
  const setSelectedId = useGameStore((s) => s.setSelectedSandboxCardId)

  const open = controlledOpen ?? storeOpen
  const rooms = controlledRooms ?? (selectedId ? fetchGameList(selectedId) : mockRooms)

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      setRoomSelectionOpen(false)
    }
  }

  const handleJoin = (roomId: string) => {
    const result = seekGame({ roomId })
    if (onJoin) {
      onJoin(roomId, result)
    }
    setRoomSelectionOpen(false)
    setSelectedId(null)
  }

  if (!open) return null

  return (
    <div className="modal-overlay" data-testid="room-selection-overlay">
      <div className="room-selection-modal" data-testid="room-selection-modal">
        <header className="room-selection-header">
          <h2>ルーム選択 (手動)</h2>
          <button data-testid="room-selection-close" onClick={handleClose} type="button">
            X
          </button>
        </header>

        <div className="room-list" data-testid="room-list">
          {rooms.map((room) => (
            <div key={room.roomId} className="room-item" data-testid={`room-item-${room.roomId}`}>
              <p>Room: {room.roomId} Map: {room.map}</p>
              <p>
                Players: {room.players}/{room.maxPlayers} Region: {room.region} Mode: {room.modeId}
              </p>
              <button data-testid={`join-${room.roomId}`} onClick={() => handleJoin(room.roomId)} type="button">
                Join
              </button>
            </div>
          ))}
          {rooms.length === 0 && <p data-testid="room-empty">No rooms</p>}
        </div>
      </div>
    </div>
  )
}
