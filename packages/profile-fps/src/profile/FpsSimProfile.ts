/**
 * FpsSimProfile — 現行 FPS 実装を L2 profile として束ねる。
 *
 * PH2-B では profile-fps 内に factory を追加するだけで、gameserver / web への
 * 注入は PH2-C / PH2-D に残す。wire layout は現行 Snapshot 形式を維持する。
 */

import type { SimProfile, SnapshotWriteArgs } from '@cod/engine-core/profile/SimProfile'
import {
  MSG_S2C_SNAPSHOT,
  PACKET_TYPE_BYTES,
  SNAPSHOT_PLAYER_BYTES,
} from '@cod/protocol/protocol/constants'
import type { PlayerInput } from '@cod/protocol/protocol/messages'
import {
  quantizePosition,
  quantizeVelocity,
  quantizeYaw,
} from '@cod/protocol/protocol/quantize'
import { TYPE_SPECS } from '@cod/protocol/protocol/type-specs'
import { createPlayerState, type PlayerState } from '@cod/protocol/types'
import { buildServerWorld } from '../physics/world'
import type { CollisionWorld } from '../sim/collisionWorld'
import { stepPlayer } from '../sim/movement'

const LE = true

export type FpsSimProfile = SimProfile<CollisionWorld, PlayerState, PlayerInput>

export interface FpsSimProfileOptions {
  /** テストや将来の map loader から world factory を差し替えるための seam。 */
  readonly createWorld?: () => CollisionWorld
}

export function createFpsSimProfile(options: FpsSimProfileOptions = {}): FpsSimProfile {
  const createWorld = options.createWorld ?? buildServerWorld
  return {
    typeSpec: TYPE_SPECS.fps,
    createWorld,
    createPlayerState: (playerId) => createPlayerState(playerId),
    stepPlayer,
    createIdleInput,
    writeSnapshot: writeFpsSnapshot,
  }
}

export function createIdleInput(player: PlayerState, dtMs: number): PlayerInput {
  return {
    seq: player.lastInputSeq,
    moveX: 0,
    moveZ: 0,
    yaw: player.yaw,
    pitch: player.pitch,
    flags: 0,
    dtMs,
  }
}

/**
 * 現行 fps Snapshot payload を書く。
 *
 * Layout: type:u8 | serverTick:u32 | lastAckSeq:u32 |
 *         [id:u16 | x,y,z:i16 | vx,vy,vz:i16 | yaw:u16] × n
 */
export function writeFpsSnapshot(args: SnapshotWriteArgs<PlayerState>): number {
  let o = 0
  args.view.setUint8(o, MSG_S2C_SNAPSHOT)
  o += PACKET_TYPE_BYTES
  args.view.setUint32(o, args.serverTick >>> 0, LE)
  o += 4
  args.view.setUint32(o, args.lastAckSeq >>> 0, LE)
  o += 4

  for (const player of args.players) {
    args.view.setUint16(o, player.id & 0xffff, LE)
    o += 2
    args.view.setInt16(o, quantizePosition(player.x), LE)
    o += 2
    args.view.setInt16(o, quantizePosition(player.y), LE)
    o += 2
    args.view.setInt16(o, quantizePosition(player.z), LE)
    o += 2
    args.view.setInt16(o, quantizeVelocity(player.vx), LE)
    o += 2
    args.view.setInt16(o, quantizeVelocity(player.vy), LE)
    o += 2
    args.view.setInt16(o, quantizeVelocity(player.vz), LE)
    o += 2
    args.view.setUint16(o, quantizeYaw(player.yaw), LE)
    o += 2
  }

  return o
}

export function fpsSnapshotPayloadBytes(playerCount: number): number {
  return PACKET_TYPE_BYTES + 4 + 4 + playerCount * SNAPSHOT_PLAYER_BYTES
}
