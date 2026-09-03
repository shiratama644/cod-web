/**
 * 権威シミュレーション（サーバー）。
 *
 * 60Hz 固定ステップ（SIM_DT）で shared の純粋移動関数 `stepPlayer` を全プレイヤーに
 * 適用する。アキュムレータで可変フレームから固定ステップへディスパッチし、
 * 1 フレームの最大ステップ数をクランプして spiral of death を防ぐ。
 *
 * **入力はプレイヤーごとに FIFO キューで保持する。**
 * 「最新 1 つだけ上書き」してしまうと、1 tick に入力が 2 つ届いたとき（ジッタで
 * バッチ着信）古い入力が捨てられて **ジャンプフラグが消えたり、移動 tick が
 * 欠落してクライアント予測とズレ、調停でプレイヤーが後ろへ引き戻される** 原因に
 * なる。WebSocket（TCP）は順序・到達を保証するので、届いた入力を seq 順に並べ、
 * tick ごとに 1 つずつ確実に消費することで入力を取りこぼさない。
 *  - 入力キューが空の tick は「入力なし（重力のみ・視点は維持）」で進む。
 *  - seq が巻き戻る/重複する古い入力は破棄する（順序ガード）。
 */

import { MAX_STEPS_PER_FRAME, SIM_DT } from '../../shared/protocol/constants'
import type { PlayerInput } from '../../shared/protocol/messages'
import { stepPlayer } from '../../shared/sim/movement'
import type { CollisionWorld } from '../../shared/sim/collisionWorld'
import type { Room } from '../room/Room'

/** 1 プレイヤーあたりの入力キュー最大長（超えたら古いものから破棄して遅延を防ぐ）。 */
const MAX_QUEUED_INPUTS = 120

export class Simulation {
  private tickNumber = 0
  /** playerId → 未消費の入力キュー（FIFO・seq 順）。tick ごとに先頭を 1 つ消費する。 */
  private readonly inputQueues = new Map<number, PlayerInput[]>()
  /** playerId → キュー済みの最新 seq（巻き戻り/重複を弾くガード）。 */
  private readonly latestSeq = new Map<number, number>()
  private accumulator = 0
  private lastTimeMs: number | null = null

  constructor(
    private readonly room: Room,
    private readonly world: CollisionWorld,
  ) {}

  /** 現在のシム tick 番号。 */
  currentTick(): number {
    return this.tickNumber
  }

  /**
   * プレイヤーから入力を受け取り、FIFO キューへ追加する。
   * seq が巻き戻る/同じ古い入力は破棄する。
   */
  receiveInput(playerId: number, input: PlayerInput): void {
    const last = this.latestSeq.get(playerId) ?? 0
    if (input.seq <= last) return // 重複/巻き戻りは無視
    this.latestSeq.set(playerId, input.seq)

    let q = this.inputQueues.get(playerId)
    if (!q) {
      q = []
      this.inputQueues.set(playerId, q)
    }
    q.push(input)
    // 極端に溜まった場合（デバッグポーズ等）は古いものから捨てて遅延を防ぐ。
    if (q.length > MAX_QUEUED_INPUTS) q.splice(0, q.length - MAX_QUEUED_INPUTS)
  }

  /**
   * 1 固定ステップ進める。各プレイヤーについてキュー先頭の入力を 1 つ消費して
   * stepPlayer を適用。キューが空なら「入力なし」で進める。
   */
  step(): number {
    for (const player of this.room.getPlayers()) {
      const q = this.inputQueues.get(player.id)
      const queued = q && q.length > 0 ? q.shift() : undefined
      if (queued) {
        stepPlayer(player, queued, SIM_DT, this.world)
      } else {
        // 入力が無い tick: 重力は進めるが、水平移動 0・視点は現在値を維持する。
        stepPlayer(player, idleInput(player.yaw, player.pitch), SIM_DT, this.world)
      }
    }
    this.tickNumber += 1
    return this.tickNumber
  }

  /**
   * 経過時間（ms）をアキュムレータに積み、固定ステップに分解して実行する。
   * タイマー駆動のメインループから呼ぶ。
   * @returns 実行したステップ数。
   */
  update(nowMs: number): number {
    if (this.lastTimeMs == null) {
      this.lastTimeMs = nowMs
      return 0
    }
    let frameMs = nowMs - this.lastTimeMs
    this.lastTimeMs = nowMs
    // 異常に大きなフレーム（タブ復帰など）をクランプ。
    if (frameMs > 250) frameMs = 250
    this.accumulator += frameMs / 1000

    let steps = 0
    const stepSeconds = SIM_DT
    while (this.accumulator >= stepSeconds && steps < MAX_STEPS_PER_FRAME) {
      this.step()
      this.accumulator -= stepSeconds
      steps += 1
    }
    // ステップ上限で余った時間は破棄（spiral of death 防止）。
    if (steps >= MAX_STEPS_PER_FRAME) this.accumulator = 0
    return steps
  }
}

/**
 * 入力が無い tick 用の入力。水平移動 0・ジャンプ無し。視点（yaw/pitch）は
 * そのプレイヤーの現在値を渡すことで、入力待ちのたびに向きが yaw=0 に戻るのを防ぐ。
 */
function idleInput(yaw: number, pitch: number): PlayerInput {
  return {
    seq: 0,
    moveX: 0,
    moveZ: 0,
    yaw,
    pitch,
    flags: 0,
    dtMs: Math.round(SIM_DT * 1000),
  }
}
