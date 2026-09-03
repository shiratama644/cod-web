/**
 * サーバー側の衝突世界構築（ヘッドレス）。
 *
 * Phase 1 は平面/簡易ジオメトリの BVH をその場で構築する。本番（3D Mesh Map）
 * ではビルド時に事前生成した BVH を MeshBVH.deserialize で復元するが、どちらも
 * 最終的に shared の CollisionWorld 境界に乗る（docs/arch/server-authority.md §5.1）。
 *
 * サーバーは GLTFLoader（window/Image 依存）を使わず、three の core/math と
 * three-mesh-bvh（CPU のみ）だけで BVH を扱う。
 */

import { createPlaneWorld, type BoxObstacle, type CollisionWorld } from '../../shared/sim/collisionWorld'

/** Phase 1 のデフォルト障害物（平面マップ上の簡易ボックス）。 */
const DEFAULT_OBSTACLES: BoxObstacle[] = [
  { cx: 10, cy: 1, cz: 0, sizeX: 2, sizeY: 2, sizeZ: 2 },
  { cx: -8, cy: 2, cz: 6, sizeX: 4, sizeY: 4, sizeZ: 2 },
  { cx: 0, cy: 0.75, cz: -12, sizeX: 6, sizeY: 1.5, sizeZ: 2 },
]

/** サーバーの衝突世界を構築する。 */
export function buildServerWorld(): CollisionWorld {
  return createPlaneWorld(DEFAULT_OBSTACLES)
}
