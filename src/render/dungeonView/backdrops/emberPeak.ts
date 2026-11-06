// Ember Peak backdrop: basalt pillars, rivers of glowing lava and rising embers.
import { circle, ellipse, poly, rect, rgba, hash } from '../../palette';
import { PANEL_H, PANEL_W } from '../layout';
import type { BackdropArt } from './shared';

export function drawEmberPeak(art: BackdropArt): void {
  const { ctx, floorY, far, mid, near, c } = art;
  const g = ctx.createLinearGradient(0, 0, 0, PANEL_H);
  g.addColorStop(0, '#1e0c0a');
  g.addColorStop(0.65, '#381612');
  g.addColorStop(1, '#582014');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PANEL_W, PANEL_H);

  // Far volcanic ridges.
  for (let i = -1; i < 5; i++) {
    const x = i * 90 - far;
    poly(ctx, [x - 10, floorY, x + 25, 22 + hash(i, 4) * 14, x + 65, 34, x + 95, floorY], '#2a110e');
  }

  // Mid obsidian columns and lava veins.
  for (let i = -1; i < 6; i++) {
    const x = i * 60 - mid;
    rect(ctx, x + 10, 6, 12, floorY - 6, '#261414');
    rect(ctx, x + 10, 6, 2.5, floorY - 6, '#3e2220');
    const glowA = 0.5 + 0.4 * Math.sin(c * 2.5 + i);
    rect(ctx, x + 15, 18, 2, floorY - 22, rgba('#ff6820', 0.65 * glowA));
    circle(ctx, x + 40, floorY - 10 - ((c * 14 + i * 19) % 45), 1.1, rgba('#ffb040', 0.7));
  }

  // Floor: cracked basalt over molten magma.
  rect(ctx, 0, floorY, PANEL_W, PANEL_H - floorY, '#241210');
  rect(ctx, 0, floorY, PANEL_W, 2, '#ff7828');
  for (let i = -1; i < 8; i++) {
    const x = i * 45 - near;
    ellipse(ctx, x + 16, floorY + 7, 11, 2.2, rgba('#ff5818', 0.45 + 0.2 * Math.sin(c * 3 + i)));
    ellipse(ctx, x + 16, floorY + 7, 5, 1, '#ffd060');
  }
}
