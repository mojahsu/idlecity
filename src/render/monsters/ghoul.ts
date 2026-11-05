// ghoul: drawn around (0,0) = feet centre, facing +x.
import { circle, poly, rect, line } from '../palette';
import type { MonsterArt } from './shared';

export function drawGhoul(art: MonsterArt): void {
  const { ctx, c, breathe } = art;
  rect(ctx, -2.6, -4, 2, 4, '#5a6a5a'); rect(ctx, 0.6, -4, 2, 4, '#5a6a5a');
  poly(ctx, [-3.5, -4, -3, -11, 3, -11, 3.5, -4], '#6a7a6a'); circle(ctx, 0, -13 + breathe, 3.4, '#8a9a7a');
  rect(ctx, -2, -13.5, 1.4, 1, '#f0f040'); rect(ctx, 0.8, -13.5, 1.4, 1, '#f0f040'); rect(ctx, -1.5, -11, 3, 1.5, '#3a2a2a');
  line(ctx, 3, -9, 7, -6 + Math.sin(c * 6) * 1, '#6a7a6a', 2);
}
