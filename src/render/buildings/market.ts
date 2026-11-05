// market: drawn in its tile; the shared pieces live in shared.ts.
import { TILE } from '../constants';
import { circle, rect, line, roundRect, groundShadow } from '../palette';
import type { BuildingArt } from './shared';

export function drawMarket(art: BuildingArt): void {
  const { ctx, px, py, cx, bottom, s, env } = art;
  const city = s.tier === 'city';
  groundShadow(ctx, cx, bottom + 1, 14, 4);
  // Two stalls with striped awnings.
  for (let k = 0; k < 2; k++) {
    const sx = px + 1 + k * 12;
    rect(ctx, sx, py + 10, 11, 10, '#a8824c');
    rect(ctx, sx + 1, py + 11, 9, 1.2, '#c9a062');
    rect(ctx, sx, py + 6, 1.2, 14, '#6b4a2b'); rect(ctx, sx + 9.8, py + 6, 1.2, 14, '#6b4a2b');
    ctx.fillStyle = k ? '#d04040' : '#3a7ac0'; ctx.beginPath(); ctx.moveTo(sx - 1, py + 7); ctx.lineTo(sx + 12, py + 7); ctx.lineTo(sx + 11, py + 2); ctx.lineTo(sx, py + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4f0e6'; for (let i = 0; i < 3; i++) ctx.fillRect(sx + 1 + i * 4, py + 2.5, 2, 4.5);
    // Goods.
    circle(ctx, sx + 3, py + 9.5, 1.4, k ? '#f06a4f' : '#f7d94c'); circle(ctx, sx + 6, py + 9.5, 1.4, k ? '#8fcf7a' : '#e08a40'); circle(ctx, sx + 8.5, py + 9.5, 1.4, k ? '#f7d94c' : '#d83a4a');
  }
  // A city market hangs lanterns from the awnings and adds a flower stall out front.
  if (city) {
    for (let k = 0; k < 2; k++) { const lx = px + 6 + k * 12, ly = py + 8 + Math.sin(env.clock * 2 + k) * 0.5; line(ctx, lx, py + 7, lx, ly, '#3a2a1a', 0.8); rect(ctx, lx - 1.5, ly, 3, 3.5, env.dark > 0.35 ? '#ffd070' : '#d84a4a'); }
    rect(ctx, px - 6, py + TILE - 7, 7, 5, '#a8824c'); rect(ctx, px - 6, py + TILE - 7, 7, 1, '#c9a062');
    circle(ctx, px - 4.5, py + TILE - 8.5, 1.3, '#f29ac6'); circle(ctx, px - 2.5, py + TILE - 9, 1.3, '#f7d94c'); circle(ctx, px - 0.5, py + TILE - 8.5, 1.3, '#f06a4f');
  }
  // Barrel and crate.
  roundRect(ctx, px + 3, py + TILE - 5, 4, 4.5, 1, '#8a5a2a'); line(ctx, px + 3, py + TILE - 3, px + 7, py + TILE - 3, '#3a2a1a', 0.8);
  rect(ctx, px + TILE - 8, py + TILE - 5, 5, 4.5, '#b08a52'); line(ctx, px + TILE - 8, py + TILE - 5, px + TILE - 3, py + TILE - 0.5, '#6b4a2b', 0.8);
}
