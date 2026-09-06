// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ProtocolError } from '@shared/protocol/binary'
import { INPUT_PACKET_BYTES, MSG_C2S_INPUT } from '@shared/protocol/constants'
import { ingestInput } from '@server/net/ingest'

const FUZZ_COUNT = 1_000_000
const FUZZ_SEED = 0xc0d00001

/** 固定シードの xorshift32。 */
function nextU32(state: { x: number }): number {
  let x = state.x >>> 0
  x ^= x << 13
  x ^= x >>> 17
  x ^= x << 5
  state.x = x >>> 0
  return state.x
}

function ingestQuiet(buf: ArrayBuffer | Uint8Array): 'ok' | 'protocol' {
  try {
    ingestInput(buf)
    return 'ok'
  } catch (err) {
    if (err instanceof ProtocolError) return 'protocol'
    throw err
  }
}

describe('ingestInput (PH0-F)', () => {
  it('Input 15B / 17B は ProtocolError 1002', () => {
    for (const n of [15, 17]) {
      const bytes = new Uint8Array(n)
      bytes[0] = MSG_C2S_INPUT
      try {
        ingestInput(bytes)
        throw new Error(`expected throw for ${n}B`)
      } catch (err) {
        expect(err).toBeInstanceOf(ProtocolError)
        expect((err as ProtocolError).closeCode).toBe(1002)
      }
    }
  })

  it('空バッファは ProtocolError 1002', () => {
    try {
      ingestInput(new Uint8Array(0))
      throw new Error('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(ProtocolError)
      expect((err as ProtocolError).closeCode).toBe(1002)
    }
  })

  it(`ランダム ${FUZZ_COUNT} パケットでプロセスが落ちない`, () => {
    const rng = { x: FUZZ_SEED }
    let protocol = 0
    let ok = 0
    for (let i = 0; i < FUZZ_COUNT; i++) {
      const len = nextU32(rng) % 65
      const pad = nextU32(rng) % 8
      const raw = new Uint8Array(len + pad)
      for (let j = 0; j < raw.length; j++) raw[j] = nextU32(rng) & 0xff
      if (len > 0 && i % 3 === 0) raw[pad] = MSG_C2S_INPUT
      const packet = pad === 0 ? raw : raw.subarray(pad)
      const result = ingestQuiet(packet)
      if (result === 'ok') ok += 1
      else protocol += 1
    }
    expect(ok + protocol).toBe(FUZZ_COUNT)
    expect(protocol).toBeGreaterThan(0)
  }, 60_000)

  it('16B 正当 Input は通る', () => {
    const buf = new ArrayBuffer(INPUT_PACKET_BYTES)
    const view = new DataView(buf)
    view.setUint8(0, MSG_C2S_INPUT)
    const out = ingestInput(new Uint8Array(buf))
    expect(out.seq).toBe(0)
    expect(out.moveX).toBe(0)
    expect(out.moveZ).toBe(0)
  })
})
