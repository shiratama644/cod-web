/**
 * 固定小数点量子化ヘルパー。
 *
 * パケット上は整数（int16/uint16/int8）に詰め、シミュレーションは必ず
 * デコード後の浮動小数点数を使う。クライアント予測とサーバー権威が同じ
 * encode → decode を経由することで、量子化誤差が両者で一致する（決定論）。
 */

import { PITCH_SCALE, POS_SCALE, VEL_SCALE, YAW_SCALE } from './constants'

const TWO_PI = Math.PI * 2
const U16_MAX = 0xffff
const I16_MIN = -0x8000
const I16_MAX = 0x7fff
const I8_MIN = -0x80
const I8_MAX = 0x7f

function clampInt(v: number, min: number, max: number): number {
  const n = Math.round(v)
  return n < min ? min : n > max ? max : n
}

// ── 位置（0.01m 単位, int16。原点 ±327.67m） ──────────────────────────────

export function quantizePosition(meters: number): number {
  return clampInt(meters * POS_SCALE, I16_MIN, I16_MAX)
}

export function dequantizePosition(quantized: number): number {
  return quantized / POS_SCALE
}

// ── 速度（0.01m/s 単位, int16） ───────────────────────────────────────────

export function quantizeVelocity(mps: number): number {
  return clampInt(mps * VEL_SCALE, I16_MIN, I16_MAX)
}

export function dequantizeVelocity(quantized: number): number {
  return quantized / VEL_SCALE
}

// ── yaw（0〜2π → 0〜65535, uint16） ───────────────────────────────────────

/** 任意のラジアンを [0, 2π) に正規化する。 */
export function normalizeAngle(rad: number): number {
  const a = rad % TWO_PI
  return a < 0 ? a + TWO_PI : a
}

export function quantizeYaw(rad: number): number {
  return clampInt(normalizeAngle(rad) * YAW_SCALE, 0, U16_MAX)
}

export function dequantizeYaw(quantized: number): number {
  return quantized / YAW_SCALE
}

// ── pitch（-π/2〜+π/2 → -128〜127, int8） ─────────────────────────────────

export function quantizePitch(rad: number): number {
  // クランプしてから丸める（視点はそもそも ±π/2 を超えないが安全のため）。
  const clamped = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rad))
  return clampInt(clamped * PITCH_SCALE, I8_MIN, I8_MAX)
}

export function dequantizePitch(quantized: number): number {
  return quantized / PITCH_SCALE
}
