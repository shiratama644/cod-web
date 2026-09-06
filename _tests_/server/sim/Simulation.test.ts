// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { LAGCOMP_HISTORY_MS, SIM_DT } from '@shared/protocol/constants'
import type { PlayerInput } from '@shared/protocol/messages'
import { createPlaneWorld } from '@shared/sim/collisionWorld'
import { Room, type Peer } from '@server/room/Room'
import { Simulation } from '@server/sim/Simulation'

function noopPeer(): Peer {
  return { playerId: -1, sendText: () => {}, sendBinary: () => 16 }
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

  it('1 tick に複数入力が届いても取りこぼさず順に消費する（ジャンプフラグが消えない）', () => {
    const room = new Room()
    const id = room.join(noopPeer()) as number
    const sim = new Simulation(room, createPlaneWorld())
    // 着地させる
    for (let i = 0; i < 90; i++) sim.step()
    const p = room.getPlayer(id) as NonNullable<ReturnType<typeof room.getPlayer>>
    expect(p.grounded).toBe(true)

    // 同じ tick で 2 つ入力が到着（ジッタでバッチ着信）。2 つ目がジャンプ。
    sim.receiveInput(id, input({ seq: 200, moveZ: 1 }))
    sim.receiveInput(id, input({ seq: 201, flags: 1 /* JUMP */ }))

    sim.step() // 1 つ目を消費（前進）
    sim.step() // 2 つ目を消費（ジャンプ）→ 取りこぼされない
    expect(p.grounded).toBe(false) // ジャンプで離床
    expect(p.lastInputSeq).toBe(201)
  })

  it('入力が無い tick でも視点（yaw/pitch）は現在値に維持される（yaw=0 に戻らない）', () => {
    const room = new Room()
    const id = room.join(noopPeer()) as number
    const sim = new Simulation(room, createPlaneWorld())
    for (let i = 0; i < 90; i++) sim.step()

    sim.receiveInput(id, input({ seq: 300, yaw: 1.5, pitch: 0.3 }))
    sim.step()
    // 以降は入力を一切送らない tick
    for (let i = 0; i < 5; i++) sim.step()
    const p = room.getPlayer(id) as NonNullable<ReturnType<typeof room.getPlayer>>
    expect(p.yaw).toBeCloseTo(1.5, 5)
    expect(p.pitch).toBeCloseTo(0.3, 5)
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

  it('step 後に lagcomp 履歴が 1 件以上ある', () => {
    const room = new Room()
    const id = room.join(noopPeer()) as number
    const sim = new Simulation(room, createPlaneWorld())
    expect(sim.lagComp.getHistory(id)).toHaveLength(0)
    sim.step()
    const hist = sim.lagComp.getHistory(id)
    expect(hist.length).toBeGreaterThanOrEqual(1)
    expect(hist[0]?.tick).toBe(1)
  })

  it('lagcomp 履歴窓は 500ms で古いサンプルを落とす', () => {
    const room = new Room()
    const id = room.join(noopPeer()) as number
    const sim = new Simulation(room, createPlaneWorld())
    for (let i = 0; i < 60; i++) sim.step()
    const hist = sim.lagComp.getHistory(id)
    const oldest = hist[0]
    const newest = hist[hist.length - 1]
    if (!oldest || !newest) throw new Error('empty history')
    expect(newest.timeMs - oldest.timeMs).toBeLessThanOrEqual(LAGCOMP_HISTORY_MS)
    expect(hist.length).toBeLessThan(60)
    expect(hist.length).toBeGreaterThan(1)
  })
})
