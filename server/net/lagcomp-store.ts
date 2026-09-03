/**
 * ラグ補償の位置履歴バッファ（器だけ・判定は射撃フェーズ）。
 *
 * 各プレイヤーの直近 ~100ms の位置/姿勢を tick 付きで保持する。射撃イベントが
 * 届いたら発射者の視点時刻まで当たり判定対象を巻き戻す（docs/arch/server-authority.md
 * §6.6）が、Phase 1（位置同期）ではこの器を用意し tick ごとに記録するだけにし、
 * 巻き戻しレイ判定は射撃フェーズで実装する。
 *
 * マップ BVH は静的なので巻き戻さず、動的プレイヤーの位置/姿勢のみを巻き戻す。
 */

import { LAGCOMP_HISTORY_MS, SIM_TICK_HZ } from '../../shared/protocol/constants'

export interface PositionSample {
  tick: number
  timeMs: number
  x: number
  y: number
  z: number
  yaw: number
}

export class LagCompStore {
  private readonly history = new Map<number, PositionSample[]>()
  /** 履歴を保持する時間（ms）。 */
  private readonly windowMs = LAGCOMP_HISTORY_MS

  /** 各シミュレーション tick でプレイヤーの位置を記録する。 */
  record(tick: number, timeMs: number, id: number, x: number, y: number, z: number, yaw: number): void {
    let arr = this.history.get(id)
    if (!arr) {
      arr = []
      this.history.set(id, arr)
    }
    arr.push({ tick, timeMs, x, y, z, yaw })

    // 古いサンプルを窓外になったら落とす。
    const cutoff = timeMs - this.windowMs
    let oldest = arr[0]
    while (oldest && oldest.timeMs < cutoff) {
      arr.shift()
      oldest = arr[0]
    }
  }

  /** プレイヤーの直近履歴を返す（射撃フェーズで巻き戻しに使用）。 */
  getHistory(id: number): readonly PositionSample[] {
    return this.history.get(id) ?? EMPTY
  }

  /** 離脱したプレイヤーの履歴を破棄する。 */
  clear(id: number): void {
    this.history.delete(id)
  }
}

const EMPTY: readonly PositionSample[] = []

/** 履歴に残るサンプル数の上限の目安（100ms × 60Hz ≈ 6 サンプル＋余裕）。 */
export const EXPECTED_SAMPLES = Math.ceil((LAGCOMP_HISTORY_MS / 1000) * SIM_TICK_HZ)
