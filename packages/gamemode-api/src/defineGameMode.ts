/**
 * defineGameMode — GameModeDefinition の検証と登録。
 *
 * - id: /^[a-z][a-z0-9-]{2,31}$/ 例: fps-official-ffa
 * - type: fps|voxel
 * - source: official|ugc
 * - slug: URL用 例: ffa, pvp, survival
 * - minPlayers/maxPlayers: 1..64
 *
 * 検証失敗で throw。成功でそのまま返す。
 */

import type { ContentSource, GameModeDefinition, GameType } from './types.ts';

const ID_REGEX = /^[a-z][a-z0-9-]{2,31}$/;
const SLUG_REGEX = /^[a-z0-9-]{1,32}$/;

const VALID_TYPES: readonly GameType[] = ['fps', 'voxel'] as const;
const VALID_SOURCES: readonly ContentSource[] = ['official', 'ugc'] as const;

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`[defineGameMode] ${message}`);
}

export function defineGameMode<T extends GameType>(def: GameModeDefinition<T>): GameModeDefinition<T> {
  // id
  assert(typeof def.id === 'string' && def.id.length > 0, 'id must be non-empty string');
  assert(ID_REGEX.test(def.id), `id must match ${ID_REGEX.source}, got "${def.id}"`);
  assert(def.id.length >= 3 && def.id.length <= 32, `id length must be 3..32, got ${def.id.length}`);

  // type
  assert(typeof def.type === 'string', 'type must be string');
  assert((VALID_TYPES as readonly string[]).includes(def.type), `type must be one of ${VALID_TYPES.join('|')}, got "${def.type}"`);

  // source
  assert(typeof def.source === 'string', 'source must be string');
  assert((VALID_SOURCES as readonly string[]).includes(def.source), `source must be one of ${VALID_SOURCES.join('|')}, got "${def.source}"`);

  // slug
  assert(typeof def.slug === 'string' && def.slug.length > 0, 'slug must be non-empty string');
  assert(SLUG_REGEX.test(def.slug), `slug must match ${SLUG_REGEX.source}, got "${def.slug}"`);

  // players
  assert(Number.isInteger(def.minPlayers), 'minPlayers must be integer');
  assert(Number.isInteger(def.maxPlayers), 'maxPlayers must be integer');
  assert(def.minPlayers >= 1 && def.minPlayers <= 64, `minPlayers must be 1..64, got ${def.minPlayers}`);
  assert(def.maxPlayers >= 1 && def.maxPlayers <= 64, `maxPlayers must be 1..64, got ${def.maxPlayers}`);
  assert(def.minPlayers <= def.maxPlayers, `minPlayers (${def.minPlayers}) must be <= maxPlayers (${def.maxPlayers})`);

  // world
  assert(def.world !== undefined && def.world !== null, 'world must be defined');
  assert(typeof def.world === 'object', 'world must be object');

  // fps world specific: map must be non-empty string
  if (def.type === 'fps') {
    const w = def.world as { map?: unknown };
    assert(typeof w.map === 'string' && w.map.length > 0, 'fps world.map must be non-empty string');
  }

  return def;
}
