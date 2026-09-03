/**
 * 入力アダプタ（PC 版の最小構成）: キーボード WASD ＋ PointerLock マウス視点。
 *
 * ブラウザ API（DOM イベント・PointerLock）に依存するのはこのクラスだけ。
 * モバイルのタッチ/ジョイパッドは後続フェーズ。
 */

import type { PlayerInput } from '@shared/protocol/messages'
import { INPUT_FLAG_JUMP } from '@shared/protocol/messages'

export interface InputState {
  moveX: number // -1..1（右）
  moveZ: number // -1..1（前）
  yaw: number
  pitch: number
  jump: boolean
}

export class InputController {
  private readonly keys = new Set<string>()
  private yawValue = 0
  private pitchValue = 0
  private jumpQueued = false
  private el: HTMLElement | null = null
  private locked = false

  private readonly onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code)
    if (e.code === 'Space') this.jumpQueued = true
  }
  private readonly onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code)
  }
  private readonly onMouseMove = (e: MouseEvent) => {
    if (!this.locked) return
    const sens = 0.0022
    this.yawValue -= e.movementX * sens
    this.pitchValue -= e.movementY * sens
    const lim = Math.PI / 2 - 0.01
    this.pitchValue = Math.max(-lim, Math.min(lim, this.pitchValue))
  }
  private readonly onLockChange = () => {
    this.locked = document.pointerLockElement === this.el
  }

  /** 対象要素で PointerLock とイベント購読を開始する。 */
  attach(el: HTMLElement): void {
    this.el = el
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('pointerlockchange', this.onLockChange)
    el.addEventListener('click', this.requestLock)
  }

  private readonly requestLock = () => {
    this.el?.requestPointerLock?.()
  }

  /** PointerLock 中か。 */
  get isLocked(): boolean {
    return this.locked
  }

  get yaw(): number {
    return this.yawValue
  }

  get pitch(): number {
    return this.pitchValue
  }

  /**
   * 現在の入力を PlayerInput として取り出す（seq は呼び出し側で採番）。
   * ジャンプは押した瞬間だけ立てて消費する（ワンショット）。
   */
  sample(seq: number, dtMs: number): PlayerInput {
    const k = this.keys
    let moveX = 0
    let moveZ = 0
    if (k.has('KeyW') || k.has('ArrowUp')) moveZ += 1
    if (k.has('KeyS') || k.has('ArrowDown')) moveZ -= 1
    if (k.has('KeyD') || k.has('ArrowRight')) moveX += 1
    if (k.has('KeyA') || k.has('ArrowLeft')) moveX -= 1

    const flags = this.jumpQueued ? INPUT_FLAG_JUMP : 0
    this.jumpQueued = false

    return {
      seq,
      moveX,
      moveZ,
      yaw: this.yawValue,
      pitch: this.pitchValue,
      flags,
      dtMs,
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('pointerlockchange', this.onLockChange)
    this.el?.removeEventListener('click', this.requestLock)
  }
}
