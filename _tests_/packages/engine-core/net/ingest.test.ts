// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ProtocolError } from '@cod/protocol/protocol/binary'
import {
  CHANNEL_BYTES,
  Channel,
  INPUT_FRAME_BYTES,
  INPUT_PACKET_BYTES,
  MSG_C2S_INPUT,
} from '@cod/protocol/protocol/constants'
import { ingestInput } from '@cod/engine-core/net/ingest'

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

function inputFrame(payloadBytes = INPUT_PACKET_BYTES): Uint8Array {
  const bytes = new Uint8Array(CHANNEL_BYTES + payloadBytes)
  bytes[0] = Channel.Unreliable
  if (payloadBytes > 0) bytes[CHANNEL_BYTES] = MSG_C2S_INPUT
  return bytes
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

describe('ingestInput (PH1-C Channel frame)', () => {
  it('Input payload 15B / 17B は ProtocolError 1002', () => {
    for (const n of [15, 17]) {
      try {
        ingestInput(inputFrame(n))
        throw new Error(`expected throw for ${n}B payload`)
      } catch (err) {
        expect(err).toBeInstanceOf(ProtocolError)
        expect((err as ProtocolError).closeCode).toBe(1002)
      }
    }
  })

  it('空フレーム・不正 Channel・Channel 欠落の旧 16B Input は ProtocolError 1002', () => {
    const badChannel = inputFrame()
    badChannel[0] = 255
    for (const bytes of [new Uint8Array(0), badChannel, new Uint8Array(INPUT_PACKET_BYTES)]) {
      if (bytes.byteLength > 0) bytes[0] = MSG_C2S_INPUT
      try {
        ingestInput(bytes)
        throw new Error('expected throw')
      } catch (err) {
        expect(err).toBeInstanceOf(ProtocolError)
        expect((err as ProtocolError).closeCode).toBe(1002)
      }
    }
  })

  it('Reliable / Bulk Channel のバイナリ入力は ProtocolError 1002', () => {
    for (const channel of [Channel.Reliable, Channel.Bulk]) {
      const bytes = inputFrame()
      bytes[0] = channel
      try {
        ingestInput(bytes)
        throw new Error(`expected throw for channel ${channel}`)
      } catch (err) {
        expect(err).toBeInstanceOf(ProtocolError)
        expect((err as ProtocolError).closeCode).toBe(1002)
      }
    }
  })

  it(`ランダム ${FUZZ_COUNT} フレームでプロセスが落ちない`, () => {
    const rng = { x: FUZZ_SEED }
    let protocol = 0
    let ok = 0
    for (let i = 0; i < FUZZ_COUNT; i++) {
      const len = nextU32(rng) % 65
      const pad = nextU32(rng) % 8
      const raw = new Uint8Array(len + pad)
      for (let j = 0; j < raw.length; j++) raw[j] = nextU32(rng) & 0xff
      if (len > 0 && i % 3 === 0) raw[pad] = Channel.Unreliable
      if (len > 1 && i % 3 === 0) raw[pad + CHANNEL_BYTES] = MSG_C2S_INPUT
      const packet = pad === 0 ? raw : raw.subarray(pad)
      const result = ingestQuiet(packet)
      if (result === 'ok') ok += 1
      else protocol += 1
    }
    expect(ok + protocol).toBe(FUZZ_COUNT)
    expect(protocol).toBeGreaterThan(0)
  }, 60_000)

  it('17B 正当 Input frame は通る（payload は 16B）', () => {
    const out = ingestInput(inputFrame())
    expect(INPUT_FRAME_BYTES).toBe(17)
    expect(out.seq).toBe(0)
    expect(out.moveX).toBe(0)
    expect(out.moveZ).toBe(0)
  })
})
