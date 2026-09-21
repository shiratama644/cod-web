/**
 * sandbox.ts — Sandboxモーダル用フィルタ/ソート/mockデータ (PH4-D)
 *
 * 2026-09-22改訂版: Sandboxは標準FPS/Voxel以外の公式ゲーム + UGC、親ジャンル FPS/Voxel + サブタグ Bedwars/Zombie/Athletic
 * - 親ジャンルフィルタ: FPS / Voxel
 * - サブタグフィルタ: Bedwars, Zombie, Athletic, TDM, DOM, FFA等
 * - ソート: totalPlays / activePlayers / detailViews
 * - カード: thumbnail/title/creator/plays/desc、creatorは Official または ユーザー名 (公式拡張+UGC)
 */

import type {
  ParentGenre,
  ParentGenreFilter,
  SandboxCard,
  SandboxSortKey,
  SubTagFilter,
} from '@cod/gamemode-api'

export type { ParentGenre, ParentGenreFilter, SubTagFilter, SandboxSortKey, SandboxCard }

export const MOCK_CARDS: SandboxCard[] = [
  {
    id: 'fps-official-zombie',
    type: 'fps',
    source: 'official',
    slug: 'zombie',
    parentGenre: 'fps',
    genres: ['zombie'],
    tags: ['official', 'zombie', 'pve'],
    title: 'Zombie (Official拡張)',
    creator: 'Official',
    thumbnail: '/thumb/zombie.png',
    totalPlays: 5432,
    activePlayers: 8,
    detailViews: 1234,
    description: 'Official Zombie survival - 公式拡張FPS',
    category: 'Sandbox',
  },
  {
    id: 'voxel-official-bedwars',
    type: 'voxel',
    source: 'official',
    slug: 'bedwars',
    parentGenre: 'voxel',
    genres: ['bedwars'],
    tags: ['official', 'bedwars', 'pvp'],
    title: 'Bedwars (Official拡張)',
    creator: 'Official',
    thumbnail: '/thumb/bedwars.png',
    totalPlays: 10234,
    activePlayers: 12,
    detailViews: 3456,
    description: 'Official Bedwars - 公式拡張Voxel',
    category: 'Sandbox',
  },
  {
    id: 'fps-ugc-zombie-1',
    type: 'fps',
    source: 'ugc',
    slug: 'zombie',
    parentGenre: 'fps',
    genres: ['zombie'],
    tags: ['ugc', 'zombie', 'pve'],
    title: 'Zombie Survival UGC',
    creator: 'Zombiemaster',
    thumbnail: '/thumb/zombie-ugc.png',
    totalPlays: 3210,
    activePlayers: 5,
    detailViews: 890,
    description: 'UGC Zombie survival by community',
    category: 'Sandbox',
  },
  {
    id: 'voxel-ugc-athletic-1',
    type: 'voxel',
    source: 'ugc',
    slug: 'athletic',
    parentGenre: 'voxel',
    genres: ['athletic'],
    tags: ['ugc', 'athletic', 'parkour'],
    title: 'Athletic Parkour UGC',
    creator: 'ParkourKing',
    thumbnail: '/thumb/athletic.png',
    totalPlays: 2100,
    activePlayers: 3,
    detailViews: 567,
    description: 'UGC Athletic parkour challenge',
    category: 'Sandbox',
  },
  {
    id: 'fps-official-tdm',
    type: 'fps',
    source: 'official',
    slug: 'tdm',
    parentGenre: 'fps',
    genres: ['tdm'],
    tags: ['official', 'tdm', 'pvp'],
    title: 'TDM (Official拡張)',
    creator: 'Official',
    thumbnail: '/thumb/tdm.png',
    totalPlays: 8765,
    activePlayers: 15,
    detailViews: 2345,
    description: 'Official Team Deathmatch - 公式拡張FPS',
    category: 'Sandbox',
  },
  {
    id: 'voxel-ugc-bedwars-1',
    type: 'voxel',
    source: 'ugc',
    slug: 'bedwars',
    parentGenre: 'voxel',
    genres: ['bedwars'],
    tags: ['ugc', 'bedwars', 'pvp'],
    title: 'Bedwars Classic UGC',
    creator: 'BedwarsFan',
    thumbnail: '/thumb/bedwars-ugc.png',
    totalPlays: 4567,
    activePlayers: 7,
    detailViews: 1234,
    description: 'UGC Bedwars classic',
    category: 'Sandbox',
  },
]

export function filterByParentGenre(cards: SandboxCard[], parent: ParentGenreFilter): SandboxCard[] {
  if (parent === 'all') return cards
  return cards.filter((c) => c.parentGenre === parent)
}

export function filterBySubTag(cards: SandboxCard[], subTag: SubTagFilter): SandboxCard[] {
  if (subTag === 'all') return cards
  return cards.filter((c) => c.genres.includes(subTag))
}

export function filterBySearch(cards: SandboxCard[], search: string): SandboxCard[] {
  if (!search || search.trim() === '') return cards
  const lower = search.toLowerCase()
  return cards.filter(
    (c) =>
      c.title.toLowerCase().includes(lower) ||
      c.description.toLowerCase().includes(lower) ||
      c.creator.toLowerCase().includes(lower) ||
      c.tags.some((t) => t.toLowerCase().includes(lower)) ||
      c.genres.some((g) => g.toLowerCase().includes(lower)),
  )
}

export function sortByKey(
  cards: SandboxCard[],
  key: SandboxSortKey,
  order: 'desc' | 'asc' = 'desc',
): SandboxCard[] {
  return [...cards].sort((a, b) => {
    const diff = a[key] - b[key]
    return order === 'desc' ? -diff : diff
  })
}

export interface SandboxFilterOptions {
  parentGenre: ParentGenreFilter
  subTag: SubTagFilter
  sort: SandboxSortKey
  order?: 'desc' | 'asc'
  search?: string
}

export function applySandboxFilters(cards: SandboxCard[], opts: SandboxFilterOptions): SandboxCard[] {
  let result = cards
  result = filterByParentGenre(result, opts.parentGenre)
  result = filterBySubTag(result, opts.subTag)
  if (opts.search) {
    result = filterBySearch(result, opts.search)
  }
  result = sortByKey(result, opts.sort, opts.order ?? 'desc')
  return result
}

export const PARENT_GENRE_OPTIONS: ParentGenreFilter[] = ['all', 'fps', 'voxel']
export const SUBTAG_OPTIONS: SubTagFilter[] = ['all', 'bedwars', 'zombie', 'athletic', 'tdm', 'dom', 'ffa']
export const SORT_OPTIONS: SandboxSortKey[] = ['totalPlays', 'activePlayers', 'detailViews']
