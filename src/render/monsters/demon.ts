// demon: drawn around (0,0) = feet centre, facing +x.
import { circle, poly, rect, line } from '../palette';
import type { MonsterArt } from './shared';

export function drawDemon(art: MonsterArt): void {
  const { ctx, c, breathe } = art;
  rect(ctx, -3.5, -5, 2.8, 5, '#6a1a1a'); rect(ctx, 0.8, -5, 2.8, 5, '#6a1a1a');
  rect(ctx, -5.5, -15, 11, 10, '#a02020'); rect(ctx, -5.5, -15, 11, 1.5, '#c04040');
  circle(ctx, 0, -18 + breathe, 4.2, '#b03030'); poly(ctx, [-3, -21, -5, -26, -1.5, -22], '#3a1010'); poly(ctx, [3, -21, 5, -26, 1.5, -22], '#3a1010');
  rect(ctx, -2.2, -19, 1.6, 1.2, '#ffe040'); rect(ctx, 0.8, -19, 1.6, 1.2, '#ffe040');
  { const w = Math.sin(c * 6) * 3; poly(ctx, [-5, -13, -13, -18 - w, -10, -8], '#4a1010'); }
  line(ctx, 5, -10, 9, -16, '#4a4a50', 2);
}
