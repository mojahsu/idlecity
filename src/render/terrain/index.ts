// Terrain: a cached static ground layer (grass, roads, water, rocks, bushes)
// plus per-frame animated water and trees. The static layer is re-rendered
// only when the terrain, the season, the weather or the display scale changes.
import type { GameState } from '../../sim/types';
import { TILE } from '../constants';
import { PALETTE, ellipse, hash, rgba, type Env } from '../palette';
import { drawGrassDetail } from './grass';
import { drawRoad } from './road';
import { drawWaterBase } from './water';
import { drawRock, drawGlints } from './rock';
import { drawBush, drawStump } from './bush';
import { drawSprite, drawTilePart, drawTileRect, townSprites } from '../sprites';
import { GROUND, PROP, TREES } from '../spriteMap';
export { drawWater } from './water';
export { drawTree, drawTreeShadows, treeFoot } from './trees';

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
    return `${env.season}|${env.rainy ? 'wet' : 'dry'}|${scale.toFixed(3)}|${townSprites() ? 'spr' : 'proc'}|${h}`;
  }

  private renderStatic(s: GameState, env: Env, scale: number): void {
    const W = s.width * TILE, H = s.height * TILE;
    const bw = Math.max(1, Math.round(W * scale)), bh = Math.max(1, Math.round(H * scale));
    if (this.canvas.width !== bw || this.canvas.height !== bh) { this.canvas.width = bw; this.canvas.height = bh; }
    const ctx = this.canvas.getContext('2d')!;
    ctx.setTransform(bw / W, 0, 0, bh / H, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (townSprites()) { renderSpriteGround(ctx, s, env); return; }
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
      if (t.terrain === 'road') drawRoad(ctx, s, x, y, pal.dirt, pal.dirtEdge, env);
    }
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
      const t = s.tiles[y * s.width + x];
      if (t.terrain === 'water') drawWaterBase(ctx, s, x, y, env);
    }
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
      const t = s.tiles[y * s.width + x];
      const px = x * TILE, py = y * TILE;
      switch (t.terrain) {
        case 'grass': drawGrassDetail(ctx, x, y, px, py, env); break;
        case 'forest': if (t.amount < 1) drawStump(ctx, px, py, t); else drawGrassDetail(ctx, x, y, px, py, env, true); break;
        case 'rock': drawRock(ctx, px, py, t, env, '#9a9a96', '#6e6e6a', '#b9b9b4'); break;
        case 'ore': drawRock(ctx, px, py, t, env, '#5c5c6a', '#3a3a48', '#7a7a8c'); if (t.amount >= 1) drawGlints(ctx, px, py, t); break;
        case 'bush': drawBush(ctx, px, py, t, env); break;
      }
    }
  }
}

/** The ground from Tiny Town tiles: grass with the odd flower, dirt roads with grass fringes, cobbles round the square. */
function renderSpriteGround(ctx: CanvasRenderingContext2D, s: GameState, env: Env): void {
  const autumn = env.season === 'autumn';
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
    const t = s.tiles[y * s.width + x];
    const px = x * TILE, py = y * TILE;
    if (t.terrain === 'water') { drawWaterBase(ctx, s, x, y, env); continue; }
    const n = hash(x, y, 1);
    drawTileRect(ctx, n > 0.93 ? GROUND.grassFlowers : n > 0.82 ? GROUND.grassTuft : GROUND.grass, px, py, TILE, TILE);
    switch (t.terrain) {
      case 'road': drawSpriteRoad(ctx, s, x, y); break;
      case 'forest': if (t.amount < 1) drawStump(ctx, px, py, t); break;
      case 'rock': drawRock(ctx, px, py, t, env, '#9a9a96', '#6e6e6a', '#b9b9b4'); break;
      case 'ore':
        drawRock(ctx, px, py, t, env, '#5c5c6a', '#3a3a48', '#7a7a8c');
        if (t.amount >= 1) drawGlints(ctx, px, py, t);
        break;
      case 'bush':
        if (t.amount >= 1) {
          drawSprite(ctx, TREES.round.green, px + TILE / 2, py + TILE - 2, TILE * 0.78, autumn ? { tint: '#d87828', tintA: 0.42 } : {});
          if (t.amount >= 5 && !autumn) for (let i = 0; i < 3; i++) { ctx.fillStyle = '#d83a4a'; ctx.fillRect(px + 7 + i * 3.5 + hash(x, y, 20 + i) * 2, py + 10 + hash(x, y, 30 + i) * 4, 2, 2); }
        } else drawSprite(ctx, PROP.mushroom, px + TILE / 2, py + TILE - 3, TILE * 0.58);
        break;
    }
  }
  // Season and weather, washed over every tile but the water.
  const wash = env.season === 'winter' ? 'rgba(236,241,248,0.62)' : autumn ? 'rgba(214,140,50,0.17)' : env.season === 'summer' ? 'rgba(255,224,120,0.07)' : null;
  const wet = env.rainy ? 'rgba(50,70,110,0.14)' : null;
  for (const c of [wash, wet]) {
    if (!c) continue;
    ctx.fillStyle = c;
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) if (s.tiles[y * s.width + x].terrain !== 'water') ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  }
}

function drawSpriteRoad(ctx: CanvasRenderingContext2D, s: GameState, x: number, y: number): void {
  const px = x * TILE, py = y * TILE;
  const isRoad = (dx: number, dy: number) => { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= s.width || ny >= s.height) return true; return s.tiles[ny * s.width + nx].terrain === 'road'; };
  const cobble = Math.hypot(x - s.center.x, y - s.center.y) < 7.5 && (x + y) % 2 === 0;
  drawTileRect(ctx, cobble ? GROUND.cobble : GROUND.dirt.c, px, py, TILE, TILE);
  // Grass fringes on the sides with no road neighbour, cut from the 3x3 patch's edges and corners.
  const e = 4, k = TILE / 16, ek = e * k;
  const up = !isRoad(0, -1), down = !isRoad(0, 1), left = !isRoad(-1, 0), right = !isRoad(1, 0);
  if (up) drawTilePart(ctx, GROUND.dirt.t, 0, 0, 16, e, px, py, TILE, ek);
  if (down) drawTilePart(ctx, GROUND.dirt.b, 0, 16 - e, 16, e, px, py + TILE - ek, TILE, ek);
  if (left) drawTilePart(ctx, GROUND.dirt.l, 0, 0, e, 16, px, py, ek, TILE);
  if (right) drawTilePart(ctx, GROUND.dirt.r, 16 - e, 0, e, 16, px + TILE - ek, py, ek, TILE);
  if (up && left) drawTilePart(ctx, GROUND.dirt.tl, 0, 0, e, e, px, py, ek, ek);
  if (up && right) drawTilePart(ctx, GROUND.dirt.tr, 16 - e, 0, e, e, px + TILE - ek, py, ek, ek);
  if (down && left) drawTilePart(ctx, GROUND.dirt.bl, 0, 16 - e, e, e, px, py + TILE - ek, ek, ek);
  if (down && right) drawTilePart(ctx, GROUND.dirt.br, 16 - e, 16 - e, e, e, px + TILE - ek, py + TILE - ek, ek, ek);
}
