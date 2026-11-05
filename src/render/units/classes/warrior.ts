// warrior: class art drawn over the shared body.
import { circle, poly, rect } from '../../palette';
import { body } from '../shared';
import type { ClassArt } from './shared';

export function drawWarrior(art: ClassArt): void {
  const { ctx, p, flutter } = art;
  poly(ctx, [-3, -10, -6 - flutter, -1, -2, -2, -2, -10], '#8a2a2a'); // cape
  body(ctx, '#b84034', '#f2c9a0', '#3a2a1a', p);
  rect(ctx, -3.2, -9, 6.4, 4, '#9aa0a8'); // breastplate
  ctx.fillStyle = '#8a9098'; ctx.beginPath(); ctx.arc(0, -14, 3.8, Math.PI, 0); ctx.fill(); rect(ctx, -3.8, -14, 7.6, 1.6, '#6a7078');
  poly(ctx, [0, -19, 1.5, -16, -1.5, -16], '#d04040'); // plume
  circle(ctx, -4.5, -6, 3, '#6a4a2a'); circle(ctx, -4.5, -6, 1.8, '#c0a060'); // shield
  ctx.save(); ctx.translate(4, -7); ctx.rotate(p.walk * 0.3 - 0.5); rect(ctx, -0.6, -10, 1.2, 10, '#d8dde3'); rect(ctx, -2, 0, 4, 1.2, '#b8862a'); ctx.restore();
}
