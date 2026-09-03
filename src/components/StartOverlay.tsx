import { useEffect, useRef, useState } from 'react'

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: (options?: { [key: string]: unknown }) => Promise<void> | void
}

/**
 * 全画面化を試みる。モバイル Chromium / Samsung Internet は documentElement より
 * **要素（canvas / body）の requestFullscreen** が確実で、Android は webkit プレフィックス
 * 付きでないと動かない端末があるため、候補を順に試す。必ずユーザージェスチャ内で呼ぶ。
 */
function requestFullscreen(): void {
  const options: FullscreenOptions = { navigationUI: 'hide' }
  const candidates: Element[] = [
    document.querySelector('canvas') as Element | null,
    document.body,
    document.documentElement,
  ].filter(Boolean) as Element[]

  for (const el0 of candidates) {
    const el = el0 as FullscreenElement
    try {
      if (el.requestFullscreen) {
        const p = el.requestFullscreen(options)
        if (p && typeof p.then === 'function') p.catch(() => {})
        return // 標準 API で起動できたら終了（成功可否は fullscreenchange で判定）
      }
      if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen({ navigationUI: 'hide' })
        return
      }
    } catch {
      // この要素では入れなかっただけ。次の候補を試す。
    }
  }
}

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
  // 一度でも全画面に入れたか（Esc での「全画面解除→オーバーレイ復帰」は、実際に
  // 全画面を使えていた場合のみ行う）。モバイルで Fullscreen API が拒否/非対応の環境では
  // fullscreenchange が fs=false のまま発火して started を巻き戻してしまうため、この門が要る。
  const didEnterFs = useRef(false)

  // 全画面解除（Esc 等）を検知してオーバーレイを復帰させる。
  useEffect(() => {
    const handler = () => {
      const d = document as Document & { webkitFullscreenElement?: Element | null }
      const fs = Boolean(d.fullscreenElement ?? d.webkitFullscreenElement)
      if (fs) {
        didEnterFs.current = true
      } else if (didEnterFs.current) {
        // 実際に全画面を使えていて、それを抜けた場合のみ開始画面へ戻す。
        didEnterFs.current = false
        setStarted(false)
      }
    }
    document.addEventListener('fullscreenchange', handler)
    document.addEventListener('webkitfullscreenchange', handler as EventListener)
    return () => {
      document.removeEventListener('fullscreenchange', handler)
      document.removeEventListener('webkitfullscreenchange', handler as EventListener)
    }
  }, [])

  const enter = () => {
    requestFullscreen()
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
