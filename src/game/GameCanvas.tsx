import { Canvas } from '@react-three/fiber'
import { useCallback } from 'react'
import { gameStoreApi } from '@/store/gameStore'
import type { RendererBackend } from './renderer/createRenderer'
import { createRenderer } from './renderer/createRenderer'
import { SceneContents } from './scene/SceneContents'

/**
 * R3F Canvas。
 *
 * gl prop に非同期ファクトリを渡し、**WebGPU を最優先 → 不在/失敗時は WebGL2 へ
 * 自動フォールバック**する（createRenderer / docs/arch/tech-stack.md）。
 * WebGPU でも WebGL2 でも SceneContents は同一。
 *
 * 決定したバックエンドは Zustand ストアへ書き込む（初期化時 1 回のみ。低頻度値）。
 */
export function GameCanvas() {
  const createGl = useCallback(async (glProps: Record<string, unknown>) => {
    const { renderer, backend } = await createRenderer(glProps)
    // React フックを使えない場所（R3F のレンダラー生成）からは getState 経由で書く。
    gameStoreApi.getState().setRenderer(backend as RendererBackend)
    return renderer
  }, [])

  return (
    <Canvas
      // R3F v9: gl に非同期ファクトリを渡すと WebGPURenderer を初期化できる。
      gl={createGl}
      camera={{ position: [4, 4, 6], fov: 60, near: 0.1, far: 2000 }}
      dpr={[1, 2]}
      // 物理キーボード（モバイルに繋いだ BT/USB キーボード含む）のイベントを
      // 確実に受けるため、canvas をフォーカス可能にする。
      tabIndex={-1}
    >
      <SceneContents />
    </Canvas>
  )
}
