// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { LagCompStore } from '@cod/engine-core/net/lagcomp-store'

describe('LagCompStore — 履歴とリーク防止', () => {
  it('record で履歴が増え、clear で消える', () => {
    const store = new LagCompStore()
    store.record(1, 0, 1, 0, 0, 0, 0)
    store.record(2, 16, 1, 1, 0, 0, 0)
    expect(store.getHistory(1)).toHaveLength(2)
    store.clear(1)
    expect(store.getHistory(1)).toHaveLength(0)
  })

  it('存在しない id の clear は例外を投げない', () => {
    const store = new LagCompStore()
    expect(() => store.clear(999)).not.toThrow()
  })

  it('複数プレイヤーの履歴は独立', () => {
    const store = new LagCompStore()
    store.record(1, 0, 1, 0, 0, 0, 0)
    store.record(1, 0, 2, 10, 0, 0, 0)
    expect(store.getHistory(1)).toHaveLength(1)
    expect(store.getHistory(2)).toHaveLength(1)
    store.clear(1)
    expect(store.getHistory(1)).toHaveLength(0)
    expect(store.getHistory(2)).toHaveLength(1)
  })
})
