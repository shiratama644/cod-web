/**
 * 高頻度パケット（入力・スナップショット）の手動バイナリ固定レイアウト。
 * DataView / ArrayBuffer・リトルエンディアン。
 *
 * ゼロアロケーション方針: エンコードは呼び出し側が用意した DataView に書き
 * 込み、書き込んだバイト長を返す。呼び出し側はバッファをプール/リングで
 * 再利用する（毎フレーム new ArrayBuffer しない）。
 *
 * レイアウト正本: docs/arch/server-authority.md §6。
 *
 * Input   (C→S, 60Hz): type:u8 | seq:u32 | moveX:i8 | moveZ:i8
 *                          | yaw:u16 | pitch:i8 | flags:u8 | dtMs:u16
 * Snapshot(S→C, 30Hz): type:u8 | serverTick:u32 | lastAckSeq:u32
 *                          | [ id:u16 | x:i16 y:i16 z:i16
 *                                 | vx:i16 vy:i16 vz:i16 | yaw:u16 ] × n
 */

import {
  MAX_PLAYERS,
  MSG_C2S_INPUT,
  MSG_S2C_SNAPSHOT,
  PACKET_TYPE_BYTES,
  SNAPSHOT_HEADER_BYTES,
  SNAPSHOT_PLAYER_BYTES,
  snapshotPayloadBytes,
} from './constants'
import type { PlayerInput, Snapshot } from './messages'
import {
  dequantizePosition,
  dequantizeVelocity,
  dequantizeYaw,
  dequantizePitch,
  quantizePitch,
  quantizePosition,
  quantizeVelocity,
  quantizeYaw,
} from './quantize'

const LE = true // リトルエンディアン

/** スナップショットの最大バイト長（type + ヘッダ + 最大人数）。バッファ確保用。 */
export const SNAPSHOT_MAX_BYTES = snapshotPayloadBytes(MAX_PLAYERS)

// ─────────────────────────────────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────────────────────────────────

/**
 * 入力を `view` の先頭からエンコードする。
 * @returns 書き込んだバイト長（常に INPUT_PACKET_BYTES）。
 */
export function encodeInput(view: DataView, input: PlayerInput): number {
  let o = 0
  view.setUint8(o, MSG_C2S_INPUT)
  o += PACKET_TYPE_BYTES
  view.setUint32(o, input.seq >>> 0, LE)
  o += 4
  view.setInt8(o, clampInt8(input.moveX))
  o += 1
  view.setInt8(o, clampInt8(input.moveZ))
  o += 1
  view.setUint16(o, quantizeYaw(input.yaw), LE)
  o += 2
  view.setInt8(o, quantizePitch(input.pitch))
  o += 1
  view.setUint8(o, input.flags & 0xff)
  o += 1
  view.setUint16(o, clampU16(input.dtMs), LE)
  o += 2
  return o
}

/** バッファ（type バイト以降）から入力をデコードする。 */
export function decodeInput(view: DataView, byteOffset = 0): PlayerInput {
  let o = byteOffset
  // type バイトは呼び出し側で確認済みの前提。ここでは本体を読む。
  const seq = view.getUint32(o, LE)
  o += 4
  const moveX = view.getInt8(o)
  o += 1
  const moveZ = view.getInt8(o)
  o += 1
  const yaw = dequantizeYaw(view.getUint16(o, LE))
  o += 2
  const pitch = dequantizePitch(view.getInt8(o))
  o += 1
  const flags = view.getUint8(o)
  o += 1
  const dtMs = view.getUint16(o, LE)
  o += 2
  return { seq, moveX, moveZ, yaw, pitch, flags, dtMs }
}

// ─────────────────────────────────────────────────────────────────────────
// Snapshot
// ─────────────────────────────────────────────────────────────────────────

/**
 * スナップショットを `view` の先頭からエンコードする。
 * @returns 書き込んだバイト長（プレイヤー数に依存）。
 */
export function encodeSnapshot(view: DataView, snapshot: Snapshot): number {
  let o = 0
  view.setUint8(o, MSG_S2C_SNAPSHOT)
  o += PACKET_TYPE_BYTES
  view.setUint32(o, snapshot.serverTick >>> 0, LE)
  o += 4
  view.setUint32(o, snapshot.lastAckSeq >>> 0, LE)
  o += 4

  for (const p of snapshot.players) {
    view.setUint16(o, p.id & 0xffff, LE)
    o += 2
    view.setInt16(o, quantizePosition(p.x), LE)
    o += 2
    view.setInt16(o, quantizePosition(p.y), LE)
    o += 2
    view.setInt16(o, quantizePosition(p.z), LE)
    o += 2
    view.setInt16(o, quantizeVelocity(p.vx), LE)
    o += 2
    view.setInt16(o, quantizeVelocity(p.vy), LE)
    o += 2
    view.setInt16(o, quantizeVelocity(p.vz), LE)
    o += 2
    view.setUint16(o, quantizeYaw(p.yaw), LE)
    o += 2
  }
  return o
}

/**
 * バッファ（type バイト以降）からスナップショットをデコードする。
 * @param byteLength パケットの総バイト長（type 込み）。プレイヤー数の導出に使う。
 */
export function decodeSnapshot(view: DataView, byteLength: number, byteOffset = 0): Snapshot {
  let o = byteOffset
  const serverTick = view.getUint32(o, LE)
  o += 4
  const lastAckSeq = view.getUint32(o, LE)
  o += 4

  const bodyBytes = byteLength - PACKET_TYPE_BYTES - SNAPSHOT_HEADER_BYTES
  const count = Math.floor(bodyBytes / SNAPSHOT_PLAYER_BYTES)
  const players = []
  for (let i = 0; i < count; i++) {
    const id = view.getUint16(o, LE)
    o += 2
    const x = dequantizePosition(view.getInt16(o, LE))
    o += 2
    const y = dequantizePosition(view.getInt16(o, LE))
    o += 2
    const z = dequantizePosition(view.getInt16(o, LE))
    o += 2
    const vx = dequantizeVelocity(view.getInt16(o, LE))
    o += 2
    const vy = dequantizeVelocity(view.getInt16(o, LE))
    o += 2
    const vz = dequantizeVelocity(view.getInt16(o, LE))
    o += 2
    const yaw = dequantizeYaw(view.getUint16(o, LE))
    o += 2
    players.push({ id, x, y, z, vx, vy, vz, yaw })
  }
  return { serverTick, lastAckSeq, players }
}

/** 受信バッファの先頭バイトからメッセージ種別を読む。 */
export function readMessageType(view: DataView): number {
  return view.getUint8(0)
}

// ── 入力の moveX/moveZ は -1/0/1 に正規化されている前提だが、安全のためクランプ ──

function clampInt8(v: number): number {
  const n = Math.round(v)
  return n < -128 ? -128 : n > 127 ? 127 : n
}

function clampU16(v: number): number {
  const n = Math.round(v)
  return n < 0 ? 0 : n > 0xffff ? 0xffff : n
}
