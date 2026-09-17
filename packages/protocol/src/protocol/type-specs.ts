/**
 * Game Type ごとのレート定義。
 *
 * Phase 2 は fps 先行で SimProfile を分離する。voxel はまだ package / 実装を
 * 作らないが、L0/L1 が type 非依存で設計できるように spec だけをここに置く。
 * `official` / `ugc` は Game Type ではなく Content Source なのでここには含めない。
 */

export const GAME_TYPES = ['fps', 'voxel'] as const
export type GameType = (typeof GAME_TYPES)[number]

export interface TypeSpec {
  /** シミュレーションの根本パラダイム。Content Source ではない。 */
  readonly type: GameType
  /** サーバー権威シミュレーションの固定 tick レート。 */
  readonly simHz: number
  /** クライアント→サーバーの入力送信レート。 */
  readonly inputHz: number
  /** サーバー→クライアントの snapshot 送信レート。 */
  readonly snapshotHz: number
  /** 1 room の既定最大人数。 */
  readonly maxPlayers: number
}

export const TYPE_SPECS = {
  fps: {
    type: 'fps',
    simHz: 60,
    inputHz: 60,
    snapshotHz: 30,
    maxPlayers: 20,
  },
  voxel: {
    type: 'voxel',
    simHz: 30,
    inputHz: 30,
    snapshotHz: 15,
    maxPlayers: 32,
  },
} as const satisfies Record<GameType, TypeSpec>

export function typeStepSeconds(spec: Pick<TypeSpec, 'simHz'>): number {
  return 1 / spec.simHz
}

export function snapshotEveryTicks(spec: Pick<TypeSpec, 'simHz' | 'snapshotHz'>): number {
  return spec.simHz / spec.snapshotHz
}
