// The merchant caravan: merchant on foot, two laden mules and a covered wagon.
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, line, groundShadow, rgba, type Env } from '../palette';
import { facing, pose, body, withUnit, spriteFigures } from './shared';
import { drawSprite } from '../sprites';
import { ANIMAL, MERCHANT } from '../spriteMap';
import type { Caravan } from '../../sim/types';

/** Merchant on foot, two laden mules and a covered wagon. */
export function drawCaravan(ctx: CanvasRenderingContext2D, c: Caravan, env: Env): void {
  const moving = c.phase !== 'trade';
  const dir = facing(c.x, c.path, 11);
  const px = c.x * TILE + TILE / 2, py = c.y * TILE + TILE / 2 + 6;
  const step = moving ? env.clock * 10 : 0;
  // Wagon (behind), then mules, then the merchant leading.
  for (let i = 1; i >= 0; i--) {
    const mx = px - dir * (14 + i * 11), my = py - 1 + (i ? 1 : -1);
    const trot = moving ? Math.sin(step + i * 2) * 1.2 : 0;
    groundShadow(ctx, mx, my + 1, 7, 2, 0.25);
    if (spriteFigures()) {
      // A pack horse from the creatures sheet, its load strapped on top.
      drawSprite(ctx, ANIMAL.horse, mx, my + 1 + Math.abs(trot) * 0.4, 20, { flip: dir < 0 });
      rect(ctx, mx - 3.5, my - 14, 7, 4.5, i ? '#b85a4a' : '#5a7ab0'); rect(ctx, mx - 3.5, my - 14, 7, 1, i ? '#d88a7a' : '#8aa0d0'); line(ctx, mx, my - 14, mx, my - 9.5, '#3a2a1a', 0.8);
      continue;
    }
    ctx.save(); ctx.translate(mx, my); ctx.scale(dir, 1);
    for (let k = 0; k < 4; k++) rect(ctx, -4 + k * 2.6, -4, 1.2, 4 + (k % 2 ? trot : -trot), '#5a4a3a');
    ellipse(ctx, 0, -6.5, 5.5, 3, '#8a7a6a'); rect(ctx, 4, -10.5, 2.6, 5, '#8a7a6a'); poly(ctx, [4, -10.5, 4.5, -13.5, 5.5, -10.5], '#8a7a6a'); poly(ctx, [6, -10.5, 6.5, -13.5, 7.2, -10.5], '#8a7a6a');
    poly(ctx, [-5, -7, -7.5, -9, -6, -5], '#4a3a2a');
    // Packs.
    rect(ctx, -3.5, -11.5, 7, 4.5, i ? '#b85a4a' : '#5a7ab0'); rect(ctx, -3.5, -11.5, 7, 1, i ? '#d88a7a' : '#8aa0d0'); line(ctx, 0, -11.5, 0, -7, '#3a2a1a', 0.8);
    ctx.restore();
  }
  if (c.phase === 'trade') {
    // Spread a rug with wares next to the wagon.
    rect(ctx, px + dir * 4 - 8, py + 2, 16, 6, '#b84040'); rect(ctx, px + dir * 4 - 7, py + 3, 14, 4, '#d8a040');
    circle(ctx, px + dir * 4 - 4, py + 4.5, 1.4, '#5aa0e0'); circle(ctx, px + dir * 4, py + 4.5, 1.4, '#f0d050'); circle(ctx, px + dir * 4 + 4, py + 4.5, 1.4, '#8fcf7a');
  }
  // Merchant leads on foot with a staff and a wide hat.
  const p = pose(moving, false, env.clock, 11);
  withUnit(ctx, c.x + dir * 0.05, c.y, dir, p.bob, () => {
    if (!body(ctx, '#7a4a8a', '#e8b88a', '#2b1d12', p, true, { ref: MERCHANT, tint: '#7a4a8a', tintA: 0.5 })) { ellipse(ctx, 0, -15.5, 6, 1.8, '#5a3a2a'); ellipse(ctx, 0, -16.5, 3.2, 2.2, '#6a4a3a'); }
    line(ctx, 4.5, 0, 4.5, -14, '#8a6a3a', 1.2);
    ellipse(ctx, -4.5, -6, 2.4, 2, '#b08a52');
  });
  // Covered wagon at the back.
  const wx = px - dir * 34, wy = py;
  groundShadow(ctx, wx, wy + 1, 12, 3, 0.25);
  ctx.save(); ctx.translate(wx, wy); ctx.scale(dir, 1);
  const wheel = moving ? env.clock * 4 : 0;
  rect(ctx, -11, -9, 22, 6, '#8a6a3a'); rect(ctx, -11, -9, 22, 1.2, '#b08a52');
  ctx.fillStyle = '#e8dcc0'; ctx.beginPath(); ctx.moveTo(-10, -9); ctx.quadraticCurveTo(-10, -20, 0, -20); ctx.quadraticCurveTo(10, -20, 10, -9); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(k * 5, -9); ctx.quadraticCurveTo(k * 5, -17, k * 4, -19.5); ctx.stroke(); }
  for (const x of [-6, 6]) { circle(ctx, x, -2, 3, '#3a2a1a'); ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - Math.cos(wheel) * 2.5, -2 - Math.sin(wheel) * 2.5); ctx.lineTo(x + Math.cos(wheel) * 2.5, -2 + Math.sin(wheel) * 2.5); ctx.moveTo(x - Math.sin(wheel) * 2.5, -2 + Math.cos(wheel) * 2.5); ctx.lineTo(x + Math.sin(wheel) * 2.5, -2 - Math.cos(wheel) * 2.5); ctx.stroke(); }
  if (env.dark > 0.3) { rect(ctx, 11, -14, 1, 5, '#5a3a1e'); circle(ctx, 11.5, -15, 1.4, '#ffd070'); }
  ctx.restore();
}
