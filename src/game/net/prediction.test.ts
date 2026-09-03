// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createDefaultWorld } from '@shared/sim/collisionWorld'
import type { PlayerInput, Snapshot } from '@shared/protocol/messages'
import { ClientPrediction } from './prediction'
import { Interpolator } from './interpolation'

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

  it('ack 済み入力は pending から消える', () => {
    const pred = new ClientPrediction(createDefaultWorld(), 1)
    for (let i = 0; i < 5; i++) pred.applyInput(moveInput())
    expect(pred.pendingCount).toBe(5)
    pred.reconcile({ x: pred.state.x, y: pred.state.y, z: pred.state.z, yaw: 0, pitch: 0 }, 3)
    expect(pred.pendingCount).toBe(2) // seq 4,5 が残る
  })

  it('調停でサーバー位置に補正され、未 ack 入力が replay される', () => {
    const pred = new ClientPrediction(createDefaultWorld(), 1)
    // 着地させる
    for (let i = 0; i < 60; i++) pred.applyInput(moveInput())
    pred.reconcile({ x: 0, y: pred.state.y, z: 0, yaw: 0, pitch: 0 }, pred.pendingCount === 0 ? 0 : 60)
    // サーバー位置（x=0,z=0）に補正済み
    expect(pred.state.x).toBeCloseTo(0, 5)
    expect(pred.state.z).toBeCloseTo(0, 5)
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
