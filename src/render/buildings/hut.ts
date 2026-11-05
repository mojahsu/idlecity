// hut: drawn in its tile; the shared pieces live in shared.ts.
import { TILE } from '../constants';
import { circle, line, rect, groundShadow, rgba } from '../palette';
import type { BuildingArt } from './shared';
import { thatch, wallBox, window_, door, chimney } from './shared';

export function drawHut(art: BuildingArt): void {
  const { ctx, px, py, cx, bottom, o, snow, s } = art;
  const grown = s.tier === 'town' || s.tier === 'city';
  groundShadow(ctx, cx + 2, bottom + 1, 13, 4);
  wallBox(ctx, px + 4, py + 7, TILE - 8, TILE - 9, '#9a7448');
  ctx.strokeStyle = rgba('#000000', 0.18); for (let i = 1; i < 4; i++) line(ctx, px + 4, py + 7 + i * 3.5, px + TILE - 4, py + 7 + i * 3.5, rgba('#000000', 0.18), 0.8);
  thatch(ctx, cx, py + 8, TILE - 4, 10, snow ? '#e9edf0' : '#c6a65a');
  door(ctx, cx - 3, py + TILE - 10, 6, 8);
  window_(ctx, px + 6, py + 11, 3, 3, o);
  window_(ctx, px + TILE - 9, py + 11, 3, 3, o);
  // A grown town's huts get a chimney and a flower box.
  if (grown) { chimney(ctx, px + TILE - 8, py + 1); if (!snow) { rect(ctx, px + 5, py + 14.5, 5, 1.2, '#6b4a2b'); circle(ctx, px + 6.5, py + 14, 0.9, '#f06a4f'); circle(ctx, px + 8.5, py + 14, 0.9, '#f7d94c'); } }
}
