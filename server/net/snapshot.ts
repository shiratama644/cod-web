/**
 * スナップショット生成とブロードキャスト（30Hz・1 tick おき）。
 *
 * 背圧は bun `ws.send` の戻り値で見る（-1 スキップ継続、0 切断）。
 * `bufferedAmount` は使わない。
 */

import {
  SNAPSHOT_SEND_EVERY_TICKS,
  snapshotPayloadBytes,
} from '../../shared/protocol/constants'
import { SNAPSHOT_MAX_BYTES, encodeSnapshot } from '../../shared/protocol/packer'
import type { Snapshot } from '../../shared/protocol/messages'
import type { Room } from '../room/Room'

/** リング送信バッファの本数。 */
const RING_SIZE = 3

export class SnapshotBroadcaster {
  private readonly ring: ArrayBuffer[] = Array.from(
    { length: RING_SIZE },
    () => new ArrayBuffer(SNAPSHOT_MAX_BYTES),
  )
  private ringIndex = 0
  /** send() === -1 になったプレイヤー。drain までスナップショットを送らない。 */
  private readonly paused = new Set<number>()

  private lastSentTick = -SNAPSHOT_SEND_EVERY_TICKS

  markWritable(playerId: number): void {
    this.paused.delete(playerId)
  }

  /**
   * シム tick ごとに呼ぶ。SNAPSHOT_SEND_EVERY_TICKS（2）に 1 回だけ送信する。
   * @returns 送信した場合の payload バイト数、スキップしたら null。
   */
  maybeSend(room: Room, serverTick: number): number | null {
    if (serverTick - this.lastSentTick < SNAPSHOT_SEND_EVERY_TICKS) return null
    this.lastSentTick = serverTick

    const players = room.getPlayers()
    if (players.length === 0) return null

    const buffer = this.ring[this.ringIndex]
    this.ringIndex = (this.ringIndex + 1) % RING_SIZE
    const view = new DataView(buffer)

    const snapshot: Snapshot = {
      serverTick,
      lastAckSeq: 0,
      players: players.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        z: p.z,
        vx: p.vx,
        vy: p.vy,
        vz: p.vz,
        yaw: p.yaw,
      })),
    }

    const dropped: number[] = []
    for (const p of players) {
      const peer = room.getPeer(p.id)
      if (!peer) continue
      if (this.paused.has(p.id)) continue
      snapshot.lastAckSeq = p.lastInputSeq
      const bytes = encodeSnapshot(view, snapshot)
      const packet = buffer.slice(0, bytes)
      const sent = peer.sendBinary(packet)
      if (sent === 0) {
        peer.disconnect?.(1011, 'send failed')
        dropped.push(p.id)
        continue
      }
      if (sent < 0) this.paused.add(p.id)
    }
    for (const id of dropped) room.leave(id)

    return snapshotPayloadBytes(players.length)
  }
}
