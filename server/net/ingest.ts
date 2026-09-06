/**
 * 受信バイナリをコピーせず入力にデコードする。
 * 長さ不正・範囲外は ProtocolError（呼び出し側が切断）。
 */

import { decodeInput } from '../../shared/protocol/packer'
import type { PlayerInput } from '../../shared/protocol/messages'

/** Bun の Buffer（Uint8Array）をコピーせず DataView にする。 */
export function toDataView(buf: ArrayBuffer | Uint8Array): DataView {
  if (buf instanceof ArrayBuffer) return new DataView(buf)
  return new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
}

/** ソケット無しで message 相当の入力デコードを行う。 */
export function ingestInput(buf: ArrayBuffer | Uint8Array): PlayerInput {
  return decodeInput(toDataView(buf))
}
