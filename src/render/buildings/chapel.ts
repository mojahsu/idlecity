// chapel: drawn in its tile; the shared pieces live in shared.ts.
import { TILE } from '../constants';
import { circle, poly, rect, roundRect, groundShadow } from '../palette';
import type { BuildingArt } from './shared';
import { roofShingles, wallBox, door } from './shared';

export function drawChapel(art: BuildingArt): void {
  const { ctx, env, px, py, cx, bottom, o, snow } = art;
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
}
