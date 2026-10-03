/**
 * @cod/protocol ホットパスのマイクロベンチマーク。
 * ネットコードの encode/decode は 60Hz × 全プレイヤーで毎 tick 呼ばれるため、
 * ゼロアロケーション文化(AGENTS.md)の回帰検知として計測する。
 *
 * 実行: bun run bench
 */

import {
  encodeInput,
  decodeInput,
  encodeSnapshot,
  decodeSnapshot,
  MAX_PLAYERS,
  SNAPSHOT_MAX_BYTES,
  quantizeYaw,
  dequantizeYaw,
  type PlayerInput,
  type Snapshot,
} from '@cod/protocol'
import { bench, describe } from 'vitest'

const INPUT_BUF_BYTES = 64

const sampleInput: PlayerInput = {
  seq: 123456,
  moveX: 1,
  moveZ: -1,
  yaw: 1.2345,
  pitch: -0.5,
  flags: 0b11,
  dtMs: 16.7,
}

function makeSnapshot(playerCount: number): Snapshot {
  return {
    serverTick: 987654,
    lastAckSeq: 123450,
    players: Array.from({ length: playerCount }, (_, i) => ({
      id: i + 1,
      x: i * 1.5,
      y: 2.0,
      z: -i * 0.75,
      vx: 0.1 * i,
      vy: -0.2,
      vz: 0.3,
      yaw: (i * Math.PI) / playerCount,
    })),
  }
}

describe('protocol packer: input', () => {
  const buf = new DataView(new ArrayBuffer(INPUT_BUF_BYTES))
  const encodedLen = encodeInput(buf, sampleInput)

  bench('encodeInput', () => {
    encodeInput(buf, sampleInput)
  })

  bench('decodeInput', () => {
    decodeInput(buf, encodedLen)
  })

  bench('encode + decode roundtrip', () => {
    const len = encodeInput(buf, sampleInput)
    decodeInput(buf, len)
  })
})

describe(`protocol packer: snapshot (${MAX_PLAYERS} players)`, () => {
  const buf = new DataView(new ArrayBuffer(SNAPSHOT_MAX_BYTES))
  const snapshot = makeSnapshot(MAX_PLAYERS)
  const encodedLen = encodeSnapshot(buf, snapshot)

  bench('encodeSnapshot', () => {
    encodeSnapshot(buf, snapshot)
  })

  bench('decodeSnapshot', () => {
    decodeSnapshot(buf, encodedLen)
  })
})

describe('protocol quantize', () => {
  bench('quantizeYaw/dequantizeYaw x1000', () => {
    let acc = 0
    for (let i = 0; i < 1000; i++) {
      acc += dequantizeYaw(quantizeYaw((i / 1000) * Math.PI * 2 - Math.PI))
    }
    if (Number.isNaN(acc)) throw new Error('unreachable')
  })
})
