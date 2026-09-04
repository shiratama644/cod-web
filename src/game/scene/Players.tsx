/**
 * プレイヤー描画（自プレイヤー＋リモートプレイヤー）。
 *
 * - 自プレイヤー: ClientPrediction の状態を毎フレーム読み、カメラを一人称視点に
 *   合わせる。体は見せない（一人称）。
 * - リモートプレイヤー: Interpolator が補間した位置にカプセルを配置し、ref を
 *   直接更新する（React state 不使用・ゼロアロケ）。
 *   - スナップショットに 1 フレーム含まれないだけでは消さず、**GRACE_MS 間は
 *     直前位置に留める**ことで、ドロップ/補間の隙間による「点滅」を防ぐ。
 *     猶予を超えて戻らなければ本当に離脱したとみなし削除する。
 *
 * マップ（床・障害物）も shared の DEFAULT_OBSTACLES に合わせて簡易描画する。
 */

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { DEFAULT_OBSTACLES } from '@shared/sim/collisionWorld'
import { PLAYER_HEIGHT } from '@shared/sim/movement'
import type { GameClient } from '../net/GameClient'

// リモートが消えてもメッシュを残す猶予時間（ms）。この間に再検出されれば継続。
const GRACE_MS = 600

// 繰り返し使う一時オブジェクト（ゼロアロケ）。
const _euler = new THREE.Euler(0, 0, 0, 'YXZ')
const _remote = new THREE.Vector3()

interface RemoteMesh {
  mesh: THREE.Mesh
  lastSeenMs: number
}

export function Players({ client }: { client: GameClient }) {
  // リモートプレイヤーごとのメッシュ＋最終検出時刻を持つマップ。
  const remotes = useRef<Map<number, RemoteMesh>>(new Map())
  const remoteGroup = useRef<THREE.Group>(null)

  const capsuleGeo = useMemo(() => new THREE.CapsuleGeometry(0.4, PLAYER_HEIGHT - 0.8, 4, 8), [])
  const remoteMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ff5a5a', roughness: 0.6 }), [])

  useFrame(({ camera }) => {
    const now = performance.now()

    // ── 自プレイヤー: 一人称カメラ ──
    // 60Hz 固定ステップの予測状態を速度で描画時刻へ外挿した値を使う（120Hz 等でも
    // 階段状にならず滑らか・遅延ゼロ）。yaw/pitch は入力をそのまま（視点は機敏に）。
    const self = client.renderSelf(now)
    if (self) {
      const eye = self.y + PLAYER_HEIGHT - 0.2
      camera.position.set(self.x, eye, self.z)
      _euler.set(self.pitch, self.yaw, 0)
      camera.quaternion.setFromEuler(_euler)
    }

    // ── リモートプレイヤー: 補間位置にメッシュ配置 ──
    const group = remoteGroup.current
    if (group) {
      const seen = new Set<number>()
      client.remotes.forEach((p, id) => {
        seen.add(id)
        let entry = remotes.current.get(id)
        if (!entry) {
          const mesh = new THREE.Mesh(capsuleGeo, remoteMat)
          mesh.castShadow = true
          mesh.receiveShadow = true
          group.add(mesh)
          entry = { mesh, lastSeenMs: now }
          remotes.current.set(id, entry)
        }
        entry.lastSeenMs = now
        _remote.set(p.x, p.y + PLAYER_HEIGHT / 2, p.z)
        entry.mesh.position.copy(_remote) // 既に補間済みなので即時
        entry.mesh.rotation.y = p.yaw
      })

      // 猶予を超えて戻らなかったプレイヤーだけ削除する（点滅防止）。
      for (const [id, entry] of remotes.current) {
        if (!seen.has(id) && now - entry.lastSeenMs > GRACE_MS) {
          group.remove(entry.mesh)
          remotes.current.delete(id)
        }
      }
    }
  })

  return (
    <>
      <group ref={remoteGroup} />

      {/* マップ: 床（y=0）。影を受ける。 */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[400, 1, 400]} />
        <meshStandardMaterial color="#7c9a5e" roughness={1} />
      </mesh>

      {/* マップ: 障害物（shared と同一配置）。影を落とす/受ける。 */}
      {DEFAULT_OBSTACLES.map((o) => (
        <mesh
          key={`obs-${o.cx}-${o.cy}-${o.cz}`}
          position={[o.cx, o.cy, o.cz]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[o.sizeX, o.sizeY, o.sizeZ]} />
          <meshStandardMaterial color="#9a8a6e" roughness={0.9} />
        </mesh>
      ))}
    </>
  )
}
