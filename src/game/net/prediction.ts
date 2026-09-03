/**
 * クライアント予測＋調停（Reconciliation）。
 *
 * - 入力のたびに shared の純粋 `stepPlayer` でローカル状態を即座に進める（予測）。
 * - 送信済み入力を seq 付きで pending 配列に保持する。
 * - サーバー確定スナップショット（自 playerId の位置と lastAckSeq）が届いたら、
 *   自状態をサーバー確定位置に補正し、まだ ack されていない入力
 *   （seq > lastAckSeq）を先頭から replay して現在位置を再計算する。
 *
 * これにより、ラグがあっても自キャラはオフライン並みに応答し、サーバー権威との
 * ズレは裏で修正される（ラバーバンドを防ぐ）。
 */

import { SIM_DT } from '@shared/protocol/constants'
import type { PlayerInput } from '@shared/protocol/messages'
import { stepPlayer } from '@shared/sim/movement'
import type { CollisionWorld } from '@shared/sim/collisionWorld'
import { createPlayerState, type PlayerState } from '@shared/types'

interface PendingInput {
  seq: number
  input: PlayerInput
}

export class ClientPrediction {
  state: PlayerState
  private pending: PendingInput[] = []
  private nextSeq = 1

  constructor(
    private readonly world: CollisionWorld,
    playerId: number,
    spawnX = 0,
    spawnY = 5,
    spawnZ = 0,
  ) {
    this.state = createPlayerState(playerId, spawnX, spawnY, spawnZ)
  }

  /** 自プレイヤー ID。 */
  get playerId(): number {
    return this.state.id
  }

  /**
   * ローカル入力を予測適用し、送信すべき入力（seq 付き）を返す。
   * 入力は pending にも積む（調停時の replay 用）。
   */
  applyInput(input: Omit<PlayerInput, 'seq'>): PlayerInput {
    const seq = this.nextSeq++
    const full: PlayerInput = { ...input, seq }
    // ローカル予測: 固定ステップで即座に進める。
    stepPlayer(this.state, full, SIM_DT, this.world)
    this.pending.push({ seq, input: full })
    return full
  }

  /**
   * サーバー確定値で調停する。
   * @param serverState スナップショット内の自プレイヤー状態
   * @param lastAckSeq  サーバーが処理済みの最新入力 seq
   */
  reconcile(serverState: { x: number; y: number; z: number; yaw: number; pitch: number }, lastAckSeq: number): void {
    // ack 済みの入力を破棄
    this.pending = this.pending.filter((p) => p.seq > lastAckSeq)

    // 自状態をサーバー確定位置に補正
    this.state.x = serverState.x
    this.state.y = serverState.y
    this.state.z = serverState.z
    this.state.yaw = serverState.yaw
    this.state.pitch = serverState.pitch

    // まだサーバーに反映されていない入力を先頭から replay
    for (const p of this.pending) {
      stepPlayer(this.state, p.input, SIM_DT, this.world)
    }
  }

  /** pending 入力の件数（テスト/デバッグ用）。 */
  get pendingCount(): number {
    return this.pending.length
  }
}
