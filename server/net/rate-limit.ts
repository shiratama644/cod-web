/**
 * トークンバケット。server.md: input 90/s burst 20。超過は即切断。
 * nowMs を引数に取り、テストは仮想時計で再現する。
 */

export const INPUT_RATE_PER_SEC = 90
export const INPUT_RATE_BURST = 20

export class TokenBucket {
  private tokens: number
  private lastMs: number

  constructor(
    readonly perSec: number,
    readonly burst: number,
    nowMs = 0,
  ) {
    this.tokens = burst
    this.lastMs = nowMs
  }

  /** 消費できれば true。不足なら false（トークンは減らさない）。 */
  tryConsume(nowMs: number, cost = 1): boolean {
    const elapsed = Math.max(0, nowMs - this.lastMs)
    this.lastMs = nowMs
    this.tokens = Math.min(this.burst, this.tokens + (elapsed / 1000) * this.perSec)
    if (this.tokens < cost) return false
    this.tokens -= cost
    return true
  }
}

/** プレイヤーごとの入力レート。未登録ならバースト満タンで作る。 */
export class InputRateLimiter {
  private readonly buckets = new Map<number, TokenBucket>()

  allow(playerId: number, nowMs: number): boolean {
    let bucket = this.buckets.get(playerId)
    if (!bucket) {
      bucket = new TokenBucket(INPUT_RATE_PER_SEC, INPUT_RATE_BURST, nowMs)
      this.buckets.set(playerId, bucket)
    }
    return bucket.tryConsume(nowMs)
  }

  remove(playerId: number): void {
    this.buckets.delete(playerId)
  }
}
