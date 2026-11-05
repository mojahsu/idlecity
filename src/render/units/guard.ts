// A town guard pacing a wall.
import { ellipse, poly, rect, line, type Env } from '../palette';
import { pose, body, withUnit } from './shared';

/** A town guard pacing a wall: grey tunic, kettle helmet, spear, torch after dark. */
export function drawGuard(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, moving: boolean, env: Env, seed: number): void {
  const p = pose(moving, false, env.clock, seed);
  withUnit(ctx, x, y, dir, p.bob, () => {
    body(ctx, '#7a7a86', '#e8b88a', '#3a2a1a', p);
    rect(ctx, -3.2, -9.5, 6.4, 3, '#9aa0a8');
    ctx.fillStyle = '#8a9098'; ctx.beginPath(); ctx.arc(0, -14, 3.8, Math.PI, 0); ctx.fill(); ellipse(ctx, 0, -14, 5, 1.2, '#7a8088');
    line(ctx, 4.5, 2, 4.5, -18, '#8a6a3a', 1.2); poly(ctx, [3.6, -18, 4.5, -22, 5.4, -18], '#d8dde3');
    if (env.dark > 0.25) { line(ctx, -4.5, -6, -4.5, -12, '#5a3a1e', 1.2); const f = 1 + 0.3 * Math.sin(env.clock * 11 + seed); ellipse(ctx, -4.5, -13.5 * f, 1.8, 2.6 * f, '#ff9a30'); ellipse(ctx, -4.5, -13 * f, 0.9, 1.4 * f, '#ffe080'); }
  });
}
