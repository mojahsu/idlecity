// lich: drawn around (0,0) = feet centre, facing +x.
import { circle, poly, rect, rgba } from '../palette';
import type { MonsterArt } from './shared';

export function drawLich(art: MonsterArt): void {
  const { ctx, c, breathe } = art;
  poly(ctx, [-5, 0, -3.5, -14, 3.5, -14, 5, 0], '#2a1a3a'); rect(ctx, -3.5, -14, 7, 1.5, '#6a3aa0');
  circle(ctx, 0, -16.5 + breathe, 3.4, '#e8e4d8'); rect(ctx, -2, -17, 1.4, 1.4, '#60e0ff'); rect(ctx, 0.8, -17, 1.4, 1.4, '#60e0ff');
  poly(ctx, [-4.5, -19.5, -3, -24, -1, -20, 1, -24, 3, -20, 4.5, -19.5], '#3a2a5a');
  rect(ctx, 5, -20, 1.2, 20, '#4a3a5a'); circle(ctx, 5.6, -21.5, 2.6, rgba('#60e0ff', 0.35 + 0.2 * Math.sin(c * 4))); circle(ctx, 5.6, -21.5, 1.4, '#a0f0ff');
  for (let i = 0; i < 3; i++) circle(ctx, -6 + Math.sin(c * 2 + i * 2) * 2, -6 - i * 4 + Math.cos(c * 3 + i) * 2, 1, rgba('#60e0ff', 0.6));
}
