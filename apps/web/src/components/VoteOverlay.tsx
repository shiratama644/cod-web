import { useGameStore } from '../store/gameStore.ts'
import type { VoteSession, SubTag } from '@cod/gamemode-api'

export interface VoteOverlayProps {
  session?: VoteSession | null
  onVote?: (subMode: SubTag) => void
  onClose?: () => void
}

/**
 * VoteOverlay — 投票システム入口 Official FPS 1ゲーム複数モード mock (PH4-F)
 *
 * - トリガー: Official FPSで1マッチ終了時 onRoundEnd後に全プレイヤー投票で次サブモード決定
 * - 候補: 同一FPS公式ゲーム内のサブモード [FFA,TDM,DOM]
 * - 多数決で次サブモード決定
 * - Official Voxelは投票対象外 (Survival永続)
 */
export function VoteOverlay({ session: controlledSession, onVote, onClose }: VoteOverlayProps) {
  const storeSession = useGameStore((s) => s.voteSession)
  const setVoteSession = useGameStore((s) => s.setVoteSession)

  const session = controlledSession !== undefined ? controlledSession : storeSession

  if (!session) return null

  const handleVote = (subMode: SubTag) => {
    if (onVote) {
      onVote(subMode)
    } else {
      // mock投票: votesをインクリメント
      const newOptions = session.options.map((opt) => (opt.subMode === subMode ? { ...opt, votes: opt.votes + 1 } : opt))
      const newVoters = new Set(session.voters)
      newVoters.add(`player-${Date.now()}`)
      setVoteSession({ ...session, options: newOptions, voters: newVoters })
    }
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      setVoteSession(null)
    }
  }

  const totalVotes = session.options.reduce((sum, opt) => sum + opt.votes, 0)
  const remainingMs = Math.max(0, session.endsAtMs - Date.now())
  const remainingSec = Math.ceil(remainingMs / 1000)

  return (
    <div className="modal-overlay" data-testid="vote-overlay">
      <div className="vote-overlay" data-testid="vote-overlay-panel">
        <header className="vote-header">
          <h2>次のモードを投票 — Official FPS 1ゲーム複数モード</h2>
          <button data-testid="vote-close" onClick={handleClose} type="button">
            X
          </button>
        </header>

        <p className="vote-info" data-testid="vote-info">
          Official Voxelは投票対象外 (Survival永続) — Game: {session.gameId} Room: {session.roomId}
        </p>

        <p data-testid="vote-timer">残り時間: {remainingSec}s (mock timer, tick基準)</p>
        <p data-testid="vote-total">総投票数: {totalVotes} / Voters: {session.voters.size}</p>

        <div className="vote-options" data-testid="vote-options">
          {session.options.map((opt) => (
            <button
              key={opt.subMode}
              className="vote-option"
              data-testid={`vote-option-${opt.subMode}`}
              onClick={() => handleVote(opt.subMode)}
              type="button"
            >
              {opt.label} ({opt.votes}) — {opt.subMode}
            </button>
          ))}
        </div>

        <div className="vote-results" data-testid="vote-results">
          {session.options
            .slice()
            .sort((a, b) => b.votes - a.votes)
            .map((opt) => (
              <div key={opt.subMode} data-testid={`vote-result-${opt.subMode}`}>
                {opt.label}: {opt.votes} votes {totalVotes > 0 ? `(${(opt.votes / totalVotes * 100).toFixed(0)}%)` : ''}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
