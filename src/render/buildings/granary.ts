// granary: drawn in its tile; the shared pieces live in shared.ts.
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, line, groundShadow, rgba } from '../palette';
import type { BuildingArt } from './shared';
import { roofShingles, wallBox, door } from './shared';

export function drawGranary(art: BuildingArt): void {
  const { ctx, env, px, py, cx, bottom, snow } = art;
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
}
