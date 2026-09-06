// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { MAX_PLAYERS } from '@shared/protocol/constants'
import { Room, type Peer } from '@server/room/Room'

function makePeer(): Peer & { sent: string[] } {
  const sent: string[] = []
  return {
    playerId: -1,
    sendText: (d: string) => sent.push(d),
    sendBinary: () => 16,
    sent,
  }
}

describe('Room — 参加/離退', () => {
  it('join で playerId を払い出し、welcome と roster を受け取る', () => {
    const room = new Room()
    const peer = makePeer()
    const id = room.join(peer)
    expect(id).toBe(1)
    expect(room.playerCount).toBe(1)
    const welcome = JSON.parse(peer.sent[0] as string)
    expect(welcome.kind).toBe('welcome')
    expect(welcome.playerId).toBe(1)
    expect(welcome.roster).toEqual([1])
  })

  it('2 人目は 1 人目の join 通知を受け、本人は welcome を受け取る', () => {
    const room = new Room()
    const a = makePeer()
    const b = makePeer()
    room.join(a)
    a.sent.length = 0
    room.join(b)

    // b には welcome
    const bWelcome = JSON.parse(b.sent[0] as string)
    expect(bWelcome.kind).toBe('welcome')
    expect(bWelcome.roster).toHaveLength(2)
    // a には join 通知
    const aJoin = JSON.parse(a.sent[0] as string)
    expect(aJoin.kind).toBe('join')
    expect(aJoin.playerId).toBe(2)
  })

  it('leave すると roster から外れ、他者に leave 通知が届く', () => {
    const room = new Room()
    const a = makePeer()
    const b = makePeer()
    const idA = room.join(a) as number
    room.join(b)
    a.sent.length = 0
    b.sent.length = 0

    room.leave(idA)
    expect(room.playerCount).toBe(1)
    expect(room.roster()).toEqual([2])
    const leave = JSON.parse(b.sent[0] as string)
    expect(leave.kind).toBe('leave')
    expect(leave.playerId).toBe(idA)
  })

  it('満員（MAX_PLAYERS）になると参加を拒否する', () => {
    const room = new Room()
    for (let i = 0; i < MAX_PLAYERS; i++) room.join(makePeer())
    expect(room.playerCount).toBe(MAX_PLAYERS)
    const extra = makePeer()
    expect(room.join(extra)).toBeNull()
    expect(room.playerCount).toBe(MAX_PLAYERS)
  })

  it('getPlayers はプレイヤー状態を返す（id 一致）', () => {
    const room = new Room()
    const id = room.join(makePeer()) as number
    const players = room.getPlayers()
    expect(players).toHaveLength(1)
    expect(players[0]?.id).toBe(id)
    expect(room.getPlayer(id)?.id).toBe(id)
  })
})
