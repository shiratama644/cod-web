/**
 * スナップショット生成とブロードキャスト。
 *
 * 背圧は bun `ws.send` の戻り値で見る（-1 スキップ継続、0 切断）。
 * `bufferedAmount` は使わない。
 */

import { CHANNEL_BYTES, Channel, SNAPSHOT_SEND_EVERY_TICKS } from '@cod/protocol/protocol/constants'
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
   * 離脱したプレイヤーの backpressure 状態を破棄する（メモリリーク防止）。
   */
  removePlayer(playerId: number): void {
    this.paused.delete(playerId)
  }

  /**
   * シム tick ごとに呼ぶ。profile の snapshotHz に基づいて送信する。
   * @returns 送信した場合の payload バイト数（Channel を除く）、スキップしたら null。
   */
  maybeSend(room: Room, serverTick: number): number | null {
    if (serverTick - this.lastSentTick < this.snapshotEveryTicks) return null
    this.lastSentTick = serverTick

    const playerCount = room.playerCount
    if (playerCount === 0) return null

    // ゼロアロケ: getPlayersIterable で配列確保を避ける。ただし writeSnapshot は配列を要求するため
    // 1 回だけ配列化する（n 回 encode していた従来より大幅に削減）。encode は 1 回のみ。
    const players = [...room.getPlayersIterable()]
    if (players.length === 0) return null

    const u8 = this.ring[this.ringIndex]
    this.ringIndex = (this.ringIndex + 1) % RING_SIZE
    u8[0] = Channel.Unreliable
    const view = new DataView(
      u8.buffer,
      u8.byteOffset + CHANNEL_BYTES,
      u8.byteLength - CHANNEL_BYTES,
    )

    // 1 回だけエンコード（ダミー lastAckSeq）。後で per-peer に lastAckSeq をパッチする。
    const payloadBytes = this.writeSnapshot({
      view,
      serverTick,
      lastAckSeq: 0,
      players,
    })

    const dropped: number[] = []
    for (const p of players) {
      const peer = room.getPeer(p.id)
      if (!peer) continue
      if (this.paused.has(p.id)) continue
      // per-peer lastAckSeq をパッチ（type:1B + serverTick:4B の後 = offset 5）
      view.setUint32(5, p.lastInputSeq >>> 0, true)
      const frameBytes = CHANNEL_BYTES + payloadBytes
      const sent = peer.sendBinary(u8.subarray(0, frameBytes))
      if (sent === 0) {
        peer.disconnect?.(1011, 'send failed')
        this.removePlayer(p.id)
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
  // ゼロアロケ: players.map による中間配列確保を廃止。
  // PlayerState は SnapshotPlayer のスーパーセット（id,x,y,z,vx,vy,vz,yaw を含む）なので
  // map せずにキャストでそのまま渡せる。余分なフィールドは encodeSnapshot 内で無視される。
  const snapshot: Snapshot = {
    serverTick,
    lastAckSeq,
    players: players as unknown as Snapshot['players'],
  }
  return encodeSnapshot(view, snapshot)
}
