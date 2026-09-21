import { useGameStore } from '../store/gameStore.ts'
import {
  MOCK_CARDS,
  PARENT_GENRE_OPTIONS,
  SORT_OPTIONS,
  SUBTAG_OPTIONS,
  applySandboxFilters,
  type SandboxCard,
} from '../lib/sandbox.ts'

export interface SandboxModalProps {
  open?: boolean
  cards?: SandboxCard[]
  onClose?: () => void
  onSelectCard?: (card: SandboxCard) => void
}

/**
 * SandboxModal — 親ジャンル+サブタグフィルタ+ソート (PH4-D)
 *
 * - カード一覧: thumbnail/title/creator/plays/desc、creatorは Official または ユーザー名 (公式拡張+UGC)
 * - 親ジャンルフィルタ: FPS / Voxel
 * - サブタグフィルタ: Bedwars, Zombie, Athletic, TDM, DOM, FFA
 * - ソート: totalPlays / activePlayers / detailViews
 * - mockデータ: 公式拡張+UGC
 */
export function SandboxModal({ open: controlledOpen, cards = MOCK_CARDS, onClose, onSelectCard }: SandboxModalProps) {
  const storeOpen = useGameStore((s) => s.sandboxOpen)
  const setSandboxOpen = useGameStore((s) => s.setSandboxOpen)
  const parentGenre = useGameStore((s) => s.sandboxParentGenre)
  const subTag = useGameStore((s) => s.sandboxSubTag)
  const sort = useGameStore((s) => s.sandboxSort)
  const search = useGameStore((s) => s.sandboxSearch)
  const setParentGenre = useGameStore((s) => s.setSandboxParentGenre)
  const setSubTag = useGameStore((s) => s.setSandboxSubTag)
  const setSort = useGameStore((s) => s.setSandboxSort)
  const setSelectedId = useGameStore((s) => s.setSelectedSandboxCardId)

  const open = controlledOpen ?? storeOpen

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      setSandboxOpen(false)
    }
  }

  const handleSelectCard = (card: SandboxCard) => {
    setSelectedId(card.id)
    if (onSelectCard) {
      onSelectCard(card)
    }
  }

  if (!open) return null

  const filtered = applySandboxFilters(cards, {
    parentGenre,
    subTag,
    sort,
    order: 'desc',
    search,
  })

  return (
    <div className="modal-overlay" data-testid="sandbox-modal-overlay">
      <div className="sandbox-modal" data-testid="sandbox-modal">
        <header className="sandbox-modal-header">
          <h2>Sandbox (公式拡張+UGC)</h2>
          <button data-testid="sandbox-close" onClick={handleClose} type="button">
            X
          </button>
        </header>

        <div className="sandbox-filters" data-testid="sandbox-filters">
          <div className="filter-group">
            <span>Parent:</span>
            {PARENT_GENRE_OPTIONS.map((p) => (
              <button
                key={p}
                className={parentGenre === p ? 'filter-btn active' : 'filter-btn'}
                data-testid={`filter-parent-${p}`}
                onClick={() => setParentGenre(p)}
                type="button"
              >
                {p}
              </button>
            ))}
          </div>
          <div className="filter-group">
            <span>SubTag:</span>
            {SUBTAG_OPTIONS.map((t) => (
              <button
                key={t}
                className={subTag === t ? 'filter-btn active' : 'filter-btn'}
                data-testid={`filter-subtag-${t}`}
                onClick={() => setSubTag(t)}
                type="button"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="sandbox-sort" data-testid="sandbox-sort">
          <label htmlFor="sandbox-sort-select">Sort:</label>
          <select
            id="sandbox-sort-select"
            data-testid="sandbox-sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'totalPlays' ? '累計プレイ数' : s === 'activePlayers' ? '現在のプレイ人数' : '詳細ページ閲覧数'}
              </option>
            ))}
          </select>
        </div>

        <div className="sandbox-card-grid" data-testid="sandbox-card-grid">
          {filtered.map((card) => (
            <button
              key={card.id}
              className="sandbox-card"
              data-testid={`sandbox-card-${card.id}`}
              onClick={() => handleSelectCard(card)}
              type="button"
            >
              <img src={card.thumbnail} alt={card.title} className="sandbox-card-thumb" />
              <h3 className="sandbox-card-title">{card.title}</h3>
              <p className="sandbox-card-creator">Creator: {card.creator}</p>
              <p className="sandbox-card-plays">
                Plays: {card.totalPlays} Active: {card.activePlayers}
              </p>
              <p className="sandbox-card-desc">{card.description}</p>
              <p className="sandbox-card-meta">
                Parent: {card.parentGenre} Genres: {card.genres.join(',')} Source: {card.source}
              </p>
            </button>
          ))}
          {filtered.length === 0 && <p data-testid="sandbox-empty">No games found</p>}
        </div>
      </div>
    </div>
  )
}
