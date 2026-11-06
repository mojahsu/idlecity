// Buildings: construction reveal, the finished art (one file per type), fire,
// sun shadows, street lamps, light and smoke sources.
import type { Building, GameState } from '../../sim/types';
import { BUILDINGS } from '../../data/buildings';
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, roundRect, groundShadow, rgba, hash, glow, castShadow, type Env } from '../palette';
import { stretchOf, stretchY, type BuildingArt, type Opts } from './shared';
export type { LightSource, SmokeSource } from './shared';
import type { LightSource, SmokeSource } from './shared';
import { drawCampfire } from './campfire';
import { drawHut } from './hut';
import { drawHouse } from './house';
import { drawLumberCamp } from './lumberCamp';
import { drawQuarry } from './quarry';
import { drawFarm } from './farm';
import { drawWell } from './well';
import { drawGranary } from './granary';
import { drawTavern } from './tavern';
import { drawBlacksmith } from './blacksmith';
import { drawMarket } from './market';
import { drawMine } from './mine';
import { drawChapel } from './chapel';
import { drawGuildHall } from './guildHall';
import { drawWalls } from './walls';
import { drawKeep } from './keep';
import { drawGrave } from './grave';
import { drawSpriteBuilding, hasSpriteBuilding, spriteBuildingHeight } from './sprite';

/**
 * Whether a building's windows glow. Homes light up when someone is inside and
 * go dark one by one late at night; shops and halls keep their lamps burning.
 */
export function isLit(b: Building, env: Env): boolean {
  const def = BUILDINGS[b.type];
  if ((b.type === 'hut' || b.type === 'house') && env.raid && env.indoors.has(b.id)) return true;
  if (!def.light || env.dark <= 0.35) return false;
  const f = env.dayFrac, h = hash(b.x, b.y, 61);
  if (b.type === 'hut' || b.type === 'house') {
    if (env.seasonal === 'solstice') return true; // candles in every window on midwinter night
    if (!env.indoors.has(b.id)) return false;
    return f >= 0.1 + h * 0.05 && !(f > 0.92 + h * 0.06 && f < 1) ;
  }
  if (b.type === 'market') return f > 0.5 && f < 0.9;
  if (b.type === 'chapel') return f > 0.5 && f < 0.96;
  return true;
}

/** Rough height of each building above the ground line, for sun shadows. */
const HEIGHT: Partial<Record<Building['type'], number>> = {
  hut: 26, house: 36, lumberCamp: 22, quarry: 6, farm: 0, well: 22, granary: 40, tavern: 42, blacksmith: 34,
  market: 18, mine: 12, chapel: 50, guildHall: 42, walls: 34, keep: 52, grave: 8, campfire: 0,
};

/** Sun shadows and Ambient Occlusion (AO) contact shadows of every finished building, drawn on the ground before the scene. */
export function drawBuildingShadows(ctx: CanvasRenderingContext2D, s: GameState, env: Env): void {
  for (const b of s.buildings) {
    const h = hasSpriteBuilding(b.type) ? spriteBuildingHeight(b.type) : HEIGHT[b.type] ?? 0;
    if (!b.built || !h) continue;
    const px = b.x * TILE, py = b.y * TILE;
    // Soft ambient occlusion contact shadow grounding the building base.
    groundShadow(ctx, px + TILE / 2, py + TILE - 1.5, TILE * 0.54, 4.2, 0.34);
    castShadow(ctx, env, px + TILE / 2, py + TILE - 1, TILE - 4, h);
  }
  for (const l of lampPosts(s)) castShadow(ctx, env, l.x * TILE + 5, l.y * TILE + 6, 2, 16);
}

/** Street lamps on a few road tiles near the square; lit after dark. */
export function lampPosts(s: GameState): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
    if (s.tiles[y * s.width + x].terrain !== 'road') continue;
    if ((x * 7 + y * 13) % 6 !== 0 || Math.hypot(x - s.center.x, y - s.center.y) > 9) continue;
    out.push({ x, y });
  }
  return out;
}

/** The lamplighter does the round at dusk, so lamps come on one after another (index order); they all burn until dawn. */
export function lampLit(i: number, env: Env): boolean {
  if (env.dark <= 0.3) return false;
  const f = env.dayFrac;
  return f < 0.5 || f > 0.705 + i * 0.012;
}

export function drawLampPost(ctx: CanvasRenderingContext2D, x: number, y: number, env: Env, i = 0): void {
  const px = x * TILE + 5, py = y * TILE + 6;
  groundShadow(ctx, px, py + 1, 2.5, 1.2, 0.25);
  rect(ctx, px - 1, py - 16, 2, 17, '#3a3a40'); rect(ctx, px - 2.5, py - 1, 5, 2, '#3a3a40');
  rect(ctx, px - 1, py - 18, 4, 1.2, '#3a3a40');
  const lx = px + 3, ly = py - 15;
  rect(ctx, lx - 2, ly, 4, 5, '#4a4a50'); poly(ctx, [lx - 3, ly, lx, ly - 2.5, lx + 3, ly], '#3a3a40');
  if (lampLit(i, env)) { const f = 0.8 + 0.2 * Math.sin(env.clock * 7 + x); rect(ctx, lx - 1.4, ly + 0.8, 2.8, 3.4, `rgba(255,${200 * f},100,${f})`); }
  else rect(ctx, lx - 1.4, ly + 0.8, 2.8, 3.4, 'rgba(210,225,240,0.6)');
}

/** Full height above the tile top a building may occupy (used for the build reveal). */
const REVEAL_H = (TILE + 34) * 1.55;

export function drawBuilding(ctx: CanvasRenderingContext2D, s: GameState, b: Building, env: Env): void {
  const px = b.x * TILE, py = b.y * TILE;
  if (!b.built) { drawConstruction(ctx, s, b, env, px, py); return; }
  drawBuilt(ctx, s, b, env, px, py);
  if (s.fire && s.fire.buildingId === b.id) drawBlaze(ctx, b, s.fire.intensity, env, px, py);
}

/** Flames licking up a burning building, with a warm glow even by day. */
function drawBlaze(ctx: CanvasRenderingContext2D, b: Building, k: number, env: Env, px: number, py: number): void {
  const cx = px + TILE / 2, ground = py + TILE;
  const top = ground - (TILE + 10) * stretchOf(b.type)[1] * Math.min(1, 0.4 + k);
  // Scorching darkens the walls as it spreads.
  ctx.fillStyle = `rgba(20,10,5,${0.35 * k})`; ctx.fillRect(px - 2, top, TILE + 4, ground - top);
  glow(ctx, cx, ground - 12, 34 + 20 * k, '#ff8020', 0.25 + 0.3 * k);
  const n = 3 + Math.round(k * 5);
  for (let i = 0; i < n; i++) {
    const h = hash(b.x, b.y, 70 + i);
    const fx = px + 2 + h * (TILE - 4), base = ground - 2 - h * 6 - (i % 2) * 8 * k;
    const f = 1 + 0.35 * Math.sin(env.clock * (9 + i) + h * 20);
    const hgt = (8 + 16 * k) * f * (0.6 + h * 0.6);
    poly(ctx, [fx - 4, base, fx - 1.5, base - hgt * 0.55, fx + 0.5 + Math.sin(env.clock * 7 + i) * 2, base - hgt, fx + 2, base - hgt * 0.5, fx + 4, base], 'rgba(255,110,30,0.85)');
    poly(ctx, [fx - 2, base, fx, base - hgt * 0.6, fx + 2, base], 'rgba(255,220,120,0.9)');
  }
}

function drawConstruction(ctx: CanvasRenderingContext2D, s: GameState, b: Building, env: Env, px: number, py: number): void {
  const p = Math.max(0.02, b.progress);
  // Cleared ground and foundation stones.
  ellipse(ctx, px + TILE / 2, py + TILE / 2 + 3, 13, 8, rgba('#8a7250', 0.55));
  ctx.fillStyle = '#9a9a92';
  for (let i = 0; i < 6; i++) ctx.fillRect(px + 2 + (i % 3) * 7, py + TILE - 6 + Math.floor(i / 3) * 3, 5, 2);
  // The building itself, revealed from the ground up.
  ctx.save();
  ctx.beginPath();
  const h = REVEAL_H * p;
  ctx.rect(px - 10, py + TILE + 2 - h, TILE + 20, h);
  ctx.clip();
  drawBuilt(ctx, s, b, env, px, py);
  ctx.restore();
  // Scaffolding: two posts and planks at the current work height.
  const top = py + TILE + 1 - h;
  ctx.fillStyle = '#b08a52';
  ctx.fillRect(px - 2, Math.min(py + TILE - 2, top - 6), 2, py + TILE + 1 - Math.min(py + TILE - 2, top - 6));
  ctx.fillRect(px + TILE, Math.min(py + TILE - 2, top - 6), 2, py + TILE + 1 - Math.min(py + TILE - 2, top - 6));
  ctx.fillStyle = '#c9a062';
  ctx.fillRect(px - 3, top - 2, TILE + 6, 2);
  ctx.fillStyle = '#8f6a3a';
  for (let i = 0; i < 2; i++) { const y = top + 8 + i * 9; if (y < py + TILE - 1) ctx.fillRect(px - 3, y, TILE + 6, 1.5); }
  // Material pile and progress bar.
  rect(ctx, px + TILE - 6, py + TILE - 4, 7, 2, '#c8925a'); rect(ctx, px + TILE - 5, py + TILE - 6, 5, 2, '#d8a46a');
  roundRect(ctx, px + 2, py + TILE + 3, TILE - 4, 3, 1.5, 'rgba(0,0,0,0.6)');
  roundRect(ctx, px + 2, py + TILE + 3, (TILE - 4) * b.progress, 3, 1.5, '#e0b040');
}

// ---- per-type art -----------------------------------------------------------
function drawBuilt(ctx: CanvasRenderingContext2D, s: GameState, b: Building, env: Env, px: number, py: number): void {
  if (drawSpriteBuilding(ctx, s, b, env, px, py)) return;
  const [sx, sy] = stretchOf(b.type);
  if (sx === 1 && sy === 1) { drawBuiltArt(ctx, s, b, env, px, py); return; }
  ctx.save();
  ctx.translate(px + TILE / 2, py + TILE); ctx.scale(sx, sy); ctx.translate(-(px + TILE / 2), -(py + TILE));
  drawBuiltArt(ctx, s, b, env, px, py);
  ctx.restore();
}

/** Light emitters for the night pass. */
export function lightSources(s: GameState, env: Env): LightSource[] {
  const out: LightSource[] = [];
  for (const b of s.buildings) {
    if (!b.built) continue;
    const def = BUILDINGS[b.type];
    const px = b.x * TILE, py = b.y * TILE;
    const cx = px + TILE / 2, cy = stretchY(b.type, py, py + TILE / 2);
    if (b.type === 'campfire') out.push({ x: cx, y: cy, r: 46, color: '#ffa040', flicker: 0.12 });
    else if (b.type === 'blacksmith') out.push({ x: cx - 3, y: py + TILE - 4, r: 26, color: '#ff8030', flicker: 0.2 });
    else if (b.type === 'keep') out.push({ x: cx, y: cy, r: 50, color: '#ffc070', flicker: 0.05 });
    else if (b.type === 'walls') out.push({ x: px + TILE - 4, y: stretchY(b.type, py, py + 2), r: 20, color: '#ffa040', flicker: 0.15 });
    else if (b.type === 'mine') out.push({ x: cx, y: stretchY(b.type, py, py + TILE / 2 - 1), r: 12, color: '#ffc050', flicker: 0.1 });
    else if (b.type === 'chapel') out.push({ x: cx, y: cy, r: 34, color: '#ffc080', flicker: 0.03 });
    else if (def.light && isLit(b, env)) out.push({ x: cx, y: cy, r: b.type === 'tavern' || b.type === 'guildHall' || b.type === 'market' ? 34 : 28, color: '#ffd080', flicker: 0.04 });
    if (s.fire && s.fire.buildingId === b.id) out.push({ x: cx, y: py + TILE - 10, r: 40 + 40 * s.fire.intensity, color: '#ff8030', flicker: 0.3 });
  }
  lampPosts(s).forEach((l, i) => { if (lampLit(i, env)) out.push({ x: l.x * TILE + 8, y: l.y * TILE - 8, r: 22, color: '#ffc870', flicker: 0.06 }); });
  for (const d of s.dungeons) {
    if (d.id === 'darkTower' && d.unlocked) out.push({ x: d.x * TILE + TILE / 2, y: d.y * TILE + TILE / 2 - 6, r: 34, color: s.victory ? '#f0d050' : '#a040e0', flicker: 0.25 });
  }
  return out;
}

/** Chimneys and fires that should emit smoke particles. */
export function smokeSources(s: GameState, env: Env): SmokeSource[] {
  const out: SmokeSource[] = [];
  const cold = env.season === 'winter' || env.dark > 0.5;
  // Breakfast fires: every chimney puffs hard just after sunrise.
  const dawn = env.dayFrac > 0.1 && env.dayFrac < 0.3;
  for (const b of s.buildings) {
    if (!b.built) continue;
    const px = b.x * TILE, py = b.y * TILE;
    if (s.fire && s.fire.buildingId === b.id) { out.push({ x: px + TILE / 2, y: stretchY(b.type, py, py + 4), rate: 4 + 8 * s.fire.intensity, color: '#3a3330', size: 2.6 }); continue; }
    switch (b.type) {
      case 'campfire': out.push({ x: px + TILE / 2, y: py + TILE / 2 - 8, rate: 2.5, color: '#d8d0c8', size: 2.2 }); break;
      case 'house': out.push({ x: px + TILE - 6, y: stretchY(b.type, py, py - 4), rate: dawn && env.indoors.has(b.id) ? 1.8 : cold ? 1.2 : 0.5, color: '#e8e4e0', size: 1.6 }); break;
      case 'hut': if (cold || dawn) out.push({ x: px + TILE / 2 + 4, y: stretchY(b.type, py, py - 2), rate: dawn ? 1 : 0.6, color: '#e8e4e0', size: 1.3 }); break;
      case 'tavern': out.push({ x: px + 6, y: stretchY(b.type, py, py - 6), rate: 1.6, color: '#ece8e4', size: 1.8 }); break;
      case 'guildHall': out.push({ x: px + 6, y: stretchY(b.type, py, py - 5), rate: cold ? 1.2 : 0.6, color: '#e8e4e0', size: 1.6 }); break;
      case 'blacksmith': out.push({ x: px + TILE - 6, y: stretchY(b.type, py, py - 2), rate: 3, color: '#55504e', size: 2 }); break;
    }
  }
  return out;
}

/** One drawing per type; each file in this folder is one building. */
const ART: Record<Building['type'], (a: BuildingArt) => void> = {
  campfire: drawCampfire,
  hut: drawHut,
  house: drawHouse,
  lumberCamp: drawLumberCamp,
  quarry: drawQuarry,
  farm: drawFarm,
  well: drawWell,
  granary: drawGranary,
  tavern: drawTavern,
  blacksmith: drawBlacksmith,
  market: drawMarket,
  mine: drawMine,
  chapel: drawChapel,
  guildHall: drawGuildHall,
  walls: drawWalls,
  keep: drawKeep,
  grave: drawGrave,
};

function drawBuiltArt(ctx: CanvasRenderingContext2D, s: GameState, b: Building, env: Env, px: number, py: number): void {
  const cx = px + TILE / 2, cy = py + TILE / 2;
  const bottom = py + TILE - 2;
  const o: Opts = { lit: isLit(b, env), env };
  const snow = env.season === 'winter';
  const v = hash(b.x, b.y, 50);
  ART[b.type]({ ctx, s, b, env, px, py, cx, cy, bottom, o, snow, v });
}
