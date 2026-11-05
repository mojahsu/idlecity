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

/** Townsfolk are indoors between these day fractions (sunset to just before sunrise). */
export function isNight(s: GameState): boolean {
  const f = dayFraction(s);
  return f > 0.8 || f < 0.17;
}

export type Weather = 'clear' | 'rain' | 'storm' | 'snow';

/** The weather of a day is fixed by its index so the renderer and the sim agree. */
export function dayWeather(day: number, sea: (typeof SEASONS)[number]): Weather {
  if (sea === 'winter') return (day * 7919) % 3 !== 0 ? 'snow' : 'clear';
  if ((day * 7919) % 5 !== 0) return 'clear';
  return (day * 31) % 2 === 0 ? 'storm' : 'rain';
}

/** Rain (and storms) fall from late morning to mid afternoon; a rainbow follows. */
export const RAIN_FROM = 0.25;
export const RAIN_TO = 0.62;

export function isRaining(s: GameState): boolean {
  const w = dayWeather(currentDay(s), season(s));
  if (w !== 'rain' && w !== 'storm') return false;
  const f = dayFraction(s);
  return f >= RAIN_FROM && f <= RAIN_TO;
}

/** The harvest festival: nobody works on the fifth day of autumn. */
export function isHoliday(s: GameState): boolean {
  return season(s) === 'autumn' && (currentDay(s) - 1) % 10 === 5;
}

/** Midday break: everyone who is near the square sits down to eat. */
export const LUNCH_FROM = 0.47;
export const LUNCH_TO = 0.55;
export function isLunch(s: GameState): boolean {
  const f = dayFraction(s);
  return f >= LUNCH_FROM && f < LUNCH_TO;
}
