// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  MSG_S2C_SNAPSHOT,
  snapshotPayloadBytes,
} from '@shared/protocol/constants'
import { decodeSnapshot, readMessageType } from '@shared/protocol/packer'
import { Room, type Peer } from '@server/room/Room'
import { SnapshotBroadcaster } from '@server/net/snapshot'

interface TestPeer extends Peer {
  binary: ArrayBuffer[]
  text: string[]
  sendResult: number
  disconnected: Array<{ code: number; reason: string }>
}

function makePeer(sendResult = 16): TestPeer {
  return {
    playerId: -1,
    text: [],
    binary: [],
    sendResult,
    disconnected: [],
    sendText(d) {
      this.text.push(d)
    },
    sendBinary(d) {
      if (this.sendResult < 0) return this.sendResult
      if (this.sendResult === 0) return 0
      this.binary.push(d)
      return this.sendResult
    },
    disconnect(code, reason) {
      this.disconnected.push({ code, reason })
    },
  }
}

function roomWith(n: number, sendResult = 16): Room {
  const room = new Room()
  for (let i = 0; i < n; i++) room.join(makePeer(sendResult))
  return room
}

function peer(room: Room, index: number): TestPeer {
  const player = room.getPlayers()[index]
  if (!player) throw new Error(`no player at ${index}`)
  const p = room.getPeer(player.id)
  if (!p) throw new Error(`no peer for ${player.id}`)
  return p as TestPeer
}

function firstPacket(p: TestPeer): ArrayBuffer {
  const buf = p.binary[0]
  if (!buf) throw new Error('no binary packet sent')
  return buf
}

describe('SnapshotBroadcaster', () => {
  it('tick 0 で送信、tick 1 ではスキップ、tick 2 でまた送信（1 tick おき＝30Hz）', () => {
    const room = roomWith(2)
    const bc = new SnapshotBroadcaster()
    expect(bc.maybeSend(room, 0)).toBe(snapshotPayloadBytes(2))
    expect(bc.maybeSend(room, 1)).toBeNull()
    expect(bc.maybeSend(room, 2)).toBe(snapshotPayloadBytes(2))
    for (const player of room.getPlayers()) {
      const p = room.getPeer(player.id) as TestPeer
      expect(p.binary).toHaveLength(2)
    }
  })

  it('送信バイナリはスナップショット形式で、全プレイヤーを含む', () => {
    const room = roomWith(3)
    const bc = new SnapshotBroadcaster()
    bc.maybeSend(room, 10)
    const p = peer(room, 0)
    const buf = firstPacket(p)
    const view = new DataView(buf)
    expect(readMessageType(view)).toBe(MSG_S2C_SNAPSHOT)
    const snap = decodeSnapshot(view, buf.byteLength)
    expect(snap.serverTick).toBe(10)
    expect(snap.players).toHaveLength(3)
  })

  it('send() が -1 なら以降のスナップショットをスキップし、drain で再開する', () => {
    const room = roomWith(2)
    const slow = peer(room, 0)
    const slowId = room.getPlayers()[0]?.id
    if (slowId == null) throw new Error('no slow id')
    slow.sendResult = -1
    const ok = peer(room, 1)

    const bc = new SnapshotBroadcaster()
    bc.maybeSend(room, 0)
    bc.maybeSend(room, 2)

    expect(slow.binary).toHaveLength(0)
    expect(ok.binary).toHaveLength(2)

    slow.sendResult = 16
    bc.markWritable(slowId)
    bc.maybeSend(room, 4)
    expect(slow.binary).toHaveLength(1)
    expect(ok.binary).toHaveLength(3)
  })

  it('send() が 0 なら切断しルームから外す', () => {
    const room = roomWith(2)
    const dead = peer(room, 0)
    const deadId = room.getPlayers()[0]?.id
    if (deadId == null) throw new Error('no dead id')
    dead.sendResult = 0
    const ok = peer(room, 1)

    const bc = new SnapshotBroadcaster()
    bc.maybeSend(room, 0)

    expect(dead.disconnected).toEqual([{ code: 1011, reason: 'send failed' }])
    expect(room.getPlayer(deadId)).toBeUndefined()
    expect(ok.binary).toHaveLength(1)
    expect(room.playerCount).toBe(1)
  })

  it('lastAckSeq は受信クライアントごとの処理済み入力 seq を入れる', () => {
    const room = roomWith(2)
    const p1 = room.getPlayers()[0]
    if (!p1) throw new Error('no player')
    p1.lastInputSeq = 77
    const bc = new SnapshotBroadcaster()
    bc.maybeSend(room, 0)

    const peer1 = peer(room, 0)
    const packet = firstPacket(peer1)
    const view1 = new DataView(packet)
    const snap1 = decodeSnapshot(view1, packet.byteLength)
    expect(snap1.lastAckSeq).toBe(77)
  })

  it('payload サイズは 20 人で MTU 予算内（設計 ~329B）', () => {
    const room = roomWith(20)
    const bc = new SnapshotBroadcaster()
    const bytes = bc.maybeSend(room, 0)
    expect(bytes).toBe(snapshotPayloadBytes(20))
    expect(bytes).toBe(329)
  })
})
