// Colours, deterministic noise and small drawing helpers shared by the
// render modules. Everything here is pure; no canvas state is kept.
import type { GameState } from '../sim/types';
import { RAIN_TO, currentDay, darkness, dayFraction, dayWeather, isNight, isRaining, season } from '../sim/time';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

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
  return { season: sea, dark, dayFrac: f, clock, day, rainy, storm, snowy, foggy, rainbow, clearNight, night: isNight(s), bell, indoors };
}

/** Deterministic 0..1 noise from integer coordinates and a salt. */
export function hash(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }
export function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

function hexToRgb(c: string): [number, number, number] {
  const h = c.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((ch) => ch + ch).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(c: string, a: number): string {
  const [r, g, b] = hexToRgb(c);
  return `rgba(${r},${g},${b},${a})`;
}

export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  const k = clamp01(t);
  return `rgb(${Math.round(lerp(A[0], B[0], k))},${Math.round(lerp(A[1], B[1], k))},${Math.round(lerp(A[2], B[2], k))})`;
}

export function shade(c: string, amount: number): string {
  return amount < 0 ? mix(c, '#000000', -amount) : mix(c, '#ffffff', amount);
}

export interface SeasonPalette {
  grass: string;
  grassAlt: string;
  grassDark: string;
  tuft: string;
  flowers: string[];
  canopy: string[];
  canopyShade: string;
  bush: string;
  dirt: string;
  dirtEdge: string;
  water: string;
  waterDeep: string;
  bank: string;
  crop: string;
  cropHeight: number;
}

export const PALETTE: Record<Season, SeasonPalette> = {
  spring: {
    grass: '#6aa84f', grassAlt: '#74b257', grassDark: '#4f8c3c', tuft: '#8ccb62',
    flowers: ['#ffffff', '#f7d94c', '#f29ac6'],
    canopy: ['#3f9a4c', '#4daa58', '#5db862', '#8fcf7a'], canopyShade: '#2d7338',
    bush: '#4f9a3f', dirt: '#b89a6a', dirtEdge: '#8f7347', water: '#3e86bd', waterDeep: '#2c6693', bank: '#c9b885',
    crop: '#8ccb62', cropHeight: 0.35,
  },
  summer: {
    grass: '#5f9c3e', grassAlt: '#68a646', grassDark: '#487f31', tuft: '#7fbd55',
    flowers: ['#f7d94c', '#f06a4f'],
    canopy: ['#2f7f3c', '#3a8f45', '#459c4e', '#6ab861'], canopyShade: '#245f2c',
    bush: '#45903a', dirt: '#b3935f', dirtEdge: '#866a3e', water: '#3b84bb', waterDeep: '#296190', bank: '#c7b27a',
    crop: '#6fb44a', cropHeight: 0.8,
  },
  autumn: {
    grass: '#86a048', grassAlt: '#92aa50', grassDark: '#687f36', tuft: '#b3b65a',
    flowers: ['#e0b040'],
    canopy: ['#c8692c', '#d98a30', '#e0a838', '#b84a2a'], canopyShade: '#8a3f1c',
    bush: '#8a8a3a', dirt: '#ad8f5e', dirtEdge: '#7f663b', water: '#3f7fae', waterDeep: '#2b5c84', bank: '#bda772',
    crop: '#e0b848', cropHeight: 1,
  },
  winter: {
    grass: '#dde3e6', grassAlt: '#d3dadd', grassDark: '#bfc8cd', tuft: '#c8d0d4',
    flowers: [],
    canopy: ['#6f8f6a', '#7a9a74', '#86a67f', '#a8bfa2'], canopyShade: '#4f6b4b',
    bush: '#6a7f5a', dirt: '#c9c2b4', dirtEdge: '#9f988a', water: '#5b8fbd', waterDeep: '#3f6d94', bank: '#d9d7cc',
    crop: '#b0a080', cropHeight: 0.1,
  },
};

/** Warm/cool tint of the whole scene for the time of day, as an rgba fill. */
export function skyTint(env: Env): string | null {
  const f = env.dayFrac;
  // Golden dawn and dusk; blue night handled by the night layer.
  if (f > 0.18 && f < 0.3) return `rgba(255,150,70,${0.22 * (1 - Math.abs(f - 0.24) / 0.06)})`;
  if (f > 0.72 && f < 0.84) return `rgba(255,110,60,${0.26 * (1 - Math.abs(f - 0.78) / 0.06)})`;
  return null;
}

// ---- tiny shape helpers ---------------------------------------------------

export function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

export function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

export function poly(ctx: CanvasRenderingContext2D, pts: number[], color: string): void {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath(); ctx.fill();
}

export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string): void {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
}

export function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width = 1): void {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

/** Soft drop shadow under an object standing on the ground. */
export function groundShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, alpha = 0.22): void {
  ellipse(ctx, x, y, rx, ry, `rgba(10,20,10,${alpha})`);
}

/** Additive glow used for fires, lanterns and magic. */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
