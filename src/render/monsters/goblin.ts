// goblin: drawn around (0,0) = feet centre, facing +x.
import { circle, poly, rect, line } from '../palette';
import type { MonsterArt } from './shared';

export function drawGoblin(art: MonsterArt): void {
  const { ctx, breathe } = art;
  rect(ctx, -2.2, -3, 1.8, 3, '#3a4a2a'); rect(ctx, 0.6, -3, 1.8, 3, '#3a4a2a');
  rect(ctx, -2.8, -8, 5.6, 5.5, '#5a3a2a'); circle(ctx, 0, -10.5 + breathe, 3, '#6a9a3a');
  poly(ctx, [-3, -11, -5.5, -12.5, -3, -9.5], '#6a9a3a'); poly(ctx, [3, -11, 5.5, -12.5, 3, -9.5], '#6a9a3a');
  rect(ctx, 0.8, -11, 1, 1, '#ff4040'); line(ctx, 3, -7, 6, -11, '#c0c0c8', 1.2);
}
