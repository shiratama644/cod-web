import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Channel, type ChannelId } from '@cod/protocol/protocol/constants'
import { WebSocketTransport } from '@/game/net/websocket'

type SentData = string | ArrayBufferLike | Blob | ArrayBufferView

class MockWebSocket {
  static instances: MockWebSocket[] = []

  binaryType: BinaryType = 'blob'
  readyState = 0
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  readonly sent: SentData[] = []
  readonly closeCalls: Array<{ code?: number; reason?: string }> = []
  readonly url: string

  constructor(url: string | URL) {
    this.url = String(url)
    MockWebSocket.instances.push(this)
  }

  send(data: SentData): void {
    this.sent.push(data)
  }

  close(code?: number, reason?: string): void {
    this.closeCalls.push({ code, reason })
    this.readyState = 3
    this.onclose?.(new CloseEvent('close', { code: code ?? 1000, reason: reason ?? '', wasClean: true }))
  }

  emitOpen(): void {
    this.readyState = 1
    this.onopen?.(new Event('open'))
  }

  emitMessage(data: string | ArrayBuffer): void {
    this.onmessage?.(new MessageEvent('message', { data }))
  }

  emitError(): void {
    this.onerror?.(new Event('error'))
  }
}

function installMockWebSocket(): void {
  vi.stubGlobal('WebSocket', MockWebSocket)
}

function lastSocket(): MockWebSocket {
  const socket = MockWebSocket.instances.at(-1)
  if (!socket) throw new Error('MockWebSocket was not constructed')
  return socket
}

function makeFrame(channel: ChannelId, payload: Uint8Array): ArrayBuffer {
  const frame = new Uint8Array(payload.byteLength + 1)
  frame[0] = channel
  frame.set(payload, 1)
  return frame.buffer
}

function toBytes(data: SentData): Uint8Array {
  if (typeof data === 'string') return new TextEncoder().encode(data)
  if (data instanceof Blob) throw new Error('Blob sends are not expected in transport tests')
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
  return new Uint8Array(data)
}

describe('WebSocketTransport', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    installMockWebSocket()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens a browser WebSocket as arraybuffer and reports status transitions', () => {
    const transport = new WebSocketTransport()
    const opened = vi.fn()
    const closed = vi.fn()

    transport.onOpen(opened)
    transport.onClose(closed)
    transport.connect('ws://example.test/ws')

    const socket = lastSocket()
    expect(socket.url).toBe('ws://example.test/ws')
    expect(socket.binaryType).toBe('arraybuffer')
    expect(transport.status).toBe('connecting')

    socket.emitOpen()
    expect(transport.status).toBe('open')
    expect(opened).toHaveBeenCalledTimes(1)

    socket.close(1000, 'done')
    expect(transport.status).toBe('closed')
    expect(closed).toHaveBeenCalledTimes(1)
  })

  it('delivers text control messages separately from binary payloads', () => {
    const transport = new WebSocketTransport()
    const texts: string[] = []
    const binaries = vi.fn()

    transport.onText((text) => texts.push(text))
    transport.onBinary(binaries)
    transport.connect('ws://example.test/ws')

    lastSocket().emitMessage(JSON.stringify({ kind: 'welcome', playerId: 1 }))

    expect(texts).toEqual(['{"kind":"welcome","playerId":1}'])
    expect(binaries).not.toHaveBeenCalled()
  })

  it('decodes Channel-prefixed binary frames without copying the payload view', () => {
    const transport = new WebSocketTransport()
    const received: Array<{ channel: ChannelId; payload: DataView }> = []
    const payload = new Uint8Array([0x10, 0xaa, 0xbb])
    const frame = makeFrame(Channel.Unreliable, payload)

    transport.onBinary((channel, payloadView) => received.push({ channel, payload: payloadView }))
    transport.connect('ws://example.test/ws')
    lastSocket().emitMessage(frame)

    expect(received).toHaveLength(1)
    expect(received[0]?.channel).toBe(Channel.Unreliable)
    expect(received[0]?.payload.byteOffset).toBe(1)
    expect(Array.from(new Uint8Array(received[0]?.payload.buffer ?? new ArrayBuffer(0), 1, 3))).toEqual([
      0x10, 0xaa, 0xbb,
    ])
  })

  it('closes with protocol code 1002 on malformed binary frames', () => {
    const transport = new WebSocketTransport()
    transport.connect('ws://example.test/ws')

    const socket = lastSocket()
    socket.emitMessage(new ArrayBuffer(0))

    expect(socket.closeCalls).toContainEqual({ code: 1002, reason: 'protocol' })
    expect(transport.status).toBe('closed')
  })

  it('sends no-copy frames when the payload has one byte of channel headroom', () => {
    const transport = new WebSocketTransport()
    transport.connect('ws://example.test/ws')
    const socket = lastSocket()
    socket.emitOpen()

    const backing = new Uint8Array([0xff, 0x10, 0x01, 0x02])
    const payload = new Uint8Array(backing.buffer, 1, 3)
    transport.send(Channel.Unreliable, payload)

    const sent = socket.sent[0]
    expect(sent).toBeInstanceOf(Uint8Array)
    const sentView = sent as Uint8Array
    expect(sentView.buffer).toBe(backing.buffer)
    expect(sentView.byteOffset).toBe(0)
    expect(Array.from(sentView)).toEqual([Channel.Unreliable, 0x10, 0x01, 0x02])
  })

  it('reuses a fallback frame buffer for payloads without channel headroom', () => {
    const transport = new WebSocketTransport()
    transport.connect('ws://example.test/ws')
    const socket = lastSocket()
    socket.emitOpen()

    transport.send(Channel.Reliable, new Uint8Array([0x01, 0x02]))
    const firstSnapshot = Array.from(toBytes(socket.sent[0] ?? new ArrayBuffer(0)))
    transport.send(Channel.Bulk, new ArrayBuffer(1))

    expect(firstSnapshot).toEqual([Channel.Reliable, 0x01, 0x02])
    expect(Array.from(toBytes(socket.sent[1] ?? new ArrayBuffer(0)))).toEqual([Channel.Bulk, 0x00])
  })

  it('drops sends while not open and marks errors without calling close handlers', () => {
    const transport = new WebSocketTransport()
    const closed = vi.fn()
    transport.onClose(closed)
    transport.connect('ws://example.test/ws')
    const socket = lastSocket()

    transport.send(Channel.Unreliable, new Uint8Array([0x10]))
    expect(socket.sent).toHaveLength(0)

    socket.emitError()
    expect(transport.status).toBe('error')
    expect(closed).not.toHaveBeenCalled()
  })
})
