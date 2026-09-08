import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { RendererHud } from '@/components/RendererHud'
import { gameStoreApi, useGameStore } from '@/store/gameStore'

// 注意: Babylon canvas は jsdom で WebGL が無いためテストしない（計画書 §6）。
// WebGL 非依存の DOM オーバーレイと、純粋な Zustand ストアのロジックを検証する。

describe('gameStore', () => {
  beforeEach(() => {
    // 各テストでストアを初期状態にリセット。
    useGameStore.setState({ renderer: null, hp: 100, ammo: 30 })
  })

  it('starts with sensible defaults', () => {
    const s = gameStoreApi.getState()
    expect(s.renderer).toBeNull()
    expect(s.hp).toBe(100)
    expect(s.ammo).toBe(30)
  })

  it('records the resolved renderer backend', () => {
    gameStoreApi.getState().setRenderer('babylon-webgl')
    expect(gameStoreApi.getState().renderer).toBe('babylon-webgl')
  })

  it('clamps hp into [0, 100] and ammo to >= 0', () => {
    gameStoreApi.getState().setHp(250)
    expect(gameStoreApi.getState().hp).toBe(100)
    gameStoreApi.getState().setHp(-20)
    expect(gameStoreApi.getState().hp).toBe(0)
    gameStoreApi.getState().setAmmo(-5)
    expect(gameStoreApi.getState().ammo).toBe(0)
  })

  it('notifies subscribers on change (subscribe / getState, no React re-render)', () => {
    const seen: Array<string | null> = []
    const unsub = gameStoreApi.subscribe((s) => seen.push(s.renderer))
    gameStoreApi.getState().setRenderer('babylon-webgl')
    unsub()
    expect(seen).toContain('babylon-webgl')
  })
})

describe('RendererHud', () => {
  beforeEach(() => {
    useGameStore.setState({ renderer: null, hp: 100, ammo: 30 })
  })

  it('shows initializing state before backend resolves', () => {
    render(<RendererHud />)
    expect(screen.getByRole('status')).toHaveTextContent(/initializing/i)
  })

  it('shows the resolved backend from the store', () => {
    useGameStore.setState({ renderer: 'babylon-webgl', hp: 100, ammo: 30 })
    render(<RendererHud />)
    expect(screen.getByRole('status')).toHaveTextContent(/babylon-webgl/i)
  })
})
