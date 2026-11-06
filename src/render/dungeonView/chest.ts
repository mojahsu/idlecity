// A chest flipping open with a glow, plus dungeon story encounter props (spring, altar, rescue).
import { circle, ellipse, poly, rect, rgba, type Env } from '../palette';
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

/** Story encounter prop on a cleared dungeon floor: healing spring, war altar, or rescued traveller. */
export function drawEventProp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  prop: { kind: 'spring' | 'altar' | 'rescue'; t: number },
  env: Env,
): void {
  const a = Math.min(1, prop.t * 2);
  ctx.save();
  ctx.globalAlpha = a;
  if (prop.kind === 'spring') {
    circle(ctx, x, y - 5, 15, rgba('#50d8ff', 0.28));
    ellipse(ctx, x, y - 1, 9, 3.2, '#4a6a78');
    ellipse(ctx, x, y - 1.5, 7, 2.2, '#60e8ff');
    for (let i = 0; i < 3; i++) {
      const h = 4 + Math.sin(env.clock * 8 + i * 2) * 2.5;
      ellipse(ctx, x - 3 + i * 3, y - 2 - h, 1.4, h, rgba('#a0f4ff', 0.85));
    }
  } else if (prop.kind === 'altar') {
    const g = ctx.createLinearGradient(x, y - 42, x, y);
    g.addColorStop(0, 'rgba(255,224,112,0)');
    g.addColorStop(1, 'rgba(255,224,112,0.38)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 10, y - 42, 20, 42);
    rect(ctx, x - 7, y - 4, 14, 4, '#6a6458');
    rect(ctx, x - 4.5, y - 14, 9, 10, '#8a8270');
    poly(ctx, [x, y - 21, x - 3.5, y - 16, x, y - 12, x + 3.5, y - 16], '#ffe070');
  } else {
    // Rescued explorer waving and thanking the party.
    const hop = Math.abs(Math.sin(env.clock * 8)) * 2.5;
    circle(ctx, x, y - 6, 12, rgba('#ffd870', 0.22));
    rect(ctx, x - 3, y - 10 - hop, 6, 7, '#4a7a5a');
    circle(ctx, x, y - 13 - hop, 3, '#f2c9a0');
    rect(ctx, x + 2.5, y - 14 - hop, 1.5, 5, '#4a7a5a');
  }
  ctx.restore();
}
