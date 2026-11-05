// Rocks and ore with glints.
import type { GameState, Tile } from '../../sim/types';
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, groundShadow, hash, type Env } from '../palette';

export function drawRock(ctx: CanvasRenderingContext2D, px: number, py: number, t: Tile, env: Env, mid: string, dark: string, light: string): void {
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

export function drawGlints(ctx: CanvasRenderingContext2D, px: number, py: number, t: Tile): void {
  for (let i = 0; i < 4; i++) {
    const gx = px + 6 + ((t.v * 97 + i * 37) % 12), gy = py + 7 + ((t.v * 61 + i * 23) % 10);
    rect(ctx, gx, gy, 2, 2, '#d8e2ff'); rect(ctx, gx, gy, 1, 1, '#ffffff');
  }
}
