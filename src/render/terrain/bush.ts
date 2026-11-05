// Berry bushes and felled stumps.
import type { GameState, Tile } from '../../sim/types';
import { TILE } from '../constants';
import { circle, ellipse, groundShadow, shade, hash, PALETTE, type Env } from '../palette';

export function drawBush(ctx: CanvasRenderingContext2D, px: number, py: number, t: Tile, env: Env): void {
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

export function drawStump(ctx: CanvasRenderingContext2D, px: number, py: number, t: Tile): void {
  const cx = px + TILE / 2 + (t.v - 0.5) * 4, cy = py + TILE / 2 + 2;
  groundShadow(ctx, cx + 1, cy + 3, 5, 2.5, 0.15);
  ellipse(ctx, cx, cy + 1, 4.5, 2.5, '#6b4a2b');
  ellipse(ctx, cx, cy - 1, 4.5, 2.5, '#a8814f');
  ellipse(ctx, cx, cy - 1, 2.5, 1.3, '#c9a56c');
}
