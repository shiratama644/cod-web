/**
 * GameClient — クライアントのネット/予測/補間を束ねるフレームワーク非依存のコア。
 *
 * React/three のレンダリングとは切り離し、R3F の useFrame から毎フレーム
 * `frame(dtSec)` を呼ぶだけにする。高頻度値（座標）は React state を経由せず
 * このオブジェクトが保持し、描画側が ref を直接更新する（黄金ルール4/5）。
 *
 * - **入力サンプリング・ローカル予測・サーバーへの送信は wall-clock の固定
 *   タイマー（60Hz）で駆動する**。requestAnimationFrame はタブがバックグラウンド/
 *   非表示（側ペインや最小化）になると間引かれたり停止したりするため、ネット/予測を
 *   rAF で回すと見えない側のプレイヤーが数秒遅れて動く「ラグ」になる。タイマー駆動なら
 *   表示状態に依らず入力は 60Hz でサーバーへ届く。
 * - 毎レンダーフレーム（rAF）は描画のためだけにリモート補間結果をサンプリングする。
 * - 受信したスナップショットは WebSocket コールバックで Interpolator へ（リモート補間）
 *   と自プレイヤーの調停に使う（受信自体は rAF 非依存）。
 */

import {
  INPUT_PACKET_BYTES,
  INPUT_SEND_HZ,
  MAX_STEPS_PER_FRAME,
  SIM_DT,
} from '@shared/protocol/constants'
import { encodeInput, decodeSnapshot, readMessageType } from '@shared/protocol/packer'
import { MSG_S2C_SNAPSHOT } from '@shared/protocol/constants'
import type { PlayerInput } from '@shared/protocol/messages'
import { createDefaultWorld, type CollisionWorld } from '@shared/sim/collisionWorld'
import type { InputController } from '../input/InputController'
import type { NetTransport } from './transport'
import { WebSocketTransport } from './websocket'
import { ClientPrediction } from './prediction'
import { Interpolator, type InterpolatedPlayer } from './interpolation'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

/**
 * 接続先は常に同一オリジンの `/ws`。
 * - 開発時は Vite dev サーバが `/ws` を bun ゲームサーバ（:8080）へ WebSocket
 *   プロキシする（vite.config.ts）。ブラウザがサンドボックス外の localhost を
 *   直接叩かずに済む。
 * - 本番はエッジ（Caddy）が同パスをゲームサーバへ中継する想定。
 */
const DEFAULT_WS_URL = `${location.origin.replace(/^http/, 'ws')}/ws`

export class GameClient {
  readonly transport: NetTransport
  readonly world: CollisionWorld
  private prediction: ClientPrediction | null = null
  private readonly interpolator = new Interpolator()
  private input: InputController | null = null

  private selfId: number | null = null
  /** 固定 60Hz ネット/予測ループのタイマーハンドル。 */
  private tickTimer: ReturnType<typeof setInterval> | null = null
  private disposed = false
  /** 実時間アキュムレータ（秒）。タイマーの呼び出し間隔が揺れてもシム step 数を実時間に合わせる。 */
  private tickAccumulator = 0
  private lastTickMs: number | null = null
  status: ConnectionStatus = 'disconnected'
  /** 状態変化時のコールバック（低頻度・HUD 用）。 */
  onStatusChange: ((s: ConnectionStatus) => void) | null = null

  // 送信バッファ（プールして毎フレーム new しない）
  private readonly sendBuffer = new ArrayBuffer(INPUT_PACKET_BYTES)
  private readonly sendView = new DataView(this.sendBuffer)

  /** 現在の部屋にいるリモートプレイヤー補間結果（フレームごとに更新）。 */
  remotes: Map<number, InterpolatedPlayer> = new Map()

  constructor(transport: NetTransport = new WebSocketTransport()) {
    this.transport = transport
    this.world = createDefaultWorld()
  }

  connect(url: string = DEFAULT_WS_URL): void {
    this.disposed = false
    this.tickAccumulator = 0
    this.lastTickMs = null
    this.setStatus('connecting')
    this.transport.onOpen(() => this.setStatus('connected'))
    this.transport.onClose(() => this.setStatus('disconnected'))
    this.transport.onBinary((data) => this.onBinary(data))
    // テキスト制御（welcome で自 playerId を得る）
    const t = this.transport as WebSocketTransport
    if (typeof t.onText === 'function') {
      t.onText((text) => this.onControlText(text))
    }
    this.transport.connect(url)

    // 60Hz 固定のネット/予測ループを開始（rAF 非依存）。
    this.startTickLoop()
  }

  /**
   * wall-clock の高頻度タイマーで、実時間を固定 60Hz ステップ（SIM_DT）に分解して
   * 入力送信・ローカル予測を進める。タイマーの呼び出し間隔が揺れたり数フレーム
   * 詰まったりしても、**経過時間に比例した正しい回数だけシムを進める**。これが
   * サーバー（同じ 60Hz 固定ステップ）と step 数で一致し、調停でのゴムバンド
   * （引き戻し・停止後の変な移動・ジャンプ連打のカクつき）を防ぐ核心。
   */
  private startTickLoop(): void {
    if (this.tickTimer != null) return
    // タイマーは 60Hz より少し速く回し（実時間はアキュムレータで整合）、
    // タブのスロットルでも大きく遅れないようにする。
    this.tickTimer = setInterval(() => this.netTick(), 1000 / INPUT_SEND_HZ)
  }

  private netTick(): void {
    if (this.disposed) return
    const now = performance.now()
    if (this.lastTickMs == null) {
      this.lastTickMs = now
      this.updateRemotes()
      return
    }
    let frameMs = now - this.lastTickMs
    this.lastTickMs = now
    // 異常に大きな間隔（バックグラウンド復帰など）はクランプして一気に巻き戻さない。
    if (frameMs > 250) frameMs = 250
    this.tickAccumulator += frameMs / 1000

    let steps = 0
    while (this.tickAccumulator >= SIM_DT && steps < MAX_STEPS_PER_FRAME) {
      this.tickAccumulator -= SIM_DT
      this.simStep()
      steps++
    }
    // 上限で余った時間は破棄（spiral of death 防止）。
    if (steps >= MAX_STEPS_PER_FRAME) this.tickAccumulator = 0

    // リモート補間もタイマーで進め、rAF が間引かれてもデータは最新に保つ。
    this.updateRemotes()
  }

  /** 予測/送信の 1 固定ステップ（入力サンプリング→予測→サーバーへ送信）。 */
  private simStep(): void {
    if (!this.prediction || !this.input) return
    const local = this.sampleInput()
    const sent = this.prediction.applyInput(local)
    this.encodeAndSend(sent)
  }

  /** 入力ソースを登録する。 */
  setInput(controller: InputController): void {
    this.input = controller
  }

  private onControlText(text: string): void {
    try {
      const msg = JSON.parse(text)
      if (msg.kind === 'welcome' && typeof msg.playerId === 'number') {
        this.selfId = msg.playerId
        this.prediction = new ClientPrediction(this.world, msg.playerId)
      }
    } catch {
      // 無視
    }
  }

  private onBinary(data: ArrayBuffer): void {
    const view = new DataView(data)
    const type = readMessageType(view)
    if (type !== MSG_S2C_SNAPSHOT) return
    const snap = decodeSnapshot(view, data.byteLength, 1)
    const now = performance.now()
    this.interpolator.push(snap, now)

    // 自プレイヤーの調停
    if (this.selfId != null && this.prediction) {
      const me = snap.players.find((p) => p.id === this.selfId)
      if (me) {
        // スナップショットに pitch は含まれない（Phase 1 は yaw のみ送信）。
        // 自視点の pitch はローカル入力が正なので、調停では現在の pitch を維持する。
        this.prediction.reconcile(
          { x: me.x, y: me.y, z: me.z, yaw: me.yaw, pitch: this.prediction.state.pitch },
          snap.lastAckSeq,
        )
      }
    }
  }

  /**
   * 毎レンダーフレーム（rAF）呼ぶ。描画に使うリモート補間結果を最新化するだけ。
   * 入力送信・予測は wall-clock の 60Hz タイマー（netTick）が駆動するため、
   * ここでは送らない（rAF が間引かれる側ペインでも同期が止まらない）。
   */
  frame(_dtSec: number): void {
    this.updateRemotes()
  }

  /** 自プレイヤーの状態（描画はこれを参照）。 */
  get self() {
    return this.prediction?.state ?? null
  }

  /** 入力コントローラから 1 入力を取り出す（ジャンプはワンショット消費）。 */
  private sampleInput(): Omit<PlayerInput, 'seq'> {
    // 固定 60Hz タイマー駆動なので、入力の dt は常に 1 ティック分で確定する。
    const dtMs = Math.round((1000 / INPUT_SEND_HZ))
    const c = this.input
    if (!c) return { moveX: 0, moveZ: 0, yaw: 0, pitch: 0, flags: 0, dtMs }
    // seq は prediction が採番するので、ここでは仮 seq でサンプルし適用時に上書きされる
    const sampled = c.sample(0, dtMs)
    return {
      moveX: sampled.moveX,
      moveZ: sampled.moveZ,
      yaw: sampled.yaw,
      pitch: sampled.pitch,
      flags: sampled.flags,
      dtMs: sampled.dtMs,
    }
  }

  private encodeAndSend(input: PlayerInput): void {
    const len = encodeInput(this.sendView, input)
    this.transport.sendBinary(this.sendBuffer.slice(0, len))
  }

  private updateRemotes(): void {
    this.remotes = this.interpolator.sample(performance.now(), this.selfId ?? -1)
  }

  private setStatus(s: ConnectionStatus): void {
    this.status = s
    this.onStatusChange?.(s)
  }

  dispose(): void {
    this.disposed = true
    if (this.tickTimer != null) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
    this.transport.close()
  }
}
