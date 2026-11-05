// imp: drawn around (0,0) = feet centre, facing +x.
import { circle, poly, rect, line } from '../palette';
import type { MonsterArt } from './shared';

export function drawImp(art: MonsterArt): void {
  const { ctx, c, breathe } = art;
  rect(ctx, -2, -3, 1.6, 3, '#8a2a2a'); rect(ctx, 0.6, -3, 1.6, 3, '#8a2a2a');
  rect(ctx, -2.8, -8.5, 5.6, 5.5, '#b03030'); circle(ctx, 0, -10.5 + breathe, 2.8, '#c04040');
  poly(ctx, [-2, -12.5, -2.5, -15.5, -0.5, -13], '#6a1a1a'); poly(ctx, [2, -12.5, 2.5, -15.5, 0.5, -13], '#6a1a1a');
  rect(ctx, 0.8, -11, 1, 1, '#ffe040');
  { const w = Math.sin(c * 10) * 2; poly(ctx, [-3, -8, -8, -11 - w, -6, -6], '#6a1a1a'); }
  line(ctx, -2, -3, -6, -1 + Math.sin(c * 5), '#b03030', 1);
}
