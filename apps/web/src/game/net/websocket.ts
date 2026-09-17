/**
 * WebSocket 版 NetTransport（Phase 1 の実装）。
 *
 * bun ネイティブ WebSocket（uWS コア）に対してバイナリフレームで送受信する。
 * WebTransport は同じ NetTransport インターフェースの別実装として後続フェーズで
 * 追加する（docs/arch/server-authority.md §3）。
 */

import { CHANNEL_BYTES, type ChannelId } from '@cod/protocol/protocol/constants'
import { decodeFrame } from '@cod/protocol/protocol/framing'
import type { BinaryMessageHandler, NetTransport, TransportStatus } from './transport'

export class WebSocketTransport implements NetTransport {
  private ws: WebSocket | null = null
  private binaryHandler: BinaryMessageHandler | null = null
  private openHandler: (() => void) | null = null
  private closeHandler: (() => void) | null = null
  private _status: TransportStatus = 'closed'
  private frameBuffer = new Uint8Array(0)

  get status(): TransportStatus {
    return this._status
  }

  connect(url: string): void {
    this._status = 'connecting'
    const ws = new WebSocket(url)
    ws.binaryType = 'arraybuffer'
    this.ws = ws

    ws.onopen = () => {
      this._status = 'open'
      this.openHandler?.()
    }
    ws.onmessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        // 制御テキスト（welcome/join/leave）は別系統で扱う想定。Phase 1 では
        // 高頻度バイナリのみここで処理し、テキストは無視するか上位で別購読する。
        this.textHandler?.(event.data)
        return
      }
      try {
        const frame = decodeFrame(new DataView(event.data as ArrayBuffer))
        this.binaryHandler?.(frame.channel, frame.payload)
      } catch {
        ws.close(1002, 'protocol')
      }
    }
    ws.onclose = () => {
      this._status = 'closed'
      this.closeHandler?.()
    }
    ws.onerror = () => {
      this._status = 'error'
    }
  }

  /** 制御テキスト（welcome/join/leave）用ハンドラ。 */
  private textHandler: ((data: string) => void) | null = null
  onText(handler: (data: string) => void): void {
    this.textHandler = handler
  }

  send(channel: ChannelId, payload: ArrayBuffer | ArrayBufferView): void {
    if (!this.ws || this._status !== 'open') return
    const view =
      payload instanceof ArrayBuffer
        ? new Uint8Array(payload)
        : new Uint8Array(payload.buffer as ArrayBuffer, payload.byteOffset, payload.byteLength)

    // 呼び出し側が「1B 前に Channel 用の余白を持つ payload view」を渡した場合は、
    // 同じ backing buffer の直前に Channel を書いて送る。payload はコピーしない。
    if (view.byteOffset >= CHANNEL_BYTES) {
      const frame = new Uint8Array(
        view.buffer as ArrayBuffer,
        view.byteOffset - CHANNEL_BYTES,
        view.byteLength + CHANNEL_BYTES,
      )
      frame[0] = channel
      this.ws.send(frame)
      return
    }

    // 汎用 fallback。通常の Input 送信は上の no-copy path を通る。
    const frameBytes = view.byteLength + CHANNEL_BYTES
    if (this.frameBuffer.byteLength < frameBytes) this.frameBuffer = new Uint8Array(frameBytes)
    this.frameBuffer[0] = channel
    this.frameBuffer.set(view, CHANNEL_BYTES)
    this.ws.send(this.frameBuffer.subarray(0, frameBytes))
  }

  onBinary(handler: BinaryMessageHandler): void {
    this.binaryHandler = handler
  }

  onOpen(handler: () => void): void {
    this.openHandler = handler
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler
  }

  close(): void {
    this.ws?.close()
    this.ws = null
    this._status = 'closed'
  }
}
