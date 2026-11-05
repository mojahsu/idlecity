// A straw-stuffed sparring post in the guild's yard, with a dented shield.
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, line, groundShadow, type Env } from '../palette';

export function drawTrainingPost(ctx: CanvasRenderingContext2D, x: number, y: number, env: Env): void {
  const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2 + 5;
  groundShadow(ctx, px, py + 1, 4, 1.6, 0.25);
  rect(ctx, px - 1.2, py - 16, 2.4, 16, '#6b4a2b');
  ellipse(ctx, px, py - 12, 4, 5, '#c8a860'); line(ctx, px - 2, py - 14, px + 2, py - 10, 'rgba(0,0,0,0.15)', 0.8);
  rect(ctx, px - 6, py - 11, 12, 1.5, '#6b4a2b');
  circle(ctx, px - 4.5, py - 10.5, 2.6, '#8a8f96'); circle(ctx, px - 4.5, py - 10.5, 1.2, '#6a6f76');
  poly(ctx, [px - 1.5, py - 19, px, py - 17, px + 1.5, py - 19, px, py - 16.5], '#8a5a2a');
  void env;
}
