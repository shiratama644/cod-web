import { useRef } from 'react'
import type { Mesh } from 'three'
import { useSpin } from '@/game/loop/useSpin'
import type { Position } from '@/game/types'

interface ObjectProps {
  position?: Position
}

/**
 * 地面プレーン。
 * P0-D の最小シーン構成要素（影なし・軽量）。
 */
export function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#1c2530" />
    </mesh>
  )
}

/**
 * 動作確認用の回転ボックス。
 *
 * 毎フレームの回転は useSpin（useFrame）が ref を直接更新する（React state 非依存・
 * ゼロアロケーション・delta time ベース）。R3F の JSX で ref を渡しているだけで、
 * コンポーネント自体は再レンダーされない。
 */
export function Box({ position = [0, 1, 0] }: ObjectProps) {
  const meshRef = useRef<Mesh>(null)
  useSpin(meshRef)

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#4fc3f7" />
    </mesh>
  )
}
