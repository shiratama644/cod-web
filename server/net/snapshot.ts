/**
 * スナップショット生成とブロードキャスト（30Hz・1 tick おき）。
 *
 * - shared の `encodeSnapshot` でバイナリ固定レイアウトに詰め、送信バッファは
 *   リングで再利用（ゼロアロケ方針）。
 * - 各クライアントについて lastAckSeq（そのクライアントが処理済みの最新入力 seq）を
 *   ヘッダに入れる（クライアント側の調停で使用）。
 * - 送信前に送信バッファ量をチェックし、閾値を超える詰まりクライアントは
 *   今回のスナップショットをスキップ（古いものを溜めず最新だけ届ける）。
 */

import {
  SNAPSHOT_SEND_EVERY_TICKS,
  snapshotPayloadBytes,
} from '../../shared/protocol/constants'
import { SNAPSHOT_MAX_BYTES, encodeSnapshot } from '../../shared/protocol/packer'
import type { Snapshot } from '../../shared/protocol/messages'
import type { Room } from '../room/Room'

/** バックプレッシャ閾値（バイト）。送信バッファがこれを超えるクライアントは間引く。 */
export const BACKPRESSURE_LIMIT_BYTES = 64 * 1024 // 64KB（≈ 1200B × 数十個分の余裕）

/** リング送信バッファの本数。 */
const RING_SIZE = 3

export class SnapshotBroadcaster {
  // リングバッファ（書いて送るだけ。ブロードキャストは同期的にコピーされる前提で
  // RING_SIZE 本を順繰りに使い、同一バッファの上書き競合を避ける）。
  private readonly ring: ArrayBuffer[] = Array.from(
    { length: RING_SIZE },
    () => new ArrayBuffer(SNAPSHOT_MAX_BYTES),
  )
  private ringIndex = 0

  /** 前回スナップショットを送ったシム tick（1 tick おき送信の判定用）。
   *  初期値を十分小さくして、最初の tick（tick 0）から必ず送るようにする。 */
  private lastSentTick = -SNAPSHOT_SEND_EVERY_TICKS

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

    // 全プレイヤーの状態を Snapshot 形式に変換。
    const snapshot: Snapshot = {
      serverTick,
      lastAckSeq: 0, // クライアントごとに上書きする
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

    // クライアントごとに lastAckSeq を変えて個別送信（フルスナップショット）。
    for (const p of players) {
      const peer = room.getPeer(p.id)
      if (!peer) continue
      // バックプレッシャ: 送信バッファが詰まっているクライアントはスキップ。
      if (peer.getBufferedAmount() > BACKPRESSURE_LIMIT_BYTES) continue
      snapshot.lastAckSeq = p.lastInputSeq
      const bytes = encodeSnapshot(view, snapshot)
      // 書き込んだバイト長だけを切り出して送る。ArrayBuffer#slice は新しい
      // ArrayBuffer を返す（TypedArray ではない）。
      const packet = buffer.slice(0, bytes)
      peer.sendBinary(packet)
    }

    // payload バイト長（players 数は全員共通）。
    return snapshotPayloadBytes(players.length)
  }
}
