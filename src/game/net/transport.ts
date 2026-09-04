/**
 * NetTransport — リアルタイム通信の抽象インターフェース。
 *
 * Phase 1 では WebSocket（バイナリ）実装のみを通す。WebTransport は
 * 同じインターフェースの別実装として後続フェーズで追加する
 * （docs/arch/server-authority.md §3）。
 *
 * 高頻度パケット（入力・スナップショット）は非信頼・バイナリで流す想定。
 * WS では TCP 上で動くため厳密な非信頼ではないが、送る側は「古いものは
 * 捨ててよい最新値」という前提で作り、WT 切替時にそのまま活きるようにする。
 */

/** バイナリパケットを受信したときのコールバック。 */
export type BinaryMessageHandler = (data: ArrayBuffer) => void

/** 接続状態。 */
export type TransportStatus = 'connecting' | 'open' | 'closed' | 'error'

export interface NetTransport {
  /** 接続を開始する。 */
  connect(url: string): void
  /** バイナリパケットを送信する（高頻度・最新値優先）。 */
  sendBinary(data: ArrayBuffer | DataView): void
  /** バイナリ受信ハンドラを登録する。 */
  onBinary(handler: BinaryMessageHandler): void
  /** 接続が開いたときのハンドラ。 */
  onOpen(handler: () => void): void
  /** 切断されたときのハンドラ。 */
  onClose(handler: () => void): void
  /** 現在の状態。 */
  readonly status: TransportStatus
  /** 接続を閉じる。 */
  close(): void
}
