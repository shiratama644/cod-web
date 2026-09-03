/**
 * CollisionWorld — 衝突判定の境界。
 *
 * three-mesh-bvh の MeshBVH をラップし、移動システム（movement.ts）に対して
 * 「足元の床の高さ」「水平方向の壁当たり」を提供する。three の core/math と
 * three-mesh-bvh のみを使い、DOM / WebGL / GLTFLoader に依存しない（ヘッドレス
 * bun サーバーでも動く）。
 *
 * 設計（docs/arch/server-authority.md §5.1）:
 *   - 本番は 3D Mesh Map（GLTF）からビルド時に事前生成した BVH を
 *     `MeshBVH.deserialize` で受け取る（マップ導入フェーズ）。
 *   - Phase 1 は平面/簡易ジオメトリからその場で BVH を構築する
 *     `createPlaneWorld()` を用意し、呼び出し側は常にこの境界越しに問い合わせる。
 *
 * 衝突解決はキネマティック（浮遊カプセル）の簡易版:
 *   - 床は鉛直下向きレイ（raycastFirst）で足元の高さを得て「浮遊高さ」に吸着。
 *   - 壁は水平方向のレイで行き止まりを検出し、進入を防ぐ。
 *   完全なカプセル shapecast は段差・坂の必要が出るマップ導入フェーズで拡張する。
 */

import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Ray,
  Vector3,
} from 'three'
import { MeshBVH } from 'three-mesh-bvh'

/** 衝突世界に対する問い合わせを提供する境界。 */
export interface CollisionWorld {
  /**
   * 位置 (x,z) の足元にある床のワールド Y を返す。足元 `feelerHeight` 以内に
   * 床が無ければ null（= 空中）。
   */
  sampleFloor(x: number, z: number, feetY: number, feelerHeight: number): number | null
  /**
   * 中心 (x,y,z)・半径 r のカプセル/球が水平方向 (dirX,dirZ) に
   * `maxDist` 進むと壁に当たるか。当たるならその距離を返す。
   */
  castWall(
    x: number,
    y: number,
    z: number,
    dirX: number,
    dirZ: number,
    r: number,
    maxDist: number,
  ): number | null
}

/** ビルド済み BVH から CollisionWorld を作る（本番・GLTF deserialize 後の境界）。 */
export function createCollisionWorld(bvh: MeshBVH): CollisionWorld {
  return new BvhCollisionWorld(bvh)
}

/**
 * Phase 1 用の平面ワールド: y=0 の広い床＋任意の簡易ボックス障害物。
 * 床・障害物を統合した 1 つの BVH を構築する。
 */
export function createPlaneWorld(obstacles: ReadonlyArray<BoxObstacle> = []): CollisionWorld {
  const geometries: BufferGeometry[] = []

  // 床: 厚みを持たせた薄いボックス（上面が y=0）。Plane よりボックスの方が
  // 下向き/横向きどちらのレイでも安定して当たる。
  const floor = new BoxGeometry(400, 1, 400)
  floor.translate(0, -0.5, 0)
  geometries.push(floor)

  for (const o of obstacles) {
    const g = new BoxGeometry(o.sizeX, o.sizeY, o.sizeZ)
    g.translate(o.cx, o.cy, o.cz)
    geometries.push(g)
  }

  const merged = mergeGeometries(geometries)
  const bvh = new MeshBVH(merged)
  return new BvhCollisionWorld(bvh)
}

export interface BoxObstacle {
  cx: number
  cy: number
  cz: number
  sizeX: number
  sizeY: number
  sizeZ: number
}

// ─────────────────────────────────────────────────────────────────────────

class BvhCollisionWorld implements CollisionWorld {
  // 繰り返し使う一時オブジェクト（ゼロアロケ）。
  private readonly _ray = new Ray()
  private readonly _origin = new Vector3()
  private readonly _dir = new Vector3()

  constructor(private readonly bvh: MeshBVH) {}

  sampleFloor(x: number, z: number, feetY: number, feelerHeight: number): number | null {
    // 足元より少し上から真下にレイ。feelerHeight 以内の上面を床とする。
    this._origin.set(x, feetY + 0.05, z)
    this._dir.set(0, -1, 0)
    this._ray.set(this._origin, this._dir)
    const hit = this.bvh.raycastFirst(this._ray as never, DoubleSide, 0, feelerHeight + 0.1)
    if (!hit || hit.point == null) return null
    return hit.point.y
  }

  castWall(
    x: number,
    y: number,
    z: number,
    dirX: number,
    dirZ: number,
    r: number,
    maxDist: number,
  ): number | null {
    const len = Math.hypot(dirX, dirZ)
    if (len < 1e-6) return null
    // 体の中心の高さ（足元 + 半径程度）から水平にレイ。
    this._origin.set(x, y + r, z)
    this._dir.set(dirX / len, 0, dirZ / len)
    this._ray.set(this._origin, this._dir)
    const hit = this.bvh.raycastFirst(this._ray as never, DoubleSide, 0, maxDist + r)
    if (!hit || hit.distance == null) return null
    // 衝突までの進める距離 = ヒット距離 − 半径。負なら既にめり込み。
    const allowed = hit.distance - r
    return allowed < 0 ? 0 : allowed
  }
}

/**
 * 複数ジオメトリを1つの non-indexed BufferGeometry に結合する（three の
 * BufferGeometryUtils を追加依存せず、position を連結するだけの最小実装）。
 * MeshBVH は non-indexed ジオメトリでも構築できる。
 */
function mergeGeometries(geometries: BufferGeometry[]): BufferGeometry {
  const positions: number[] = []
  for (const g of geometries) {
    const nonIndexed = g.index ? g.toNonIndexed() : g
    const pos = nonIndexed.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
    }
  }
  const merged = new BufferGeometry()
  merged.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  return merged
}
