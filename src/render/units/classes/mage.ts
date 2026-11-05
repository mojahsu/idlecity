// mage: class art drawn over the shared body.
import { circle, ellipse, poly, rect, rgba } from '../../palette';
import { body } from '../shared';
import type { ClassArt } from './shared';

export function drawMage(art: ClassArt): void {
  const { ctx, p, env, flutter } = art;
  poly(ctx, [-3, -10, -6 - flutter, 0, -2, -1, -2, -10], '#2a3a8a');
  body(ctx, '#3a4ac0', '#f2c9a0', '#d9b65a', p, true);
  poly(ctx, [-5, -15.5, 0, -24, 4.5, -15.5], '#2a3a9a'); ellipse(ctx, 0, -15.5, 5.8, 1.6, '#2a3a9a'); circle(ctx, 1, -19, 0.8, '#f7d94c');
  rect(ctx, 4, -14, 1.2, 14, '#6a4a2a');
  const g = 0.6 + 0.4 * Math.sin(env.clock * 4);
  circle(ctx, 4.6, -15.5, 2.6, rgba('#80c0ff', 0.35 * g)); circle(ctx, 4.6, -15.5, 1.5, '#a0e0ff');
}
