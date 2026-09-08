import { create } from 'zustand'

/**
 * ゲーム状態ストア骨架（P0-F）。
 *
 * 使い分け（docs/arch/game-engineering-principles.md・tech-stack.md 黄金ルール4）:
 * - **低頻度・UI 表示用の値**（HP・残弾・スコア・描画バックエンド等）は Zustand に置き、
 *   React コンポーネントからフックで購読して再レンダーしてよい。
 * - **毎フレーム更新される座標・回転等の高頻度値はここに入れない**。Babylon mesh を
 *   命令型 render loop から直接更新する。ループからストアを読む場合もフックを使わず
 *   `useGameStore.getState()` を呼び、変更購読は `useGameStore.subscribe(...)` を使う
 *   （React の再レンダーを誘発しない）。
 */

export type RendererBackend = 'babylon-webgl'

export interface GameState {
  /** 描画バックエンド（Babylon Engine 初期化時に 1 回決定）。 */
  renderer: RendererBackend | null
  /** プレイヤー HP（低頻度・UI 表示用）。 */
  hp: number
  /** 残弾数（低頻度・UI 表示用）。 */
  ammo: number

  setRenderer: (backend: RendererBackend) => void
  setHp: (hp: number) => void
  setAmmo: (ammo: number) => void
}

const MAX_HP = 100

export const useGameStore = create<GameState>((set) => ({
  renderer: null,
  hp: MAX_HP,
  ammo: 30,

  setRenderer: (renderer) => set({ renderer }),
  setHp: (hp) => set({ hp: Math.max(0, Math.min(MAX_HP, hp)) }),
  setAmmo: (ammo) => set({ ammo: Math.max(0, ammo) }),
}))

/** ループ等の React 外からストアを読むための非フック API（getState/subscribe をラップ）。 */
export const gameStoreApi = {
  getState: useGameStore.getState,
  subscribe: useGameStore.subscribe,
}
