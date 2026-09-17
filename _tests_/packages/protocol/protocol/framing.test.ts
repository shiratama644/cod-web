// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  CHANNEL_BYTES,
  Channel,
  INPUT_FRAME_BYTES,
  INPUT_PACKET_BYTES,
} from '@cod/protocol/protocol/constants'
import { decodeFrame, writeFrameChannel } from '@cod/protocol/protocol/framing'
import { ProtocolError } from '@cod/protocol/protocol/binary'

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

describe('protocol framing', () => {
  it('Channel は payload の外側 1B で、Input payload は 16B のまま', () => {
    expect(CHANNEL_BYTES).toBe(1)
    expect(INPUT_PACKET_BYTES).toBe(16)
    expect(INPUT_FRAME_BYTES).toBe(17)
  })

  it('decodeFrame は Channel と payload DataView を分離する', () => {
    const frame = new Uint8Array(INPUT_FRAME_BYTES)
    frame[0] = Channel.Unreliable
    frame[1] = 0xaa
    frame[16] = 0xbb

    const decoded = decodeFrame(view(frame))

    expect(decoded.channel).toBe(Channel.Unreliable)
    expect(decoded.payload.byteLength).toBe(INPUT_PACKET_BYTES)
    expect(decoded.payload.getUint8(0)).toBe(0xaa)
    expect(decoded.payload.getUint8(15)).toBe(0xbb)
  })

  it('空フレームと不正 Channel は ProtocolError 1002', () => {
    for (const bytes of [new Uint8Array(), new Uint8Array([3]), new Uint8Array([255])]) {
      expect(() => decodeFrame(view(bytes))).toThrow(ProtocolError)
      try {
        decodeFrame(view(bytes))
      } catch (e) {
        expect(e).toBeInstanceOf(ProtocolError)
        expect((e as ProtocolError).closeCode).toBe(1002)
      }
    }
  })

  it('writeFrameChannel は frame view の先頭 1B にだけ Channel を書く', () => {
    const backing = new Uint8Array(INPUT_FRAME_BYTES)
    const frame = view(backing)
    backing.fill(0xcc, CHANNEL_BYTES)

    writeFrameChannel(frame, Channel.Unreliable)

    expect(backing[0]).toBe(Channel.Unreliable)
    expect(backing[1]).toBe(0xcc)
    expect(backing[16]).toBe(0xcc)
  })

  it('writeFrameChannel は Channel 1B の余地が無い場合 ProtocolError', () => {
    expect(() => writeFrameChannel(view(new Uint8Array()), Channel.Unreliable)).toThrow(
      ProtocolError,
    )
  })
})
