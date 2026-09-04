// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { SIM_DT } from '@shared/protocol/constants'
import type { PlayerInput } from '@shared/protocol/messages'
import { createPlaneWorld, type CollisionWorld } from '@shared/sim/collisionWorld'
import { PLAYER_RADIUS, stepPlayer } from '@shared/sim/movement'
import { createPlayerState, type PlayerState } from '@shared/types'

function input(partial: Partial<PlayerInput> = {}): PlayerInput {
  return {
    seq: 1,
    moveX: 0,
    moveZ: 0,
    yaw: 0,
    pitch: 0,
    flags: 0,
    dtMs: Math.round(SIM_DT * 1000),
    ...partial,
  }
}

/** n ステップ進める（毎回同じ入力）。 */
function stepN(p: PlayerState, inp: PlayerInput, world: CollisionWorld, n: number) {
  for (let i = 0; i < n; i++) stepPlayer(p, inp, SIM_DT, world)
  return p
}

describe('collision world (three-mesh-bvh headless)', () => {
  it('DOM/WebGL なしで平面ワールドを構築し、床の高さを返す', () => {
    const world = createPlaneWorld()
    // 足元 y=5 から下にレイ → 床上面 y=0 が返る
    const floor = world.sampleFloor(0, 0, 5, 10)
    expect(floor).not.toBeNull()
    expect(floor as number).toBeCloseTo(0, 5)
  })

  it('壁（ボックス障害物）への水平レイが当たる', () => {
    const world = createPlaneWorld([
      { cx: 10, cy: 2, cz: 0, sizeX: 2, sizeY: 4, sizeZ: 4 },
    ])
    // (0,0,0) から +X 方向へ。障害物中心 x=10、サイズ2（端 x=9）。
    // 足元 y=0、体中心は y=0+r。半径を差し引いた距離が返る。
    const hit = world.castWall(0, 0, 0, 1, 0, PLAYER_RADIUS, 20)
    expect(hit).not.toBeNull()
    // 壁面 x=9 − 半径 0.4 ≈ 8.6 程度進める
    expect(hit as number).toBeGreaterThan(8)
    expect(hit as number).toBeLessThan(9)
  })
})

describe('stepPlayer — 決定論', () => {
  it('同じ状態・入力・world から同じ結果になる', () => {
    const world = createPlaneWorld()
    const a = createPlayerState(1, 0, 5, 0)
    const b = createPlayerState(1, 0, 5, 0)
    const inp = input({ moveZ: 1, yaw: 0 })
    stepN(a, inp, world, 30)
    stepN(b, inp, world, 30)
    expect(b).toEqual(a)
  })
})

describe('stepPlayer — 重力と床着地', () => {
  it('空中スポーンすると重力で落下し、床の上で静止する', () => {
    const world = createPlaneWorld()
    const p = createPlayerState(1, 0, 10, 0)
    stepN(p, input(), world, 60 * 3) // 3 秒分
    // 床 (y=0) + FLOAT_HEIGHT(0.02) 付近で静止し、それ以上沈まない
    expect(p.y).toBeGreaterThan(0)
    expect(p.y).toBeLessThan(0.2)
    expect(Math.abs(p.vy)).toBeLessThanOrEqual(0.01)
    expect(p.grounded).toBe(true)
  })

  it('接地中にジャンプフラグで上昇する', () => {
    const world = createPlaneWorld()
    const p = createPlayerState(1, 0, 0.1, 0)
    // まず着地させる
    stepN(p, input(), world, 10)
    expect(p.grounded).toBe(true)
    const yAtGround = p.y
    // ジャンプ1回
    stepPlayer(p, input({ flags: 1 }), SIM_DT, world)
    expect(p.vy).toBeGreaterThan(0)
    // 数ステップ後に上昇している
    stepN(p, input(), world, 5)
    expect(p.y).toBeGreaterThan(yAtGround + 0.1)
  })
})

describe('stepPlayer — 水平移動', () => {
  it('移動入力で yaw 方向に進む', () => {
    const world = createPlaneWorld()
    const p = createPlayerState(1, 0, 0.05, 0)
    stepN(p, input({ moveZ: 1, yaw: 0 }), world, 30) // 0.5 秒
    // yaw=0 の前進は -Z 方向
    expect(p.z).toBeLessThan(-0.5)
    expect(Math.abs(p.x)).toBeLessThan(0.01)
  })

  it('壁に向かって進むとめり込まない', () => {
    const world = createPlaneWorld([
      { cx: 10, cy: 2, cz: 0, sizeX: 2, sizeY: 4, sizeZ: 4 },
    ])
    const p = createPlayerState(1, 0, 0.05, 0)
    const inp = input({ moveX: 1, yaw: 0 }) // yaw0 で moveX=1 は +X
    stepN(p, inp, world, 60 * 3)
    // 壁面 x=9 に半径分手前で止まる（めり込まない）
    expect(p.x).toBeLessThan(9 - PLAYER_RADIUS + 0.5)
  })
})
