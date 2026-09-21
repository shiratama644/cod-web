// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createLCG, createRandomHelpers } from '@cod/gamemode-api';

describe('gamemode-api ctx helpers', () => {
  it('createLCG is deterministic', () => {
    const r1 = createLCG(123);
    const r2 = createLCG(123);
    const vals1 = Array.from({ length: 10 }, () => r1());
    const vals2 = Array.from({ length: 10 }, () => r2());
    expect(vals1).toEqual(vals2);
  });

  it('createLCG different seeds produce different sequences', () => {
    const r1 = createLCG(1);
    const r2 = createLCG(2);
    expect(r1()).not.toBe(r2());
  });

  it('createRandomHelpers randomInt inclusive', () => {
    const { randomInt } = createRandomHelpers(42);
    for (let i = 0; i < 100; i++) {
      const v = randomInt(0, 10);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('randomInt throws when min > max', () => {
    const { randomInt } = createRandomHelpers(1);
    expect(() => randomInt(10, 0)).toThrow(/min > max/);
  });

  it('random returns 0..1', () => {
    const { random } = createRandomHelpers(999);
    for (let i = 0; i < 50; i++) {
      const v = random();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
