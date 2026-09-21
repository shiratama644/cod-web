import { useGameStore } from '../store/gameStore.ts'
import { MOCK_CARDS } from '../lib/sandbox.ts'
import { seekGame } from '../lib/matchmaker-mock.ts'
import type { SandboxCard } from '@cod/gamemode-api'

export interface SandboxDetailPageProps {
  card?: SandboxCard | null
  onClose?: () => void
  onOpenRoomSelection?: () => void
  onPlayNow?: (result: { ticket: string; roomId: string }) => void
}

/**
 * SandboxDetailPage — 詳細ページ + Play Now / Room Selection (PH4-E)
 *
 * - /sandbox/{id} 詳細相当、内部 {type}/{source}/{slug} 解決 (公式拡張+UGC)
 * - Play Now: 空きルーム自動マッチ mock
 * - Room Selection: ルーム一覧モーダル手動選択
 */
export function SandboxDetailPage({
  card: controlledCard,
  onClose,
  onOpenRoomSelection,
  onPlayNow,
}: SandboxDetailPageProps) {
  const selectedId = useGameStore((s) => s.selectedSandboxCardId)
  const setSelectedId = useGameStore((s) => s.setSelectedSandboxCardId)
  const setRoomSelectionOpen = useGameStore((s) => s.setRoomSelectionOpen)

  const card = controlledCard ?? MOCK_CARDS.find((c) => c.id === selectedId) ?? null

  if (!card) return null

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      setSelectedId(null)
    }
  }

  const handlePlayNow = () => {
    const result = seekGame({ modeId: card.id })
    if (onPlayNow) {
      onPlayNow(result)
    }
    // mock: close detail after Play Now
    setSelectedId(null)
  }

  const handleOpenRoomSelection = () => {
    if (onOpenRoomSelection) {
      onOpenRoomSelection()
    } else {
      setRoomSelectionOpen(true)
    }
  }

  return (
    <div className="modal-overlay" data-testid="sandbox-detail-overlay">
      <div className="sandbox-detail" data-testid="sandbox-detail">
        <header className="sandbox-detail-header">
          <h2>{card.title} 詳細</h2>
          <button data-testid="detail-close" onClick={handleClose} type="button">
            X
          </button>
        </header>

        <div className="sandbox-detail-body">
          <img src={card.thumbnail} alt={card.title} className="sandbox-detail-thumb" data-testid="detail-thumb" />
          <div className="sandbox-detail-info">
            <p data-testid="detail-title">Title: {card.title}</p>
            <p data-testid="detail-creator">Creator: {card.creator} (Officialまたはユーザー)</p>
            <p data-testid="detail-plays">Plays: {card.totalPlays} Active: {card.activePlayers} Views: {card.detailViews}</p>
            <p data-testid="detail-desc">Desc: {card.description}</p>
            <p data-testid="detail-meta">
              Parent: {card.parentGenre} Genres: {card.genres.join(',')} Tags: {card.tags.join(',')} Source: {card.source}
            </p>
            <p data-testid="detail-internal">内部: /{card.type}/{card.source}/{card.slug} → /sandbox/{card.id}</p>
          </div>
        </div>

        <div className="sandbox-detail-actions" data-testid="detail-actions">
          <button data-testid="play-now-btn" onClick={handlePlayNow} type="button" className="detail-action-btn primary">
            Play Now (自動マッチ)
          </button>
          <button data-testid="room-selection-btn" onClick={handleOpenRoomSelection} type="button" className="detail-action-btn">
            ルーム選択 (手動)
          </button>
        </div>
      </div>
    </div>
  )
}
