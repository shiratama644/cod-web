/**
 * GameModeTimer — tick基準タイマー (setTimeout禁止)
 *
 * after/every/cancel を tick で管理。決定論のため nowMs ではなく tick 数で管理。
 * 例外安全: コールバック例外は catch して握りつぶす (room を落とさない)。
 * ゼロアロケ: Map + head indexリングの思想で、不要な配列確保を避ける。
 */

export interface TimerEntry {
  dueTick: number
  interval?: number
  cb: () => void
}

export class GameModeTimer {
  private readonly timers = new Map<number, TimerEntry>()
  private nextId = 1

  /** tick 後に一度だけ実行 */
  after(ticks: number, cb: () => void, nowTick: number): number {
    const id = this.nextId++
    const safeTicks = Math.max(0, Math.floor(ticks))
    this.timers.set(id, { dueTick: nowTick + safeTicks, cb })
    return id
  }

  /** tick ごとに繰り返し実行 */
  every(ticks: number, cb: () => void, nowTick: number): number {
    const id = this.nextId++
    const safeTicks = Math.max(1, Math.floor(ticks))
    this.timers.set(id, { dueTick: nowTick + safeTicks, interval: safeTicks, cb })
    return id
  }

  cancel(id: number): void {
    this.timers.delete(id)
  }

  /** 現在tickで期限のタイマーを実行 */
  tick(nowTick: number): void {
    // 期限切れを集めてから実行 (Map iteration中の削除/更新を安全に)
    const due: Array<{ id: number; entry: TimerEntry }> = []
    for (const [id, entry] of this.timers) {
      if (nowTick >= entry.dueTick) {
        due.push({ id, entry })
      }
    }
    for (const { id, entry } of due) {
      try {
        entry.cb()
      } catch {
        // 例外は握りつぶす (room を落とさない)
      }
      if (entry.interval !== undefined) {
        // 繰り返し: 次の期限を更新 (intervalが削除されていなければ)
        const current = this.timers.get(id)
        if (current) {
          current.dueTick = nowTick + entry.interval
        }
      } else {
        // 一度きり: 削除
        this.timers.delete(id)
      }
    }
  }

  /** テスト用: 現在のタイマー数 */
  get size(): number {
    return this.timers.size
  }

  clear(): void {
    this.timers.clear()
  }
}
