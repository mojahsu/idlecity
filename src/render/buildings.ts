// Building art. Each type has its own shape; a building under construction
// is revealed bottom-up behind scaffolding. Light and smoke sources are
// exported for the lighting and particle passes.
import type { Building, GameState } from '../sim/types';
import { BUILDINGS } from '../data/buildings';
import { TILE } from './constants';
import { PALETTE, circle, ellipse, poly, rect, line, roundRect, groundShadow, shade, rgba, hash, glow, castShadow, type Env } from './palette';

export interface LightSource { x: number; y: number; r: number; color: string; flicker: number }
export interface SmokeSource { x: number; y: number; rate: number; color: string; size: number }

/**
 * Buildings are drawn at tile scale and then stretched upward from the ground
 * line so people (drawn at ~60%) look about a quarter of a house tall.
 * [horizontal, vertical] factors per type; flat things stay as they are.
 */
const STRETCH: Partial<Record<Building['type'], [number, number]>> = {
  hut: [1.05, 1.35], house: [1.05, 1.5], lumberCamp: [1.05, 1.3], granary: [1.05, 1.5], tavern: [1.05, 1.55],
  blacksmith: [1.05, 1.45], market: [1.05, 1.3], chapel: [1.05, 1.5], guildHall: [1.05, 1.55], walls: [1, 1.5],
  keep: [1.08, 1.5], well: [1, 1.25], mine: [1, 1.2], quarry: [1, 1.15],
};

function stretchOf(type: Building['type']): [number, number] { return STRETCH[type] ?? [1, 1]; }

/** Map a y drawn in tile space to where the stretch puts it on screen. */
function stretchY(type: Building['type'], py: number, y: number): number {
  const ground = py + TILE;
  return ground - (ground - y) * stretchOf(type)[1];
}

/**
 * Whether a building's windows glow. Homes light up when someone is inside and
 * go dark one by one late at night; shops and halls keep their lamps burning.
 */
export function isLit(b: Building, env: Env): boolean {
  const def = BUILDINGS[b.type];
  if (!def.light || env.dark <= 0.35) return false;
  const f = env.dayFrac, h = hash(b.x, b.y, 61);
  if (b.type === 'hut' || b.type === 'house') {
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

/** Sun shadows of every finished building, drawn on the ground before the scene. */
export function drawBuildingShadows(ctx: CanvasRenderingContext2D, s: GameState, env: Env): void {
  for (const b of s.buildings) {
    const h = HEIGHT[b.type] ?? 0;
    if (!b.built || !h) continue;
    const px = b.x * TILE, py = b.y * TILE;
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

export function drawLampPost(ctx: CanvasRenderingContext2D, x: number, y: number, env: Env): void {
  const px = x * TILE + 5, py = y * TILE + 6;
  groundShadow(ctx, px, py + 1, 2.5, 1.2, 0.25);
  rect(ctx, px - 1, py - 16, 2, 17, '#3a3a40'); rect(ctx, px - 2.5, py - 1, 5, 2, '#3a3a40');
  rect(ctx, px - 1, py - 18, 4, 1.2, '#3a3a40');
  const lx = px + 3, ly = py - 15;
  rect(ctx, lx - 2, ly, 4, 5, '#4a4a50'); poly(ctx, [lx - 3, ly, lx, ly - 2.5, lx + 3, ly], '#3a3a40');
  if (env.dark > 0.3) { const f = 0.8 + 0.2 * Math.sin(env.clock * 7 + x); rect(ctx, lx - 1.4, ly + 0.8, 2.8, 3.4, `rgba(255,${200 * f},100,${f})`); }
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

// ---- shared pieces ----------------------------------------------------------

interface Opts { lit: boolean; env: Env }

function roofShingles(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, apexX: number, apexY: number, color: string): void {
  poly(ctx, [x1, y1, apexX, apexY, x2, y2], color);
  ctx.strokeStyle = rgba('#000000', 0.18); ctx.lineWidth = 1;
  const rows = 3;
  for (let i = 1; i < rows; i++) {
    const t = i / rows;
    ctx.beginPath(); ctx.moveTo(x1 + (apexX - x1) * t, y1 + (apexY - y1) * t); ctx.lineTo(x2 + (apexX - x2) * t, y2 + (apexY - y2) * t); ctx.stroke();
  }
  poly(ctx, [x1, y1, apexX, apexY, apexX, apexY + 1.5, x1 + 1, y1 + 1.5], shade(color, 0.18));
}

function thatch(ctx: CanvasRenderingContext2D, cx: number, baseY: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(cx - w / 2 - 2, baseY); ctx.quadraticCurveTo(cx - w / 2, baseY - h, cx, baseY - h - 2); ctx.quadraticCurveTo(cx + w / 2, baseY - h, cx + w / 2 + 2, baseY); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#000000', 0.15); ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx + i * (w / 6), baseY - 1); ctx.lineTo(cx + i * (w / 9), baseY - h * 0.7); ctx.stroke(); }
  ctx.fillStyle = shade(color, 0.25); ctx.beginPath(); ctx.ellipse(cx - w * 0.15, baseY - h * 0.75, w * 0.2, h * 0.14, -0.3, 0, Math.PI * 2); ctx.fill();
}

function wallBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, stone = false): void {
  rect(ctx, x, y, w, h, color);
  rect(ctx, x, y, w, 1.5, shade(color, 0.25));
  rect(ctx, x + w - 2, y, 2, h, shade(color, -0.2));
  if (stone) {
    ctx.strokeStyle = rgba('#000000', 0.16); ctx.lineWidth = 1;
    for (let r = 1; r * 4 < h; r++) { ctx.beginPath(); ctx.moveTo(x, y + r * 4); ctx.lineTo(x + w, y + r * 4); ctx.stroke(); }
    for (let r = 0; r * 4 < h; r++) for (let c = (r % 2) ? 3 : 7; c < w; c += 7) { ctx.beginPath(); ctx.moveTo(x + c, y + r * 4); ctx.lineTo(x + c, y + Math.min(h, (r + 1) * 4)); ctx.stroke(); }
  }
}

function timberFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.strokeStyle = color; ctx.lineWidth = 1.2;
  ctx.strokeRect(x + 0.6, y + 0.6, w - 1.2, h - 1.2);
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w * 0.4, y); ctx.moveTo(x + w * 0.6, y); ctx.lineTo(x + w, y + h); ctx.stroke();
}

function window_(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, o: Opts, tint = '#ffd870'): void {
  rect(ctx, x - 1, y - 1, w + 2, h + 2, '#4a3a2a');
  rect(ctx, x, y, w, h, o.lit ? tint : '#273041');
  if (!o.lit) rect(ctx, x, y, w * 0.4, h * 0.4, rgba('#ffffff', 0.25));
  line(ctx, x + w / 2, y, x + w / 2, y + h, '#4a3a2a', 0.8);
}

function door(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color = '#4a2e18'): void {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, [w / 2, w / 2, 0, 0]); ctx.fill();
  circle(ctx, x + w - 1.5, y + h * 0.55, 0.7, '#e0c060');
}

function chimney(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  rect(ctx, x, y, 4, 7, '#6a5a52'); rect(ctx, x - 0.5, y - 1, 5, 2, '#7f706a');
}

function flag(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, color: string, env: Env, w = 7): void {
  rect(ctx, x, y - h, 1.2, h, '#5a3a1e');
  const wave = Math.sin(env.clock * 6 + x) * 1.2;
  poly(ctx, [x + 1.2, y - h, x + 1.2 + w, y - h + 1.5 + wave, x + 1.2, y - h + 4], color);
  poly(ctx, [x + 1.2, y - h + 1.5, x + 1.2 + w * 0.6, y - h + 2 + wave * 0.6, x + 1.2, y - h + 3.2], shade(color, 0.25));
}

function torch(ctx: CanvasRenderingContext2D, x: number, y: number, env: Env): void {
  rect(ctx, x - 0.6, y, 1.2, 5, '#5a3a1e');
  if (env.dark > 0.2) {
    const f = 1 + 0.3 * Math.sin(env.clock * 11 + x);
    ellipse(ctx, x, y - 1.5 * f, 1.6, 2.4 * f, '#ff9a30'); ellipse(ctx, x, y - 1 * f, 0.8, 1.3 * f, '#ffe080');
  } else circle(ctx, x, y - 0.5, 1.2, '#3a2a1a');
}

// ---- per-type art -----------------------------------------------------------

function drawBuilt(ctx: CanvasRenderingContext2D, s: GameState, b: Building, env: Env, px: number, py: number): void {
  const [sx, sy] = stretchOf(b.type);
  if (sx === 1 && sy === 1) { drawBuiltArt(ctx, s, b, env, px, py); return; }
  ctx.save();
  ctx.translate(px + TILE / 2, py + TILE); ctx.scale(sx, sy); ctx.translate(-(px + TILE / 2), -(py + TILE));
  drawBuiltArt(ctx, s, b, env, px, py);
  ctx.restore();
}

function drawBuiltArt(ctx: CanvasRenderingContext2D, s: GameState, b: Building, env: Env, px: number, py: number): void {
  const def = BUILDINGS[b.type];
  const cx = px + TILE / 2, cy = py + TILE / 2;
  const bottom = py + TILE - 2;
  const o: Opts = { lit: isLit(b, env), env };
  const snow = env.season === 'winter';
  const v = hash(b.x, b.y, 50);

  switch (b.type) {
    case 'campfire': {
      groundShadow(ctx, cx, cy + 6, 9, 3, 0.2);
      for (let i = 0; i < 6; i++) { const a = i * 1.05; rect(ctx, cx + Math.cos(a) * 7 - 1.5, cy + 4 + Math.sin(a) * 3 - 1, 3, 2.5, '#8c8c86'); }
      rect(ctx, cx - 8, cy + 1, 16, 3, '#5a3a1e'); rect(ctx, cx - 2, cy - 4, 3, 10, '#6b4a2b');
      const f = 1 + 0.25 * Math.sin(env.clock * 9 + b.x), f2 = 1 + 0.3 * Math.sin(env.clock * 13 + 1.7);
      poly(ctx, [cx - 6, cy + 2, cx - 1, cy - 8 * f, cx + 1, cy - 4, cx + 6, cy + 2], '#ff7a20');
      poly(ctx, [cx - 4, cy + 2, cx + 1, cy - 11 * f2, cx + 4, cy + 2], '#ffa030');
      poly(ctx, [cx - 2, cy + 2, cx, cy - 5 * f, cx + 2, cy + 2], '#fff0a0');
      return;
    }
    case 'hut': {
      groundShadow(ctx, cx + 2, bottom + 1, 13, 4);
      wallBox(ctx, px + 4, py + 7, TILE - 8, TILE - 9, '#9a7448');
      ctx.strokeStyle = rgba('#000000', 0.18); for (let i = 1; i < 4; i++) line(ctx, px + 4, py + 7 + i * 3.5, px + TILE - 4, py + 7 + i * 3.5, rgba('#000000', 0.18), 0.8);
      thatch(ctx, cx, py + 8, TILE - 4, 10, snow ? '#e9edf0' : '#c6a65a');
      door(ctx, cx - 3, py + TILE - 10, 6, 8);
      window_(ctx, px + 6, py + 11, 3, 3, o);
      window_(ctx, px + TILE - 9, py + 11, 3, 3, o);
      return;
    }
    case 'house': {
      groundShadow(ctx, cx + 2, bottom + 1, 14, 4);
      wallBox(ctx, px + 2, py + 4, TILE - 4, TILE - 6, '#e3d2b0');
      timberFrame(ctx, px + 2, py + 4, TILE - 4, TILE - 6, '#6b4a2b');
      roofShingles(ctx, px - 1, py + 5, px + TILE + 1, py + 5, cx, py - 6, snow ? '#e9edf0' : '#9c3f30');
      chimney(ctx, px + TILE - 8, py - 3);
      door(ctx, cx - 3, py + TILE - 10, 6, 8);
      window_(ctx, px + 5, py + 8, 4, 4, o);
      window_(ctx, px + TILE - 9, py + 8, 4, 4, o);
      // Flower box.
      if (!snow) { rect(ctx, px + 4, py + 12.5, 6, 1.5, '#6b4a2b'); circle(ctx, px + 5.5, py + 12, 1, '#f06a4f'); circle(ctx, px + 8.5, py + 12, 1, '#f7d94c'); }
      // A woodpile or a rain barrel by the wall.
      if (v > 0.5) { for (let i = 0; i < 3; i++) { circle(ctx, px + TILE - 3 + (i % 2) * 2.4, py + TILE - 4 - Math.floor(i / 2) * 2.4, 1.4, '#8a5a30'); circle(ctx, px + TILE - 3 + (i % 2) * 2.4, py + TILE - 4 - Math.floor(i / 2) * 2.4, 0.6, '#d6a86c'); } }
      else { roundRect(ctx, px - 1, py + TILE - 7, 4, 5, 1, '#6b4a2b'); line(ctx, px - 1, py + TILE - 5, px + 3, py + TILE - 5, '#3a2a1a', 0.8); }
      // Washing line to the neighbouring house.
      const right = s.buildings.find((o) => o.built && o.x === b.x + 1 && o.y === b.y && (o.type === 'house' || o.type === 'hut'));
      if (right && !snow && !env.rainy && hash(b.x, b.y, 55) > 0.4) {
        const ly = py + 9;
        line(ctx, px + TILE - 2, ly, px + TILE + 6, ly + 0.5, '#e8e4dc', 0.7);
        for (let i = 0; i < 3; i++) { const lx = px + TILE - 1 + i * 2.6, wv = Math.sin(env.clock * 3 + i + b.x) * 0.8; poly(ctx, [lx, ly, lx + 2, ly, lx + 2 + wv, ly + 4, lx + wv, ly + 4], ['#d8e0f0', '#f0d0c0', '#c8e0c0'][i]); }
      }
      return;
    }
    case 'lumberCamp': {
      groundShadow(ctx, cx, bottom + 1, 13, 4);
      // Open shed on posts.
      rect(ctx, px + 3, py + 6, 2, TILE - 8, '#6b4a2b'); rect(ctx, px + TILE - 5, py + 6, 2, TILE - 8, '#6b4a2b');
      roofShingles(ctx, px, py + 7, px + TILE, py + 7, cx, py - 1, snow ? '#e9edf0' : '#5a3d22');
      // Log pile.
      for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) { const lx = px + 4 + r * 2.5 + i * 5, ly = py + TILE - 5 - r * 4; circle(ctx, lx, ly, 2.4, '#8a5a30'); circle(ctx, lx, ly, 1.2, '#d6a86c'); }
      // Stump with axe.
      ellipse(ctx, px + TILE - 6, py + TILE - 4, 3.5, 2, '#a8814f');
      line(ctx, px + TILE - 6, py + TILE - 5, px + TILE - 3, py + TILE - 11, '#6b4a2b', 1.2); rect(ctx, px + TILE - 5, py + TILE - 13, 4, 3, '#a9b0b8');
      return;
    }
    case 'quarry': {
      // Pit with cut blocks and a crane arm.
      ellipse(ctx, cx, cy + 3, 12, 8, '#6e6e6a');
      ellipse(ctx, cx, cy + 3, 9, 5.5, '#4e4e4a');
      for (let i = 0; i < 3; i++) { rect(ctx, px + 3 + i * 6, py + 2 + (i % 2) * 2, 5, 4, '#a9a9a3'); rect(ctx, px + 3 + i * 6, py + 2 + (i % 2) * 2, 5, 1, '#c6c6c0'); }
      rect(ctx, px + TILE - 6, py + 4, 2, 16, '#6b4a2b');
      const swing = Math.sin(env.clock * 0.8 + v * 6) * 2;
      line(ctx, px + TILE - 5, py + 5, px + TILE - 14 + swing, py + 1, '#6b4a2b', 2);
      line(ctx, px + TILE - 14 + swing, py + 1, px + TILE - 14 + swing, py + 9, '#3a3a3a', 0.8);
      rect(ctx, px + TILE - 16 + swing, py + 9, 4, 3, '#a9a9a3');
      if (snow) ellipse(ctx, cx - 4, cy - 2, 5, 2, '#f4f7f9');
      return;
    }
    case 'farm': {
      const pal = PALETTE[env.season];
      rect(ctx, px + 1, py + 1, TILE - 2, TILE - 2, snow ? '#d9d5c8' : '#8a6a3a');
      // Furrows and crops.
      for (let i = 0; i < 5; i++) {
        const rx = px + 3 + i * 4.5;
        rect(ctx, rx, py + 2, 1, TILE - 4, snow ? '#c4c0b2' : '#6f5430');
        if (!snow) {
          const hgt = 2 + 7 * pal.cropHeight;
          for (let j = 0; j < 4; j++) {
            const yy = py + 5 + j * 5;
            const sw = Math.sin(env.clock * 2 + i + j) * 0.5;
            line(ctx, rx + 1, yy + 2, rx + 1 + sw, yy + 2 - hgt, pal.crop, 1.4);
            if (env.season === 'autumn') ellipse(ctx, rx + 1 + sw, yy + 1 - hgt, 1.3, 2, '#f0d060');
            else if (env.season === 'summer') ellipse(ctx, rx + 1 + sw, yy + 2 - hgt, 1.6, 1, pal.crop);
          }
        }
      }
      // Fence on two sides.
      ctx.fillStyle = '#b08a52';
      for (let i = 0; i < 5; i++) ctx.fillRect(px + 1 + i * 5.5, py, 1.2, 3.5);
      ctx.fillRect(px + 1, py + 1, TILE - 2, 1);
      // Scarecrow on some farms.
      if (v > 0.5) { rect(ctx, px + TILE - 6, py + 6, 1.2, 12, '#6b4a2b'); rect(ctx, px + TILE - 10, py + 9, 9, 1.2, '#6b4a2b'); rect(ctx, px + TILE - 8, py + 8, 5, 5, '#b89b5a'); circle(ctx, px + TILE - 5.5, py + 6, 2.2, '#e8c070'); poly(ctx, [px + TILE - 9, py + 5, px + TILE - 5.5, py + 1, px + TILE - 2, py + 5], '#8a5a2a'); }
      return;
    }
    case 'well': {
      groundShadow(ctx, cx, cy + 8, 9, 3);
      ellipse(ctx, cx, cy + 4, 8, 4.5, '#7f8ba0'); ellipse(ctx, cx, cy + 3, 8, 4.5, '#9aa5b8');
      ellipse(ctx, cx, cy + 3, 5, 2.8, '#2f5f8f');
      ellipse(ctx, cx - 1, cy + 2.5, 2, 1, rgba('#ffffff', 0.4));
      rect(ctx, cx - 7, cy - 9, 1.8, 13, '#6b4a2b'); rect(ctx, cx + 5.2, cy - 9, 1.8, 13, '#6b4a2b');
      roofShingles(ctx, cx - 10, cy - 8, cx + 10, cy - 8, cx, cy - 14, snow ? '#e9edf0' : '#4f5b70');
      line(ctx, cx, cy - 8, cx, cy - 1 + Math.sin(env.clock) * 1.5, '#3a3a3a', 0.8);
      rect(ctx, cx - 1.5, cy - 1 + Math.sin(env.clock) * 1.5, 3, 2.5, '#8a6a3a');
      return;
    }
    case 'granary': {
      groundShadow(ctx, cx + 2, bottom + 1, 14, 4);
      wallBox(ctx, px + 2, py + 3, TILE - 4, TILE - 5, '#c4a054');
      ctx.strokeStyle = rgba('#000000', 0.18); for (let i = 1; i < 5; i++) line(ctx, px + 2 + i * 4, py + 3, px + 2 + i * 4, py + TILE - 2, rgba('#000000', 0.14), 0.8);
      roofShingles(ctx, px - 1, py + 4, px + TILE + 1, py + 4, cx, py - 7, snow ? '#e9edf0' : '#7a5a2a');
      door(ctx, cx - 4, py + TILE - 11, 8, 9, '#5a3a1e');
      line(ctx, cx - 4, py + TILE - 11, cx + 4, py + TILE - 2, '#8a6a3a', 1); line(ctx, cx + 4, py + TILE - 11, cx - 4, py + TILE - 2, '#8a6a3a', 1);
      // Windmill on top.
      rect(ctx, cx - 0.8, py - 14, 1.6, 8, '#6b4a2b');
      const a = env.clock * (env.rainy ? 3 : 1.6);
      for (let i = 0; i < 4; i++) {
        const an = a + i * Math.PI / 2;
        poly(ctx, [cx, py - 14, cx + Math.cos(an) * 9, py - 14 + Math.sin(an) * 9, cx + Math.cos(an + 0.35) * 8, py - 14 + Math.sin(an + 0.35) * 8], '#e8dcc0');
      }
      circle(ctx, cx, py - 14, 1.2, '#5a3a1e');
      // Sacks outside.
      ellipse(ctx, px + 4, py + TILE - 3, 2.5, 2, '#d8c090'); ellipse(ctx, px + 8, py + TILE - 2.5, 2.5, 2, '#c8b080');
      return;
    }
    case 'tavern': {
      groundShadow(ctx, cx + 2, bottom + 1, 15, 4);
      wallBox(ctx, px + 1, py + 2, TILE - 2, TILE - 4, '#e0cfae');
      timberFrame(ctx, px + 1, py + 2, TILE - 2, 9, '#5a3a1e');
      rect(ctx, px + 1, py + 11, TILE - 2, 1.5, '#5a3a1e');
      roofShingles(ctx, px - 3, py + 3, px + TILE + 3, py + 3, cx, py - 10, snow ? '#e9edf0' : '#4a2a1a');
      chimney(ctx, px + 4, py - 5);
      door(ctx, cx - 3, py + TILE - 10, 6, 8);
      window_(ctx, px + 4, py + 5, 4, 4, o); window_(ctx, px + TILE - 8, py + 5, 4, 4, o);
      window_(ctx, px + 4, py + 14, 4, 4, o); window_(ctx, px + TILE - 8, py + 14, 4, 4, o);
      // Swinging sign with a mug.
      const sw = Math.sin(env.clock * 2.2 + 1) * 1.5;
      rect(ctx, px + TILE - 2, py + 9, 6, 1.2, '#3a2a1a');
      rect(ctx, px + TILE + 1 + sw * 0.3, py + 10, 5, 5, '#8a5a2a'); rect(ctx, px + TILE + 2.2 + sw * 0.3, py + 11, 2.6, 3, '#e0c060');
      // Lantern by the door at night, and light spilling out of the open door.
      if (o.lit) { circle(ctx, cx + 5, py + TILE - 10, 1.4, '#ffd070'); rect(ctx, cx - 2.5, py + TILE - 9.5, 5, 7, 'rgba(255,200,110,0.55)'); }
      return;
    }
    case 'blacksmith': {
      groundShadow(ctx, cx + 2, bottom + 1, 14, 4);
      wallBox(ctx, px + 2, py + 5, TILE - 4, TILE - 7, '#5a5a5e', true);
      roofShingles(ctx, px - 1, py + 6, px + TILE + 1, py + 6, cx, py - 3, snow ? '#e9edf0' : '#3a3a40');
      chimney(ctx, px + TILE - 8, py - 1);
      // Open forge: glowing arch.
      const pulse = 0.6 + 0.4 * Math.sin(env.clock * 5 + v * 4);
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(cx - 3, py + TILE - 3, 5, Math.PI, 0); ctx.fill();
      ctx.fillStyle = `rgba(255,${120 + 60 * pulse},40,${0.75 + 0.25 * pulse})`; ctx.beginPath(); ctx.arc(cx - 3, py + TILE - 3, 3.2, Math.PI, 0); ctx.fill();
      // Anvil.
      rect(ctx, px + TILE - 9, py + TILE - 7, 6, 2, '#2a2a2a'); rect(ctx, px + TILE - 7, py + TILE - 5, 2, 3, '#2a2a2a'); rect(ctx, px + TILE - 10, py + TILE - 8, 8, 1.5, '#4a4a50');
      return;
    }
    case 'market': {
      groundShadow(ctx, cx, bottom + 1, 14, 4);
      // Two stalls with striped awnings.
      for (let k = 0; k < 2; k++) {
        const sx = px + 1 + k * 12;
        rect(ctx, sx, py + 10, 11, 10, '#a8824c');
        rect(ctx, sx + 1, py + 11, 9, 1.2, '#c9a062');
        rect(ctx, sx, py + 6, 1.2, 14, '#6b4a2b'); rect(ctx, sx + 9.8, py + 6, 1.2, 14, '#6b4a2b');
        ctx.fillStyle = k ? '#d04040' : '#3a7ac0'; ctx.beginPath(); ctx.moveTo(sx - 1, py + 7); ctx.lineTo(sx + 12, py + 7); ctx.lineTo(sx + 11, py + 2); ctx.lineTo(sx, py + 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f4f0e6'; for (let i = 0; i < 3; i++) ctx.fillRect(sx + 1 + i * 4, py + 2.5, 2, 4.5);
        // Goods.
        circle(ctx, sx + 3, py + 9.5, 1.4, k ? '#f06a4f' : '#f7d94c'); circle(ctx, sx + 6, py + 9.5, 1.4, k ? '#8fcf7a' : '#e08a40'); circle(ctx, sx + 8.5, py + 9.5, 1.4, k ? '#f7d94c' : '#d83a4a');
      }
      // Barrel and crate.
      roundRect(ctx, px + 3, py + TILE - 5, 4, 4.5, 1, '#8a5a2a'); line(ctx, px + 3, py + TILE - 3, px + 7, py + TILE - 3, '#3a2a1a', 0.8);
      rect(ctx, px + TILE - 8, py + TILE - 5, 5, 4.5, '#b08a52'); line(ctx, px + TILE - 8, py + TILE - 5, px + TILE - 3, py + TILE - 0.5, '#6b4a2b', 0.8);
      return;
    }
    case 'mine': {
      // Hill with a timbered shaft entrance and a cart on rails.
      ellipse(ctx, cx, cy + 4, 13, 9, '#6a6256'); ellipse(ctx, cx - 2, cy + 1, 10, 6, '#7d7466');
      if (snow) ellipse(ctx, cx - 2, cy - 2, 8, 3, '#f4f7f9');
      rect(ctx, cx - 6, cy - 1, 12, 11, '#1a1410');
      rect(ctx, cx - 7, cy - 3, 14, 2.5, '#8a6a3a'); rect(ctx, cx - 7, cy - 3, 2, 13, '#8a6a3a'); rect(ctx, cx + 5, cy - 3, 2, 13, '#8a6a3a');
      line(ctx, cx - 3, cy + 10, px + 2, py + TILE, '#5a5a5a', 1); line(ctx, cx + 3, cy + 10, px + 8, py + TILE, '#5a5a5a', 1);
      const cart = (env.clock * 0.5 + v) % 1;
      const kx = cx - 1 - cart * 8, ky = cy + 4 + cart * 6;
      rect(ctx, kx - 3, ky, 6, 3.5, '#4a3a2a'); rect(ctx, kx - 2, ky - 1.5, 4, 1.5, '#8a8a9a'); circle(ctx, kx - 2, ky + 4, 1, '#222'); circle(ctx, kx + 2, ky + 4, 1, '#222');
      if (o.lit || env.dark > 0.2) circle(ctx, cx, cy - 1, 1.2, '#ffc050');
      return;
    }
    case 'chapel': {
      groundShadow(ctx, cx + 2, bottom + 1, 14, 4);
      wallBox(ctx, px + 3, py + 4, TILE - 6, TILE - 6, '#e8e0d0', true);
      roofShingles(ctx, px + 1, py + 5, px + TILE - 1, py + 5, cx, py - 4, snow ? '#e9edf0' : '#6a5a8a');
      // Steeple with bell.
      rect(ctx, cx - 3, py - 13, 6, 10, '#e8e0d0'); poly(ctx, [cx - 4, py - 13, cx, py - 20, cx + 4, py - 13], snow ? '#e9edf0' : '#6a5a8a');
      rect(ctx, cx - 1.5, py - 11, 3, 4, '#2a2a3a');
      const swing = env.bell ? Math.sin(env.clock * 9) * 2.2 : Math.sin(env.clock * 3) * 0.6;
      circle(ctx, cx + swing, py - 9, 1.1, '#e0c060');
      rect(ctx, cx - 0.5, py - 24, 1, 5, '#f0e060'); rect(ctx, cx - 2, py - 22.5, 4, 1, '#f0e060');
      // Arched stained windows.
      for (const wx of [px + 6, px + TILE - 9]) {
        ctx.fillStyle = '#4a3a5a'; ctx.beginPath(); ctx.roundRect(wx - 0.8, py + 8, 4.6, 8.5, [2, 2, 0, 0]); ctx.fill();
        ctx.fillStyle = o.lit ? '#ffb060' : '#4a6a9a'; ctx.beginPath(); ctx.roundRect(wx, py + 9, 3, 7, [1.5, 1.5, 0, 0]); ctx.fill();
        if (o.lit) { rect(ctx, wx, py + 12, 3, 1.5, '#d04060'); rect(ctx, wx, py + 14, 3, 1.5, '#4060d0'); }
      }
      door(ctx, cx - 2.5, py + TILE - 9, 5, 7, '#5a3a1e');
      return;
    }
    case 'guildHall': {
      groundShadow(ctx, cx + 2, bottom + 1, 15, 4);
      wallBox(ctx, px + 1, py + 2, TILE - 2, TILE - 4, '#7a4a7a', true);
      roofShingles(ctx, px - 2, py + 3, px + TILE + 2, py + 3, cx, py - 9, snow ? '#e9edf0' : '#3a2a4a');
      chimney(ctx, px + 4, py - 4);
      door(ctx, cx - 3.5, py + TILE - 11, 7, 9, '#3a2a1a');
      window_(ctx, px + 4, py + 6, 4, 4, o, '#ffe090'); window_(ctx, px + TILE - 8, py + 6, 4, 4, o, '#ffe090');
      // Crossed swords sign and banner.
      line(ctx, cx - 4, py + 15, cx + 4, py + 19, '#d0d0d8', 1.2); line(ctx, cx + 4, py + 15, cx - 4, py + 19, '#d0d0d8', 1.2);
      flag(ctx, px + TILE - 3, py - 8, 12, '#8a3ad0', env, 8);
      return;
    }
    case 'walls': {
      groundShadow(ctx, cx + 1, bottom + 1, 9, 3);
      wallBox(ctx, px + 5, py - 2, TILE - 10, TILE, '#9a9a96', true);
      rect(ctx, px + 4, py - 3, TILE - 8, 2, '#7a7a76');
      for (let i = 0; i < 3; i++) rect(ctx, px + 5 + i * 5, py - 7, 3, 5, '#8a8a86');
      rect(ctx, cx - 1.2, py + 6, 2.4, 5, '#1a1a1a');
      door(ctx, cx - 2, py + TILE - 8, 4, 6, '#3a2a1a');
      torch(ctx, px + TILE - 4, py + 2, env);
      flag(ctx, px + 6, py - 6, 6, '#d04040', env, 5);
      if (snow) rect(ctx, px + 4, py - 4, TILE - 8, 1.5, '#f4f7f9');
      return;
    }
    case 'keep': {
      groundShadow(ctx, cx + 2, bottom + 2, 18, 5);
      // Main hall.
      wallBox(ctx, px + 1, py - 2, TILE - 2, TILE, '#8a8a9a', true);
      rect(ctx, px, py - 3, TILE, 2, '#6a6a7a');
      for (let i = 0; i < 4; i++) rect(ctx, px + 2 + i * 6, py - 6, 3, 4, '#7a7a8a');
      // Towers.
      for (const tx of [px - 3, px + TILE - 6]) {
        wallBox(ctx, tx, py - 12, 9, TILE + 10, '#9a9aaa', true);
        poly(ctx, [tx - 1, py - 12, tx + 4.5, py - 22, tx + 10, py - 12], snow ? '#e9edf0' : '#4a4a6a');
        rect(ctx, tx + 3.5, py - 2, 2, 4, o.lit ? '#ffd870' : '#1a1a2a');
      }
      // Gate with portcullis.
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.roundRect(cx - 4, py + 8, 8, 14, [4, 4, 0, 0]); ctx.fill();
      ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 0.8; for (let i = -2; i <= 2; i++) line(ctx, cx + i * 1.8, py + 9, cx + i * 1.8, py + 21, '#6a5a4a', 0.8);
      window_(ctx, cx - 1.5, py + 1, 3, 4, o);
      flag(ctx, cx - 1, py - 8, 14, s.victory ? '#f0d050' : '#d04040', env, 9);
      torch(ctx, px + 1, py + 10, env); torch(ctx, px + TILE - 1, py + 10, env);
      return;
    }
    case 'grave': {
      const tilt = (v - 0.5) * 0.25;
      ctx.save(); ctx.translate(cx, cy + 5); ctx.rotate(tilt);
      ellipse(ctx, 0, 1, 6, 2.5, rgba('#4a3a2a', 0.35));
      ctx.fillStyle = '#9a9a96'; ctx.beginPath(); ctx.roundRect(-4, -10, 8, 11, [4, 4, 0, 0]); ctx.fill();
      ctx.fillStyle = '#7a7a76'; ctx.fillRect(2.5, -10, 1.5, 11);
      rect(ctx, -0.6, -8, 1.2, 5, '#5a5a56'); rect(ctx, -2, -6.5, 4, 1.2, '#5a5a56');
      if (!snow) { circle(ctx, -5, 0, 1.2, '#f7d94c'); circle(ctx, 5.5, 0.5, 1.2, '#f29ac6'); }
      ctx.restore();
      return;
    }
  }
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
  if (env.dark > 0.3) for (const l of lampPosts(s)) out.push({ x: l.x * TILE + 8, y: l.y * TILE - 8, r: 22, color: '#ffc870', flicker: 0.06 });
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

// ---- dungeon entrances --------------------------------------------------------

export function drawDungeonEntrance(ctx: CanvasRenderingContext2D, s: GameState, d: GameState['dungeons'][number], env: Env): void {
  const px = d.x * TILE, py = d.y * TILE;
  const cx = px + TILE / 2, cy = py + TILE / 2;
  if (!d.unlocked) {
    // Overgrown and unremarkable until the town is big enough to notice it.
    ellipse(ctx, cx, cy + 3, 10, 6, rgba('#3a4a2a', 0.35));
    circle(ctx, cx - 4, cy + 1, 3, '#4f8a3a'); circle(ctx, cx + 3, cy + 2, 3.5, '#45803a');
    return;
  }
  if (d.id === 'goblinCave') {
    groundShadow(ctx, cx, cy + 9, 13, 4);
    ellipse(ctx, cx, cy + 3, 13, 9, '#6a5a4a'); ellipse(ctx, cx - 3, cy, 9, 6, '#7d6c5a');
    if (env.season === 'winter') ellipse(ctx, cx - 3, cy - 3, 7, 2.5, '#f4f7f9');
    ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.arc(cx, cy + 5, 6.5, Math.PI, 0); ctx.fill(); ctx.fillRect(cx - 6.5, cy + 5, 13, 6);
    // Bones and a skull on a stake.
    rect(ctx, px + 2, py + TILE - 3, 5, 1.2, '#e8e4d8'); rect(ctx, px + TILE - 7, py + TILE - 2.5, 4, 1.2, '#e8e4d8');
    rect(ctx, px + TILE - 4, cy - 9, 1.2, 12, '#5a3a1e'); circle(ctx, px + TILE - 3.4, cy - 10, 2.4, '#efeadc'); rect(ctx, px + TILE - 4.6, cy - 10.5, 1, 1, '#1a1410'); rect(ctx, px + TILE - 2.8, cy - 10.5, 1, 1, '#1a1410');
    if (env.dark > 0.3) { const g = 0.5 + 0.5 * Math.sin(env.clock * 3); rect(ctx, cx - 2.5, cy + 6, 1.2, 1.2, `rgba(255,220,60,${g})`); rect(ctx, cx + 1.5, cy + 6, 1.2, 1.2, `rgba(255,220,60,${g})`); }
  } else if (d.id === 'ancientRuins') {
    groundShadow(ctx, cx, cy + 10, 13, 3.5);
    rect(ctx, px - 1, py + TILE - 6, TILE + 2, 4, '#8a8a9a'); rect(ctx, px - 1, py + TILE - 6, TILE + 2, 1, '#a8a8b8');
    // Broken columns and a cracked arch.
    for (const [x, h] of [[px + 2, 14], [px + 8, 20], [px + TILE - 6, 11]] as [number, number][]) {
      rect(ctx, x, py + TILE - 6 - h, 4, h, '#9a9aaa'); rect(ctx, x, py + TILE - 6 - h, 1.2, h, '#b8b8c8'); rect(ctx, x - 0.8, py + TILE - 6 - h, 5.6, 1.5, '#8a8a9a');
      circle(ctx, x + 2, py + TILE - 7 - h * 0.4, 2.2, rgba('#4f9a3f', 0.8));
    }
    poly(ctx, [px + 12, py + TILE - 6, px + 12, py + 2, px + 15, py - 2, px + 19, py - 1, px + 20, py + TILE - 6, px + 17, py + TILE - 6, px + 17, py + 3, px + 15, py + 4, px + 15, py + TILE - 6], '#8a8a9a');
    rect(ctx, px + 15, py + 4, 2, 14, '#1a1a2a');
    circle(ctx, px + 20, py + TILE - 6, 2.5, '#5f9a3a');
    if (env.dark > 0.3) { const g = 0.4 + 0.4 * Math.sin(env.clock * 2); circle(ctx, px + 16, py + 10, 1.3, `rgba(120,220,160,${g})`); }
  } else {
    // Dark tower: tall spire, bats, a pulsing purple glow (gold once the Demon Lord is dead).
    const col = s.victory ? '#f0d050' : '#a040e0';
    const pulse = 0.5 + 0.5 * Math.sin(env.clock * 2);
    groundShadow(ctx, cx, cy + 10, 11, 4, 0.35);
    rect(ctx, cx - 7, cy - 18, 14, 28, '#2a1a3a'); rect(ctx, cx - 7, cy - 18, 2, 28, '#3a2a4a');
    rect(ctx, cx - 9, cy - 22, 18, 5, '#3a2a4a'); for (let i = 0; i < 4; i++) rect(ctx, cx - 9 + i * 5, cy - 26, 3, 4, '#3a2a4a');
    poly(ctx, [cx - 4, cy - 26, cx, cy - 38, cx + 4, cy - 26], '#1f1230');
    for (const wy of [cy - 14, cy - 6, cy + 2]) { rect(ctx, cx - 1.5, wy, 3, 4, s.victory ? '#f0d050' : `rgba(${160 + 60 * pulse},60,${220},1)`); }
    ctx.fillStyle = '#0d0810'; ctx.beginPath(); ctx.roundRect(cx - 3, cy + 3, 6, 8, [3, 3, 0, 0]); ctx.fill();
    if (!s.victory) for (let i = 0; i < 3; i++) {
      const a = env.clock * 1.5 + i * 2.1, bx = cx + Math.cos(a) * (12 + i * 3), by = cy - 28 + Math.sin(a * 1.7) * 6;
      const fl = Math.sin(env.clock * 14 + i) * 2;
      poly(ctx, [bx - 3, by - fl, bx, by + 1, bx + 3, by - fl, bx, by - 1], '#1a1020');
    }
    if (s.victory) circle(ctx, cx, cy - 40, 2, '#f0d050');
    void col;
  }
  if (d.bossDefeated) { rect(ctx, px + TILE - 2, cy - 16, 1.2, 12, '#5a3a1e'); poly(ctx, [px + TILE - 1, cy - 16, px + TILE + 6, cy - 14.5 + Math.sin(env.clock * 6) * 1, px + TILE - 1, cy - 12], '#f0d050'); }
}
