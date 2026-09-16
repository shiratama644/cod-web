// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GAME_TYPE,
  INPUT_SEND_HZ,
  MAX_PLAYERS,
  SIM_DT,
  SIM_TICK_HZ,
  SNAPSHOT_SEND_EVERY_TICKS,
  SNAPSHOT_SEND_HZ,
} from '@cod/protocol/protocol/constants'
import { GAME_TYPES, TYPE_SPECS, snapshotEveryTicks, typeStepSeconds } from '@cod/protocol/protocol/type-specs'

describe('TYPE_SPECS', () => {
  it('defines only Game Types, not content sources', () => {
    expect(GAME_TYPES).toEqual(['fps', 'voxel'])
    expect(Object.keys(TYPE_SPECS)).toEqual(['fps', 'voxel'])
    expect(TYPE_SPECS.fps.type).toBe('fps')
    expect(TYPE_SPECS.voxel.type).toBe('voxel')
  })

  it('keeps fps rate constants compatible with existing exports', () => {
    expect(DEFAULT_GAME_TYPE).toBe('fps')
    expect(SIM_TICK_HZ).toBe(TYPE_SPECS.fps.simHz)
    expect(SIM_DT).toBe(typeStepSeconds(TYPE_SPECS.fps))
    expect(INPUT_SEND_HZ).toBe(TYPE_SPECS.fps.inputHz)
    expect(SNAPSHOT_SEND_HZ).toBe(TYPE_SPECS.fps.snapshotHz)
    expect(SNAPSHOT_SEND_EVERY_TICKS).toBe(snapshotEveryTicks(TYPE_SPECS.fps))
    expect(MAX_PLAYERS).toBe(TYPE_SPECS.fps.maxPlayers)
  })

  it('reserves voxel rates as contract-only values for later phases', () => {
    expect(TYPE_SPECS.voxel).toMatchObject({
      type: 'voxel',
      simHz: 30,
      inputHz: 30,
      snapshotHz: 15,
      maxPlayers: 32,
    })
    expect(snapshotEveryTicks(TYPE_SPECS.voxel)).toBe(2)
    expect(typeStepSeconds(TYPE_SPECS.voxel)).toBeCloseTo(1 / 30, 10)
  })
})
