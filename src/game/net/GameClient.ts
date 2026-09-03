/**
 * GameClient — クライアントのネット/予測/補間を束ねるフレームワーク非依存のコア。
 *
 * React/three のレンダリングとは切り離し、R3F の useFrame から毎フレーム
 * `frame(dtSec)` を呼ぶだけにする。高頻度値（座標）は React state を経由せず
 * このオブジェクトが保持し、描画側が ref を直接更新する（黄金ルール4/5）。
 *
 * - 60Hz 固定で入力をサンプリングしてサーバーへ送り、ローカル予測を進める。
 * - 受信したスナップショットは Interpolator へ（リモート補間）と自プレイヤーの
 *   調停に使う。
 */

import {
  INPUT_PACKET_BYTES,
  INPUT_SEND_HZ,
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

  private sendAccumulator = 0
  private selfId: number | null = null
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
   * 毎レンダーフレーム呼ぶ。入力送信は 60Hz 固定、予測は入力送信と同じレート、
   * リモート補間は可変フレームごとにサンプリング。
   */
  frame(dtSec: number): void {
    if (!this.prediction || !this.input) {
      // まだ welcome 前。スナップショットだけ溜める。
      this.updateRemotes()
      return
    }

    // 60Hz 固定で入力サンプリング→ローカル予測→サーバーへ送信
    this.sendAccumulator += dtSec
    const inputInterval = 1 / INPUT_SEND_HZ
    let steps = 0
    while (this.sendAccumulator >= inputInterval && steps < 4) {
      this.sendAccumulator -= inputInterval
      // InputController から移動入力を取り出す（ジャンプはワンショット消費）。
      // seq は ClientPrediction が採番する。
      const local = this.sampleInput()
      const sent = this.prediction.applyInput(local)
      this.encodeAndSend(sent)
      steps++
    }

    this.updateRemotes()
  }

  /** 自プレイヤーの状態（描画はこれを参照）。 */
  get self() {
    return this.prediction?.state ?? null
  }

  /** 入力コントローラから 1 入力を取り出す（ジャンプはワンショット消費）。 */
  private sampleInput(): Omit<PlayerInput, 'seq'> {
    const c = this.input
    if (!c) return { moveX: 0, moveZ: 0, yaw: 0, pitch: 0, flags: 0, dtMs: Math.round(SIM_DT * 1000) }
    // seq は prediction が採番するので、ここでは仮 seq でサンプルし適用時に上書きされる
    const sampled = c.sample(0, Math.round(SIM_DT * 1000))
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
    this.transport.close()
  }
}
