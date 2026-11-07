// Per-frame environment snapshot: season, time of day, weather, who is indoors.
import type { GameState } from '../../sim/types';
import { RAIN_TO, currentDay, darkness, dayFraction, dayWeather, isHoliday, isNight, isRaining, season, seasonalEvent, type SeasonalEvent } from '../../sim/time';
import type { Season } from './seasons';

/** Per-frame environment snapshot so draw functions don't recompute it. */
export interface Env {
  season: Season;
  /** 0 = full day, 1 = full night. */
  dark: number;
  /** 0..1 fraction of the day; 0 = midnight. */
  dayFrac: number;
  /** Seconds of wall-clock animation time. */
  clock: number;
  /** In-game day index. */
  day: number;
  rainy: boolean;
  /** Rain with lightning. */
  storm: boolean;
  snowy: boolean;
  foggy: boolean;
  /** 0..1 strength of the rainbow after the rain. */
  rainbow: number;
  /** Clear night sky: shooting stars, and in winter the aurora. */
  clearNight: boolean;
  /** Townsfolk are home (sunset to sunrise). */
  night: boolean;
  /** 0..1 while the chapel bell rings (morning and evening). */
  bell: number;
  /** Ids of houses with someone asleep inside. */
  indoors: Set<number>;
  /** Harvest festival evening (mid autumn). */
  festival: boolean;
  /** The festival day itself: nobody works. */
  holiday: boolean;
  /** The season's special day, if today is one. */
  seasonal: SeasonalEvent | null;
  /** True while a monster raid is marching on or fighting the town. */
  raid: boolean;
  /** Clothing quality stage (0 = coarse linen cloth, 1 = simple homespun, 2 = dyed tunic & cape, 3 = fine town/royal attire). */
  clothTier: 0 | 1 | 2 | 3;
}

export function makeEnv(s: GameState, clock: number): Env {
  const sea = season(s) as Season;
  const day = currentDay(s);
  const f = dayFraction(s);
  const weather = dayWeather(day, sea);
  const rainy = isRaining(s);
  const storm = rainy && weather === 'storm';
  const snowy = weather === 'snow';
  const wet = weather === 'rain' || weather === 'storm';
  const rainbow = wet && f > RAIN_TO && f < RAIN_TO + 0.14 ? Math.max(0, Math.min(1, (f - RAIN_TO) / 0.03, (RAIN_TO + 0.14 - f) / 0.04)) : 0;
  const foggy = weather === 'clear' && (sea === 'autumn' || sea === 'spring') && (day * 104729) % 3 === 0 && f > 0.2 && f < 0.36;
  const dark = darkness(s);
  const clearNight = dark > 0.6 && !rainy && !snowy && !foggy;
  const bell = f > 0.24 && f < 0.275 ? 1 : f > 0.765 && f < 0.8 ? 1 : 0;
  const indoors = new Set<number>();
  for (const w of s.workers) if (w.task?.kind === 'sleep' && w.task.phase === 'sleep') indoors.add(w.task.buildingId);
  const festival = sea === 'autumn' && (day - 1) % 10 === 5 && f > 0.78;
  const hasMarket = s.buildings.some((b) => b.built && b.type === 'market');
  const hasTavernOrSmith = s.buildings.some((b) => b.built && (b.type === 'tavern' || b.type === 'blacksmith'));
  const hasHomespun = s.tier !== 'camp' || s.buildings.some((b) => b.built && b.type === 'farm');
  const clothTier: 0 | 1 | 2 | 3 = (s.tier === 'town' || s.tier === 'city') && hasMarket
    ? 3
    : s.tier === 'village' || s.tier === 'town' || s.tier === 'city' || hasTavernOrSmith
      ? 2
      : hasHomespun
        ? 1
        : 0;
  return { season: sea, dark, dayFrac: f, clock, day, rainy, storm, snowy, foggy, rainbow, clearNight, night: isNight(s), bell, indoors, festival, holiday: isHoliday(s), seasonal: seasonalEvent(s), raid: !!s.raid, clothTier };
}

/** Warm/cool tint of the whole scene for the time of day, as an rgba fill. */
export function skyTint(env: Env): string | null {
  const f = env.dayFrac;
  // Golden dawn and dusk; blue night handled by the night layer.
  if (f > 0.18 && f < 0.3) return `rgba(255,150,70,${0.22 * (1 - Math.abs(f - 0.24) / 0.06)})`;
  if (f > 0.72 && f < 0.84) return `rgba(255,110,60,${0.26 * (1 - Math.abs(f - 0.78) / 0.06)})`;
  return null;
}
