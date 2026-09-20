/**
 * ラグ補償の位置履歴バッファ（器だけ・判定は射撃フェーズ）。
 *
 * 各プレイヤーの直近 500ms の位置/姿勢を tick 付きで保持する。射撃イベントが
 * 届いたら発射者の視点時刻まで当たり判定対象を巻き戻す（docs/arch/server-authority.md
 * §6.6）が、Phase 1（位置同期）ではこの器を用意し tick ごとに記録するだけにし、
 * 巻き戻しレイ判定は射撃フェーズで実装する。
 *
 * マップ BVH は静的なので巻き戻さず、動的プレイヤーの位置/姿勢のみを巻き戻す。
 */

import { LAGCOMP_HISTORY_MS, SIM_TICK_HZ } from '@cod/protocol/protocol/constants'

export interface PositionSample {
  tick: number
  timeMs: number
  x: number
  y: number
  z: number
  yaw: number
}

interface HistoryBuffer {
  buf: PositionSample[]
  head: number
}

export class LagCompStore {
  private readonly history = new Map<number, HistoryBuffer>()
  /** 履歴を保持する時間（ms）。 */
  private readonly windowMs = LAGCOMP_HISTORY_MS

  /** 各シミュレーション tick でプレイヤーの位置を記録する。 */
  record(tick: number, timeMs: number, id: number, x: number, y: number, z: number, yaw: number): void {
    let h = this.history.get(id)
    if (!h) {
      h = { buf: [], head: 0 }
      this.history.set(id, h)
    }
    h.buf.push({ tick, timeMs, x, y, z, yaw })

    // 古いサンプルを窓外になったら落とす。head を進めることで shift O(n) を回避。
    const cutoff = timeMs - this.windowMs
    while (h.head < h.buf.length) {
      const oldest = h.buf[h.head]
      if (!oldest || oldest.timeMs >= cutoff) break
      h.head++
    }
    // 定期的に compaction
    if (h.head > 16 && h.head * 2 > h.buf.length) {
      h.buf.splice(0, h.head)
      h.head = 0
    }
  }

  /** プレイヤーの直近履歴を返す（射撃フェーズで巻き戻しに使用）。 */
  getHistory(id: number): readonly PositionSample[] {
    const h = this.history.get(id)
    if (!h) return EMPTY
    if (h.head === 0) return h.buf
    // head がある場合は有効範囲のみ返す（slice 1 回は許容、頻度低）。ゼロアロケを優先するなら
    // 呼び出し側で head を意識すべきだが、現状は互換のため slice で返す。
    // ただし GC 削減のため、head が小さい間は slice を避けるため上では head=0 のときは buf そのまま。
    return h.buf.slice(h.head)
  }

  /** 離脱したプレイヤーの履歴を破棄する。 */
  clear(id: number): void {
    this.history.delete(id)
  }
}

const EMPTY: readonly PositionSample[] = []

/** 履歴に残るサンプル数の上限の目安（500ms × 60Hz ≈ 30 サンプル）。 */
export const EXPECTED_SAMPLES = Math.ceil((LAGCOMP_HISTORY_MS / 1000) * SIM_TICK_HZ)
