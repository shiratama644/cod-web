import { useEffect, useState } from 'react'

/**
 * 開始オーバーレイ（DOM）。
 *
 * - ゲーム開始前に全画面への入り口を提示する。タップ/クリックはユーザージェスチャ
 *   なので、ここで **全画面（Fullscreen API）** を要求する。全画面はジェスチャ外からは
 *   許可されないため、このボタンが必須（モバイルのブラウザ全画面対策）。
 * - 開始後、オーバーレイが消えると canvas がタップ可能になり、InputController が
 *   PointerLock（PC）/ ドラッグルック（モバイル）を開始する。
 * - Esc 等で全画面を抜けるとオーバーレイを再表示する（再開の入り口）。
 * - 全画面 API が無効/拒否されても started には遷移し、ドラッグ操作はそのまま使える。
 */
export function StartOverlay() {
  const [started, setStarted] = useState(false)

  // 全画面解除（Esc 等）を検知してオーバーレイを復帰させる。
  useEffect(() => {
    const handler = () => {
      const d = document as Document & { webkitFullscreenElement?: Element | null }
      const fs = Boolean(d.fullscreenElement ?? d.webkitFullscreenElement)
      if (!fs) setStarted(false)
    }
    document.addEventListener('fullscreenchange', handler)
    document.addEventListener('webkitfullscreenchange', handler as EventListener)
    return () => {
      document.removeEventListener('fullscreenchange', handler)
      document.removeEventListener('webkitfullscreenchange', handler as EventListener)
    }
  }, [])

  const enter = () => {
    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void
    }
    try {
      if (root.requestFullscreen) {
        root.requestFullscreen().catch(() => {})
      } else if (root.webkitRequestFullscreen) {
        root.webkitRequestFullscreen()
      }
    } catch {
      /* fullscreen 非対応環境 */
    }
    // 物理キーボード入力の保険としてフォーカスを確定する。
    window.focus()
    document.querySelector('canvas')?.focus?.()
    setStarted(true)
  }

  if (started) return null

  return (
    <button type="button" className="start-overlay" onPointerDown={enter} aria-label="Start game">
      <div className="start-panel">
        <h1 className="start-title">TAP TO START</h1>
        <p className="start-sub">タップ / クリックで全画面開始</p>
        <ul className="start-help">
          <li>
            <b>PC</b>: 開始後に画面をクリックでマウスロック、<kbd>W A S D</kbd> で移動、
            <kbd>Space</kbd> でジャンプ、<kbd>Esc</kbd> で解除
          </li>
          <li>
            <b>スマホ / タブレット</b>: 画面を<em>ドラッグ</em>で視点操作。
            物理キーボード・マウスを繋げば PC と同じように操作できます
          </li>
          <li>（タッチ移動用ジョイスティックは今後追加予定）</li>
        </ul>
      </div>
    </button>
  )
}
