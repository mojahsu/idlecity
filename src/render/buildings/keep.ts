// keep: drawn in its tile; the shared pieces live in shared.ts.
import { TILE } from '../constants';
import { poly, rect, line, roundRect, groundShadow } from '../palette';
import type { BuildingArt } from './shared';
import { wallBox, window_, flag, torch } from './shared';

export function drawKeep(art: BuildingArt): void {
  const { ctx, s, env, px, py, cx, bottom, o, snow } = art;
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
}
