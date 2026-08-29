export type Rng = () => number

/**
 * mulberry32 PRNG — tiny deterministic generator for tests and replay.
 * Pass the returned function wherever the engine needs an injectable rng.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}

/**
 * One 7-bag of the seven tetriminoes, shuffled uniformly by `rng`.
 * Bags are dealt in order, one piece at a time.
 */
export function bag<T>(items: readonly T[], rng: Rng): T[] {
  return shuffle(items, rng)
}