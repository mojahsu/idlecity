// priest: class art drawn over the shared body.
import { circle, rect, rgba } from '../../palette';
import { body } from '../shared';
import type { ClassArt } from './shared';

export function drawPriest(art: ClassArt): void {
  const { ctx, p, env } = art;
  body(ctx, '#e8e0c8', '#c98f62', '#2b1d12', p, true);
  rect(ctx, -3, -10.5, 6, 1.5, '#e0b040'); rect(ctx, -0.6, -10, 1.2, 8, '#e0b040');
  ctx.fillStyle = '#f4efe0'; ctx.beginPath(); ctx.arc(0, -13.4, 3.9, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
  rect(ctx, 4, -14, 1.2, 14, '#8a6a3a'); rect(ctx, 3.3, -17, 2.6, 2.6, '#e0b040'); rect(ctx, 4.1, -18, 1, 4.6, '#e0b040');
  circle(ctx, 0, -18.5, 4.2, rgba('#ffe890', 0.25 + 0.1 * Math.sin(env.clock * 3)));
}
