/**
 * WebSocket / 将来 WebTransport 共通の 1B Channel framing。
 *
 * PH1-C ではバイナリフレームの先頭 1B を Channel とし、残りを既存 payload
 * （Input 16B / Snapshot 現行レイアウト）として扱う。payload 自体の type byte は
 * 維持し、Channel 以外のワイヤレイアウトは変えない。
 */

import { ProtocolError } from './binary'
import { CHANNEL_BYTES, Channel, type ChannelId } from './constants'

export interface DecodedFrame {
  channel: ChannelId
  /** Channel 1B を除いた payload。元バッファを参照し、コピーしない。 */
  payload: DataView
}

/** Channel として許可されている値かを判定する。 */
export function isChannel(value: number): value is ChannelId {
  return value === Channel.Reliable || value === Channel.Unreliable || value === Channel.Bulk
}

/** frame の先頭 1B に Channel を書く。 */
export function writeFrameChannel(view: DataView, channel: ChannelId): void {
  if (view.byteLength < CHANNEL_BYTES) {
    throw new ProtocolError('frame buffer too short')
  }
  view.setUint8(0, channel)
}

/** frame を Channel と payload に分解する。payload は subarray 相当の DataView でコピーしない。 */
export function decodeFrame(view: DataView, byteLength = view.byteLength): DecodedFrame {
  if (byteLength < CHANNEL_BYTES) {
    throw new ProtocolError('empty frame')
  }
  const channel = view.getUint8(0)
  if (!isChannel(channel)) {
    throw new ProtocolError(`unknown channel ${channel}`)
  }
  return {
    channel,
    payload: new DataView(view.buffer, view.byteOffset + CHANNEL_BYTES, byteLength - CHANNEL_BYTES),
  }
}
