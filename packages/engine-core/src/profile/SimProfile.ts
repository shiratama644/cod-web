/**
 * SimProfile — L1 engine-core と L2 profile-* の境界。
 *
 * engine-core は Game Type 非依存の L1 なので、fps / voxel の具象実装を import しない。
 * L2 profile はこの contract を実装し、Room / Simulation / SnapshotBroadcaster などへ
 * executable 側（apps/gameserver / client-*）から注入する。
 */

import type { TypeSpec } from '@cod/protocol/protocol/type-specs'

export interface SnapshotWriteArgs<TPlayerState> {
  /** 書き込み先。Channel を除いた payload view。 */
  readonly view: DataView
  /** サーバーの現在 tick。 */
  readonly serverTick: number
  /** 受信者ごとの処理済み input seq。 */
  readonly lastAckSeq: number
  /** snapshot に含める player state。AOI 適用後の配列を想定する。 */
  readonly players: readonly TPlayerState[]
}

export interface SimProfile<TWorld, TPlayerState, TInput> {
  readonly typeSpec: TypeSpec
  createWorld(): TWorld
  createPlayerState(playerId: number): TPlayerState
  stepPlayer(player: TPlayerState, input: TInput, dtSec: number, world: TWorld): TPlayerState
  createIdleInput(player: TPlayerState, dtMs: number): TInput
  writeSnapshot(args: SnapshotWriteArgs<TPlayerState>): number
}

export function profileStepSeconds(profile: Pick<SimProfile<unknown, unknown, unknown>, 'typeSpec'>): number {
  return 1 / profile.typeSpec.simHz
}

export function profileSnapshotEveryTicks(
  profile: Pick<SimProfile<unknown, unknown, unknown>, 'typeSpec'>,
): number {
  return profile.typeSpec.simHz / profile.typeSpec.snapshotHz
}
