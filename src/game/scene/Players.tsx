/**
 * プレイヤー描画（自プレイヤー＋リモートプレイヤー）。
 *
 * - 自プレイヤー: ClientPrediction の状態を毎フレーム読み、カメラを一人称視点に
 *   合わせる。体は見せない（一人称）。
 * - リモートプレイヤー: Interpolator が補間した位置にカプセル/ボックスを配置し、
 *   ref を直接更新する（React state 不使用・ゼロアロケ）。
 *
 * マップ（床・障害物）も shared の DEFAULT_OBSTACLES に合わせて簡易描画する。
 */

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { DEFAULT_OBSTACLES } from '@shared/sim/collisionWorld'
import { PLAYER_HEIGHT } from '@shared/sim/movement'
import type { GameClient } from '../net/GameClient'

// 繰り返し使う一時オブジェクト（ゼロアロケ）。
const _euler = new THREE.Euler(0, 0, 0, 'YXZ')
const _remote = new THREE.Vector3()

export function Players({ client }: { client: GameClient }) {
  // リモートプレイヤーごとのメッシュを確保するマップ。
  const remoteMeshes = useRef<Map<number, THREE.Mesh>>(new Map())
  const remoteGroup = useRef<THREE.Group>(null)

  const capsuleGeo = useMemo(() => new THREE.CapsuleGeometry(0.4, PLAYER_HEIGHT - 0.8, 4, 8), [])
  const remoteMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5aa2ff' }), [])

  useFrame(({ camera }) => {
    // ── 自プレイヤー: 一人称カメラ ──
    const self = client.self
    if (self) {
      // カメラ位置は足元 + 目線高さ。yaw/pitch はオイラー YXZ。
      const eye = self.y + PLAYER_HEIGHT - 0.2
      camera.position.set(self.x, eye, self.z)
      _euler.set(self.pitch, self.yaw, 0)
      camera.quaternion.setFromEuler(_euler)
    }

    // ── リモートプレイヤー: 補間位置にメッシュ配置 ──
    const group = remoteGroup.current
    if (!group) return
    const seen = new Set<number>()
    client.remotes.forEach((p, id) => {
      seen.add(id)
      let mesh = remoteMeshes.current.get(id)
      if (!mesh) {
        mesh = new THREE.Mesh(capsuleGeo, remoteMat)
        remoteMeshes.current.set(id, mesh)
        group.add(mesh)
      }
      _remote.set(p.x, p.y + PLAYER_HEIGHT / 2, p.z)
      mesh.position.lerp(_remote, 1) // 既に補間済みなので即時
      mesh.rotation.y = p.yaw
    })
    // 離脱したプレイヤーのメッシュを削除
    for (const [id, mesh] of remoteMeshes.current) {
      if (!seen.has(id)) {
        group.remove(mesh)
        remoteMeshes.current.delete(id)
      }
    }
  })

  return (
    <>
      <group ref={remoteGroup} />

      {/* マップ: 床（y=0） */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[400, 1, 400]} />
        <meshStandardMaterial color="#1c2330" />
      </mesh>

      {/* マップ: 障害物（shared と同一配置）。キーは静的な座標から生成。 */}
      {DEFAULT_OBSTACLES.map((o) => (
        <mesh
          key={`obs-${o.cx}-${o.cy}-${o.cz}`}
          position={[o.cx, o.cy, o.cz]}
          castShadow
        >
          <boxGeometry args={[o.sizeX, o.sizeY, o.sizeZ]} />
          <meshStandardMaterial color="#3a4658" />
        </mesh>
      ))}
    </>
  )
}
