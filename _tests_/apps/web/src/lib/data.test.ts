// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  ATTACHMENT_SLOTS,
  ATTACHMENTS,
  type ClassLoadout,
  computeStats,
  DEFAULT_CLASSES,
  MAX_ATTACHMENTS,
  MODES,
  type SlotKey,
  STAT_LABELS,
  type StatKey,
  WEAPONS,
} from '../../../../../apps/web/src/lib/data'

const STAT_KEYS = Object.keys(STAT_LABELS) as StatKey[]

function makeClass(patch: Partial<ClassLoadout> = {}): ClassLoadout {
  return { ...DEFAULT_CLASSES[0], attachments: {}, ...patch }
}

describe('data integrity', () => {
  it('weapon id は一意で、全 stat が 0..100 に収まる', () => {
    const ids = WEAPONS.map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const w of WEAPONS) {
      for (const k of STAT_KEYS) {
        expect(w.stats[k]).toBeGreaterThanOrEqual(0)
        expect(w.stats[k]).toBeLessThanOrEqual(100)
      }
    }
  })

  it('ATTACHMENT_SLOTS のキーと ATTACHMENTS のキーが 1:1 対応する', () => {
    const slotKeys = ATTACHMENT_SLOTS.map((s) => s.key).sort()
    expect(Object.keys(ATTACHMENTS).sort()).toEqual(slotKeys)
  })

  it('DEFAULT_CLASSES は実在 weapon / attachment のみ参照し、装備数上限を守る', () => {
    for (const c of DEFAULT_CLASSES) {
      expect(WEAPONS.some((w) => w.id === c.primary)).toBe(true)
      const entries = Object.entries(c.attachments) as [SlotKey, string][]
      expect(entries.length).toBeLessThanOrEqual(MAX_ATTACHMENTS)
      for (const [slot, id] of entries) {
        expect(ATTACHMENTS[slot].some((a) => a.id === id)).toBe(true)
      }
    }
  })

  it('MODES は MP/BR/ZM の各タブに id 一意のモードを持つ', () => {
    for (const tab of ['MP', 'BR', 'ZM'] as const) {
      const ids = MODES[tab].map((m) => m.id)
      expect(ids.length).toBeGreaterThan(0)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('computeStats', () => {
  it('アタッチメントなしでは base と final が一致する', () => {
    const { base, final } = computeStats(makeClass())
    expect(final).toEqual(base)
  })

  it('アタッチメントの mods が final に加算される', () => {
    const slot = 'muzzle' satisfies SlotKey
    const att = ATTACHMENTS[slot][0]
    const { base, final } = computeStats(makeClass({ attachments: { [slot]: att.id } }))
    for (const k of STAT_KEYS) {
      const expected = Math.max(0, Math.min(100, base[k] + (att.mods[k] ?? 0)))
      expect(final[k]).toBe(expected)
    }
  })

  it('final は 0..100 にクランプされる(全スロット装備の網羅走査)', () => {
    for (const w of WEAPONS) {
      for (const slotDef of ATTACHMENT_SLOTS) {
        for (const att of ATTACHMENTS[slotDef.key]) {
          const { final } = computeStats(
            makeClass({ primary: w.id, attachments: { [slotDef.key]: att.id } }),
          )
          for (const k of STAT_KEYS) {
            expect(final[k]).toBeGreaterThanOrEqual(0)
            expect(final[k]).toBeLessThanOrEqual(100)
          }
        }
      }
    }
  })

  it('未知の weapon id は先頭武器にフォールバックする', () => {
    const { base } = computeStats(makeClass({ primary: 'no-such-weapon' }))
    expect(base).toEqual(WEAPONS[0].stats)
  })

  it('未知の attachment id は無視される', () => {
    const { base, final } = computeStats(makeClass({ attachments: { muzzle: 'no-such-att' } }))
    expect(final).toEqual(base)
  })

  it('base オブジェクトを書き換えない(final は別インスタンス)', () => {
    const slot = 'barrel' satisfies SlotKey
    const att = ATTACHMENTS[slot].find((a) => Object.keys(a.mods).length > 0)
    expect(att).toBeDefined()
    const weapon = WEAPONS[0]
    const before = { ...weapon.stats }
    computeStats(makeClass({ primary: weapon.id, attachments: { [slot]: att?.id } }))
    expect(weapon.stats).toEqual(before)
  })
})
