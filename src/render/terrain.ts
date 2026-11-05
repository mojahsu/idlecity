// Terrain: a cached static ground layer (grass, roads, water, rocks, bushes)
// plus per-frame animated trees and water. The static layer is re-rendered
// only when the terrain, the season or the display scale changes.
import type { GameState, Tile } from '../sim/types';
import { TILE } from './constants';
import { PALETTE, hash, circle, ellipse, poly, rect, groundShadow, shade, rgba, type Env } from './palette';

const TERRAIN_CODE: Record<string, number> = { grass: 1, forest: 2, rock: 3, bush: 4, ore: 5, water: 6, road: 7 };

export class TerrainLayer {
  private canvas = document.createElement('canvas');
  private stamp = '';

  /** Draw the ground to `ctx`, refreshing the cache when needed. */
  draw(ctx: CanvasRenderingContext2D, s: GameState, env: Env, scale: number): void {
    const stamp = this.computeStamp(s, env, scale);
    if (stamp !== this.stamp) { this.stamp = stamp; this.renderStatic(s, env, scale); }
    ctx.drawImage(this.canvas, 0, 0, s.width * TILE, s.height * TILE);
  }

  private computeStamp(s: GameState, env: Env, scale: number): string {
    let h = 0;
    for (let i = 0; i < s.tiles.length; i++) {
      const t = s.tiles[i];
      const code = TERRAIN_CODE[t.terrain];
      const amt = t.terrain === 'rock' || t.terrain === 'ore' ? Math.floor(t.amount / 10) : t.terrain === 'forest' ? (t.amount < 1 ? 0 : 1) : t.terrain === 'bush' ? (t.amount >= 5 ? 2 : t.amount < 1 ? 0 : 1) : 0;
      h = (h * 31 + code * 8 + amt) | 0;
    }
    return `${env.season}|${scale.toFixed(3)}|${h}`;
  }

  private renderStatic(s: GameState, env: Env, scale: number): void {
    const W = s.width * TILE, H = s.height * TILE;
    const bw = Math.max(1, Math.round(W * scale)), bh = Math.max(1, Math.round(H * scale));
    if (this.canvas.width !== bw || this.canvas.height !== bh) { this.canvas.width = bw; this.canvas.height = bh; }
    const ctx = this.canvas.getContext('2d')!;
    ctx.setTransform(bw / W, 0, 0, bh / H, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const pal = PALETTE[env.season];

    // Base grass with soft blotches.
    ctx.fillStyle = pal.grass; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
      const t = s.tiles[y * s.width + x];
      if (t.terrain === 'water') continue;
      const px = x * TILE, py = y * TILE;
      const n = hash(x, y, 1);
      if (n > 0.55) ellipse(ctx, px + TILE / 2 + (n - 0.5) * 10, py + TILE / 2 + hash(x, y, 2) * 8 - 4, TILE * 0.8, TILE * 0.5, rgba(n > 0.8 ? pal.grassDark : pal.grassAlt, 0.5));
    }
    // Dirt under roads and around buildings, water, then details.
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
      const t = s.tiles[y * s.width + x];
      if (t.terrain === 'road') this.drawRoad(ctx, s, x, y, pal.dirt, pal.dirtEdge);
    }
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
      const t = s.tiles[y * s.width + x];
      if (t.terrain === 'water') this.drawWaterBase(ctx, s, x, y, env);
    }
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
      const t = s.tiles[y * s.width + x];
      const px = x * TILE, py = y * TILE;
      switch (t.terrain) {
        case 'grass': this.drawGrassDetail(ctx, x, y, px, py, env); break;
        case 'forest': if (t.amount < 1) this.drawStump(ctx, px, py, t); else this.drawGrassDetail(ctx, x, y, px, py, env, true); break;
        case 'rock': this.drawRock(ctx, px, py, t, env, '#9a9a96', '#6e6e6a', '#b9b9b4'); break;
        case 'ore': this.drawRock(ctx, px, py, t, env, '#5c5c6a', '#3a3a48', '#7a7a8c'); if (t.amount >= 1) this.drawGlints(ctx, px, py, t); break;
        case 'bush': this.drawBush(ctx, px, py, t, env); break;
      }
    }
  }

  private drawGrassDetail(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, env: Env, underTree = false): void {
    const pal = PALETTE[env.season];
    const n = hash(x, y, 3);
    if (env.season === 'winter') {
      if (n > 0.7) ellipse(ctx, px + 6 + n * 10, py + 8 + hash(x, y, 4) * 8, 5, 2.5, '#f2f5f7');
      return;
    }
    // Grass tufts.
    if (n > 0.35) {
      const tx = px + 4 + hash(x, y, 5) * 16, ty = py + 6 + hash(x, y, 6) * 14;
      ctx.strokeStyle = pal.tuft; ctx.lineWidth = 1;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(tx + i * 1.5, ty); ctx.lineTo(tx + i * 2.5, ty - 4 - Math.abs(i)); ctx.stroke(); }
    }
    // Flowers.
    if (!underTree && pal.flowers.length && n > 0.86) {
      const c = pal.flowers[Math.floor(hash(x, y, 7) * pal.flowers.length)];
      for (let i = 0; i < 3; i++) {
        const fx = px + 4 + hash(x + i, y, 8) * 16, fy = py + 4 + hash(x, y + i, 9) * 16;
        circle(ctx, fx, fy, 1.3, c); circle(ctx, fx, fy, 0.5, '#f7d94c');
      }
    }
    // Small pebbles.
    if (n < 0.08) { circle(ctx, px + 8 + n * 80, py + 14, 1.5, '#9c9a90'); circle(ctx, px + 11 + n * 80, py + 15.5, 1, '#b5b2a6'); }
  }

  private drawRoad(ctx: CanvasRenderingContext2D, s: GameState, x: number, y: number, dirt: string, edge: string): void {
    const px = x * TILE, py = y * TILE;
    const isRoad = (dx: number, dy: number) => { const t = s.tiles[(y + dy) * s.width + (x + dx)]; return !!t && (t.terrain === 'road') && x + dx >= 0 && x + dx < s.width; };
    const half = TILE / 2, w = 8;
    // Edge (darker) then fill: a rounded cross connecting to road neighbours.
    for (const [c, inset] of [[edge, 0], [dirt, 1.5]] as [string, number][]) {
      ctx.fillStyle = c; ctx.beginPath();
      ctx.roundRect(px + half - w + inset, py + half - w + inset, 2 * (w - inset), 2 * (w - inset), 4);
      if (isRoad(-1, 0)) ctx.rect(px, py + half - w + inset, half, 2 * (w - inset));
      if (isRoad(1, 0)) ctx.rect(px + half, py + half - w + inset, half, 2 * (w - inset));
      if (isRoad(0, -1)) ctx.rect(px + half - w + inset, py, 2 * (w - inset), half);
      if (isRoad(0, 1)) ctx.rect(px + half - w + inset, py + half, 2 * (w - inset), half);
      ctx.fill();
    }
    // Wheel ruts and pebbles.
    const n = hash(x, y, 11);
    ctx.strokeStyle = rgba(edge, 0.5); ctx.lineWidth = 1;
    if (isRoad(-1, 0) || isRoad(1, 0)) { ctx.beginPath(); ctx.moveTo(px, py + half - 3); ctx.lineTo(px + TILE, py + half - 3); ctx.moveTo(px, py + half + 3); ctx.lineTo(px + TILE, py + half + 3); ctx.stroke(); }
    if (n > 0.6) circle(ctx, px + 6 + n * 12, py + 6 + hash(x, y, 12) * 12, 1.2, shade(dirt, -0.25));
  }

  private drawWaterBase(ctx: CanvasRenderingContext2D, s: GameState, x: number, y: number, env: Env): void {
    const pal = PALETTE[env.season];
    const px = x * TILE, py = y * TILE;
    const land = (dx: number, dy: number) => { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= s.width || ny >= s.height) return false; return s.tiles[ny * s.width + nx].terrain !== 'water'; };
    // Bank (sand) drawn on the neighbouring land side.
    ctx.fillStyle = pal.bank;
    if (land(1, 0)) ctx.fillRect(px + TILE, py, 4, TILE);
    if (land(-1, 0)) ctx.fillRect(px - 4, py, 4, TILE);
    if (land(0, 1)) ctx.fillRect(px, py + TILE, TILE, 4);
    if (land(0, -1)) ctx.fillRect(px, py - 4, TILE, 4);
    const deep = !land(1, 0) && !land(-1, 0);
    ctx.fillStyle = deep ? pal.waterDeep : pal.water;
    ctx.fillRect(px, py, TILE, TILE);
    if (land(1, 0)) rect(ctx, px + TILE - 3, py, 3, TILE, rgba('#ffffff', 0.18));
    if (land(-1, 0)) rect(ctx, px, py, 3, TILE, rgba('#ffffff', 0.18));
    // Reeds on the bank.
    if (hash(x, y, 13) > 0.65 && land(1, 0) && env.season !== 'winter') {
      const rx = px + TILE + 1, ry = py + 6 + hash(x, y, 14) * 12;
      ctx.strokeStyle = '#5f8f3a'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(rx + i * 2, ry + 6); ctx.lineTo(rx + i * 2 + 1, ry - 4 - i); ctx.stroke(); }
      rect(ctx, rx + 2, ry - 6, 2, 4, '#7a5a3a');
    }
  }

  private drawStump(ctx: CanvasRenderingContext2D, px: number, py: number, t: Tile): void {
    const cx = px + TILE / 2 + (t.v - 0.5) * 4, cy = py + TILE / 2 + 2;
    groundShadow(ctx, cx + 1, cy + 3, 5, 2.5, 0.15);
    ellipse(ctx, cx, cy + 1, 4.5, 2.5, '#6b4a2b');
    ellipse(ctx, cx, cy - 1, 4.5, 2.5, '#a8814f');
    ellipse(ctx, cx, cy - 1, 2.5, 1.3, '#c9a56c');
  }

  private drawRock(ctx: CanvasRenderingContext2D, px: number, py: number, t: Tile, env: Env, mid: string, dark: string, light: string): void {
    const cx = px + TILE / 2 + (t.v - 0.5) * 3, cy = py + TILE / 2 + 4;
    if (t.amount < 1) {
      for (let i = 0; i < 4; i++) circle(ctx, cx - 6 + i * 4 + hash(px, py, i) * 2, cy + 2 + hash(py, px, i) * 3, 1.6, i % 2 ? mid : dark);
      return;
    }
    const size = 0.55 + 0.45 * Math.min(1, t.amount / 40);
    groundShadow(ctx, cx + 2, cy + 6, 10 * size, 3.5, 0.22);
    poly(ctx, [cx - 10 * size, cy + 6, cx - 7 * size, cy - 4 * size, cx - 2 * size, cy - 9 * size, cx + 4 * size, cy - 7 * size, cx + 10 * size, cy + 6], dark);
    poly(ctx, [cx - 8 * size, cy + 6, cx - 5 * size, cy - 2 * size, cx - 1 * size, cy - 7 * size, cx + 3 * size, cy - 5 * size, cx + 6 * size, cy + 6], mid);
    poly(ctx, [cx - 4 * size, cy - 2 * size, cx - 1 * size, cy - 6 * size, cx + 2 * size, cy - 4.5 * size, cx, cy - 1 * size], light);
    // A smaller companion stone.
    poly(ctx, [cx + 6 * size, cy + 6, cx + 8 * size, cy + 1, cx + 12 * size, cy + 2, cx + 13 * size, cy + 6], mid);
    if (env.season === 'winter') { ellipse(ctx, cx - 1 * size, cy - 6 * size, 5 * size, 2, '#f4f7f9'); }
  }

  private drawGlints(ctx: CanvasRenderingContext2D, px: number, py: number, t: Tile): void {
    for (let i = 0; i < 4; i++) {
      const gx = px + 6 + ((t.v * 97 + i * 37) % 12), gy = py + 7 + ((t.v * 61 + i * 23) % 10);
      rect(ctx, gx, gy, 2, 2, '#d8e2ff'); rect(ctx, gx, gy, 1, 1, '#ffffff');
    }
  }

  private drawBush(ctx: CanvasRenderingContext2D, px: number, py: number, t: Tile, env: Env): void {
    const pal = PALETTE[env.season];
    const cx = px + TILE / 2 + (t.v - 0.5) * 4, cy = py + TILE / 2 + 3;
    if (t.amount < 1) {
      ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx, cy + 4); ctx.lineTo(cx + i * 3, cy - 4 - Math.abs(i)); ctx.stroke(); }
      return;
    }
    groundShadow(ctx, cx + 1, cy + 5, 8, 3, 0.18);
    const base = pal.bush;
    circle(ctx, cx - 4, cy + 1, 5.5, shade(base, -0.2));
    circle(ctx, cx + 4, cy + 1, 5.5, shade(base, -0.2));
    circle(ctx, cx, cy - 3, 6, shade(base, -0.1));
    circle(ctx, cx - 3, cy - 1, 4.5, base);
    circle(ctx, cx + 3, cy - 1, 4.5, base);
    circle(ctx, cx - 1, cy - 4, 3.5, shade(base, 0.2));
    if (t.amount >= 5 && env.season !== 'winter') {
      const berry = env.season === 'autumn' ? '#8a2a4a' : '#d83a4a';
      for (let i = 0; i < 5; i++) { const bx = cx - 5 + hash(px, py, 20 + i) * 10, by = cy - 5 + hash(py, px, 30 + i) * 8; circle(ctx, bx, by, 1.3, berry); circle(ctx, bx - 0.4, by - 0.4, 0.5, '#ffb0b8'); }
    }
    if (env.season === 'winter') ellipse(ctx, cx, cy - 5, 5, 2, '#f4f7f9');
  }
}

/** Animated layer: water ripples and swaying trees (sorted into the scene by y). */
export function drawWater(ctx: CanvasRenderingContext2D, s: GameState, env: Env): void {
  const c = env.clock;
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
    const t = s.tiles[y * s.width + x];
    if (t.terrain !== 'water') continue;
    const px = x * TILE, py = y * TILE;
    // Flowing highlights drifting downstream.
    const phase = (c * 0.6 + t.v * 3 + y * 0.35) % 1;
    const o = phase * TILE;
    ctx.strokeStyle = `rgba(255,255,255,${0.12 + 0.18 * Math.sin(phase * Math.PI)})`; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(px + 3, py + o); ctx.quadraticCurveTo(px + 10, py + o - 3, px + 17, py + o); ctx.stroke();
    if (env.dark > 0.4 && hash(x, y, 40) > 0.6) {
      const sp = 0.5 + 0.5 * Math.sin(c * 3 + t.v * 20);
      ctx.fillStyle = `rgba(220,235,255,${0.35 * sp * env.dark})`; ctx.fillRect(px + 6 + t.v * 10, py + 12 + hash(x, y, 41) * 8, 2, 1);
    }
  }
}

export function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, t: Tile, env: Env): void {
  const pal = PALETTE[env.season];
  const size = 0.5 + 0.5 * Math.min(1, t.amount / 40);
  const r = 8.5 * size;
  const sway = Math.sin(env.clock * 1.3 + t.v * 9 + x * 0.5) * (env.rainy ? 1.4 : 0.7);
  const cx = x * TILE + TILE / 2 + (t.v - 0.5) * 5, cy = y * TILE + TILE / 2 + 2;
  const ci = Math.floor(t.v * pal.canopy.length);
  const base = pal.canopy[ci % pal.canopy.length];
  groundShadow(ctx, cx + 3, cy + 7, r * 1.1, r * 0.45, 0.25);
  // Trunk.
  ctx.fillStyle = '#5a3a1e'; ctx.fillRect(cx - 1.6, cy - 1, 3.2, 9 * size);
  ctx.fillStyle = '#7a5230'; ctx.fillRect(cx - 1.6, cy - 1, 1.2, 9 * size);
  // Layered canopy.
  circle(ctx, cx + sway * 0.4 + 1, cy - 2, r, pal.canopyShade);
  circle(ctx, cx + sway * 0.6 - r * 0.45, cy - 1, r * 0.75, base);
  circle(ctx, cx + sway * 0.6 + r * 0.45, cy - 1, r * 0.75, base);
  circle(ctx, cx + sway, cy - r * 0.55, r * 0.85, shade(base, 0.08));
  circle(ctx, cx + sway - r * 0.25, cy - r * 0.85, r * 0.45, shade(base, 0.25));
  if (env.season === 'spring' && t.v > 0.6) {
    for (let i = 0; i < 4; i++) circle(ctx, cx + sway + Math.cos(i * 1.7 + t.v * 6) * r * 0.6, cy - r * 0.5 + Math.sin(i * 2.1 + t.v) * r * 0.5, 1.2, '#f7c6dc');
  }
  if (env.season === 'autumn' && t.v > 0.4) {
    circle(ctx, cx + sway + r * 0.3, cy - r * 0.9, r * 0.35, '#e8c040');
  }
  if (env.season === 'winter') {
    ctx.fillStyle = '#f4f7f9';
    ctx.beginPath(); ctx.arc(cx + sway, cy - r * 0.55, r * 0.85, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + sway - r * 0.45, cy - 1, r * 0.75, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
  }
}
