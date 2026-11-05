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
    return `${env.season}|${env.rainy ? 'wet' : 'dry'}|${scale.toFixed(3)}|${h}`;
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
