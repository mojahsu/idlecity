// Ancient ruins entrance: broken columns and a cracked arch, overgrown.
import { TILE } from '../constants';
import { circle, poly, rect, groundShadow, rgba } from '../palette';
import type { DungeonArt } from './shared';

export function drawAncientRuins(art: DungeonArt): void {
  const { ctx, env, px, py, cx, cy } = art;
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
}
