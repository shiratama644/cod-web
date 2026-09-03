/**
 * 権威シミュレーション（サーバー）。
 *
 * 60Hz 固定ステップ（SIM_DT）で shared の純粋移動関数 `stepPlayer` を全プレイヤーに
 * 適用する。入力は各プレイヤーについて「最新 1 つ」を保持し、tick ごとに消費する
 * （クライアント入力も 60Hz で 1:1）。アキュムレータで可変フレームから固定ステップ
 * へディスパッチし、1 フレームの最大ステップ数をクランプして spiral of death を防ぐ。
 *
 * タイマー（setInterval）と純粋な tick ロジックを分離し、単体テストでは
 * `step()` を直接駆動できるようにする。
 */

import {
  MAX_STEPS_PER_FRAME,
  SIM_DT,
} from '../../shared/protocol/constants'
import type { PlayerInput } from '../../shared/protocol/messages'
import { stepPlayer } from '../../shared/sim/movement'
import type { CollisionWorld } from '../../shared/sim/collisionWorld'
import type { Room } from '../room/Room'

export class Simulation {
  private tickNumber = 0
  /** playerId → 最新の未消費入力。tick で消費したら削除する。 */
  private readonly pendingInputs = new Map<number, PlayerInput>()
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
   * プレイヤーから入力を受け取る（最新のものだけ保持）。
   * seq が巻き戻る古い入力は無視する。
   */
  receiveInput(playerId: number, input: PlayerInput): void {
    const existing = this.pendingInputs.get(playerId)
    if (existing && input.seq <= existing.seq) return
    this.pendingInputs.set(playerId, input)
  }

  /**
   * 1 固定ステップ進める。各プレイヤーの最新入力を 1 つ消費し、stepPlayer を適用。
   */
  step(): number {
    for (const player of this.room.getPlayers()) {
      const input = this.pendingInputs.get(player.id)
      if (input) {
        stepPlayer(player, input, SIM_DT, this.world)
        this.pendingInputs.delete(player.id)
      } else {
        // 入力が無い tick は「入力なし（停止・重力のみ）」で進める。
        stepPlayer(player, IDLE_INPUT, SIM_DT, this.world)
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

/** 入力が無いときのアイドル入力（移動 0・ジャンプ無し）。 */
const IDLE_INPUT: PlayerInput = {
  seq: 0,
  moveX: 0,
  moveZ: 0,
  yaw: 0,
  pitch: 0,
  flags: 0,
  dtMs: Math.round(SIM_DT * 1000),
}
