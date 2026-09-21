/**
 * matchmaker-mock.ts — Phase 4 mock API (PH4-D/E)
 *
 * 本実装 Redis/HMACはPhase 5以降。Phase 4ではmockのみ。
 * - Official FPSサブモード投票
 * - Sandbox公式拡張+UGC一覧
 * - Play Now / Room Selection mock
 */

import type { SandboxCard, SubTag } from '@cod/gamemode-api'
import { MOCK_CARDS, applySandboxFilters, type SandboxFilterOptions } from './sandbox.ts'

export const mockOfficialFpsSubModes: SubTag[] = ['ffa', 'tdm', 'dom']

export const mockGameModes: SandboxCard[] = MOCK_CARDS

export interface RoomSummary {
  readonly roomId: string
  readonly modeId: string
  readonly map: string
  readonly players: number
  readonly maxPlayers: number
  readonly region: string
}

export const mockRooms: RoomSummary[] = [
  { roomId: 'room-fps-1', modeId: 'fps-official-zombie', map: 'zombie-arena', players: 4, maxPlayers: 16, region: 'jp' },
  { roomId: 'room-fps-2', modeId: 'fps-official-zombie', map: 'zombie-arena', players: 8, maxPlayers: 16, region: 'jp' },
  { roomId: 'room-voxel-1', modeId: 'voxel-official-bedwars', map: 'bedwars-map', players: 6, maxPlayers: 12, region: 'jp' },
  { roomId: 'room-voxel-2', modeId: 'voxel-ugc-athletic-1', map: 'athletic-map', players: 2, maxPlayers: 8, region: 'jp' },
]

export interface FetchGameModesQuery extends Partial<SandboxFilterOptions> {
  category?: 'Official' | 'Sandbox'
  parentGenre?: SandboxFilterOptions['parentGenre']
  subTag?: SandboxFilterOptions['subTag']
  sort?: SandboxFilterOptions['sort']
  order?: 'desc' | 'asc'
  search?: string
}

export function fetchGameModes(query: FetchGameModesQuery = {}): SandboxCard[] {
  // Phase 4ではSandboxのみmock、OfficialはHeaderタブで別扱い
  const opts: SandboxFilterOptions = {
    parentGenre: query.parentGenre ?? 'all',
    subTag: query.subTag ?? 'all',
    sort: query.sort ?? 'totalPlays',
    order: query.order ?? 'desc',
    search: query.search,
  }
  return applySandboxFilters(mockGameModes, opts)
}

export function fetchGameList(modeId?: string): RoomSummary[] {
  if (!modeId) return mockRooms
  return mockRooms.filter((r) => r.modeId === modeId)
}

export interface SeekGameResult {
  readonly ticket: string
  readonly roomId: string
  readonly nodeId: string
}

export function seekGame(params: { modeId?: string; roomId?: string }): SeekGameResult {
  // Play Now: modeId指定で空きルーム自動選択、Room Selection: roomId指定
  const roomId = params.roomId ?? mockRooms.find((r) => !params.modeId || r.modeId === params.modeId)?.roomId ?? 'room-fps-1'
  return {
    ticket: `mock-ticket-${roomId}-${Date.now()}`,
    roomId,
    nodeId: 'mock-node-1',
  }
}

export function fetchOfficialFpsSubModes(): SubTag[] {
  return mockOfficialFpsSubModes
}

export interface VoteResult {
  readonly subMode: SubTag
  readonly votes: number
}

export function voteOfficialFps(subMode: SubTag): VoteResult {
  // mock投票: 常に指定されたsubModeが勝つとして返す
  return { subMode, votes: 1 }
}
