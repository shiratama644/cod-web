// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { BinaryReader, ProtocolError } from '@shared/protocol/binary'

describe('BinaryReader', () => {
  it('u32 をリトルエンディアンで読む', () => {
    const buf = new ArrayBuffer(4)
    const view = new DataView(buf)
    view.setUint32(0, 0x01020304, true)
    const r = new BinaryReader(view)
    expect(r.u32()).toBe(0x01020304)
    expect(r.remaining()).toBe(0)
  })

  it('不足バイトは ProtocolError（RangeError ではない）', () => {
    const r = new BinaryReader(new DataView(new ArrayBuffer(1)))
    r.u8()
    try {
      r.u16()
      throw new Error('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(ProtocolError)
      expect((err as ProtocolError).closeCode).toBe(1002)
    }
  })
})
