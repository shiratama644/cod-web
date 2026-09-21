/**
 * Minimal BaseCtx implementation helpers (L1 pure, no I/O, no setTimeout).
 *
 * 実際の RoomCtx 実装は engine-core の GameModeRuntime 側で提供する。
 * ここでは LCG 乱数や validation の pure helper のみ置く。
 */

export function createLCG(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function createRandomHelpers(seed: number): {
  random: () => number;
  randomInt: (min: number, max: number) => number;
} {
  const next = createLCG(seed);
  return {
    random: () => next(),
    randomInt: (min: number, max: number) => {
      if (min > max) throw new Error('min > max');
      const r = next();
      return Math.floor(r * (max - min + 1)) + min;
    },
  };
}
