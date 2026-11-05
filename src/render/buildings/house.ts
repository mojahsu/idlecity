// house: drawn in its tile; the shared pieces live in shared.ts.
import { TILE } from '../constants';
import { circle, poly, rect, line, roundRect, groundShadow, hash } from '../palette';
import type { BuildingArt } from './shared';
import { roofShingles, wallBox, timberFrame, window_, door, chimney } from './shared';

export function drawHouse(art: BuildingArt): void {
  const { ctx, s, b, env, px, py, cx, bottom, o, snow, v } = art;
  groundShadow(ctx, cx + 2, bottom + 1, 14, 4);
  wallBox(ctx, px + 2, py + 4, TILE - 4, TILE - 6, '#e3d2b0');
  timberFrame(ctx, px + 2, py + 4, TILE - 4, TILE - 6, '#6b4a2b');
  roofShingles(ctx, px - 1, py + 5, px + TILE + 1, py + 5, cx, py - 6, snow ? '#e9edf0' : '#9c3f30');
  chimney(ctx, px + TILE - 8, py - 3);
  door(ctx, cx - 3, py + TILE - 10, 6, 8);
  window_(ctx, px + 5, py + 8, 4, 4, o);
  window_(ctx, px + TILE - 9, py + 8, 4, 4, o);
  // Flower box.
  if (!snow) { rect(ctx, px + 4, py + 12.5, 6, 1.5, '#6b4a2b'); circle(ctx, px + 5.5, py + 12, 1, '#f06a4f'); circle(ctx, px + 8.5, py + 12, 1, '#f7d94c'); }
  // A woodpile or a rain barrel by the wall.
  if (v > 0.5) { for (let i = 0; i < 3; i++) { circle(ctx, px + TILE - 3 + (i % 2) * 2.4, py + TILE - 4 - Math.floor(i / 2) * 2.4, 1.4, '#8a5a30'); circle(ctx, px + TILE - 3 + (i % 2) * 2.4, py + TILE - 4 - Math.floor(i / 2) * 2.4, 0.6, '#d6a86c'); } }
  else { roundRect(ctx, px - 1, py + TILE - 7, 4, 5, 1, '#6b4a2b'); line(ctx, px - 1, py + TILE - 5, px + 3, py + TILE - 5, '#3a2a1a', 0.8); }
  // Washing line to the neighbouring house.
  const right = s.buildings.find((o) => o.built && o.x === b.x + 1 && o.y === b.y && (o.type === 'house' || o.type === 'hut'));
  if (right && !snow && !env.rainy && hash(b.x, b.y, 55) > 0.4) {
    const ly = py + 9;
    line(ctx, px + TILE - 2, ly, px + TILE + 6, ly + 0.5, '#e8e4dc', 0.7);
    for (let i = 0; i < 3; i++) { const lx = px + TILE - 1 + i * 2.6, wv = Math.sin(env.clock * 3 + i + b.x) * 0.8; poly(ctx, [lx, ly, lx + 2, ly, lx + 2 + wv, ly + 4, lx + wv, ly + 4], ['#d8e0f0', '#f0d0c0', '#c8e0c0'][i]); }
  }
}
