import { describe, expect, it, vi } from 'vitest'
import { Channel, INPUT_PACKET_BYTES, SIM_DT, type ChannelId } from '@cod/protocol/protocol/constants'
import { decodeInput, encodeSnapshot } from '@cod/protocol/protocol/packer'
import type { Snapshot } from '@cod/protocol/protocol/messages'
import { GameClient } from '@/game/net/GameClient'
import type { BinaryMessageHandler, NetTransport, TransportStatus } from '@/game/net/transport'
import type { InputController } from '@/game/input/InputController'

class MockTransport implements NetTransport {
  private binaryHandler: BinaryMessageHandler | null = null
  private openHandler: (() => void) | null = null
  private closeHandler: (() => void) | null = null
  private textHandler: ((data: string) => void) | null = null
  status: TransportStatus = 'closed'
  readonly send = vi.fn<(channel: ChannelId, payload: ArrayBuffer | ArrayBufferView) => void>()

  connect(): void {
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

    const bytes = payload instanceof ArrayBuffer ? new Uint8Array(payload) : new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength)
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
})
