// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  MODE_MESSAGE_RATE_BURST,
  MODE_MESSAGE_RATE_PER_SEC,
  ModeMessageRateLimiter,
  TokenBucket,
} from '@cod/engine-core/net/rate-limit'

describe('ModeMessageRateLimiter', () => {
  it('定数が40/s burst20', () => {
    expect(MODE_MESSAGE_RATE_PER_SEC).toBe(40)
    expect(MODE_MESSAGE_RATE_BURST).toBe(20)
  })

  it('同一時刻にburstまで消費でき、超過時false', () => {
    const lim = new ModeMessageRateLimiter()
    for (let i = 0; i < MODE_MESSAGE_RATE_BURST; i++) {
      expect(lim.allow('player1', 0)).toBe(true)
    }
    expect(lim.allow('player1', 0)).toBe(false)
  })

  it('1秒後はburstまで再充填', () => {
    const lim = new ModeMessageRateLimiter()
    for (let i = 0; i < MODE_MESSAGE_RATE_BURST; i++) lim.allow('p1', 0)
    expect(lim.allow('p1', 0)).toBe(false)
    for (let i = 0; i < MODE_MESSAGE_RATE_BURST; i++) {
      expect(lim.allow('p1', 1000)).toBe(true)
    }
    expect(lim.allow('p1', 1000)).toBe(false)
  })

  it('プレイヤー別に独立', () => {
    const lim = new ModeMessageRateLimiter()
    for (let i = 0; i < MODE_MESSAGE_RATE_BURST; i++) {
      expect(lim.allow('a', 0)).toBe(true)
    }
    expect(lim.allow('a', 0)).toBe(false)
    expect(lim.allow('b', 0)).toBe(true) // 別プレイヤーはOK
  })

  it('remove後はバーストが戻る', () => {
    const lim = new ModeMessageRateLimiter()
    for (let i = 0; i < MODE_MESSAGE_RATE_BURST; i++) lim.allow('x', 0)
    expect(lim.allow('x', 0)).toBe(false)
    lim.remove('x')
    expect(lim.allow('x', 0)).toBe(true)
  })

  it('40/sでは持続的に許可 (60Hz inputと違い40Hzでも持続)', () => {
    const lim = new ModeMessageRateLimiter()
    const interval = 1000 / 40
    // 40/sで10秒間 = 400回、burst 20があるので持続するはず
    for (let i = 0; i < 400; i++) {
      const ok = lim.allow('p', i * interval)
      expect(ok).toBe(true)
    }
  })

  it('超過時falseを返し、切断ではなくfalse (Inputと違い)', () => {
    // Inputは超過で切断だが、modeMessageはfalseを返す
    const lim = new ModeMessageRateLimiter()
    let falseCount = 0
    for (let i = 0; i < MODE_MESSAGE_RATE_BURST + 5; i++) {
      if (!lim.allow('player', 0)) falseCount++
    }
    expect(falseCount).toBe(5)
  })

  it('TokenBucketで40/s burst20の動作確認', () => {
    const b = new TokenBucket(MODE_MESSAGE_RATE_PER_SEC, MODE_MESSAGE_RATE_BURST, 0)
    let ok = 0
    for (let i = 0; i < 100; i++) {
      if (b.tryConsume(0)) ok++
    }
    expect(ok).toBe(MODE_MESSAGE_RATE_BURST)
  })
})
