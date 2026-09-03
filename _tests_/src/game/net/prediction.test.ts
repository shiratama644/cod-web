// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createDefaultWorld } from '@shared/sim/collisionWorld'
import type { PlayerInput, Snapshot } from '@shared/protocol/messages'
import { ClientPrediction } from '@/game/net/prediction'
import { Interpolator } from '@/game/net/interpolation'

function moveInput(partial: Partial<PlayerInput> = {}) {
  return {
    moveX: 0,
    moveZ: 0,
    yaw: 0,
    pitch: 0,
    flags: 0,
    dtMs: 17,
    ...partial,
  }
}

describe('ClientPrediction', () => {
  it('入力を適用するとローカル状態が進み、seq 付き入力を返す', () => {
    const pred = new ClientPrediction(createDefaultWorld(), 1)
    const in1 = pred.applyInput(moveInput({ moveZ: 1 }))
    expect(in1.seq).toBe(1)
    const in2 = pred.applyInput(moveInput({ moveZ: 1 }))
    expect(in2.seq).toBe(2)
    // 前進（yaw=0 は -Z）
    expect(pred.state.z).toBeLessThan(0)
  })

  // reconcile に渡すサーバー状態を組み立てる（速度は任意）。
  function srv(p: { x: number; y: number; z: number }, seq: number) {
    return { state: { ...p, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0 }, seq }
  }

  it('ack 済み入力は pending から消える', () => {
    const pred = new ClientPrediction(createDefaultWorld(), 1)
    for (let i = 0; i < 5; i++) pred.applyInput(moveInput())
    expect(pred.pendingCount).toBe(5)
    const { state, seq } = srv({ x: pred.state.x, y: pred.state.y, z: pred.state.z }, 3)
    pred.reconcile(state, seq)
    expect(pred.pendingCount).toBe(2) // seq 4,5 が残る
  })

  it('誤差が大きければサーバー位置へ補正し、未 ack 入力が replay される', () => {
    const pred = new ClientPrediction(createDefaultWorld(), 1)
    // 着地させる
    for (let i = 0; i < 60; i++) pred.applyInput(moveInput())
    const { state, seq } = srv({ x: 0, y: pred.state.y, z: 0 }, 60)
    pred.reconcile(state, seq)
    // サーバー位置（x=0,z=0）に補正済み（誤差が閾値を超えるためスナップ）。
    expect(pred.state.x).toBeCloseTo(0, 5)
    expect(pred.state.z).toBeCloseTo(0, 5)
  })

  it('誤差が小さいときはローカル予測を維持してスナップしない（滑らかさ優先）', () => {
    const pred = new ClientPrediction(createDefaultWorld(), 1)
    for (let i = 0; i < 60; i++) pred.applyInput(moveInput({ moveZ: 1 }))
    const before = { x: pred.state.x, y: pred.state.y, z: pred.state.z }
    // サーバーから 5cm だけズレた値が届く（閾値 0.25m 未満）。
    const { state, seq } = srv({ x: before.x + 0.05, y: before.y, z: before.z - 0.05 }, pred.pendingCount)
    pred.reconcile(state, seq)
    // ローカル予測を維持（スナップされない）。
    expect(pred.state.x).toBeCloseTo(before.x, 5)
    expect(pred.state.z).toBeCloseTo(before.z, 5)
  })
})

describe('Interpolator', () => {
  function snapshot(serverTick: number, players: Array<{ id: number; x: number; z: number }>): Snapshot {
    return {
      serverTick,
      lastAckSeq: 0,
      players: players.map((p) => ({ id: p.id, x: p.x, y: 0.02, z: p.z, vx: 0, vy: 0, vz: 0, yaw: 0 })),
    }
  }

  it('バッファが溜まるとレンダー時刻（100ms 過去）で 2 サンプル間を Lerp する', () => {
    const interp = new Interpolator()
    // t=0 で x=0、t=100 で x=10
    interp.push(snapshot(0, [{ id: 2, x: 0, z: 0 }]), 0)
    interp.push(snapshot(1, [{ id: 2, x: 10, z: 0 }]), 100)
    // レンダー時刻 = now - 100。now=150 → render=50（0 と 100 の中間）
    const out = interp.sample(150, 1)
    expect(out.get(2)?.x).toBeCloseTo(5, 1)
  })

  it('バッファが無い初期は最新サンプルをそのまま返す', () => {
    const interp = new Interpolator()
    interp.push(snapshot(0, [{ id: 2, x: 3, z: 0 }]), 0)
    const out = interp.sample(5, 1)
    expect(out.get(2)?.x).toBe(3)
  })

  it('自プレイヤーは補間対象に含めない', () => {
    const interp = new Interpolator()
    interp.push(snapshot(0, [
      { id: 1, x: 1, z: 0 },
      { id: 2, x: 2, z: 0 },
    ]), 0)
    const out = interp.sample(5, 1)
    expect(out.has(1)).toBe(false)
    expect(out.has(2)).toBe(true)
  })
})
