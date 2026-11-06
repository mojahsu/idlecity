// Emerald Cavern backdrop: glowing crystal pillars, hanging webs and subterranean pools.
import { circle, ellipse, line, poly, rect, rgba, hash } from '../../palette';
import { PANEL_H, PANEL_W } from '../layout';
import type { BackdropArt } from './shared';

export function drawEmeraldCavern(art: BackdropArt): void {
  const { ctx, floorY, far, mid, near, c } = art;
  const g = ctx.createLinearGradient(0, 0, 0, PANEL_H);
  g.addColorStop(0, '#0c201a');
  g.addColorStop(1, '#18382e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PANEL_W, PANEL_H);

  // Far cavern arches and stalactites.
  for (let i = -1; i < 5; i++) {
    const x = i * 90 - far;
    poly(ctx, [x, 0, x + 30, 26 + hash(i, 2) * 14, x + 60, 0], '#122b23');
    poly(ctx, [x + 45, 0, x + 68, 34 + hash(i, 3) * 12, x + 90, 0], '#153028');
  }

  // Mid emerald crystal clusters & faint cobwebs in the rafters.
  for (let i = -1; i < 6; i++) {
    const x = i * 60 - mid;
    const h = 18 + hash(i, 5) * 18;
    const pulse = 0.55 + 0.45 * Math.sin(c * 2 + i);
    poly(ctx, [x + 12, floorY, x + 18, floorY - h, x + 24, floorY], '#1f7a58');
    poly(ctx, [x + 15, floorY, x + 18, floorY - h * 0.85, x + 21, floorY], rgba('#70ffd0', 0.45 * pulse));
    poly(ctx, [x + 22, floorY, x + 27, floorY - h * 0.65, x + 31, floorY], '#289a70');
    circle(ctx, x + 18, floorY - h * 0.6, 12, rgba('#40ffb0', 0.08 * pulse));
    if (hash(i, 9) > 0.45) {
      line(ctx, x + 35, 0, x + 52, 18, 'rgba(220,240,235,0.18)', 0.7);
      line(ctx, x + 52, 0, x + 35, 18, 'rgba(220,240,235,0.18)', 0.7);
    }
  }

  // Floor: mossy cavern stone with glowing crystal shards.
  rect(ctx, 0, floorY, PANEL_W, PANEL_H - floorY, '#162e26');
  rect(ctx, 0, floorY, PANEL_W, 2, '#2e6854');
  for (let i = -1; i < 8; i++) {
    const x = i * 45 - near;
    ellipse(ctx, x + 18, floorY + 6, 10, 2.5, rgba('#2ac890', 0.22));
    circle(ctx, x + 32, floorY + 4, 1.5, '#50e8b0');
  }
}
