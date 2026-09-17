/**
 * 受信バイナリフレームをコピーせず入力にデコードする。
 * Channel 不正・長さ不正・範囲外は ProtocolError（呼び出し側が切断）。
 */

import { ProtocolError } from '@cod/protocol/protocol/binary'
import { Channel } from '@cod/protocol/protocol/constants'
import { decodeFrame } from '@cod/protocol/protocol/framing'
import { decodeInput } from '@cod/protocol/protocol/packer'
import type { PlayerInput } from '@cod/protocol/protocol/messages'

/** Bun の Buffer（Uint8Array）をコピーせず DataView にする。 */
export function toDataView(buf: ArrayBuffer | Uint8Array): DataView {
  if (buf instanceof ArrayBuffer) return new DataView(buf)
  return new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
}

/** ソケット無しで message 相当の入力フレームデコードを行う。 */
export function ingestInput(buf: ArrayBuffer | Uint8Array): PlayerInput {
  const frame = decodeFrame(toDataView(buf))
  if (frame.channel !== Channel.Unreliable) {
    throw new ProtocolError(`unexpected input channel ${frame.channel}`)
  }
  return decodeInput(frame.payload)
}
