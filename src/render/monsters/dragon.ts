// dragon: drawn around (0,0) = feet centre, facing +x.
import { ellipse, poly, rect, line, rgba } from '../palette';
import type { MonsterArt } from './shared';

export function drawDragon(art: MonsterArt): void {
  const { ctx, c, breathe, attacking } = art;
  const w = Math.sin(c * 4) * 4;
  poly(ctx, [-4, -10, -16, -18 - w, -8, -6], '#2a6a3a'); poly(ctx, [2, -11, 10, -20 - w, 6, -8], '#2a6a3a');
  ellipse(ctx, -2, -7, 9, 5 + breathe * 0.4, '#3a8a4a'); ellipse(ctx, -2, -5, 7, 2.5, '#9ad070');
  for (let k = 0; k < 4; k++) rect(ctx, -7 + k * 4, -3, 2, 3, '#2a6a3a');
  line(ctx, -10, -7, -17, -3 + Math.sin(c * 2) * 2, '#3a8a4a', 3);
  ellipse(ctx, 8, -13 + breathe, 5, 3, '#3a8a4a'); poly(ctx, [12, -14, 16, -12, 12, -11], '#3a8a4a'); rect(ctx, 9, -14.5, 1.4, 1.2, '#ffe040');
  for (let k = 0; k < 4; k++) poly(ctx, [-8 + k * 4, -11, -6.5 + k * 4, -14.5, -5 + k * 4, -11], '#2a6a3a');
  if (attacking > 0.3) { ellipse(ctx, 20, -12, 7 * attacking, 3 * attacking, rgba('#ff8020', 0.8)); ellipse(ctx, 18, -12, 4 * attacking, 1.8 * attacking, '#ffe060'); }
}
