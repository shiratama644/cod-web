// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  INPUT_RATE_BURST,
  INPUT_RATE_PER_SEC,
  InputRateLimiter,
  TokenBucket,
} from '@server/net/rate-limit'

describe('TokenBucket', () => {
  it('同一時刻に burst まで消費でき、次は拒否する', () => {
    const b = new TokenBucket(INPUT_RATE_PER_SEC, INPUT_RATE_BURST, 0)
    for (let i = 0; i < INPUT_RATE_BURST; i++) {
      expect(b.tryConsume(0)).toBe(true)
    }
    expect(b.tryConsume(0)).toBe(false)
  })

  it('1 秒後は burst まで再充填される（90/s でも cap は 20）', () => {
    const b = new TokenBucket(INPUT_RATE_PER_SEC, INPUT_RATE_BURST, 0)
    for (let i = 0; i < INPUT_RATE_BURST; i++) b.tryConsume(0)
    expect(b.tryConsume(0)).toBe(false)
    for (let i = 0; i < INPUT_RATE_BURST; i++) {
      expect(b.tryConsume(1000)).toBe(true)
    }
    expect(b.tryConsume(1000)).toBe(false)
  })

  it('クライアント 60Hz では 10 秒間切れない', () => {
    const b = new TokenBucket(INPUT_RATE_PER_SEC, INPUT_RATE_BURST, 0)
    const interval = 1000 / 60
    for (let i = 0; i < 600; i++) {
      expect(b.tryConsume(i * interval)).toBe(true)
    }
  })

  it('同一時刻に 200 発は burst を超えた分が拒否', () => {
    const b = new TokenBucket(INPUT_RATE_PER_SEC, INPUT_RATE_BURST, 0)
    let ok = 0
    let denied = 0
    for (let i = 0; i < 200; i++) {
      if (b.tryConsume(0)) ok += 1
      else denied += 1
    }
    expect(ok).toBe(INPUT_RATE_BURST)
    expect(denied).toBe(200 - INPUT_RATE_BURST)
  })
})

describe('InputRateLimiter', () => {
  it('プレイヤー別に独立し、remove 後はバーストが戻る', () => {
    const lim = new InputRateLimiter()
    for (let i = 0; i < INPUT_RATE_BURST; i++) {
      expect(lim.allow(1, 0)).toBe(true)
    }
    expect(lim.allow(1, 0)).toBe(false)
    expect(lim.allow(2, 0)).toBe(true)
    lim.remove(1)
    expect(lim.allow(1, 0)).toBe(true)
  })
})
