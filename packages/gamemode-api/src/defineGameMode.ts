/**
 * defineGameMode — GameModeDefinition の検証と登録。
 *
 * - id: /^[a-z][a-z0-9-]{2,31}$/ 例: fps-official-ffa, fps-official (本体)
 * - type: fps|voxel
 * - source: official|ugc
 * - slug: URL用 例: ffa, pvp, survival
 * - minPlayers/maxPlayers: 1..64
 * - parentGenre: fps|voxel (optional) — 改訂版
 * - genres: SubTag[] (optional) — 親ジャンル+サブタグフィルタ用、空配列許容
 * - tags: Tag[] (optional)
 * - display: { title, description, thumbnail, creator, creatorId } (optional)
 * - stats: { totalPlays, activePlayers, detailViews } (optional)
 * - subModes: SubTag[] (optional) — Official FPS 1ゲーム複数モード用
 * - currentSubMode: SubTag (optional)
 * - category: Official|Sandbox (optional)
 *
 * 検証失敗で throw。成功でそのまま返す。後方互換維持。
 */

import type {
  ContentSource,
  GameCategory,
  GameModeDefinition,
  GameType,
  ParentGenre,
} from './types.ts';

const ID_REGEX = /^[a-z][a-z0-9-]{2,31}$/;
const SLUG_REGEX = /^[a-z0-9-]{1,32}$/;
const SUBTAG_REGEX = /^[a-z0-9-]{1,32}$/;

const VALID_TYPES: readonly GameType[] = ['fps', 'voxel'] as const;
const VALID_SOURCES: readonly ContentSource[] = ['official', 'ugc'] as const;
const VALID_PARENT_GENRES: readonly ParentGenre[] = ['fps', 'voxel'] as const;
const VALID_CATEGORIES: readonly GameCategory[] = ['Official', 'Sandbox'] as const;

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`[defineGameMode] ${message}`);
}

function isNonEmptyString(v: unknown): boolean {
  return typeof v === 'string' && v.length > 0;
}

function validateStringArray(fieldName: string, arr: unknown, allowEmpty: boolean): void {
  assert(Array.isArray(arr), `${fieldName} must be array`);
  const typedArr = arr as unknown[];
  if (!allowEmpty) {
    assert(typedArr.length > 0, `${fieldName} must be non-empty array`);
  }
  for (let i = 0; i < typedArr.length; i++) {
    const item = typedArr[i];
    assert(isNonEmptyString(item), `${fieldName}[${i}] must be non-empty string`);
    assert(
      SUBTAG_REGEX.test(item as string),
      `${fieldName}[${i}] must match ${SUBTAG_REGEX.source}, got '${item as string}'`,
    );
  }
}

export function defineGameMode<T extends GameType>(def: GameModeDefinition<T>): GameModeDefinition<T> {
  // id
  assert(typeof def.id === 'string' && def.id.length > 0, 'id must be non-empty string');
  assert(ID_REGEX.test(def.id), `id must match ${ID_REGEX.source}, got '${def.id}'`);
  assert(def.id.length >= 3 && def.id.length <= 32, `id length must be 3..32, got ${def.id.length}`);

  // type
  assert(typeof def.type === 'string', 'type must be string');
  assert(
    (VALID_TYPES as readonly string[]).includes(def.type),
    `type must be one of ${VALID_TYPES.join('|')}, got '${def.type}'`,
  );

  // source
  assert(typeof def.source === 'string', 'source must be string');
  assert(
    (VALID_SOURCES as readonly string[]).includes(def.source),
    `source must be one of ${VALID_SOURCES.join('|')}, got '${def.source}'`,
  );

  // slug
  assert(typeof def.slug === 'string' && def.slug.length > 0, 'slug must be non-empty string');
  assert(SLUG_REGEX.test(def.slug), `slug must match ${SLUG_REGEX.source}, got '${def.slug}'`);

  // players
  assert(Number.isInteger(def.minPlayers), 'minPlayers must be integer');
  assert(Number.isInteger(def.maxPlayers), 'maxPlayers must be integer');
  assert(def.minPlayers >= 1 && def.minPlayers <= 64, `minPlayers must be 1..64, got ${def.minPlayers}`);
  assert(def.maxPlayers >= 1 && def.maxPlayers <= 64, `maxPlayers must be 1..64, got ${def.maxPlayers}`);
  assert(
    def.minPlayers <= def.maxPlayers,
    `minPlayers (${def.minPlayers}) must be <= maxPlayers (${def.maxPlayers})`,
  );

  // world
  assert(def.world !== undefined && def.world !== null, 'world must be defined');
  assert(typeof def.world === 'object', 'world must be object');

  // fps world specific: map must be non-empty string
  if (def.type === 'fps') {
    const w = def.world as { map?: unknown };
    assert(typeof w.map === 'string' && w.map.length > 0, 'fps world.map must be non-empty string');
  }

  // --- 改訂版: 親ジャンル / サブタグ / タグ / 表示 / 統計 / subModes / category optional validation ---

  if (def.parentGenre !== undefined) {
    assert(typeof def.parentGenre === 'string', 'parentGenre must be string');
    assert(
      (VALID_PARENT_GENRES as readonly string[]).includes(def.parentGenre),
      `parentGenre must be one of ${VALID_PARENT_GENRES.join('|')}, got '${def.parentGenre}'`,
    );
  }

  if (def.genres !== undefined) {
    validateStringArray('genres', def.genres, true);
  }

  if (def.tags !== undefined) {
    validateStringArray('tags', def.tags, true);
  }

  if (def.subModes !== undefined) {
    validateStringArray('subModes', def.subModes, true);
  }

  if (def.currentSubMode !== undefined) {
    assert(isNonEmptyString(def.currentSubMode), 'currentSubMode must be non-empty string');
    assert(
      SUBTAG_REGEX.test(def.currentSubMode),
      `currentSubMode must match ${SUBTAG_REGEX.source}, got '${def.currentSubMode}'`,
    );
  }

  if (def.category !== undefined) {
    assert(typeof def.category === 'string', 'category must be string');
    assert(
      (VALID_CATEGORIES as readonly string[]).includes(def.category),
      `category must be one of ${VALID_CATEGORIES.join('|')}, got '${def.category}'`,
    );
  }

  if (def.display !== undefined) {
    assert(typeof def.display === 'object' && def.display !== null, 'display must be object');
    const d = def.display as Record<string, unknown>;
    const displayFields = ['title', 'description', 'thumbnail', 'creator', 'creatorId'] as const;
    for (const field of displayFields) {
      if (d[field] !== undefined) {
        assert(typeof d[field] === 'string', `display.${field} must be string`);
      }
    }
  }

  if (def.stats !== undefined) {
    assert(typeof def.stats === 'object' && def.stats !== null, 'stats must be object');
    const s = def.stats as Record<string, unknown>;
    const statFields = ['totalPlays', 'activePlayers', 'detailViews'] as const;
    for (const field of statFields) {
      if (s[field] !== undefined) {
        assert(
          typeof s[field] === 'number' && Number.isFinite(s[field]) && (s[field] as number) >= 0,
          `stats.${field} must be non-negative finite number`,
        );
      }
    }
  }

  return def;
}
