// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  MSG_S2C_SNAPSHOT,
  snapshotPayloadBytes,
} from '@shared/protocol/constants'
import { decodeSnapshot, readMessageType } from '@shared/protocol/packer'
import { Room, type Peer } from '@server/room/Room'
import { BACKPRESSURE_LIMIT_BYTES, SnapshotBroadcaster } from '@server/net/snapshot'

interface TestPeer extends Peer {
  binary: ArrayBuffer[]
  text: string[]
  bufferAmount: number
}

function makePeer(): TestPeer {
  return {
    playerId: -1,
    text: [],
    binary: [],
    bufferAmount: 0,
    sendText(d) {
      this.text.push(d)
    },
    sendBinary(d) {
      this.binary.push(d)
      return this.bufferAmount > BACKPRESSURE_LIMIT_BYTES
    },
    getBufferedAmount() {
      return this.bufferAmount
    },
  }
}

function roomWith(n: number): Room {
  const room = new Room()
  for (let i = 0; i < n; i++) room.join(makePeer())
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
    expect(bc.maybeSend(room, 1)).toBeNull() // スキップ
    expect(bc.maybeSend(room, 2)).toBe(snapshotPayloadBytes(2))
    // 各ピアが受け取ったのは 2 回分
    for (const player of room.getPlayers()) {
      const peer = room.getPeer(player.id) as TestPeer
      expect(peer.binary).toHaveLength(2)
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

  it('バックプレッシャで詰まっているクライアントにはスキップする', () => {
    const room = roomWith(2)
    const slow = peer(room, 0)
    slow.bufferAmount = BACKPRESSURE_LIMIT_BYTES + 1 // 詰まり
    const ok = peer(room, 1)

    const bc = new SnapshotBroadcaster()
    // tick 0 で送信（slow は間引き）→ tick 2 でもう一度
    bc.maybeSend(room, 0)
    bc.maybeSend(room, 2)

    expect(slow.binary).toHaveLength(0) // 詰まっている間ずっと間引かれる
    expect(ok.binary).toHaveLength(2) // 健全なクライアントには毎回届く
  })

  it('lastAckSeq は受信クライアントごとの処理済み入力 seq を入れる', () => {
    const room = roomWith(2)
    // プレイヤー1 の lastInputSeq を進める
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
