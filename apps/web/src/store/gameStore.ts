import { create } from 'zustand'

/**
 * ゲーム状態ストア骨架（P0-F）。
 *
 * 使い分け（docs/arch/engineering.md・.agent/skills/tech-stack/SKILL.md）:
 * - **低頻度・UI 表示用の値**（HP・残弾・スコア・描画バックエンド・接続状態等）は
 *   Zustand に置き、React コンポーネントからフックで購読して再レンダーしてよい。
 * - **毎フレーム更新される座標・回転等の高頻度値はここに入れない**。Babylon mesh を
 *   命令型 render loop から直接更新する。ループからストアを読む場合もフックを使わず
 *   `useGameStore.getState()` を呼び、変更購読は `useGameStore.subscribe(...)` を使う
 *   （React の再レンダーを誘発しない）。
 */

export type RendererBackend = 'babylon-webgl'
export type GameConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
export type OfficialTab = 'fps' | 'voxel'
export type ParentGenreFilter = 'all' | 'fps' | 'voxel'
export type SubTagFilter = 'all' | string
export type SandboxSortKey = 'totalPlays' | 'activePlayers' | 'detailViews'

export interface GameState {
  /** 描画バックエンド（Babylon Engine 初期化時に 1 回決定）。 */
  renderer: RendererBackend | null
  /** ネットワーク接続状態（低頻度 HUD 用）。 */
  connectionStatus: GameConnectionStatus
  /** プレイヤー HP（低頻度・UI 表示用）。 */
  hp: number
  /** 残弾数（低頻度・UI 表示用）。 */
  ammo: number

  /** Official FPS/Voxel切替タブ — 改訂版 (PH4-B) */
  activeTab: OfficialTab

  /** Sandboxモーダル開閉 — 改訂版 (PH4-C) 公式拡張+UGC */
  sandboxOpen: boolean

  /** Sandboxフィルタ/ソート — 改訂版 (PH4-D) 親ジャンル+サブタグ */
  sandboxParentGenre: ParentGenreFilter
  sandboxSubTag: SubTagFilter
  sandboxSort: SandboxSortKey
  sandboxSearch: string
  selectedSandboxCardId: string | null

  setRenderer: (backend: RendererBackend) => void
  setConnectionStatus: (status: GameConnectionStatus) => void
  setHp: (hp: number) => void
  setAmmo: (ammo: number) => void
  setActiveTab: (tab: OfficialTab) => void
  setSandboxOpen: (open: boolean) => void
  setSandboxParentGenre: (parent: ParentGenreFilter) => void
  setSandboxSubTag: (tag: SubTagFilter) => void
  setSandboxSort: (sort: SandboxSortKey) => void
  setSandboxSearch: (search: string) => void
  setSelectedSandboxCardId: (id: string | null) => void
}

const MAX_HP = 100

export const useGameStore = create<GameState>((set) => ({
  renderer: null,
  connectionStatus: 'disconnected',
  hp: MAX_HP,
  ammo: 30,
  activeTab: 'fps',
  sandboxOpen: false,
  sandboxParentGenre: 'all',
  sandboxSubTag: 'all',
  sandboxSort: 'totalPlays',
  sandboxSearch: '',
  selectedSandboxCardId: null,

  setRenderer: (renderer) => set({ renderer }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setHp: (hp) => set({ hp: Math.max(0, Math.min(MAX_HP, hp)) }),
  setAmmo: (ammo) => set({ ammo: Math.max(0, ammo) }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setSandboxOpen: (sandboxOpen) => set({ sandboxOpen }),
  setSandboxParentGenre: (sandboxParentGenre) => set({ sandboxParentGenre }),
  setSandboxSubTag: (sandboxSubTag) => set({ sandboxSubTag }),
  setSandboxSort: (sandboxSort) => set({ sandboxSort }),
  setSandboxSearch: (sandboxSearch) => set({ sandboxSearch }),
  setSelectedSandboxCardId: (selectedSandboxCardId) => set({ selectedSandboxCardId }),
}))

/** ループ等の React 外からストアを読むための非フック API（getState/subscribe をラップ）。 */
export const gameStoreApi = {
  getState: useGameStore.getState,
  subscribe: useGameStore.subscribe,
}
