/**
 * 入力アダプタ（PC ＋ モバイル共通の最小構成）。
 *
 * - **移動**: キーボード WASD / 矢印キー（PC、またはスマホに繋いだ物理キーボード）。
 *   キーイベントは window で購読するので、フォーカスがどこにあっても入る。
 * - **視点**:
 *   - PointerLock 対応端末（PC ブラウザ）: クリックでロックし、マウス移動で視点操作。
 *   - **PointerLock 非対応端末（Android/iOS の Edge・Chrome、マウス/タッチを問わず）**:
 *     画面を押してドラッグすると視点が動く（ドラッグルック）。PointerLock の有無に
 *     関係なく動くので、スマホに繋いだマウスでもタッチでも視点操作できる。
 *
 * ブラウザ API（DOM イベント・PointerLock・Fullscreen）に依存するのはこのクラスと
 * オーバーレイだけ。モバイルのタッチ移動用ジョイスティックは後続フェーズ。
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

const LOOK_SENS = 0.0022 // 視点感度（ドラッグ/ロック共通）
const PITCH_LIMIT = Math.PI / 2 - 0.01

export class InputController {
  private readonly keys = new Set<string>()
  private yawValue = 0
  private pitchValue = 0
  private jumpQueued = false
  private el: HTMLElement | null = null
  private locked = false

  // ドラッグルック（PointerLock 非対応端末のフォールバック）の状態。
  private dragging = false
  private activePointerId = -1
  private lastX = 0
  private lastY = 0

  private readonly onKeyDown = (e: KeyboardEvent) => {
    // 物理キーボードの操作時のみ。e.code はレイアウト非依存（WASD が安定）。
    this.keys.add(e.code)
    if (e.code === 'Space') {
      this.jumpQueued = true
      e.preventDefault()
    }
  }
  private readonly onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code)
  }

  /** 視点を dx/dy ピクセル分だけ回す（ロック/ドラッグ共通）。 */
  private applyLook(dx: number, dy: number): void {
    this.yawValue -= dx * LOOK_SENS
    this.pitchValue -= dy * LOOK_SENS
    this.pitchValue = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitchValue))
  }

  private readonly onPointerDown = (e: PointerEvent) => {
    // 主ボタン/タッチのみ。右クリック等は無視。
    if (e.button !== 0 && e.pointerType === 'mouse') return
    // ロック中はドラッグ不要（onPointerMove が movementX/Y で処理）。
    if (this.locked) return
    this.dragging = true
    this.activePointerId = e.pointerId
    this.lastX = e.clientX
    this.lastY = e.clientY
    // 以降の pointermove/up を確実に捕捉（要素外へ出ても追従）。
    this.el?.setPointerCapture?.(e.pointerId)
    // PC では PointerLock を試みる。モバイルでは失敗してもドラッグが動く。
    this.requestLock()
  }

  private readonly onPointerMove = (e: PointerEvent) => {
    if (this.locked) {
      // PointerLock 中: movementX/Y は相対移動量。clientX/Y は使えない。
      this.applyLook(e.movementX ?? 0, e.movementY ?? 0)
      return
    }
    if (this.dragging && e.pointerId === this.activePointerId) {
      const dx = e.clientX - this.lastX
      const dy = e.clientY - this.lastY
      this.lastX = e.clientX
      this.lastY = e.clientY
      this.applyLook(dx, dy)
    }
  }

  private readonly onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== this.activePointerId) return
    this.dragging = false
    this.activePointerId = -1
    this.el?.releasePointerCapture?.(e.pointerId)
  }

  private readonly onLockChange = () => {
    this.locked = document.pointerLockElement === this.el
    // ロックが外れたらドラッグ状態もリセット。
    if (!this.locked) {
      this.dragging = false
      this.activePointerId = -1
    }
  }

  /** 対象要素で入力購読を開始する。 */
  attach(el: HTMLElement): void {
    this.el = el
    // タッチでのスクロール/ピンチ等のブラウザ既定動作を抑止（視点ドラッグを優先）。
    el.style.touchAction = 'none'
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    el.addEventListener('pointerdown', this.onPointerDown)
    el.addEventListener('pointermove', this.onPointerMove)
    el.addEventListener('pointerup', this.onPointerUp)
    el.addEventListener('pointercancel', this.onPointerUp)
    document.addEventListener('pointerlockchange', this.onLockChange)
  }

  private readonly requestLock = () => {
    // PointerLock を要求。非対応/失敗しても例外にせずドラッグへフォールバック。
    try {
      const p = this.el?.requestPointerLock?.() as unknown as Promise<void> | undefined
      p?.catch?.(() => {
        /* モバイル等でロック不可 → ドラッグルックを使う */
      })
    } catch {
      /* requestPointerLock が存在しない環境 */
    }
  }

  /** 外部（開始オーバーレイ等）から PointerLock を要求する。 */
  requestPointerLock(): void {
    this.requestLock()
  }

  /** PointerLock 中か（PC）。モバイルでは常に false（ドラッグで操作）。 */
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
    this.el?.removeEventListener('pointerdown', this.onPointerDown)
    this.el?.removeEventListener('pointermove', this.onPointerMove)
    this.el?.removeEventListener('pointerup', this.onPointerUp)
    this.el?.removeEventListener('pointercancel', this.onPointerUp)
    document.removeEventListener('pointerlockchange', this.onLockChange)
  }
}
