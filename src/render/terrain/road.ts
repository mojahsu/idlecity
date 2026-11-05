// Dirt roads and the cobbled streets near the square.
import type { GameState, Tile } from '../../sim/types';
import { TILE } from '../constants';
import { circle, ellipse, rect, roundRect, shade, rgba, hash, PALETTE, type Env } from '../palette';

export function drawRoad(ctx: CanvasRenderingContext2D, s: GameState, x: number, y: number, dirt: string, edge: string, env: Env): void {
  const px = x * TILE, py = y * TILE;
  const cobbled = Math.hypot(x - s.center.x, y - s.center.y) < 7.5;
  if (cobbled) { dirt = env.season === 'winter' ? '#b8b4ac' : '#a89c8a'; edge = env.season === 'winter' ? '#8a867e' : '#776b5a'; }
  const isRoad = (dx: number, dy: number) => { const t = s.tiles[(y + dy) * s.width + (x + dx)]; return !!t && (t.terrain === 'road') && x + dx >= 0 && x + dx < s.width; };
  const half = TILE / 2, w = 8;
  // Edge (darker) then fill: a rounded cross connecting to road neighbours.
  for (const [c, inset] of [[edge, 0], [dirt, 1.5]] as [string, number][]) {
    ctx.fillStyle = c; ctx.beginPath();
    ctx.roundRect(px + half - w + inset, py + half - w + inset, 2 * (w - inset), 2 * (w - inset), 4);
    if (isRoad(-1, 0)) ctx.rect(px, py + half - w + inset, half, 2 * (w - inset));
    if (isRoad(1, 0)) ctx.rect(px + half, py + half - w + inset, half, 2 * (w - inset));
    if (isRoad(0, -1)) ctx.rect(px + half - w + inset, py, 2 * (w - inset), half);
    if (isRoad(0, 1)) ctx.rect(px + half - w + inset, py + half, 2 * (w - inset), half);
    ctx.fill();
  }
  const n = hash(x, y, 11);
  if (cobbled) {
    // Cobblestones: a staggered grid of rounded stones in three shades, clipped to the road shape.
    ctx.save(); ctx.beginPath();
    ctx.roundRect(px + half - w + 1.5, py + half - w + 1.5, 2 * (w - 1.5), 2 * (w - 1.5), 3);
    if (isRoad(-1, 0)) ctx.rect(px, py + half - w + 1.5, half, 2 * (w - 1.5));
    if (isRoad(1, 0)) ctx.rect(px + half, py + half - w + 1.5, half, 2 * (w - 1.5));
    if (isRoad(0, -1)) ctx.rect(px + half - w + 1.5, py, 2 * (w - 1.5), half);
    if (isRoad(0, 1)) ctx.rect(px + half - w + 1.5, py + half, 2 * (w - 1.5), half);
    ctx.clip();
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
      const sx = px + c * 4 + (r % 2) * 2, sy = py + r * 4;
      const k = hash(x * 6 + c, y * 6 + r, 24);
      ctx.fillStyle = k > 0.66 ? shade(dirt, 0.12) : k > 0.33 ? dirt : shade(dirt, -0.1);
      ctx.beginPath(); ctx.roundRect(sx + 0.4, sy + 0.4, 3.4, 3.2, 1.2); ctx.fill();
    }
    ctx.restore();
    if (env.rainy) { ctx.fillStyle = 'rgba(120,160,220,0.18)'; ctx.fillRect(px, py, TILE, TILE); }
    return;
  }
  // Wheel ruts, pebbles and grass creeping in at the edges.
  ctx.strokeStyle = rgba(edge, 0.5); ctx.lineWidth = 1;
  if (isRoad(-1, 0) || isRoad(1, 0)) { ctx.beginPath(); ctx.moveTo(px, py + half - 3); ctx.lineTo(px + TILE, py + half - 3); ctx.moveTo(px, py + half + 3); ctx.lineTo(px + TILE, py + half + 3); ctx.stroke(); }
  if (n > 0.6) circle(ctx, px + 6 + n * 12, py + 6 + hash(x, y, 12) * 12, 1.2, shade(dirt, -0.25));
  if (n > 0.3 && n < 0.5) { const gx = px + 3 + n * 30, gy = isRoad(0, 1) || isRoad(0, -1) ? py + 2 : py + half - w - 1; ctx.strokeStyle = PALETTE[env.season].tuft; ctx.beginPath(); ctx.moveTo(gx, gy + 2); ctx.lineTo(gx + 1, gy - 2); ctx.moveTo(gx + 2, gy + 2); ctx.lineTo(gx + 2.5, gy - 1.5); ctx.stroke(); }
  if (env.rainy && n > 0.75) ellipse(ctx, px + half, py + half + 2, 6, 2.5, rgba('#3e86bd', 0.35));
}
