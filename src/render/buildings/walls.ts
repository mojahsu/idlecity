// walls: drawn in its tile; the shared pieces live in shared.ts.
import { TILE } from '../constants';
import { rect, groundShadow } from '../palette';
import type { BuildingArt } from './shared';
import { wallBox, door, flag, torch } from './shared';

export function drawWalls(art: BuildingArt): void {
  const { ctx, env, px, py, cx, bottom, snow } = art;
  groundShadow(ctx, cx + 1, bottom + 1, 9, 3);
  wallBox(ctx, px + 5, py - 2, TILE - 10, TILE, '#9a9a96', true);
  rect(ctx, px + 4, py - 3, TILE - 8, 2, '#7a7a76');
  for (let i = 0; i < 3; i++) rect(ctx, px + 5 + i * 5, py - 7, 3, 5, '#8a8a86');
  rect(ctx, cx - 1.2, py + 6, 2.4, 5, '#1a1a1a');
  door(ctx, cx - 2, py + TILE - 8, 4, 6, '#3a2a1a');
  torch(ctx, px + TILE - 4, py + 2, env);
  flag(ctx, px + 6, py - 6, 6, '#d04040', env, 5);
  if (snow) rect(ctx, px + 4, py - 4, TILE - 8, 1.5, '#f4f7f9');
}
