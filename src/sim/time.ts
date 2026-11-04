import type { GameState } from './types';
import { DAY_LENGTH, DAYS_PER_SEASON, SEASONS } from './constants';

export function currentDay(s: GameState): number {
  return Math.floor(s.time / DAY_LENGTH) + 1;
}

/** 0..1 fraction of the current day; 0 = midnight. */
export function dayFraction(s: GameState): number {
  return (s.time % DAY_LENGTH) / DAY_LENGTH;
}

export function season(s: GameState): (typeof SEASONS)[number] {
  const day = currentDay(s) - 1;
  return SEASONS[Math.floor(day / DAYS_PER_SEASON) % SEASONS.length];
}

export function year(s: GameState): number {
  return Math.floor((currentDay(s) - 1) / (DAYS_PER_SEASON * SEASONS.length)) + 1;
}

/** 0 = full day, 1 = full night. */
export function darkness(s: GameState): number {
  const f = dayFraction(s);
  // Sunrise around 0.22, sunset around 0.78.
  if (f < 0.18 || f > 0.84) return 1;
  if (f < 0.28) return 1 - (f - 0.18) / 0.1;
  if (f > 0.74) return (f - 0.74) / 0.1;
  return 0;
}
