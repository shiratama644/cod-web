/**
 * 値を [min, max] の範囲にクランプする純粋関数。
 * FPS・DPR のクランプなど、ゲーム全体で使う最小ユーティリティ。
 */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new Error(`clamp: min (${min}) must not exceed max (${max})`)
  }
  if (value < min) return min
  if (value > max) return max
  return value
}
