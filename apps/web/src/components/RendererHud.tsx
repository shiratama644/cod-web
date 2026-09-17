import { useGameStore } from '@/store/gameStore'

/**
 * 描画バックエンドと接続状態を表示する小さなオーバーレイ（DOM）。
 * Babylon Engine / GameClient 初期化状態を目視確認するためのもの。
 * 低頻度値なので Zustand をフックで購読して再レンダーしてよい。
 */
export function RendererHud() {
  const renderer = useGameStore((s) => s.renderer)
  const connectionStatus = useGameStore((s) => s.connectionStatus)

  return (
    <div className="renderer-hud" role="status" aria-live="polite">
      <div>renderer: {renderer ?? 'initializing…'}</div>
      <div>net: {connectionStatus}</div>
    </div>
  )
}
