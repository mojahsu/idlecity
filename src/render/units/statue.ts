// Stone hero on a plinth, raised on the square once the Demon Lord is dead.
import { TILE } from '../constants';
import { circle, rect, groundShadow, type Env } from '../palette';
import { classArt } from './classes';

/** Stone hero on a plinth, raised on the square once the Demon Lord is dead. */
export function drawStatue(ctx: CanvasRenderingContext2D, x: number, y: number, env: Env): void {
  const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2 + 5;
  groundShadow(ctx, px, py + 2, 9, 3, 0.3);
  rect(ctx, px - 8, py - 4, 16, 6, '#8a8a86'); rect(ctx, px - 8, py - 4, 16, 1.5, '#b0b0ac'); rect(ctx, px - 6, py - 9, 12, 5, '#9a9a96'); rect(ctx, px - 6, py - 9, 12, 1.2, '#c0c0bc');
  rect(ctx, px - 3, py - 2, 6, 2, '#e0c060');
  // Flowers laid at the base of the plinth.
  if (env.season !== 'winter') {
    circle(ctx, px - 6, py + 1.2, 1.2, '#e85a70'); circle(ctx, px - 4, py + 1.6, 1.1, '#f7d94c');
    circle(ctx, px + 4.5, py + 1.5, 1.2, '#70b8f0'); circle(ctx, px + 6.2, py + 1.1, 1.1, '#f7d94c');
  }
  ctx.save(); ctx.translate(px, py - 9); ctx.scale(0.75, 0.75);
  ctx.filter = 'grayscale(1) brightness(1.15) contrast(0.9)';
  classArt(ctx, 'warrior', { walk: 0, bob: 0, swing: 0 }, false, env, 1);
  ctx.restore();
  // Subtle golden glints rising around the monument.
  for (let i = 0; i < 2; i++) {
    const gt = (env.clock * 0.6 + i * 0.5) % 1;
    circle(ctx, px - 5 + i * 10 + Math.sin(env.clock * 2 + i) * 1.5, py - 8 - gt * 14, 0.9 * (1 - gt) + 0.3, `rgba(255,228,120,${0.75 * (1 - gt)})`);
  }
}
