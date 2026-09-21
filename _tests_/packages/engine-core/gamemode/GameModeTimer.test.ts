// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { GameModeTimer } from '@cod/engine-core/gamemode/GameModeTimer'

describe('GameModeTimer', () => {
  it('after: 指定tick後に一度だけ実行', () => {
    const timer = new GameModeTimer()
    const cb = vi.fn()
    timer.after(3, cb, 0)
    timer.tick(0)
    expect(cb).not.toHaveBeenCalled()
    timer.tick(2)
    expect(cb).not.toHaveBeenCalled()
    timer.tick(3)
    expect(cb).toHaveBeenCalledTimes(1)
    timer.tick(4)
    expect(cb).toHaveBeenCalledTimes(1) // 一度きり
  })

  it('every: 指定tickごとに繰り返し実行', () => {
    const timer = new GameModeTimer()
    const cb = vi.fn()
    timer.every(2, cb, 0)
    timer.tick(1)
    expect(cb).not.toHaveBeenCalled()
    timer.tick(2)
    expect(cb).toHaveBeenCalledTimes(1)
    timer.tick(3)
    expect(cb).toHaveBeenCalledTimes(1)
    timer.tick(4)
    expect(cb).toHaveBeenCalledTimes(2)
    timer.tick(6)
    expect(cb).toHaveBeenCalledTimes(3)
  })

  it('cancel: タイマーをキャンセルできる', () => {
    const timer = new GameModeTimer()
    const cb = vi.fn()
    const id = timer.after(5, cb, 0)
    timer.cancel(id)
    timer.tick(10)
    expect(cb).not.toHaveBeenCalled()
    expect(timer.size).toBe(0)
  })

  it('setTimeoutを使わない (コードにsetTimeout文字列が無いことを保証)', () => {
    // 実装がsetTimeoutを使っていないことを静的に確認する代わりに、
    // timerがtick基準で動くことを検証
    const timer = new GameModeTimer()
    const cb = vi.fn()
    timer.after(1, cb, 100)
    // nowTickが進まなければ発火しない
    timer.tick(100)
    expect(cb).not.toHaveBeenCalled()
    timer.tick(101)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('コールバック例外でroomが落ちない (例外安全)', () => {
    const timer = new GameModeTimer()
    const cb1 = vi.fn(() => {
      throw new Error('mode error')
    })
    const cb2 = vi.fn()
    timer.after(1, cb1, 0)
    timer.after(1, cb2, 0)
    expect(() => timer.tick(1)).not.toThrow()
    expect(cb1).toHaveBeenCalled()
    expect(cb2).toHaveBeenCalled() // 例外があっても他のcbは実行される
  })

  it('everyの例外でも他のタイマーは継続', () => {
    const timer = new GameModeTimer()
    const cbError = vi.fn(() => {
      throw new Error('err')
    })
    const cbOk = vi.fn()
    timer.every(1, cbError, 0)
    timer.every(1, cbOk, 0)
    timer.tick(1)
    expect(cbError).toHaveBeenCalledTimes(1)
    expect(cbOk).toHaveBeenCalledTimes(1)
    timer.tick(2)
    expect(cbError).toHaveBeenCalledTimes(2)
    expect(cbOk).toHaveBeenCalledTimes(2)
  })

  it('after 0 tickは即時実行 (次tick)', () => {
    const timer = new GameModeTimer()
    const cb = vi.fn()
    timer.after(0, cb, 5)
    timer.tick(5)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('sizeとclearが正しく動作', () => {
    const timer = new GameModeTimer()
    timer.after(10, () => {}, 0)
    timer.every(5, () => {}, 0)
    expect(timer.size).toBe(2)
    timer.clear()
    expect(timer.size).toBe(0)
  })
})
