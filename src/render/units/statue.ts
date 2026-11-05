// Stone hero on a plinth, raised on the square once the Demon Lord is dead.
import { TILE } from '../constants';
import { rect, groundShadow, type Env } from '../palette';
import { classArt } from './classes';

/** Stone hero on a plinth, raised on the square once the Demon Lord is dead. */
export function drawStatue(ctx: CanvasRenderingContext2D, x: number, y: number, env: Env): void {
  const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2 + 5;
  groundShadow(ctx, px, py + 2, 9, 3, 0.3);
  rect(ctx, px - 8, py - 4, 16, 6, '#8a8a86'); rect(ctx, px - 8, py - 4, 16, 1.5, '#b0b0ac'); rect(ctx, px - 6, py - 9, 12, 5, '#9a9a96'); rect(ctx, px - 6, py - 9, 12, 1.2, '#c0c0bc');
  rect(ctx, px - 3, py - 2, 6, 2, '#e0c060');
  ctx.save(); ctx.translate(px, py - 9); ctx.scale(0.75, 0.75);
  ctx.filter = 'grayscale(1) brightness(1.15) contrast(0.9)';
  classArt(ctx, 'warrior', { walk: 0, bob: 0, swing: 0 }, false, env, 1);
  ctx.restore();
}
