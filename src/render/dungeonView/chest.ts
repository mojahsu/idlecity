// A chest flipping open with a glow, next to the party.
import { circle, rect, rgba, type Env } from '../palette';
import { drawNamed, dungeonSprites } from '../sprites';

/** A chest flipping open with a glow, next to the party. */
export function drawChest(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, env: Env): void {
  const open = Math.min(1, (1.4 - k) * 3);
  circle(ctx, x, y - 4, 14, rgba('#ffe080', 0.25 * open * (0.7 + 0.3 * Math.sin(env.clock * 8))));
  if (dungeonSprites() && drawNamed(ctx, 'chest_full_open_anim', x, y, 1.3, 0, { frame: open * 2.99 })) {
    if (open > 0.5) for (let i = 0; i < 3; i++) drawNamed(ctx, 'coin_anim', x - 5 + i * 5, y - 9 - (i % 2) * 3 - open * 3, 1, env.clock + i * 0.3, {}, 10);
    return;
  }
  rect(ctx, x - 7, y - 6, 14, 7, '#8a5a2a'); rect(ctx, x - 7, y - 6, 14, 1.2, '#b08a52'); rect(ctx, x - 1, y - 5, 2, 3, '#e0c060');
  ctx.save(); ctx.translate(x - 7, y - 6); ctx.rotate(-open * 1.9); rect(ctx, 0, -4, 14, 4, '#a06a3a'); rect(ctx, 0, -4, 14, 1, '#c89060'); ctx.restore();
  if (open > 0.5) for (let i = 0; i < 3; i++) circle(ctx, x - 3 + i * 3, y - 5 - (i % 2), 1.3, '#ffd040');
}
