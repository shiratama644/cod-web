// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  quantizePosition,
  dequantizePosition,
  quantizeVelocity,
  quantizeMoveAxis,
  dequantizeMoveAxis,
  quantizeYaw,
  quantizePitch,
  dequantizePitch,
  normalizeAngle,
} from '@cod/protocol/protocol/quantize'

describe('quantize branches', () => {
  it('position clamps to int16 range', () => {
    // 超過値はクランプされる分岐
    const large = quantizePosition(10000)
    const small = quantizePosition(-10000)
    expect(large).toBe(32767)
    expect(small).toBe(-32768)
    expect(dequantizePosition(large)).toBeGreaterThan(0)
  })

  it('velocity clamps', () => {
    expect(quantizeVelocity(10000)).toBe(32767)
    expect(quantizeVelocity(-10000)).toBe(-32768)
  })

  it('move axis clamps to -100..100', () => {
    expect(quantizeMoveAxis(10)).toBe(100)
    expect(quantizeMoveAxis(-10)).toBe(-100)
    expect(quantizeMoveAxis(0.5)).toBe(50)
    expect(dequantizeMoveAxis(100)).toBe(1)
    expect(dequantizeMoveAxis(-100)).toBe(-1)
  })

  it('yaw normalizes negative and large angles', () => {
    expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI, 5)
    expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI, 5)
    expect(normalizeAngle(0)).toBe(0)
    // quantize clamps to 0..65535
    expect(quantizeYaw(0)).toBe(0)
    expect(quantizeYaw(Math.PI * 2 - 0.0001)).toBeGreaterThan(60000)
  })

  it('pitch clamps to ±π/2', () => {
    expect(quantizePitch(Math.PI)).toBe(16384)
    expect(quantizePitch(-Math.PI)).toBe(-16384)
    expect(quantizePitch(0)).toBe(0)
    expect(dequantizePitch(0)).toBe(0)
  })

  it('dequantize roundtrip small errors', () => {
    for (const v of [-1, -0.5, 0, 0.5, 1]) {
      expect(Math.abs(dequantizeMoveAxis(quantizeMoveAxis(v)) - v)).toBeLessThan(0.02)
    }
  })
})
