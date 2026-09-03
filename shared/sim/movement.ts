/**
 * プレイヤー移動システム（純粋関数）。
 *
 * クライアント予測とサーバー権威が**同一関数・同一 CollisionWorld** を呼び、
 * 同じ入力（量子化デコード後）から同じ状態を得る（決定論）。
 *
 * 物理エンジンは使わず、three-mesh-bvh の BVH に対するキネマティックな
 * 浮遊カプセル: 重力を積分し、床レイで接地判定・浮遊高さに吸着、水平レイで
 * 壁への進入を防ぐ。docs/arch/server-authority.md §6.5。
 */

import { GRAVITY, JUMP_FORCE, MOVE_SPEED } from '../protocol/constants'
import { INPUT_FLAG_JUMP, type PlayerInput } from '../protocol/messages'
import type { CollisionWorld } from './collisionWorld'
import type { PlayerState } from '../types'

/** カプセル/プレイヤーの半径（m）。水平の壁判定・体中心の高さに使う。 */
export const PLAYER_RADIUS = 0.4
/** カプセルの全高（m）。 */
export const PLAYER_HEIGHT = 1.8
/** 接地判定に使う足元下のレイ長さ（m）。この内に床があれば接地とみなす。 */
export const GROUND_FEELER = 0.2
/**
 * 落下時の床スナップ用レイ長さ（m）。1 ステップの最大落下距離（終端速度
 * 50m/s × 1/60 ≈ 0.83m）を確実に吸収できる長さ。高速でも床をすり抜けない。
 */
export const FLOOR_SNAP_FEELER = 1.0
/** 接地時に維持する浮遊高さ（足元と床の間の遊び）。 */
export const FLOAT_HEIGHT = 0.02
/** 水平速度の大きさ上限（m/s）。移動検証・チート防止の下限としても使用。 */
export const MAX_HORIZONTAL_SPEED = MOVE_SPEED * 1.5

/**
 * 1 ステップ分プレイヤーを進める。
 *
 * @param p     現在の状態（in-place で更新される。呼び出し側で複製したい場合は複製を渡す）
 * @param input デコード済みの入力（量子化後の値。決定論のため生値は使わない）
 * @param dt    固定ステップ秒数（通常 SIM_DT = 1/60）
 * @param world 衝突世界（BVH）
 * @returns 更新された状態（引数 p と同一参照）
 */
export function stepPlayer(
  p: PlayerState,
  input: PlayerInput,
  dt: number,
  world: CollisionWorld,
): PlayerState {
  // ── 1. 入力から水平の目標速度を求める（yaw 基準の前後左右） ──
  const sin = Math.sin(input.yaw)
  const cos = Math.cos(input.yaw)
  // yaw=0 を -Z 方向（three のカメラ既定）にとる。前進(moveZ=1)は -Z。
  // 前後: moveZ、左右: moveX
  let wishX = (-sin * input.moveZ + cos * input.moveX)
  let wishZ = (-cos * input.moveZ - sin * input.moveX)
  const wishLen = Math.hypot(wishX, wishZ)
  if (wishLen > 1) {
    wishX /= wishLen
    wishZ /= wishLen
  }

  p.vx = wishX * MOVE_SPEED
  p.vz = wishZ * MOVE_SPEED

  // 水平速度の上限クランプ（不正な速度を棄却）
  const hSpeed = Math.hypot(p.vx, p.vz)
  if (hSpeed > MAX_HORIZONTAL_SPEED) {
    const k = MAX_HORIZONTAL_SPEED / hSpeed
    p.vx *= k
    p.vz *= k
  }

  // ── 2. 接地判定（足元の床を BVH レイで調べる） ──
  const floorY = world.sampleFloor(p.x, p.z, p.y, GROUND_FEELER)
  p.grounded = floorY !== null && p.vy <= 0.001 && p.y <= floorY + GROUND_FEELER

  // ── 3. ジャンプ（接地中のみ）と重力 ──
  let jumpedThisFrame = false
  if (p.grounded && (input.flags & INPUT_FLAG_JUMP) !== 0) {
    p.vy = JUMP_FORCE
    p.grounded = false
    jumpedThisFrame = true
  }
  p.vy += GRAVITY * dt
  // 落下速度の下限（過剰な vy を抑制）
  if (p.vy < -50) p.vy = -50

  // ── 4. 水平移動（壁との衝突をレイで解決） ──
  const moveX = p.vx * dt
  const moveZ = p.vz * dt
  const moveDist = Math.hypot(moveX, moveZ)
  if (moveDist > 1e-6) {
    const hitDist = world.castWall(p.x, p.y, p.z, moveX, moveZ, PLAYER_RADIUS, moveDist)
    if (hitDist === null) {
      p.x += moveX
      p.z += moveZ
    } else {
      const allowed = Math.max(0, hitDist)
      const scale = moveDist > 0 ? allowed / moveDist : 0
      p.x += moveX * scale
      p.z += moveZ * scale
      // 壁に当たった水平速度は 0 にせず、次ステップで再判定（簡易）。
    }
  }

  // ── 5. 鉛直移動と床への吸着 ──
  // 上昇中（ジャンプ直後）は床スナップしない（上昇開始直後に足元レイが床を
  // 再検知して vy を 0 にしてしまうのを防ぐ）。落下中は十分な長さのレイで
  // 1 ステップ分の落ち込みを吸収し、高速落下でも床をすり抜けないようにする。
  p.y += p.vy * dt
  if (jumpedThisFrame || p.vy > 0) {
    // 上昇中（ジャンプ開始フレーム含む）は床スナップしない。
    p.grounded = false
  } else {
    // 落下中は十分な長さのレイで 1 ステップ分の落ち込みを吸収（すり抜け防止）。
    const newFloorY = world.sampleFloor(p.x, p.z, p.y, FLOOR_SNAP_FEELER)
    if (newFloorY !== null && p.y <= newFloorY + FLOAT_HEIGHT + GROUND_FEELER) {
      p.y = newFloorY + FLOAT_HEIGHT
      p.vy = 0
      p.grounded = true
    } else {
      p.grounded = false
    }
  }

  // ── 6. 視点と入力 ack ──
  p.yaw = input.yaw
  p.pitch = input.pitch
  if (input.seq > p.lastInputSeq) p.lastInputSeq = input.seq

  return p
}
