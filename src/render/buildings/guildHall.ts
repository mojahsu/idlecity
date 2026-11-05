// guildHall: drawn in its tile; the shared pieces live in shared.ts.
import { TILE } from '../constants';
import { line, groundShadow } from '../palette';
import type { BuildingArt } from './shared';
import { roofShingles, wallBox, window_, door, chimney, flag } from './shared';

export function drawGuildHall(art: BuildingArt): void {
  const { ctx, env, px, py, cx, bottom, o, snow } = art;
  groundShadow(ctx, cx + 2, bottom + 1, 15, 4);
  wallBox(ctx, px + 1, py + 2, TILE - 2, TILE - 4, '#7a4a7a', true);
  roofShingles(ctx, px - 2, py + 3, px + TILE + 2, py + 3, cx, py - 9, snow ? '#e9edf0' : '#3a2a4a');
  chimney(ctx, px + 4, py - 4);
  door(ctx, cx - 3.5, py + TILE - 11, 7, 9, '#3a2a1a');
  window_(ctx, px + 4, py + 6, 4, 4, o, '#ffe090'); window_(ctx, px + TILE - 8, py + 6, 4, 4, o, '#ffe090');
  // Crossed swords sign and banner.
  line(ctx, cx - 4, py + 15, cx + 4, py + 19, '#d0d0d8', 1.2); line(ctx, cx + 4, py + 15, cx - 4, py + 19, '#d0d0d8', 1.2);
  flag(ctx, px + TILE - 3, py - 8, 12, '#8a3ad0', env, 8);
}
