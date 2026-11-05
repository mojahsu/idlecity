// tavern: drawn in its tile; the shared pieces live in shared.ts.
import { TILE } from '../constants';
import { circle, rect, groundShadow, rgba } from '../palette';
import type { BuildingArt } from './shared';
import { roofShingles, wallBox, timberFrame, window_, door, chimney } from './shared';

export function drawTavern(art: BuildingArt): void {
  const { ctx, env, px, py, cx, bottom, o, snow } = art;
  groundShadow(ctx, cx + 2, bottom + 1, 15, 4);
  wallBox(ctx, px + 1, py + 2, TILE - 2, TILE - 4, '#e0cfae');
  timberFrame(ctx, px + 1, py + 2, TILE - 2, 9, '#5a3a1e');
  rect(ctx, px + 1, py + 11, TILE - 2, 1.5, '#5a3a1e');
  roofShingles(ctx, px - 3, py + 3, px + TILE + 3, py + 3, cx, py - 10, snow ? '#e9edf0' : '#4a2a1a');
  chimney(ctx, px + 4, py - 5);
  door(ctx, cx - 3, py + TILE - 10, 6, 8);
  window_(ctx, px + 4, py + 5, 4, 4, o); window_(ctx, px + TILE - 8, py + 5, 4, 4, o);
  window_(ctx, px + 4, py + 14, 4, 4, o); window_(ctx, px + TILE - 8, py + 14, 4, 4, o);
  // Swinging sign with a mug.
  const sw = Math.sin(env.clock * 2.2 + 1) * 1.5;
  rect(ctx, px + TILE - 2, py + 9, 6, 1.2, '#3a2a1a');
  rect(ctx, px + TILE + 1 + sw * 0.3, py + 10, 5, 5, '#8a5a2a'); rect(ctx, px + TILE + 2.2 + sw * 0.3, py + 11, 2.6, 3, '#e0c060');
  // Lantern by the door at night, and light spilling out of the open door.
  if (o.lit) { circle(ctx, cx + 5, py + TILE - 10, 1.4, '#ffd070'); rect(ctx, cx - 2.5, py + TILE - 9.5, 5, 7, 'rgba(255,200,110,0.55)'); }
}
