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
} from '@shared/protocol/constants'
import { ProtocolError } from '@shared/protocol/binary'
import {
  SNAPSHOT_MAX_BYTES,
  decodeInput,
  decodeSnapshot,
  encodeInput,
  encodeSnapshot,
  readMessageType,
  reservedButtonAnomalies,
  resetReservedButtonAnomalies,
} from '@shared/protocol/packer'
import type { PlayerInput, Snapshot } from '@shared/protocol/messages'
import {
  dequantizePitch,
  dequantizePosition,
  dequantizeYaw,
  quantizePitch,
  quantizePosition,
  quantizeYaw,
} from '@shared/protocol/quantize'

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
    expect(quantizePitch(999)).toBe(16384)
    expect(quantizePitch(-999)).toBe(-16384)
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

    const out = decodeInput(view)
    expect(out.seq).toBe(input.seq)
    expect(out.moveX).toBe(input.moveX)
    expect(out.moveZ).toBe(input.moveZ)
    expect(out.flags).toBe(input.flags)
    expect(out.dtMs).toBe(input.dtMs)
    expect(Math.abs(out.yaw - input.yaw)).toBeLessThan(0.001)
    expect(Math.abs(out.pitch - input.pitch)).toBeLessThan(0.02)
  })

  it('入力パケットは 16B 固定', () => {
    expect(INPUT_PACKET_BYTES).toBe(16)
  })

  it('moveX/moveZ はアナログ値(-1..1)のまま往復する（スケール忘れで巨大値にならない）', () => {
    // 旧バグ: clampInt8(0.8) が 1 に丸められ、decode 側は生 int8 を読むと 127 等の
    // 巨大値になりサーバー速度が MOVE_SPEED の数十倍になっていた。必ず -1..1 に収まること。
    const buf = new ArrayBuffer(INPUT_PACKET_BYTES)
    const view = new DataView(buf)
    for (const ax of [0, 0.3, 0.8, -0.55, 1, -1]) {
      for (const az of [0, 0.6, -0.9, 1]) {
        const input: PlayerInput = { seq: 1, moveX: ax, moveZ: az, yaw: 0, pitch: 0, flags: 0, dtMs: 16 }
        encodeInput(view, input)
        const out = decodeInput(view)
        expect(out.moveX).toBeGreaterThanOrEqual(-1)
        expect(out.moveX).toBeLessThanOrEqual(1)
        expect(out.moveZ).toBeGreaterThanOrEqual(-1)
        expect(out.moveZ).toBeLessThanOrEqual(1)
        // int8 量子化誤差は 1/100 = 0.01 以内。
        expect(Math.abs(out.moveX - ax)).toBeLessThan(0.02)
        expect(Math.abs(out.moveZ - az)).toBeLessThan(0.02)
      }
    }
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

    const out = decodeSnapshot(view, written)
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
    const out = decodeSnapshot(view, written)
    expect(out.players).toHaveLength(0)
    expect(out.serverTick).toBe(7)
  })
})

function expectProtocolError(fn: () => unknown): ProtocolError {
  try {
    fn()
  } catch (err) {
    expect(err).toBeInstanceOf(ProtocolError)
    return err as ProtocolError
  }
  throw new Error('expected ProtocolError')
}

describe('input length and range (PH0-A)', () => {
  it('空バッファは ProtocolError 1002（プロセスは落ちない）', () => {
    const err = expectProtocolError(() => decodeInput(new DataView(new ArrayBuffer(0))))
    expect(err.closeCode).toBe(1002)
  })

  it('15B / 17B は ProtocolError 1002', () => {
    for (const n of [15, 17]) {
      const buf = new ArrayBuffer(n)
      new DataView(buf).setUint8(0, MSG_C2S_INPUT)
      const err = expectProtocolError(() => decodeInput(new DataView(buf)))
      expect(err.closeCode).toBe(1002)
    }
  })

  it('短いバッファで RangeError にならず ProtocolError になる', () => {
    const buf = new ArrayBuffer(3)
    new DataView(buf).setUint8(0, MSG_C2S_INPUT)
    expectProtocolError(() => decodeInput(new DataView(buf)))
  })

  it('moveX が -100..100 の外なら ProtocolError 1002', () => {
    const input: PlayerInput = {
      seq: 1,
      moveX: 0,
      moveZ: 0,
      yaw: 0,
      pitch: 0,
      flags: 0,
      dtMs: 16,
    }
    const buf = new ArrayBuffer(INPUT_PACKET_BYTES)
    const view = new DataView(buf)
    encodeInput(view, input)
    view.setInt8(6, 101)
    const err = expectProtocolError(() => decodeInput(view))
    expect(err.closeCode).toBe(1002)
  })

  it('dtMs > 500 は clamp して切断しない', () => {
    const input: PlayerInput = {
      seq: 1,
      moveX: 0,
      moveZ: 0,
      yaw: 0,
      pitch: 0,
      flags: 0,
      dtMs: 16,
    }
    const buf = new ArrayBuffer(INPUT_PACKET_BYTES)
    const view = new DataView(buf)
    encodeInput(view, input)
    view.setUint16(14, 600, true)
    const out = decodeInput(view)
    expect(out.dtMs).toBe(500)
  })

  it('buttons bit9–15 が非 0 なら記録し切断しない', () => {
    resetReservedButtonAnomalies()
    const input: PlayerInput = {
      seq: 1,
      moveX: 0,
      moveZ: 0,
      yaw: 0,
      pitch: 0,
      flags: 0,
      dtMs: 16,
    }
    const buf = new ArrayBuffer(INPUT_PACKET_BYTES)
    const view = new DataView(buf)
    encodeInput(view, input)
    view.setUint16(12, 0x0200, true)
    const out = decodeInput(view)
    expect(out.flags).toBe(0x0200)
    expect(reservedButtonAnomalies).toBe(1)
  })
})
