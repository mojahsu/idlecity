// Deterministic RNG (mulberry32) stored in state so saves replay identically.
import type { GameState } from './types';

type Seeded = Pick<GameState, 'seed'>;

export function random(s: Seeded): number {
  s.seed = (s.seed + 0x6d2b79f5) | 0;
  let t = s.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(s: Seeded, min: number, max: number): number {
  return min + Math.floor(random(s) * (max - min + 1));
}

export function chance(s: Seeded, p: number): boolean {
  return random(s) < p;
}

/** Pick a name not already in use; falls back to a numbered one when all are taken. */
export function uniqueName(s: Seeded, pool: readonly string[], used: string[]): string {
  const free = pool.filter((n) => !used.includes(n));
  if (free.length) return pick(s, free);
  return `${pick(s, pool)} ${randInt(s, 2, 99)}`;
}

export function pick<T>(s: Seeded, arr: readonly T[]): T {
  return arr[Math.floor(random(s) * arr.length)];
}
