import { describe, expect, it, vi } from 'vitest'
import { Channel, INPUT_PACKET_BYTES, SIM_DT, type ChannelId } from '@cod/protocol/protocol/constants'
import { decodeInput, encodeSnapshot } from '@cod/protocol/protocol/packer'
import type { Snapshot } from '@cod/protocol/protocol/messages'
import { GameClient, type ConnectionStatus } from '@/game/net/GameClient'
import type { BinaryMessageHandler, NetTransport, TransportStatus } from '@/game/net/transport'
import type { InputController } from '@/game/input/InputController'

class MockTransport implements NetTransport {
  private binaryHandler: BinaryMessageHandler | null = null
  private openHandler: (() => void) | null = null
  private closeHandler: (() => void) | null = null
  private textHandler: ((data: string) => void) | null = null
  status: TransportStatus = 'closed'
  readonly urls: string[] = []
  readonly send = vi.fn<(channel: ChannelId, payload: ArrayBuffer | ArrayBufferView) => void>()

  connect(url: string): void {
    this.urls.push(url)
    this.status = 'connecting'
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

  onText(handler: (data: string) => void): void {
    this.textHandler = handler
  }

  close(): void {
    this.status = 'closed'
    this.closeHandler?.()
  }

  emitOpen(): void {
    this.status = 'open'
    this.openHandler?.()
  }

  emitText(data: string): void {
    this.textHandler?.(data)
  }

  emitBinary(channel: ChannelId, payload: DataView): void {
    this.binaryHandler?.(channel, payload)
  }
}

function inputStub(): InputController {
  return {
    sample: (seq: number, dtMs: number) => ({
      seq,
      moveX: 0,
      moveZ: 1,
      yaw: Math.PI / 4,
      pitch: 0.1,
      flags: 0,
      dtMs,
    }),
  } as InputController
}

function snapshotView(snapshot: Snapshot): DataView {
  const buffer = new ArrayBuffer(128)
  const view = new DataView(buffer)
  const len = encodeSnapshot(view, snapshot)
  return new DataView(buffer, 0, len)
}

describe('GameClient network path', () => {
  it('samples input through the Babylon-facing frame boundary and sends Channel.Unreliable Input payloads', () => {
    const transport = new MockTransport()
    const client = new GameClient(transport)
    client.setInput(inputStub())

    client.connect('ws://example.test/ws')
    transport.emitOpen()
    transport.emitText(JSON.stringify({ kind: 'welcome', playerId: 1 }))
    client.frame(SIM_DT)

    expect(transport.send).toHaveBeenCalledTimes(1)
    const [channel, payload] = transport.send.mock.calls[0]
    expect(channel).toBe(Channel.Unreliable)
    expect(payload.byteLength).toBe(INPUT_PACKET_BYTES)

    const bytes =
      payload instanceof ArrayBuffer
        ? new Uint8Array(payload)
        : new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength)
    const input = decodeInput(new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength))
    expect(input.seq).toBe(1)
    expect(input.moveZ).toBeGreaterThan(0)
  })

  it('accepts Channel.Unreliable snapshots and exposes remote players for the Babylon renderer', () => {
    const transport = new MockTransport()
    const client = new GameClient(transport)
    client.setInput(inputStub())

    client.connect('ws://example.test/ws')
    transport.emitOpen()
    transport.emitText(JSON.stringify({ kind: 'welcome', playerId: 1 }))
    client.frame(SIM_DT)

    transport.emitBinary(
      Channel.Unreliable,
      snapshotView({
        serverTick: 1,
        lastAckSeq: 1,
        players: [
          { id: 1, x: 0, y: 5, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0 },
          { id: 2, x: 3, y: 5, z: -4, vx: 0, vy: 0, vz: 0, yaw: Math.PI / 2 },
        ],
      }),
    )
    client.frame(0)

    expect(client.self?.id).toBe(1)
    expect(client.remotes.has(1)).toBe(false)
    expect(client.remotes.get(2)).toMatchObject({ id: 2 })
  })

  it('reports connect, open, and close status transitions for the HUD seam', () => {
    const transport = new MockTransport()
    const client = new GameClient(transport)
    const statuses: ConnectionStatus[] = []
    client.onStatusChange = (status) => statuses.push(status)

    client.connect('ws://example.test/ws')
    transport.emitOpen()
    client.dispose()

    expect(transport.urls).toEqual(['ws://example.test/ws'])
    expect(statuses).toEqual(['connecting', 'connected', 'disconnected'])
    expect(client.status).toBe('disconnected')
  })

  it('does not predict or send until a valid welcome assigns the local player id', () => {
    const transport = new MockTransport()
    const client = new GameClient(transport)
    client.setInput(inputStub())

    client.connect('ws://example.test/ws')
    transport.emitOpen()
    transport.emitText('not json')
    transport.emitText(JSON.stringify({ kind: 'welcome', playerId: '1' }))
    client.frame(SIM_DT * 4)

    expect(client.self).toBeNull()
    expect(transport.send).not.toHaveBeenCalled()
  })

  it('ignores non-snapshot channels and malformed snapshot payloads without dropping existing remotes', () => {
    const transport = new MockTransport()
    const client = new GameClient(transport)
    client.setInput(inputStub())

    client.connect('ws://example.test/ws')
    transport.emitOpen()
    transport.emitText(JSON.stringify({ kind: 'welcome', playerId: 1 }))
    client.frame(SIM_DT)

    const goodSnapshot = snapshotView({
      serverTick: 1,
      lastAckSeq: 1,
      players: [
        { id: 1, x: 0, y: 5, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0 },
        { id: 2, x: 3, y: 5, z: -4, vx: 0, vy: 0, vz: 0, yaw: 0 },
      ],
    })
    transport.emitBinary(Channel.Unreliable, goodSnapshot)
    client.frame(0)
    expect(client.remotes.get(2)).toMatchObject({ id: 2, x: 3 })

    transport.emitBinary(Channel.Reliable, snapshotView({ serverTick: 2, lastAckSeq: 1, players: [] }))
    transport.emitBinary(Channel.Unreliable, new DataView(new ArrayBuffer(1)))
    client.frame(0)

    expect(client.remotes.get(2)).toMatchObject({ id: 2, x: 3 })
  })

  it('clamps long frame catch-up and continues remote interpolation even after dispose', () => {
    const transport = new MockTransport()
    const client = new GameClient(transport)
    client.setInput(inputStub())

    client.connect('ws://example.test/ws')
    transport.emitOpen()
    transport.emitText(JSON.stringify({ kind: 'welcome', playerId: 1 }))
    client.frame(10)

    expect(transport.send).toHaveBeenCalledTimes(5)

    transport.emitBinary(
      Channel.Unreliable,
      snapshotView({
        serverTick: 1,
        lastAckSeq: 5,
        players: [
          { id: 1, x: 0, y: 5, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0 },
          { id: 2, x: 8, y: 5, z: -9, vx: 0, vy: 0, vz: 0, yaw: 0 },
        ],
      }),
    )
    client.dispose()
    client.frame(SIM_DT * 3)

    expect(transport.send).toHaveBeenCalledTimes(5)
    expect(client.remotes.get(2)).toMatchObject({ id: 2, x: 8 })
  })
})
