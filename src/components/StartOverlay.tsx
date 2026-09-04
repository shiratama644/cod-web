import { useEffect, useRef, useState } from 'react'
import screenfull from 'screenfull'

/**
 * 開始オーバーレイ（DOM）。
 *
 * - ゲーム開始前に全画面への入り口を提示する。タップ/クリックはユーザージェスチャ
 *   なので、ここで **全画面（Fullscreen API）** を要求する。全画面はジェスチャ外からは
 *   許可されないため、このボタンが必須。
 * - 全画面化には **screenfull** を使用（ベンダープレフィックス・Safari/Chrome 差異・
 *   イベント名をラップしてくれる）。非対応端末（iOS Safari 等）では isEnabled が
 *   false になり、全画面をスキップしてそのまま開始する（100dvh で画面充填）。
 * - 開始後、オーバーレイが消れば canvas がタップ可能になり、InputController が
 *   PointerLock（PC）/ ドラッグルック（モバイル）を開始する。
 * - Esc 等で全画面を抜けるとオーバーレイを再表示する（再開の入り口）。ただし
 *   **一度でも全画面に入れた場合のみ**。非対応で change イベントが false で発火し、
 *   開始画面へ巻き戻る誤作動を防ぐ。
 */
export function StartOverlay() {
  const [started, setStarted] = useState(false)
  // 一度でも全画面に入れたか（Esc での「全画面解除→オーバーレイ復帰」は、実際に
  // 全画面を使えていた場合のみ行う）。
  const didEnterFs = useRef(false)

  // 全画面状態の変化を screenfull 経由で購読（プレフィックス差を吸収）。
  useEffect(() => {
    if (!screenfull.isEnabled) return
    const onChange = () => {
      if (screenfull.isFullscreen) {
        didEnterFs.current = true
      } else if (didEnterFs.current) {
        // 実際に全画面を使えていて、それを抜けた場合のみ開始画面へ戻す。
        didEnterFs.current = false
        setStarted(false)
      }
    }
    screenfull.on('change', onChange)
    return () => {
      screenfull.off('change', onChange)
    }
  }, [])

  const enter = () => {
    // 全画面対応端末なら要求（ユーザージェスチャ内）。失敗/非対応でも続行する。
    if (screenfull.isEnabled) {
      // canvas を全画面要素にすると描画領域が確実に画面いっぱいになる。なければ
      // screenfull の既定（documentElement）にフォールバックする。
      const canvas = document.querySelector('canvas')
      try {
        const p = canvas
          ? screenfull.request(canvas, { navigationUI: 'hide' })
          : screenfull.request(undefined, { navigationUI: 'hide' })
        if (p && typeof (p as Promise<void>).catch === 'function') {
          (p as Promise<void>).catch(() => {
            /* 全画面拒否は無視してゲームは開始する */
          })
        }
      } catch {
        /* 全画面不可端末は無視 */
      }
    }
    // モバイルでアドレスバーを畳む/スクロール領域をリセットする保険（Fullscreen API が
    // 効かない環境でも viewport 充填＝100dvh で画面いっぱいに使う）。
    try {
      window.scrollTo(0, 1)
      window.scrollTo(0, 0)
    } catch {
      /* no-op */
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
            <b>スマホ / タブレット</b>: <em>左下のジョイスティック</em>で移動、
            <em>右下の JUMP ボタン</em>でジャンプ、画面の空き領域を<em>ドラッグ</em>で視点操作。
            物理キーボード/マウスを繋げば PC と同じ操作も可能
          </li>
        </ul>
      </div>
    </button>
  )
}
