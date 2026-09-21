// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  MOCK_CARDS,
  filterByParentGenre,
  filterBySubTag,
  filterBySearch,
  sortByKey,
  applySandboxFilters,
} from '@/lib/sandbox.ts'
import type { SandboxCard } from '@cod/gamemode-api'

describe('sandbox lib — PH4-D 親ジャンル+サブタグフィルタ+ソート 公式拡張+UGC', () => {
  it('MOCK_CARDS contains official extension and UGC', () => {
    expect(MOCK_CARDS.length).toBeGreaterThanOrEqual(6)
    const official = MOCK_CARDS.filter((c: SandboxCard) => c.source === 'official')
    const ugc = MOCK_CARDS.filter((c: SandboxCard) => c.source === 'ugc')
    expect(official.length).toBeGreaterThanOrEqual(3) // zombie, bedwars, tdm official
    expect(ugc.length).toBeGreaterThanOrEqual(3)
    expect(MOCK_CARDS.some((c: SandboxCard) => c.creator === 'Official')).toBe(true)
  })

  it('filterByParentGenre fps/voxel/all', () => {
    const fps = filterByParentGenre(MOCK_CARDS, 'fps')
    expect(fps.every((c: SandboxCard) => c.parentGenre === 'fps')).toBe(true)
    expect(fps.length).toBeGreaterThan(0)

    const voxel = filterByParentGenre(MOCK_CARDS, 'voxel')
    expect(voxel.every((c: SandboxCard) => c.parentGenre === 'voxel')).toBe(true)

    const all = filterByParentGenre(MOCK_CARDS, 'all')
    expect(all.length).toBe(MOCK_CARDS.length)
  })

  it('filterBySubTag bedwars/zombie/athletic/tdm/all', () => {
    const zombie = filterBySubTag(MOCK_CARDS, 'zombie')
    expect(zombie.length).toBe(2) // official + ugc zombie
    expect(zombie.every((c: SandboxCard) => c.genres.includes('zombie'))).toBe(true)

    const bedwars = filterBySubTag(MOCK_CARDS, 'bedwars')
    expect(bedwars.length).toBe(2) // official + ugc bedwars

    const athletic = filterBySubTag(MOCK_CARDS, 'athletic')
    expect(athletic.length).toBe(1)

    const tdm = filterBySubTag(MOCK_CARDS, 'tdm')
    expect(tdm.length).toBe(1)

    const all = filterBySubTag(MOCK_CARDS, 'all')
    expect(all.length).toBe(MOCK_CARDS.length)
  })

  it('filterBySearch title/creator/tags', () => {
    const officialSearch = filterBySearch(MOCK_CARDS, 'Official')
    expect(officialSearch.length).toBeGreaterThanOrEqual(3)

    const zombieSearch = filterBySearch(MOCK_CARDS, 'zombie')
    expect(zombieSearch.length).toBe(2)

    const empty = filterBySearch(MOCK_CARDS, '')
    expect(empty.length).toBe(MOCK_CARDS.length)
  })

  it('sortByKey totalPlays/activePlayers/detailViews desc/asc', () => {
    const byPlaysDesc = sortByKey(MOCK_CARDS, 'totalPlays', 'desc')
    for (let i = 1; i < byPlaysDesc.length; i++) {
      expect(byPlaysDesc[i - 1].totalPlays).toBeGreaterThanOrEqual(byPlaysDesc[i].totalPlays)
    }

    const byActiveAsc = sortByKey(MOCK_CARDS, 'activePlayers', 'asc')
    for (let i = 1; i < byActiveAsc.length; i++) {
      expect(byActiveAsc[i - 1].activePlayers).toBeLessThanOrEqual(byActiveAsc[i].activePlayers)
    }

    const byViewsDesc = sortByKey(MOCK_CARDS, 'detailViews', 'desc')
    expect(byViewsDesc[0].detailViews).toBeGreaterThanOrEqual(byViewsDesc[byViewsDesc.length - 1].detailViews)
  })

  it('applySandboxFilters combines parent+subTag+search+sort', () => {
    const result = applySandboxFilters(MOCK_CARDS, {
      parentGenre: 'fps',
      subTag: 'zombie',
      sort: 'totalPlays',
      order: 'desc',
      search: '',
    })
    expect(result.length).toBe(2)
    expect(result.every((c: SandboxCard) => c.parentGenre === 'fps' && c.genres.includes('zombie'))).toBe(true)
    expect(result[0].totalPlays).toBeGreaterThanOrEqual(result[1].totalPlays)

    const withSearch = applySandboxFilters(MOCK_CARDS, {
      parentGenre: 'all',
      subTag: 'all',
      sort: 'totalPlays',
      search: 'Bedwars',
    })
    expect(withSearch.length).toBe(2)
    expect(withSearch.every((c: SandboxCard) => c.genres.includes('bedwars'))).toBe(true)
  })

  it('cards have required display fields thumbnail/title/creator/plays/desc', () => {
    for (const card of MOCK_CARDS) {
      expect(card.thumbnail).toBeTruthy()
      expect(card.title).toBeTruthy()
      expect(card.creator).toBeTruthy()
      expect(typeof card.totalPlays).toBe('number')
      expect(card.description).toBeTruthy()
      expect(card.parentGenre).toMatch(/fps|voxel/)
      expect(card.genres.length).toBeGreaterThan(0)
      expect(card.category).toBe('Sandbox')
    }
  })
})
