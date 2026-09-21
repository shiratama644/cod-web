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
      // biome-ignore lint/suspicious/noExplicitAny: invalid input test
      } as any;
      return defineGameMode(v);
    }).toThrow(/id must match/);

    expect(() =>
      defineGameMode({
        id: 'ab',
        ...base,
      }),
    ).toThrow();

    expect(() =>
      defineGameMode({
        id: 'a'.repeat(33),
        ...base,
      }),
    ).toThrow();
  });

  it('rejects invalid type', () => {
    expect(() => {
      const v = {
        id: 'fps-official-ffa',
        // biome-ignore lint/suspicious/noExplicitAny: invalid input test
        type: 'racing' as any,
        source: 'official',
        slug: 'ffa',
        minPlayers: 2,
        maxPlayers: 16,
        world: { map: 'static-arena' },
      };
      return defineGameMode(v);
    }).toThrow(/type must be one of/);
  });

  it('rejects invalid source', () => {
    expect(() => {
      const v = {
        id: 'fps-official-ffa',
        type: 'fps',
        // biome-ignore lint/suspicious/noExplicitAny: invalid input test
        source: 'custom' as any,
        slug: 'ffa',
        minPlayers: 2,
        maxPlayers: 16,
        world: { map: 'static-arena' },
      };
      return defineGameMode(v);
    }).toThrow(/source must be one of/);
  });

  it('rejects invalid slug', () => {
    expect(() =>
      defineGameMode({
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
      defineGameMode({
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
      defineGameMode({
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
        // biome-ignore lint/suspicious/noExplicitAny: invalid input test
        world: undefined as any,
      };
      return defineGameMode(v);
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
        // biome-ignore lint/suspicious/noExplicitAny: invalid input test
        world: {} as any,
      };
      return defineGameMode(v);
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
});
