// wraith: floating emerald-shrouded spectre, drawn around (0,0) = feet centre, facing +x.
import { circle, poly, rgba } from '../palette';
import type { MonsterArt } from './shared';

export function drawWraith(art: MonsterArt): void {
  const { ctx, c, breathe } = art;
  const floatY = Math.sin(c * 3.5) * 1.8;
  poly(ctx, [-5, -2 + floatY, -3, -16 + floatY, 2, -19 + floatY + breathe, 5, -14 + floatY, 4, -2 + floatY, 0, -5 + floatY], rgba('#206858', 0.88));
  circle(ctx, 1.5, -14 + floatY, 3.2, '#102420');
  circle(ctx, 2.5, -14.5 + floatY, 1.1, '#70ffd8');
}
