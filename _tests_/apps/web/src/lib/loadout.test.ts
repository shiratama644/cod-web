// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { type ClassLoadout, DEFAULT_CLASSES } from '../../../../../apps/web/src/lib/data'
import {
  type SavedLoadouts,
  sanitizeClass,
  sanitizeSaved,
} from '../../../../../apps/web/src/lib/loadout'

const fallback = DEFAULT_CLASSES[0]

describe('sanitizeClass', () => {
  it('well-formed なクラスはそのまま通す', () => {
    const c: ClassLoadout = {
      name: 'CUSTOM',
      primary: 'qq9',
      secondary: 'MW11',
      lethal: 'Semtex',
      tactical: 'Stim',
      skill: 'Purifier',
      perks: ['a', 'b', 'c'],
      attachments: { muzzle: 'mz1', optic: 'op2' },
    }
    expect(sanitizeClass(c, fallback)).toEqual(c)
  })

  it.each([null, undefined, 42, 'str', true])('非オブジェクト %p は fallback を返す', (raw) => {
    expect(sanitizeClass(raw, fallback)).toEqual(fallback)
  })

  it('欠落・空文字・型違いのフィールドは fallback 値で補完する', () => {
    const out = sanitizeClass({ name: '', primary: 7, secondary: 'Shorty' }, fallback)
    expect(out.name).toBe(fallback.name)
    expect(out.primary).toBe(fallback.primary)
    expect(out.secondary).toBe('Shorty')
    expect(out.lethal).toBe(fallback.lethal)
    expect(out.perks).toEqual(fallback.perks)
    expect(out.attachments).toEqual({})
  })

  it('perks は要素単位で補完し、常に 3 要素になる', () => {
    const out = sanitizeClass({ perks: ['X', 123] }, fallback)
    expect(out.perks).toEqual(['X', fallback.perks[1], fallback.perks[2]])
    expect(sanitizeClass({ perks: 'not-array' }, fallback).perks).toEqual(fallback.perks)
  })

  it('attachments は文字列値のみ残す', () => {
    const out = sanitizeClass({ attachments: { muzzle: 'mz1', barrel: 1, optic: null } }, fallback)
    expect(out.attachments).toEqual({ muzzle: 'mz1' })
    expect(sanitizeClass({ attachments: 'broken' }, fallback).attachments).toEqual({})
  })
})

describe('sanitizeSaved', () => {
  const classes = (): ClassLoadout[] => DEFAULT_CLASSES.map((c) => ({ ...c }))

  it('equipped を classes の範囲内にクランプする', () => {
    expect(sanitizeSaved({ classes: classes(), equipped: 99 }).equipped).toBe(
      DEFAULT_CLASSES.length - 1,
    )
    expect(sanitizeSaved({ classes: classes(), equipped: -5 }).equipped).toBe(0)
    expect(sanitizeSaved({ classes: classes(), equipped: 1 }).equipped).toBe(1)
  })

  it('equipped が整数でなければ 0 にする', () => {
    expect(sanitizeSaved({ classes: classes(), equipped: 1.5 }).equipped).toBe(0)
    expect(sanitizeSaved({ classes: classes(), equipped: Number.NaN as number }).equipped).toBe(0)
  })

  it('壊れたクラスは位置対応する DEFAULT_CLASSES で補完する', () => {
    const data = { classes: [null, { name: 'OK2' }], equipped: 0 } as unknown as SavedLoadouts
    const out = sanitizeSaved(data)
    expect(out.classes[0]).toEqual(DEFAULT_CLASSES[0])
    expect(out.classes[1].name).toBe('OK2')
    expect(out.classes[1].primary).toBe(DEFAULT_CLASSES[1].primary)
  })

  it('DEFAULT_CLASSES より多いクラス数でも fallback が循環して適用される', () => {
    const many = Array.from({ length: DEFAULT_CLASSES.length + 2 }, () => null)
    const out = sanitizeSaved({ classes: many, equipped: 0 } as unknown as SavedLoadouts)
    expect(out.classes).toHaveLength(DEFAULT_CLASSES.length + 2)
    expect(out.classes[DEFAULT_CLASSES.length]).toEqual(DEFAULT_CLASSES[0])
  })
})
