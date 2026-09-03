// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  IPV4_HEADER_BYTES,
  IPV6_HEADER_BYTES,
  INPUT_PACKET_BYTES,
  MAX_PLAYERS,
  MSG_C2S_INPUT,
  MSG_S2C_SNAPSHOT,
  PACKET_PAYLOAD_MAX,
  SNAPSHOT_PLAYER_BYTES,
  WIRE_DATAGRAM_TARGET,
  snapshotPayloadBytes,
  wireBytes,
} from './constants'
import {
  SNAPSHOT_MAX_BYTES,
  decodeInput,
  decodeSnapshot,
  encodeInput,
  encodeSnapshot,
  readMessageType,
} from './packer'
import type { PlayerInput, Snapshot } from './messages'
import {
  dequantizePitch,
  dequantizePosition,
  dequantizeYaw,
  quantizePitch,
  quantizePosition,
  quantizeYaw,
} from './quantize'

describe('quantize round-trip', () => {
  it('位置は 0.01m 精度で往復する（誤差 ≤ 0.01m）', () => {
    for (const m of [0, 1.23, -45.67, 100.5, -327.68, 327.67]) {
      expect(Math.abs(dequantizePosition(quantizePosition(m)) - m)).toBeLessThanOrEqual(0.01)
    }
  })

  it('yaw は [0,2π) に正規化され、量子化誤差が小さい（≤ 2π/65535）', () => {
    const eps = (Math.PI * 2) / 65535
    for (const rad of [0, 0.1, Math.PI, -0.5, Math.PI * 3, 7.0]) {
      const rt = dequantizeYaw(quantizeYaw(rad))
      // 円環上の最短角度差
      let d = Math.abs(rt - (((rad % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)))
      d = Math.min(d, Math.PI * 2 - d)
      expect(d).toBeLessThanOrEqual(eps + 1e-9)
    }
  })

  it('pitch は ±π/2 にクランプされ往復する', () => {
    expect(dequantizePitch(quantizePitch(0))).toBeCloseTo(0, 5)
    expect(Math.abs(dequantizePitch(quantizePitch(Math.PI / 2)) - Math.PI / 2)).toBeLessThan(
      0.02,
    )
    // 範囲外は ±π/2 にクランプ（スケール 127 基準なので -127〜127）
    expect(quantizePitch(999)).toBe(127)
    expect(quantizePitch(-999)).toBe(-127)
  })
})

describe('input packet', () => {
  it('固定レイアウトでエンコード/デコードが一致する', () => {
    const input: PlayerInput = {
      seq: 123456,
      moveX: 1,
      moveZ: -1,
      yaw: 1.234,
      pitch: -0.456,
      flags: 1,
      dtMs: 16,
    }
    const buf = new ArrayBuffer(INPUT_PACKET_BYTES)
    const view = new DataView(buf)
    const written = encodeInput(view, input)

    expect(written).toBe(INPUT_PACKET_BYTES)
    expect(readMessageType(view)).toBe(MSG_C2S_INPUT)

    // type バイト以降をデコード
    const out = decodeInput(view, 1)
    expect(out.seq).toBe(input.seq)
    expect(out.moveX).toBe(input.moveX)
    expect(out.moveZ).toBe(input.moveZ)
    expect(out.flags).toBe(input.flags)
    expect(out.dtMs).toBe(input.dtMs)
    expect(Math.abs(out.yaw - input.yaw)).toBeLessThan(0.001)
    expect(Math.abs(out.pitch - input.pitch)).toBeLessThan(0.02)
  })

  it('入力パケットは約 13B（type 1 + body 12）', () => {
    expect(INPUT_PACKET_BYTES).toBe(13)
  })
})

describe('snapshot packet', () => {
  function makeSnapshot(n: number): Snapshot {
    const players = Array.from({ length: n }, (_, i) => ({
      id: i + 1,
      x: i * 1.5,
      y: 10 + (i % 3),
      z: -i * 2.25,
      vx: 0.5 * (i % 2 === 0 ? 1 : -1),
      vy: 0,
      vz: -1.25,
      yaw: (i * 0.7) % (Math.PI * 2),
    }))
    return { serverTick: 999, lastAckSeq: 42, players }
  }

  it('エンコード/デコードが全プレイヤーで一致する', () => {
    const snap = makeSnapshot(MAX_PLAYERS)
    const buf = new ArrayBuffer(SNAPSHOT_MAX_BYTES)
    const view = new DataView(buf)
    const written = encodeSnapshot(view, snap)

    expect(written).toBe(snapshotPayloadBytes(MAX_PLAYERS))
    expect(readMessageType(view)).toBe(MSG_S2C_SNAPSHOT)

    const out = decodeSnapshot(view, written, 1)
    expect(out.serverTick).toBe(999)
    expect(out.lastAckSeq).toBe(42)
    expect(out.players).toHaveLength(MAX_PLAYERS)

    const p0 = out.players[0]
    expect(p0.id).toBe(1)
    // players[0] (i=0): x=0, y=10, z=0, vz=-1.25
    expect(Math.abs(p0.x - 0)).toBeLessThanOrEqual(0.01)
    expect(Math.abs(p0.z - 0)).toBeLessThanOrEqual(0.01)
    expect(Math.abs(p0.vz - -1.25)).toBeLessThanOrEqual(0.01)
    // players[1] (i=1): x=1.5, z=-2.25
    const p1 = out.players[1]
    expect(p1.id).toBe(2)
    expect(Math.abs(p1.x - 1.5)).toBeLessThanOrEqual(0.01)
    expect(Math.abs(p1.z - -2.25)).toBeLessThanOrEqual(0.01)
  })

  it('payload と wire サイズを区別して断言する（MTU 予算）', () => {
    // アプリが pack する payload（type + header + players）
    const payload20 = snapshotPayloadBytes(20)
    // 設計: 1 + 8 + 20*16 = 329B
    expect(payload20).toBe(1 + 8 + 20 * SNAPSHOT_PLAYER_BYTES)
    expect(payload20).toBe(329)

    // ワイヤー上は IP/UDP ヘッダが加わる
    const wireV4 = wireBytes(payload20, IPV4_HEADER_BYTES)
    const wireV6 = wireBytes(payload20, IPV6_HEADER_BYTES)
    expect(wireV4).toBe(329 + 8 + 20) // 357B
    expect(wireV6).toBe(329 + 8 + 40) // 377B

    // 最悪ケース（IPv6）でも保守 MTU 1200B 以内
    expect(wireV6).toBeLessThanOrEqual(WIRE_DATAGRAM_TARGET)
    // payload 上限 = 1200 - 48 = 1152
    expect(PACKET_PAYLOAD_MAX).toBe(1152)
    expect(payload20).toBeLessThanOrEqual(PACKET_PAYLOAD_MAX)
  })

  it('最大人数でも payload が設計目標・MTU 予算内', () => {
    const payload = snapshotPayloadBytes(MAX_PLAYERS)
    const wireV6 = wireBytes(payload, IPV6_HEADER_BYTES)
    expect(payload).toBeLessThanOrEqual(360) // 設計目標 ~330 + 余裕
    expect(wireV6).toBeLessThanOrEqual(WIRE_DATAGRAM_TARGET)
  })

  it('プレイヤー 0 人でもヘッダだけ正しく往復する', () => {
    const snap: Snapshot = { serverTick: 7, lastAckSeq: 0, players: [] }
    const buf = new ArrayBuffer(SNAPSHOT_MAX_BYTES)
    const view = new DataView(buf)
    const written = encodeSnapshot(view, snap)
    expect(written).toBe(snapshotPayloadBytes(0))
    const out = decodeSnapshot(view, written, 1)
    expect(out.players).toHaveLength(0)
    expect(out.serverTick).toBe(7)
  })
})
