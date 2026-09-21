// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createPlayerState, createSimWorld } from '@cod/protocol/types'

describe('protocol/types', () => {
  it('createPlayerState creates with defaults and custom spawn', () => {
    const p1 = createPlayerState(1)
    expect(p1.id).toBe(1)
    expect(p1.x).toBe(0)
    expect(p1.y).toBe(5)
    expect(p1.z).toBe(0)
    expect(p1.vx).toBe(0)
    expect(p1.grounded).toBe(false)
    expect(p1.lastInputSeq).toBe(0)

    const p2 = createPlayerState(42, 10, 20, 30)
    expect(p2.id).toBe(42)
    expect(p2.x).toBe(10)
    expect(p2.y).toBe(20)
    expect(p2.z).toBe(30)
  })

  it('createSimWorld creates empty world', () => {
    const w = createSimWorld()
    expect(w.players).toEqual([])
    expect(Array.isArray(w.players)).toBe(true)
  })

  it('SimWorld players array is independent per call', () => {
    const w1 = createSimWorld()
    const w2 = createSimWorld()
    w1.players.push(createPlayerState(1))
    expect(w2.players.length).toBe(0)
  })
})
