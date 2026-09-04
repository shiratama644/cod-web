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

/**
 * 調停時にローカル予測を許容する最大位置誤差（m）。
 * クライアントとサーバーが同じ決定論シム＋replay をしていれば誤差は量子化や
 * クロック位相ずれで数cm〜十数cmに収まる。それ以内ならスナップせず予測を信じて
 * 滑らかさを優先し、これを超えた本物のズレ（衝突・ラグ・パケット欠落）だけ補正する。
 */
const RECONCILE_TOLERANCE = 0.25

interface PendingInput {
  seq: number
  input: PlayerInput
}

export class ClientPrediction {
  state: PlayerState
  private pending: PendingInput[] = []
  private nextSeq = 1
  /**
   * 最新シム状態が対応する「描画時刻」（performance.now()）。
   * 60Hz 固定ステップを消化した直後、アキュムレータに残った端数時間を
   * 「未来側」に加えた時刻をセットする（状態はその時刻のもの、という意味）。
   * これにより可変フレームレートでも外挿が連続し、タイマー遅れでの複数ステップ
   * 一気消化時にも 1 ティック分のワープ（カクつき）が出ない。
   */
  private renderAnchorMs = 0

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
   * 固定ステップ消化後に呼び、最新シム状態が対応する描画時刻（アンカー）を設定する。
   * @param nowMs       現在時刻（netTick が呼ばれた performance.now()）
   * @param accumRemain アキュムレータに残った端数秒（次ステップまでの未消化時間）。
   *                    状態は「現在＋この端数」の未来時刻に位置する、としてアンカーを張る。
   */
  markSimAnchor(nowMs: number, accumRemain: number): void {
    this.renderAnchorMs = nowMs + accumRemain * 1000
  }

  /**
   * 描画フレーム（120Hz 等の可変レート）向けの一人称カメラ状態を返す。
   *
   * シムは 60Hz 固定ステップなので、そのままカメラに映すと 120Hz ディスプレイで
   * 「同じ位置を2フレーム→ワープ」の階段状になりガタガタする。そこで最新シム状態から
   * **速度で描画時刻へ最大1ティック分だけ外挿**し、可変フレームレートでも滑らかに
   * 追従させる（リモート補間と同じ発想を自プレイヤーにも適用。遅延は実質ゼロ）。
   * yaw/pitch は入力値をそのまま使い、視点操作は遅延させない。
   */
  renderCamera(nowMs: number): { x: number; y: number; z: number; yaw: number; pitch: number } {
    // アンカー（最新シム状態の対応時刻）からの経過を 0..1 ティックにクランプ。
    // アンカーはフレーム冒頭で「現在＋アキュムレータ端数（未来側）」に張るので、
    // dt は通常 0〜SIM_DT になり、フレーム間で連続した外挿位置が得られる。
    const dt = this.renderAnchorMs === 0 ? 0 : (nowMs - this.renderAnchorMs) / 1000
    const a = Math.max(0, Math.min(dt / SIM_DT, 1))
    const s = this.state
    return {
      x: s.x + s.vx * SIM_DT * a,
      y: s.y + s.vy * SIM_DT * a,
      z: s.z + s.vz * SIM_DT * a,
      yaw: s.yaw,
      pitch: s.pitch,
    }
  }

  /**
   * サーバー確定値で調停する（30Hz で届く）。
   *
   * 毎回無条件でサーバー位置へハードスナップすると、クロックの位相ずれや量子化で
   * 生じる小さな誤差がジャンプの縦弧・移動で「ガタガタ」として見える。そこで:
   *   1. まず現在のローカル予測状態を保存。
   *   2. サーバー確定位置（＋速度）から未 ack 入力を replay した「補正後状態」を作る。
   *   3. ローカル予測と補正後の位置差が **RECONCILE_TOLERANCE 以内ならローカル予測を
   *      そのまま維持**（スナップしない＝滑らか）。閾値を超える本物のズレだけ補正する。
   * yaw/pitch（視点）はローカル入力が常に正なので、サーバーの遅延値では上書きしない。
   *
   * @param serverState スナップショット内の自プレイヤー状態（速度はサーバー権威を参照）
   * @param lastAckSeq  サーバーが処理済みの最新入力 seq
   */
  reconcile(
    serverState: { x: number; y: number; z: number; vx: number; vy: number; vz: number; yaw: number; pitch: number },
    lastAckSeq: number,
  ): void {
    // 調停前のローカル予測状態（滑らかさ優先で維持する候補）を保存。
    const local = this.state
    const predicted = { x: local.x, y: local.y, z: local.z }

    // ack 済みの入力を破棄（pending は replay のために保持）。
    this.pending = this.pending.filter((p) => p.seq > lastAckSeq)

    // 作業用に、サーバー確定状態を起点としたプレイヤー状態を構築。
    const corrected = createPlayerState(local.id, serverState.x, serverState.y, serverState.z)
    corrected.vx = serverState.vx
    corrected.vy = serverState.vy
    corrected.vz = serverState.vz
    corrected.yaw = local.yaw
    corrected.pitch = local.pitch
    // 未 ack 入力を先頭から replay して「サーバー基準の現在位置」を再現する。
    for (const p of this.pending) {
      stepPlayer(corrected, p.input, SIM_DT, this.world)
    }

    const dx = corrected.x - predicted.x
    const dy = corrected.y - predicted.y
    const dz = corrected.z - predicted.z
    const err = Math.hypot(dx, dy, dz)

    if (err > RECONCILE_TOLERANCE) {
      // 閾値を超える本物のズレ（ラグ・衝突・パケット欠落など）→ 補正状態を採用。
      local.x = corrected.x
      local.y = corrected.y
      local.z = corrected.z
      local.vx = corrected.vx
      local.vy = corrected.vy
      local.vz = corrected.vz
    }
    // 閾値以内なら local はそのまま（ハードスナップしない）。
    // yaw/pitch はローカルの値を維持（サーバー遅延値で視点を跳ねさせない）。
  }

  /** pending 入力の件数（テスト/デバッグ用）。 */
  get pendingCount(): number {
    return this.pending.length
  }
}
