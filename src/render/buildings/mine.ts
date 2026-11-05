// mine: drawn in its tile; the shared pieces live in shared.ts.
import { TILE } from '../constants';
import { circle, ellipse, rect, line } from '../palette';
import type { BuildingArt } from './shared';

export function drawMine(art: BuildingArt): void {
  const { ctx, env, px, py, cx, cy, o, snow, v } = art;
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
}
