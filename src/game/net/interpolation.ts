/**
 * リモートプレイヤー補間（クライアント）。
 *
 * 30Hz で届くスナップショットを INTERP_DELAY_MS（~100ms）のバッファに溜め、
 * 「現在より遅れたレンダー時刻」を挟む過去 2 サンプル間で Lerp する。
 * これによりパケット揺らぎ/ロスを吸収し、可変 60〜120FPS でも滑らかに見える。
 * バッファが不足する初期は短時間の外挿（最新速度で直線補完）で繋ぐ。
 *
 * DOM/React/three に依存せず、純粋な数値計算として単体テスト可能にする。
 */

import { INTERP_DELAY_MS } from '@shared/protocol/constants'
import type { Snapshot, SnapshotPlayer } from '@shared/protocol/messages'

interface TimedSample {
  timeMs: number
  players: Map<number, SnapshotPlayer>
}

/** 1 プレイヤーの補間結果。 */
export interface InterpolatedPlayer {
  id: number
  x: number
  y: number
  z: number
  yaw: number
}

export class Interpolator {
  private samples: TimedSample[] = []

  /** スナップショットを受信した時刻（受信側で nowMs を添えて push）。 */
  push(snapshot: Snapshot, receivedAtMs: number): void {
    const players = new Map<number, SnapshotPlayer>()
    for (const p of snapshot.players) players.set(p.id, p)
    this.samples.push({ timeMs: receivedAtMs, players })

    // バッファは多めに持ちすぎない（古いものを落とす）。
    const cutoff = receivedAtMs - INTERP_DELAY_MS * 3
    let oldest = this.samples[0]
    while (oldest && oldest.timeMs < cutoff && this.samples.length > 2) {
      this.samples.shift()
      oldest = this.samples[0]
    }
  }

  /**
   * レンダー時刻 nowMs における全プレイヤーの補間位置を返す。
   * @param selfId 自プレイヤー ID（補間対象から除外）。
   */
  sample(nowMs: number, selfId: number): Map<number, InterpolatedPlayer> {
    const renderMs = nowMs - INTERP_DELAY_MS
    const out = new Map<number, InterpolatedPlayer>()

    // renderMs を挟む 2 サンプルを探す。
    let after: TimedSample | null = null
    let before: TimedSample | null = null
    for (const s of this.samples) {
      if (s.timeMs <= renderMs) before = s
      else {
        after = s
        break
      }
    }

    if (!before) {
      // まだバッファが無い（起動直後）。最新サンプルがあればそのまま返す。
      const latest = this.samples[this.samples.length - 1]
      if (latest) {
        for (const p of latest.players.values()) {
          if (p.id !== selfId) out.set(p.id, { id: p.id, x: p.x, y: p.y, z: p.z, yaw: p.yaw })
        }
      }
      return out
    }


    if (!after) {
      // 最新より先のレンダー時刻（遅延でサンプルが無い）→ 最新から外挿。
      const dt = (renderMs - before.timeMs) / 1000
      for (const p of before.players.values()) {
        if (p.id === selfId) continue
        out.set(p.id, {
          id: p.id,
          x: p.x + p.vx * dt,
          y: p.y + p.vy * dt,
          z: p.z + p.vz * dt,
          yaw: p.yaw,
        })
      }
      return out
    }

    // 2 サンプル間を Lerp。
    const span = after.timeMs - before.timeMs
    const t = span > 0 ? (renderMs - before.timeMs) / span : 0
    for (const a of before.players.values()) {
      if (a.id === selfId) continue
      const b = after.players.get(a.id)
      if (!b) {
        // after に居ない（離脱直後）なら before の値を使う。
        out.set(a.id, { id: a.id, x: a.x, y: a.y, z: a.z, yaw: a.yaw })
        continue
      }
      out.set(a.id, {
        id: a.id,
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        z: lerp(a.z, b.z, t),
        yaw: lerpAngle(a.yaw, b.yaw, t),
      })
    }
    return out
  }

  get sampleCount(): number {
    return this.samples.length
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** 角度（yaw）を最短経路で補間。 */
function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
  if (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * t
}
