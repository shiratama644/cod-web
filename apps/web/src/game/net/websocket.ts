/**
 * WebSocket 版 NetTransport（Phase 1 の実装）。
 *
 * bun ネイティブ WebSocket（uWS コア）に対してバイナリフレームで送受信する。
 * WebTransport は同じ NetTransport インターフェースの別実装として後続フェーズで
 * 追加する（docs/arch/server-authority.md §3）。
 */

import type { BinaryMessageHandler, NetTransport, TransportStatus } from './transport'

export class WebSocketTransport implements NetTransport {
  private ws: WebSocket | null = null
  private binaryHandler: BinaryMessageHandler | null = null
  private openHandler: (() => void) | null = null
  private closeHandler: (() => void) | null = null
  private _status: TransportStatus = 'closed'

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
      this.binaryHandler?.(event.data as ArrayBuffer)
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

  sendBinary(data: ArrayBuffer | ArrayBufferView): void {
    if (!this.ws || this._status !== 'open') return
    const view =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength)
    this.ws.send(view)
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
