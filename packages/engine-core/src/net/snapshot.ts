/**
 * スナップショット生成とブロードキャスト。
 *
 * 背圧は bun `ws.send` の戻り値で見る（-1 スキップ継続、0 切断）。
 * `bufferedAmount` は使わない。
 */

import {
  CHANNEL_BYTES,
  Channel,
  SNAPSHOT_SEND_EVERY_TICKS,
  snapshotPayloadBytes,
} from '@cod/protocol/protocol/constants'
import type { Snapshot } from '@cod/protocol/protocol/messages'
import { SNAPSHOT_MAX_BYTES, encodeSnapshot } from '@cod/protocol/protocol/packer'
import type { PlayerState } from '@cod/protocol/types'
import { profileSnapshotEveryTicks, type SimProfile } from '../profile/SimProfile'
import type { Room } from '../room/Room'

/** リング送信バッファの本数。 */
const RING_SIZE = 3
/** Channel 1B を含むスナップショット frame の最大バイト長。 */
export const SNAPSHOT_MAX_FRAME_BYTES = CHANNEL_BYTES + SNAPSHOT_MAX_BYTES

type SnapshotProfile = Pick<SimProfile<unknown, PlayerState, unknown>, 'typeSpec' | 'writeSnapshot'>

export interface SnapshotBroadcasterOptions {
  /** L2 profile の snapshot writer。未指定時は既存 fps 互換 writer を使う。 */
  readonly profile?: SnapshotProfile
}

export class SnapshotBroadcaster {
  private readonly ring: Uint8Array[] = Array.from(
    { length: RING_SIZE },
    () => new Uint8Array(SNAPSHOT_MAX_FRAME_BYTES),
  )
  private ringIndex = 0
  /** send() === -1 になったプレイヤー。drain までスナップショットを送らない。 */
  private readonly paused = new Set<number>()
  private readonly snapshotEveryTicks: number
  private readonly writeSnapshot: SnapshotProfile['writeSnapshot']

  private lastSentTick: number

  constructor(options: SnapshotBroadcasterOptions = {}) {
    this.snapshotEveryTicks = options.profile
      ? profileSnapshotEveryTicks(options.profile)
      : SNAPSHOT_SEND_EVERY_TICKS
    this.writeSnapshot = options.profile?.writeSnapshot ?? writeCompatSnapshot
    this.lastSentTick = -this.snapshotEveryTicks
  }

  markWritable(playerId: number): void {
    this.paused.delete(playerId)
  }

  /**
   * シム tick ごとに呼ぶ。profile の snapshotHz に基づいて送信する。
   * @returns 送信した場合の payload バイト数（Channel を除く）、スキップしたら null。
   */
  maybeSend(room: Room, serverTick: number): number | null {
    if (serverTick - this.lastSentTick < this.snapshotEveryTicks) return null
    this.lastSentTick = serverTick

    const players = room.getPlayers()
    if (players.length === 0) return null

    const u8 = this.ring[this.ringIndex]
    this.ringIndex = (this.ringIndex + 1) % RING_SIZE
    u8[0] = Channel.Unreliable
    const view = new DataView(
      u8.buffer,
      u8.byteOffset + CHANNEL_BYTES,
      u8.byteLength - CHANNEL_BYTES,
    )

    const dropped: number[] = []
    let payloadBytes = snapshotPayloadBytes(players.length)
    for (const p of players) {
      const peer = room.getPeer(p.id)
      if (!peer) continue
      if (this.paused.has(p.id)) continue
      payloadBytes = this.writeSnapshot({
        view,
        serverTick,
        lastAckSeq: p.lastInputSeq,
        players,
      })
      const frameBytes = CHANNEL_BYTES + payloadBytes
      const sent = peer.sendBinary(u8.subarray(0, frameBytes))
      if (sent === 0) {
        peer.disconnect?.(1011, 'send failed')
        dropped.push(p.id)
        continue
      }
      if (sent < 0) this.paused.add(p.id)
    }
    for (const id of dropped) room.leave(id)

    return payloadBytes
  }
}

function writeCompatSnapshot({ view, serverTick, lastAckSeq, players }: Parameters<SnapshotProfile['writeSnapshot']>[0]): number {
  const snapshot: Snapshot = {
    serverTick,
    lastAckSeq,
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
  return encodeSnapshot(view, snapshot)
}
