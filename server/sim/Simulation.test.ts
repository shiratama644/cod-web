// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { SIM_DT } from '../../shared/protocol/constants'
import type { PlayerInput } from '../../shared/protocol/messages'
import { createPlaneWorld } from '../../shared/sim/collisionWorld'
import { Room, type Peer } from '../room/Room'
import { Simulation } from './Simulation'

function noopPeer(): Peer {
  return { playerId: -1, sendText: () => {}, sendBinary: () => false, getBufferedAmount: () => 0 }
}

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

describe('Simulation — 権威シミュレーション', () => {
  it('入力なしでも tick が進み、プレイヤーは重力で落下して床に着地する', () => {
    const room = new Room()
    room.join(noopPeer())
    const sim = new Simulation(room, createPlaneWorld())

    for (let i = 0; i < 60 * 3; i++) sim.step()

    expect(sim.currentTick()).toBe(180)
    const p = room.getPlayers()[0]
    expect(p?.grounded).toBe(true)
    expect(p?.y).toBeGreaterThan(0)
    expect(p?.y).toBeLessThan(0.2)
  })

  it('移動入力を渡すと権威状態が yaw 方向に進む', () => {
    const room = new Room()
    const id = room.join(noopPeer()) as number
    const sim = new Simulation(room, createPlaneWorld())

    // まず着地させる（入力なし）
    for (let i = 0; i < 60; i++) sim.step()
    const zBefore = room.getPlayer(id)?.z ?? 0

    // 前進入力を毎 tick 供給
    for (let i = 0; i < 30; i++) {
      sim.receiveInput(id, input({ seq: 100 + i, moveZ: 1, yaw: 0 }))
      sim.step()
    }
    const zAfter = room.getPlayer(id)?.z ?? 0
    // yaw=0 の前進は -Z
    expect(zAfter).toBeLessThan(zBefore - 0.5)
    // 処理済み seq が状態に反映されている
    expect(room.getPlayer(id)?.lastInputSeq).toBe(129)
  })

  it('seq が巻き戻る古い入力は無視する（最新のみ保持）', () => {
    const room = new Room()
    const id = room.join(noopPeer()) as number
    const sim = new Simulation(room, createPlaneWorld())

    sim.receiveInput(id, input({ seq: 10 }))
    sim.receiveInput(id, input({ seq: 5 })) // 古い → 無視
    sim.step()
    expect(room.getPlayer(id)?.lastInputSeq).toBe(10)
  })

  it('update() はアキュムレータで固定ステップに分解する（60Hz ≈ 16.7ms）', () => {
    const room = new Room()
    room.join(noopPeer())
    const sim = new Simulation(room, createPlaneWorld())

    // 初回は基準時刻合わせで 0 ステップ
    expect(sim.update(0)).toBe(0)
    // 85ms 経過（0→85ms）→ 5 ステップ（85 / 16.67 = 5.1、クランプ上限 5 内）
    expect(sim.update(85)).toBe(5)
    // さらに 85ms（85→170ms）→ 累積からさらに 5 ステップ
    expect(sim.update(170)).toBe(5)
    expect(sim.currentTick()).toBe(10)
  })
})
