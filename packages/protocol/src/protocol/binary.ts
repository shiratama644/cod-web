/**
 * 境界チェック付きバイナリ読み取り。不足なら ProtocolError（プロセスは落とさない）。
 * 正本: docs/arch/protocol.md
 */

export const WS_CLOSE_PROTOCOL = 1002

export class ProtocolError extends Error {
  readonly closeCode: number

  constructor(message: string, closeCode = WS_CLOSE_PROTOCOL) {
    super(message)
    this.name = 'ProtocolError'
    this.closeCode = closeCode
  }
}

const LE = true

export class BinaryReader {
  private o: number

  constructor(
    private readonly view: DataView,
    offset = 0,
    private readonly end: number = view.byteLength,
  ) {
    this.o = offset
  }

  remaining(): number {
    return this.end - this.o
  }

  private need(n: number): void {
    if (this.o + n > this.end) {
      throw new ProtocolError(`unexpected end of buffer: need ${n}, remaining ${this.remaining()}`)
    }
  }

  u8(): number {
    this.need(1)
    const v = this.view.getUint8(this.o)
    this.o += 1
    return v
  }

  i8(): number {
    this.need(1)
    const v = this.view.getInt8(this.o)
    this.o += 1
    return v
  }

  u16(): number {
    this.need(2)
    const v = this.view.getUint16(this.o, LE)
    this.o += 2
    return v
  }

  i16(): number {
    this.need(2)
    const v = this.view.getInt16(this.o, LE)
    this.o += 2
    return v
  }

  u32(): number {
    this.need(4)
    const v = this.view.getUint32(this.o, LE)
    this.o += 4
    return v
  }
}
