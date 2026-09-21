// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { defineGameMode } from '@cod/gamemode-api';

describe('defineGameMode', () => {
  const base = {
    type: 'fps' as const,
    source: 'official' as const,
    slug: 'ffa',
    minPlayers: 2,
    maxPlayers: 16,
    world: { map: 'static-arena' },
  };

  it('accepts valid fps-official-ffa', () => {
    const def = defineGameMode({
      id: 'fps-official-ffa',
      ...base,
    });
    expect(def.id).toBe('fps-official-ffa');
    expect(def.type).toBe('fps');
    expect(def.slug).toBe('ffa');
  });

  it('accepts voxel type', () => {
    const def = defineGameMode({
      id: 'voxel-official-survival',
      type: 'voxel',
      source: 'official',
      slug: 'survival',
      minPlayers: 1,
      maxPlayers: 8,
      world: { seed: 123 },
    });
    expect(def.type).toBe('voxel');
  });

  it('rejects invalid id format', () => {
    expect(() => {
      const v = {
        id: 'FPS-OFFICIAL-FFA',
        ...base,
      };
      // biome-ignore lint/suspicious/noExplicitAny: invalid input test
      return (defineGameMode as any)(v);
    }).toThrow(/id must match/);

    expect(() =>
      // biome-ignore lint/suspicious/noExplicitAny: invalid input test
      (defineGameMode as any)({
        id: 'ab',
        ...base,
      }),
    ).toThrow();

    expect(() =>
      // biome-ignore lint/suspicious/noExplicitAny: invalid input test
      (defineGameMode as any)({
        id: 'a'.repeat(33),
        ...base,
      }),
    ).toThrow();
  });

  it('rejects invalid type', () => {
    expect(() => {
      const v = {
        id: 'fps-official-ffa',
        type: 'racing',
        source: 'official',
        slug: 'ffa',
        minPlayers: 2,
        maxPlayers: 16,
        world: { map: 'static-arena' },
      };
      // biome-ignore lint/suspicious/noExplicitAny: invalid input test
      return (defineGameMode as any)(v);
    }).toThrow(/type must be one of/);
  });

  it('rejects invalid source', () => {
    expect(() => {
      const v = {
        id: 'fps-official-ffa',
        type: 'fps',
        source: 'custom',
        slug: 'ffa',
        minPlayers: 2,
        maxPlayers: 16,
        world: { map: 'static-arena' },
      };
      // biome-ignore lint/suspicious/noExplicitAny: invalid input test
      return (defineGameMode as any)(v);
    }).toThrow(/source must be one of/);
  });

  it('rejects invalid slug', () => {
    expect(() =>
      // biome-ignore lint/suspicious/noExplicitAny: invalid input test
      (defineGameMode as any)({
        id: 'fps-official-ffa',
        type: 'fps',
        source: 'official',
        slug: 'FFA',
        minPlayers: 2,
        maxPlayers: 16,
        world: { map: 'static-arena' },
      }),
    ).toThrow(/slug must match/);
  });

  it('rejects invalid min/max players', () => {
    expect(() =>
      // biome-ignore lint/suspicious/noExplicitAny: invalid input test
      (defineGameMode as any)({
        id: 'fps-official-ffa',
        type: 'fps',
        source: 'official',
        slug: 'ffa',
        minPlayers: 0,
        maxPlayers: 16,
        world: { map: 'static-arena' },
      }),
    ).toThrow(/minPlayers must be 1..64/);

    expect(() =>
      // biome-ignore lint/suspicious/noExplicitAny: invalid input test
      (defineGameMode as any)({
        id: 'fps-official-ffa',
        type: 'fps',
        source: 'official',
        slug: 'ffa',
        minPlayers: 10,
        maxPlayers: 2,
        world: { map: 'static-arena' },
      }),
    ).toThrow(/minPlayers.*must be <= maxPlayers/);
  });

  it('rejects missing world', () => {
    expect(() => {
      const v = {
        id: 'fps-official-ffa',
        type: 'fps',
        source: 'official',
        slug: 'ffa',
        minPlayers: 2,
        maxPlayers: 16,
        world: undefined,
      };
      // biome-ignore lint/suspicious/noExplicitAny: invalid input test
      return (defineGameMode as any)(v);
    }).toThrow(/world must be defined/);
  });

  it('rejects fps world without map', () => {
    expect(() => {
      const v = {
        id: 'fps-official-ffa',
        type: 'fps',
        source: 'official',
        slug: 'ffa',
        minPlayers: 2,
        maxPlayers: 16,
        world: {},
      };
      // biome-ignore lint/suspicious/noExplicitAny: invalid input test
      return (defineGameMode as any)(v);
    }).toThrow(/fps world.map must be non-empty string/);
  });

  it('allows hooks optional and preserves them', () => {
    const def = defineGameMode({
      id: 'fps-official-ffa',
      type: 'fps',
      source: 'official',
      slug: 'ffa',
      minPlayers: 2,
      maxPlayers: 16,
      world: { map: 'static-arena' },
      onRoomCreate: () => {},
      onTick: () => {},
    });
    expect(def.onRoomCreate).toBeDefined();
    expect(def.onTick).toBeDefined();
  });

  // --- 改訂版: parentGenre / genres / tags / subModes / category / display / stats ---

  it('accepts valid parentGenre/genres/tags/subModes/category/display/stats (PH4-A)', () => {
    const def = defineGameMode({
      id: 'fps-official-ffa',
      type: 'fps',
      source: 'official',
      slug: 'ffa',
      minPlayers: 2,
      maxPlayers: 16,
      world: { map: 'static-arena' },
      parentGenre: 'fps',
      genres: ['ffa'],
      tags: ['official', 'pvp', 'fps'],
      subModes: ['ffa', 'tdm', 'dom'],
      currentSubMode: 'ffa',
      category: 'Official',
      display: {
        title: 'FFA',
        description: 'Free For All - Official FPS subMode',
        thumbnail: '/thumbnails/ffa.png',
        creator: 'Official',
      },
      stats: {
        totalPlays: 1234,
        activePlayers: 12,
        detailViews: 567,
      },
    });
    expect(def.parentGenre).toBe('fps');
    expect(def.genres).toEqual(['ffa']);
    expect(def.tags).toEqual(['official', 'pvp', 'fps']);
    expect(def.subModes).toEqual(['ffa', 'tdm', 'dom']);
    expect(def.currentSubMode).toBe('ffa');
    expect(def.category).toBe('Official');
    expect(def.display?.title).toBe('FFA');
    expect(def.stats?.totalPlays).toBe(1234);
  });

  it('accepts empty genres/tags/subModes arrays', () => {
    const def = defineGameMode({
      id: 'fps-official-ffa',
      type: 'fps',
      source: 'official',
      slug: 'ffa',
      minPlayers: 2,
      maxPlayers: 16,
      world: { map: 'static-arena' },
      genres: [],
      tags: [],
      subModes: [],
    });
    expect(def.genres).toEqual([]);
    expect(def.tags).toEqual([]);
    expect(def.subModes).toEqual([]);
  });

  it('accepts Sandbox category with official source (official extension)', () => {
    const def = defineGameMode({
      id: 'fps-official-zombie',
      type: 'fps',
      source: 'official',
      slug: 'zombie',
      minPlayers: 2,
      maxPlayers: 16,
      world: { map: 'zombie-arena' },
      parentGenre: 'fps',
      genres: ['zombie'],
      tags: ['official', 'zombie', 'pve'],
      category: 'Sandbox',
      display: { title: 'Zombie (Official拡張)', creator: 'Official' },
      stats: { totalPlays: 5432, activePlayers: 8, detailViews: 1234 },
    });
    expect(def.category).toBe('Sandbox');
    expect(def.source).toBe('official');
    expect(def.parentGenre).toBe('fps');
  });

  it('accepts voxel official survival endless', () => {
    const def = defineGameMode({
      id: 'voxel-official-survival',
      type: 'voxel',
      source: 'official',
      slug: 'survival',
      minPlayers: 1,
      maxPlayers: 8,
      world: { seed: 123 },
      parentGenre: 'voxel',
      genres: ['survival'],
      tags: ['official', 'voxel', 'survival'],
      category: 'Official',
      display: { title: 'Survival', creator: 'Official' },
    });
    expect(def.parentGenre).toBe('voxel');
    expect(def.genres).toEqual(['survival']);
  });

  it('rejects invalid parentGenre', () => {
    expect(() =>
      // biome-ignore lint/suspicious/noExplicitAny: invalid input test
      (defineGameMode as any)({
        id: 'fps-official-ffa',
        type: 'fps',
        source: 'official',
        slug: 'ffa',
        minPlayers: 2,
        maxPlayers: 16,
        world: { map: 'static-arena' },
        parentGenre: 'racing',
      }),
    ).toThrow(/parentGenre must be one of/);
  });

  it('rejects invalid genres (non-array, invalid slug)', () => {
    expect(() =>
      // biome-ignore lint/suspicious/noExplicitAny: invalid input test
      (defineGameMode as any)({
        id: 'fps-official-ffa',
        type: 'fps',
        source: 'official',
        slug: 'ffa',
        minPlayers: 2,
        maxPlayers: 16,
        world: { map: 'static-arena' },
        genres: 'ffa',
      }),
    ).toThrow(/genres must be array/);

    expect(() =>
      // biome-ignore lint/suspicious/noExplicitAny: invalid input test
      (defineGameMode as any)({
        id: 'fps-official-ffa',
        type: 'fps',
        source: 'official',
        slug: 'ffa',
        minPlayers: 2,
        maxPlayers: 16,
        world: { map: 'static-arena' },
        genres: ['FFA'],
      }),
    ).toThrow(/genres\[0\] must match/);
  });

  it('rejects invalid category', () => {
    expect(() =>
      // biome-ignore lint/suspicious/noExplicitAny: invalid input test
      (defineGameMode as any)({
        id: 'fps-official-ffa',
        type: 'fps',
        source: 'official',
        slug: 'ffa',
        minPlayers: 2,
        maxPlayers: 16,
        world: { map: 'static-arena' },
        category: 'Custom',
      }),
    ).toThrow(/category must be one of/);
  });

  it('rejects invalid display and stats', () => {
    expect(() =>
      // biome-ignore lint/suspicious/noExplicitAny: invalid input test
      (defineGameMode as any)({
        id: 'fps-official-ffa',
        type: 'fps',
        source: 'official',
        slug: 'ffa',
        minPlayers: 2,
        maxPlayers: 16,
        world: { map: 'static-arena' },
        display: 'title',
      }),
    ).toThrow(/display must be object/);

    expect(() =>
      // biome-ignore lint/suspicious/noExplicitAny: invalid input test
      (defineGameMode as any)({
        id: 'fps-official-ffa',
        type: 'fps',
        source: 'official',
        slug: 'ffa',
        minPlayers: 2,
        maxPlayers: 16,
        world: { map: 'static-arena' },
        stats: { totalPlays: -1 },
      }),
    ).toThrow(/stats\.totalPlays must be non-negative/);
  });

  it('preserves backward compat: old def without new fields still works', () => {
    const def = defineGameMode({
      id: 'fps-official-ffa',
      type: 'fps',
      source: 'official',
      slug: 'ffa',
      minPlayers: 2,
      maxPlayers: 16,
      world: { map: 'static-arena' },
    });
    expect(def.parentGenre).toBeUndefined();
    expect(def.genres).toBeUndefined();
    expect(def.category).toBeUndefined();
  });
});
