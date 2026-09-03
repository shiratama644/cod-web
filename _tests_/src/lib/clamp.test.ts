import { describe, expect, it } from 'vitest'
import { clamp } from '@/lib/clamp'

describe('clamp', () => {
  it('returns the value when within range', () => {
    expect(clamp(60, 30, 120)).toBe(60)
  })

  it('clamps to min when below', () => {
    expect(clamp(10, 30, 120)).toBe(30)
  })

  it('clamps to max when above', () => {
    expect(clamp(200, 30, 120)).toBe(120)
  })

  it('supports DPR-style fractional bounds', () => {
    expect(clamp(2.5, 1, 1.5)).toBe(1.5)
    expect(clamp(0.8, 1, 1.5)).toBe(1)
  })

  it('throws when min exceeds max', () => {
    expect(() => clamp(1, 10, 5)).toThrow(/must not exceed/)
  })
})
