import { useGameStore } from '@/store/gameStore'

/**
 * 描画バックエンドを表示する小さなオーバーレイ（DOM）。
 * WebGPU 最優先 / WebGL2 フォールバックの動作を目視確認するためのもの。
 * 低頻度値なので Zustand をフックで購読して再レンダーしてよい。
 */
export function RendererHud() {
  const renderer = useGameStore((s) => s.renderer)

  return (
    <div className="renderer-hud" role="status" aria-live="polite">
      renderer: {renderer ?? 'initializing…'}
    </div>
  )
}
