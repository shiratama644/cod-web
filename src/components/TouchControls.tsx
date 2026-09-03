import { useEffect, useRef, useState } from 'react'
import nipplejs from 'nipplejs'
import type { InputController } from '../game/input/InputController'

/**
 * モバイル向けタッチ操作（DOM オーバーレイ）。
 *
 * - **左下: 仮想ジョイスティック（nipplejs・static モード）**。アナログ値
 *   （-1..1）を InputController.setMoveVector へ渡す。nipplejs の vector は
 *   x: 右が +、y: 画面奥（上）が + なので、そのまま moveX/moveZ に対応する。
 * - **右下: ジャンプボタン**。押した瞬間に InputController.queueJump()。
 *
 * タッチ操作系（joystick ゾーン・ジャンプボタン）は pointer-events を掴むが、
 * 画面の残りの領域は素通りしてキャンバスのドラッグルック（視点操作）に当たる。
 *
 * PC などホバー（マウス）が主な端末では表示しない（タッチ端末のみ表示）。
 * 物理キーボード/マウスを繋いだスマホでもタッチは使えるので表示する。
 */
export function TouchControls({ input }: { input: InputController }) {
  const zoneRef = useRef<HTMLDivElement>(null)
  const [isTouch] = useState(() => detectTouch())

  useEffect(() => {
    if (!isTouch || !zoneRef.current) return

    const manager = nipplejs.create({
      zone: zoneRef.current,
      mode: 'static',
      // ゾーン中央にジョイスティックを固定（position は CSS で領域を右下に置く）。
      position: { left: '50%', top: '50%' },
      // 背景色はここで半透明 RGBA を渡す（nipplejs がインラインスタイルで
      // back/front に反映する。CSS で !important を使わないようにするため）。
      color: 'rgba(159, 231, 255, 0.55)',
      size: 130,
      threshold: 0.15,
      fadeTime: 0,
      restJoystick: true,
      restOpacity: 0.85,
      dynamicPage: false,
    })

    // 指を動かすとアナログ値を InputController へ。
    manager.on('move', (evt) => {
      const vec = evt.data?.vector
      if (!vec) return
      // vector.x: 右 +、vector.y: 上(奥) +。nipplejs が半径正規化済み（最大 1）。
      input.setMoveVector(clamp1(vec.x), clamp1(vec.y))
    })
    // 指を離したら中立（停止）。
    const reset = () => input.setMoveVector(0, 0)
    manager.on('end', reset)

    return () => {
      reset()
      manager.destroy()
    }
  }, [input, isTouch])

  if (!isTouch) return null

  return (
    <div className="touch-controls" aria-hidden="true">
      {/* 左下: ジョイスティックのタッチ領域（nipplejs がこの中に描画） */}
      <div ref={zoneRef} className="joystick-zone" />

      {/* 右下: ジャンプボタン */}
      <button
        type="button"
        className="jump-button"
        onPointerDown={(e) => {
          e.preventDefault()
          input.queueJump()
        }}
      >
        JUMP
      </button>
    </div>
  )
}

function clamp1(v: number): number {
  return v > 1 ? 1 : v < -1 ? -1 : v
}

/** タッチ入力が主な端末か（coarse pointer または touch イベント/ontouchstart）。 */
function detectTouch(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  if (window.matchMedia?.('(pointer: coarse)').matches) return true
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}
