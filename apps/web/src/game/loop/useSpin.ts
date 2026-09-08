import { useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'
import type { Mesh } from 'three'

/**
 * ゲームループ骨架（P0-E）。
 *
 * 黄金ルール（docs/arch/game-engineering-principles.md）:
 * - 毎フレーム更新する値は **React state を使わず ref を直接書き換える**（再レンダーなし）。
 * - ループ内で **new THREE.Vector3() 等のオブジェクトを生成しない**（ゼロアロケーション）。
 * - 経過時間は **delta time ベース**（描画 FPS が 60/90/120/144Hz でも速度一定）。
 *
 * ここでは ref の rotation を直接加算するだけなので、一時オブジェクトの割り当ては
 * 一切発生しない（プリミティブな数値演算のみ）。
 */
export function useSpin(ref: RefObject<Mesh | null>, radiansPerSecond = 0.8): void {
  useFrame((_, delta) => {
    const mesh = ref.current
    if (!mesh) return
    // delta をクランプしてタブ復帰直後の巨大ジャンプを防ぐ（最大 50ms / 0.05s）。
    const dt = delta > 0.05 ? 0.05 : delta
    mesh.rotation.y += radiansPerSecond * dt
    mesh.rotation.x += radiansPerSecond * 0.5 * dt
  })
}
