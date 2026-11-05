// farm: drawn in its tile; the shared pieces live in shared.ts.
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, line, PALETTE } from '../palette';
import type { BuildingArt } from './shared';
import { drawTileRect, townSprites } from '../sprites';
import { GROUND } from '../spriteMap';

export function drawFarm(art: BuildingArt): void {
  const { ctx, env, px, py, snow, v } = art;
  const pal = PALETTE[env.season];
  // The field: the Tiny Town dirt tile when the sheets are in, else plain soil.
  const spr = townSprites() && drawTileRect(ctx, GROUND.dirt.c, px, py, TILE, TILE, snow ? '#e8ecf2' : null, 0.6);
  if (!spr) rect(ctx, px + 1, py + 1, TILE - 2, TILE - 2, snow ? '#d9d5c8' : '#8a6a3a');
  // Furrows and crops.
  for (let i = 0; i < 5; i++) {
    const rx = px + 3 + i * 4.5;
    rect(ctx, rx, py + 2, 1, TILE - 4, snow ? '#c4c0b2' : spr ? 'rgba(90,60,30,0.35)' : '#6f5430');
    if (!snow) {
      const hgt = 2 + 7 * pal.cropHeight;
      for (let j = 0; j < 4; j++) {
        const yy = py + 5 + j * 5;
        const sw = Math.sin(env.clock * 2 + i + j) * 0.5;
        line(ctx, rx + 1, yy + 2, rx + 1 + sw, yy + 2 - hgt, pal.crop, 1.4);
        if (env.season === 'autumn') ellipse(ctx, rx + 1 + sw, yy + 1 - hgt, 1.3, 2, '#f0d060');
        else if (env.season === 'summer') ellipse(ctx, rx + 1 + sw, yy + 2 - hgt, 1.6, 1, pal.crop);
      }
    }
  }
  // Fence on two sides.
  ctx.fillStyle = '#b08a52';
  for (let i = 0; i < 5; i++) ctx.fillRect(px + 1 + i * 5.5, py, 1.2, 3.5);
  ctx.fillRect(px + 1, py + 1, TILE - 2, 1);
  // Scarecrow on some farms.
  if (v > 0.5) { rect(ctx, px + TILE - 6, py + 6, 1.2, 12, '#6b4a2b'); rect(ctx, px + TILE - 10, py + 9, 9, 1.2, '#6b4a2b'); rect(ctx, px + TILE - 8, py + 8, 5, 5, '#b89b5a'); circle(ctx, px + TILE - 5.5, py + 6, 2.2, '#e8c070'); poly(ctx, [px + TILE - 9, py + 5, px + TILE - 5.5, py + 1, px + TILE - 2, py + 5], '#8a5a2a'); }
}
