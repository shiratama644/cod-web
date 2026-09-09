/**
 * 高頻度パケット（入力・スナップショット）の手動バイナリ固定レイアウト。
 * DataView / ArrayBuffer・リトルエンディアン。境界は BinaryReader。
 *
 * レイアウト正本: docs/arch/protocol.md
 *
 * Input 16B (C→S): type:u8=0x10 | reserved:u8 | seq:u32 | moveX:i8 | moveZ:i8
 *                  | yaw:u16 | pitch:i16 | buttons:u16 | dtMs:u16
 * Snapshot (S→C, 現行ワイヤ): type:u8 | serverTick:u32 | lastAckSeq:u32
 *                  | [ id:u16 | x,y,z:i16 | vx,vy,vz:i16 | yaw:u16 ] × n
 */

import { BinaryReader, ProtocolError } from './binary'
import {
  DT_MS_CLAMP,
  INPUT_BUTTONS_RESERVED_MASK,
  INPUT_PACKET_BYTES,
  MAX_PLAYERS,
  MOVE_AXIS_MAX,
  MOVE_AXIS_MIN,
  MSG_C2S_INPUT,
  MSG_S2C_SNAPSHOT,
  PACKET_TYPE_BYTES,
  SNAPSHOT_PLAYER_BYTES,
  snapshotPayloadBytes,
} from './constants'
import type { PlayerInput, Snapshot } from './messages'
import {
  dequantizeMoveAxis,
  dequantizePosition,
  dequantizeVelocity,
  dequantizeYaw,
  dequantizePitch,
  quantizeMoveAxis,
  quantizePitch,
  quantizePosition,
  quantizeVelocity,
  quantizeYaw,
} from './quantize'

const LE = true

/** スナップショットの最大バイト長（type + ヘッダ + 最大人数）。バッファ確保用。 */
export const SNAPSHOT_MAX_BYTES = snapshotPayloadBytes(MAX_PLAYERS)

/** buttons bit9–15 が非 0 だった回数（切断しない。テスト用カウンタ）。 */
export let reservedButtonAnomalies = 0

export function resetReservedButtonAnomalies(): void {
  reservedButtonAnomalies = 0
}

// ─────────────────────────────────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────────────────────────────────

/**
 * 入力を `view` の先頭からエンコードする。
 * @returns 書き込んだバイト長（常に INPUT_PACKET_BYTES = 16）。
 */
export function encodeInput(view: DataView, input: PlayerInput): number {
  let o = 0
  view.setUint8(o, MSG_C2S_INPUT)
  o += PACKET_TYPE_BYTES
  view.setUint8(o, 0) // reserved
  o += 1
  view.setUint32(o, input.seq >>> 0, LE)
  o += 4
  view.setInt8(o, quantizeMoveAxis(input.moveX))
  o += 1
  view.setInt8(o, quantizeMoveAxis(input.moveZ))
  o += 1
  view.setUint16(o, quantizeYaw(input.yaw), LE)
  o += 2
  view.setInt16(o, quantizePitch(input.pitch), LE)
  o += 2
  view.setUint16(o, input.flags & 0xffff, LE)
  o += 2
  view.setUint16(o, clampU16(input.dtMs), LE)
  o += 2
  return o
}

/**
 * パケット先頭（type 込み）から入力をデコードする。
 * 長さ ≠ 16、type 不一致、move 範囲外は ProtocolError（切断 1002）。
 */
export function decodeInput(view: DataView, byteLength = view.byteLength): PlayerInput {
  if (byteLength === 0) {
    throw new ProtocolError('empty packet')
  }
  const r = new BinaryReader(view, 0, byteLength)
  const type = r.u8()
  if (type !== MSG_C2S_INPUT) {
    throw new ProtocolError(`unknown packet type ${type}`)
  }
  if (byteLength !== INPUT_PACKET_BYTES) {
    throw new ProtocolError(`input length ${byteLength} != ${INPUT_PACKET_BYTES}`)
  }
  r.u8() // reserved
  const seq = r.u32()
  const qx = r.i8()
  const qz = r.i8()
  if (qx < MOVE_AXIS_MIN || qx > MOVE_AXIS_MAX || qz < MOVE_AXIS_MIN || qz > MOVE_AXIS_MAX) {
    throw new ProtocolError('move axis out of range')
  }
  const yaw = dequantizeYaw(r.u16())
  const pitch = dequantizePitch(r.i16())
  const flags = r.u16()
  if ((flags & INPUT_BUTTONS_RESERVED_MASK) !== 0) {
    reservedButtonAnomalies += 1
  }
  let dtMs = r.u16()
  if (dtMs > DT_MS_CLAMP) dtMs = DT_MS_CLAMP
  return {
    seq,
    moveX: dequantizeMoveAxis(qx),
    moveZ: dequantizeMoveAxis(qz),
    yaw,
    pitch,
    flags,
    dtMs,
  }
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
 * バッファ先頭（type 込み）からスナップショットをデコードする。
 * 長さ不正は ProtocolError（切断しない。呼び出し側が捨てる）。
 * @param byteLength パケットの総バイト長（type 込み）。
 */
export function decodeSnapshot(view: DataView, byteLength = view.byteLength): Snapshot {
  const r = new BinaryReader(view, 0, byteLength)
  const type = r.u8()
  if (type !== MSG_S2C_SNAPSHOT) {
    throw new ProtocolError(`not a snapshot: type ${type}`)
  }
  const serverTick = r.u32()
  const lastAckSeq = r.u32()
  const players = []
  while (r.remaining() >= SNAPSHOT_PLAYER_BYTES) {
    const id = r.u16()
    const x = dequantizePosition(r.i16())
    const y = dequantizePosition(r.i16())
    const z = dequantizePosition(r.i16())
    const vx = dequantizeVelocity(r.i16())
    const vy = dequantizeVelocity(r.i16())
    const vz = dequantizeVelocity(r.i16())
    const yaw = dequantizeYaw(r.u16())
    players.push({ id, x, y, z, vx, vy, vz, yaw })
  }
  if (r.remaining() !== 0) {
    throw new ProtocolError('truncated snapshot player')
  }
  return { serverTick, lastAckSeq, players }
}

/** 受信バッファの先頭バイトからメッセージ種別を読む。空なら ProtocolError。 */
export function readMessageType(view: DataView): number {
  return new BinaryReader(view).u8()
}

function clampU16(v: number): number {
  const n = Math.round(v)
  return n < 0 ? 0 : n > 0xffff ? 0xffff : n
}
