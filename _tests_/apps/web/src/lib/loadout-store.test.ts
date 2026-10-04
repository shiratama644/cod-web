import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CLASSES } from '../../../../../apps/web/src/lib/data'
import type { SavedLoadouts } from '../../../../../apps/web/src/lib/loadout'
import {
  clearLocalLoadouts,
  loadLoadouts,
  saveLoadouts,
} from '../../../../../apps/web/src/lib/loadout-store'

const sample: SavedLoadouts = { classes: DEFAULT_CLASSES.slice(0, 2), equipped: 1 }
const sample2: SavedLoadouts = { classes: DEFAULT_CLASSES.slice(0, 3), equipped: 2 }

/** fetch 互換のモックを作る。 */
const okJson = (data: SavedLoadouts | null) =>
  vi.fn(async () => new Response(JSON.stringify({ data }), { status: 200 })) as typeof fetch
const httpError = () => vi.fn(async () => new Response('down', { status: 500 })) as typeof fetch
const network = () => vi.fn(async () => Promise.reject(new Error('offline'))) as typeof fetch

beforeEach(async () => {
  await clearLocalLoadouts()
})

describe('saveLoadouts', () => {
  it('API 成功時は api を返す', async () => {
    const f = okJson(null)
    await expect(saveLoadouts(sample, f)).resolves.toBe('api')
    expect(f).toHaveBeenCalledWith(
      '/api/loadouts',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ data: sample }) }),
    )
  })

  it('API が HTTP エラーでも IndexedDB に書けたら local を返す', async () => {
    await expect(saveLoadouts(sample, httpError())).resolves.toBe('local')
  })

  it('API 不達(ネットワーク断)でも local を返し、データが残る', async () => {
    await expect(saveLoadouts(sample, network())).resolves.toBe('local')
    const r = await loadLoadouts(network())
    expect(r).toEqual({ data: sample, source: 'local' })
  })
})

describe('loadLoadouts', () => {
  it('API にデータがあれば api ソースで返す', async () => {
    const r = await loadLoadouts(okJson(sample))
    expect(r).toEqual({ data: sample, source: 'api' })
  })

  it('API 取得分は IndexedDB にミラーされ、オフラインでも読める', async () => {
    await loadLoadouts(okJson(sample2))
    const r = await loadLoadouts(network())
    expect(r).toEqual({ data: sample2, source: 'local' })
  })

  it('API が null でローカルにデータがあればフォールバックする', async () => {
    await saveLoadouts(sample, network())
    const r = await loadLoadouts(okJson(null))
    expect(r).toEqual({ data: sample, source: 'local' })
  })

  it('API が null でローカルも空なら none', async () => {
    const r = await loadLoadouts(okJson(null))
    expect(r).toEqual({ data: null, source: 'none' })
  })

  it('API が HTTP エラーでローカルも空なら none', async () => {
    const r = await loadLoadouts(httpError())
    expect(r).toEqual({ data: null, source: 'none' })
  })

  it('保存 → 読込のラウンドトリップ(上書きも最新が勝つ)', async () => {
    await saveLoadouts(sample, network())
    await saveLoadouts(sample2, network())
    const r = await loadLoadouts(network())
    expect(r).toEqual({ data: sample2, source: 'local' })
  })
})
