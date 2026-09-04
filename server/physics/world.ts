/**
 * サーバー側の衝突世界構築（ヘッドレス）。
 *
 * Phase 1 は平面/簡易ジオメトリの BVH をその場で構築する。本番（3D Mesh Map）
 * ではビルド時に事前生成した BVH を MeshBVH.deserialize で復元するが、どちらも
 * 最終的に shared の CollisionWorld 境界に乗る（docs/arch/server-authority.md §5.1）。
 *
 * サーバーは GLTFLoader（window/Image 依存）を使わず、three の core/math と
 * three-mesh-bvh（CPU のみ）だけで BVH を扱う。クライアント予測と同一マップ
 * （shared の DEFAULT_OBSTACLES）を使うことで結果が一致する。
 */

import { createDefaultWorld, type CollisionWorld } from '../../shared/sim/collisionWorld'

/** サーバーの衝突世界を構築する。 */
export function buildServerWorld(): CollisionWorld {
  return createDefaultWorld()
}
