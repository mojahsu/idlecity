// lumberCamp: drawn in its tile; the shared pieces live in shared.ts.
import { TILE } from '../constants';
import { circle, ellipse, rect, line, groundShadow } from '../palette';
import type { BuildingArt } from './shared';
import { roofShingles } from './shared';

export function drawLumberCamp(art: BuildingArt): void {
  const { ctx, px, py, cx, bottom, snow } = art;
  groundShadow(ctx, cx, bottom + 1, 13, 4);
  // Open shed on posts.
  rect(ctx, px + 3, py + 6, 2, TILE - 8, '#6b4a2b'); rect(ctx, px + TILE - 5, py + 6, 2, TILE - 8, '#6b4a2b');
  roofShingles(ctx, px, py + 7, px + TILE, py + 7, cx, py - 1, snow ? '#e9edf0' : '#5a3d22');
  // Log pile.
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) { const lx = px + 4 + r * 2.5 + i * 5, ly = py + TILE - 5 - r * 4; circle(ctx, lx, ly, 2.4, '#8a5a30'); circle(ctx, lx, ly, 1.2, '#d6a86c'); }
  // Stump with axe.
  ellipse(ctx, px + TILE - 6, py + TILE - 4, 3.5, 2, '#a8814f');
  line(ctx, px + TILE - 6, py + TILE - 5, px + TILE - 3, py + TILE - 11, '#6b4a2b', 1.2); rect(ctx, px + TILE - 5, py + TILE - 13, 4, 3, '#a9b0b8');
}
