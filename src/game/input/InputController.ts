/**
 * 入力アダプタ（PC ＋ モバイル共通）。
 *
 * - **移動**:
 *   - キーボード WASD / 矢印キー（PC、またはスマホに繋いだ物理キーボード）。
 *   - 画面左下の**仮想ジョイスティック（nipplejs）**。アナログ値（-1..1）を
 *     直接反映し、キーボード入力と合成する（どちらでも動く）。
 * - **ジャンプ**: Space キー、または画面右下のジャンプボタン（ワンショット）。
 * - **視点**（マルチタッチ対応）:
 *   - PointerLock 対応端末（PC ブラウザ）: クリックでロックし、マウス移動で視点操作。
 *   - **PointerLock 非対応端末（Android/iOS の Edge・Chrome、タッチ）**:
 *     画面の「空き領域」を別の指でドラッグすると視点が動く。視点用のポインタは
 *     **window レベルで監視し、ジョイスティック/ボタン（.touch-ui）から始まった
 *     指は視点にしない**。これにより「スティックを押しながら視点ドラッグ/ジャンプ」が
 *     同時にできる（マルチタッチ）。
 *
 * ブラウザ API（DOM イベント・PointerLock・Fullscreen）に依存するのはこのクラスと
 * オーバーレイだけ。
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

/** 移動入力を -1..1 にクランプ。 */
function clampAxis(v: number): number {
  return v > 1 ? 1 : v < -1 ? -1 : v
}

export class InputController {
  private readonly keys = new Set<string>()
  private yawValue = 0
  private pitchValue = 0
  private jumpQueued = false
  private el: HTMLElement | null = null
  private locked = false

  // 仮想ジョイスティックのアナログ入力（-1..1）。nipplejs から setMoveVector で渡る。
  private joyX = 0
  private joyZ = 0

  // ドラッグルック（タッチ/マウス）で視点を操作しているポインタの ID。
  // -1 なら視点ドラッグ中の指はない。スティック/ボタンの指とは独立させる（マルチタッチ）。
  private lookPointerId = -1
  private lastLookX = 0
  private lastLookY = 0

  private readonly onKeyDown = (e: KeyboardEvent) => {
    // 物理キーボードの操作時のみ。e.code はレイアウト非依存（WASD が安定）。
    this.keys.add(e.code)
    if (e.code === 'Space') {
      this.queueJump()
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

  /**
   * そのポインタのターゲットがタッチ UI（ジョイスティック・ボタン・開始パネル）か。
   * .touch-ui またはその子孫で始まった指は視点操作にしない（マルチタッチで同居させる）。
   */
  private isTouchUiTarget(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest('.touch-ui') != null
  }

  private readonly onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      // PC マウス: 主ボタンのみ。PointerLock を試みる（ロック中は move の movementX/Y で視点）。
      if (e.button !== 0) return
      if (this.isTouchUiTarget(e.target)) return
      if (this.locked) return
      this.requestLock()
      // PointerLock が効かない環境（モバイルにマウス等）はドラッグルックにも備えて
      // このポインタを視点用に確保する。
      this.beginLook(e)
      return
    }
    // タッチ/ペン: ジョイスティック/ボタンの指は視点にしない。空き領域の指だけ視点に。
    if (this.isTouchUiTarget(e.target)) return
    // 視点ドラッグは同時に 1 本だけ（最初に空き領域を掴んだ指）。
    if (this.lookPointerId !== -1) return
    this.beginLook(e)
  }

  private beginLook(e: PointerEvent): void {
    this.lookPointerId = e.pointerId
    this.lastLookX = e.clientX
    this.lastLookY = e.clientY
  }

  private readonly onPointerMove = (e: PointerEvent) => {
    if (this.locked && e.pointerType === 'mouse') {
      // PointerLock 中: movementX/Y が相対移動量。
      this.applyLook(e.movementX ?? 0, e.movementY ?? 0)
      return
    }
    if (e.pointerId === this.lookPointerId) {
      // 視点ドラッグ中のタッチ既定動作（スクロール/ピンチ）を抑止。
      e.preventDefault()
      const dx = e.clientX - this.lastLookX
      const dy = e.clientY - this.lastLookY
      this.lastLookX = e.clientX
      this.lastLookY = e.clientY
      this.applyLook(dx, dy)
    }
  }

  private readonly onPointerUp = (e: PointerEvent) => {
    if (e.pointerId === this.lookPointerId) this.lookPointerId = -1
  }

  private readonly onLockChange = () => {
    this.locked = document.pointerLockElement === this.el
    // ロックが外れたら視点ドラッグ状態もリセット。
    if (!this.locked) this.lookPointerId = -1
  }

  /** 入力購読を開始する。視点は window レベルで監視しマルチタッチに対応する。 */
  attach(el: HTMLElement): void {
    this.el = el
    // 視点ドラッグ対象（canvas）ではタッチのスクロール/ピンチ/プルリフレッシュ等の
    // ブラウザ既定動作を抑止しないと、タッチドラッグがジェスチャとみなされて
    // pointermove がキャンセルされ、視点操作できなくなる（touch-action: none は必須）。
    el.style.touchAction = 'none'
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    // 視点ドラッグは window で取る。ジョイスティック/ボタンは .touch-ui で除外し、
    // それらの上で始まった指は視点にならない（別の指で空き領域をドラッグできる）。
    window.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('pointermove', this.onPointerMove, { passive: false })
    window.addEventListener('pointerup', this.onPointerUp)
    window.addEventListener('pointercancel', this.onPointerUp)
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

  /**
   * 仮想ジョイスティックのアナログ移動入力を設定する（nipplejs から呼ぶ）。
   * @param x -1..1（右が +）
   * @param z -1..1（前＝画面奥が +）。nipplejs の vector をそのまま渡す。
   */
  setMoveVector(x: number, z: number): void {
    this.joyX = x
    this.joyZ = z
  }

  /** ジャンプを 1 回要求する（ジャンプボタン・Space 共通。次の sample で消費）。 */
  queueJump(): void {
    this.jumpQueued = true
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
    // キーボード由来の移動（-1/0/1）。
    let keyX = 0
    let keyZ = 0
    if (k.has('KeyW') || k.has('ArrowUp')) keyZ += 1
    if (k.has('KeyS') || k.has('ArrowDown')) keyZ -= 1
    if (k.has('KeyD') || k.has('ArrowRight')) keyX += 1
    if (k.has('KeyA') || k.has('ArrowLeft')) keyX -= 1

    // キーボードと仮想ジョイスティックを合成し、-1..1 にクランプ。
    let moveX = clampAxis(keyX + this.joyX)
    let moveZ = clampAxis(keyZ + this.joyZ)
    // 斜めのアナログ入力で長さが 1 を超えないように正規化（スティックは既に
    // 半径 1 だが、キーボード合成時は 1 を超えうるため）。
    const len = Math.hypot(moveX, moveZ)
    if (len > 1) {
      moveX /= len
      moveZ /= len
    }

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
    window.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('pointercancel', this.onPointerUp)
    document.removeEventListener('pointerlockchange', this.onLockChange)
  }
}
