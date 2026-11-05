// wolf: drawn around (0,0) = feet centre, facing +x.
import { circle, ellipse, poly, rect, line } from '../palette';
import type { MonsterArt } from './shared';

export function drawWolf(art: MonsterArt): void {
  const { ctx, c, breathe } = art;
  ellipse(ctx, 0, -4, 6, 3 + breathe * 0.3, '#6a6a70'); circle(ctx, 5.5, -6, 2.6, '#7a7a80');
  poly(ctx, [4, -8, 5, -10.5, 6, -8], '#6a6a70'); poly(ctx, [6, -8, 7.2, -10.5, 8, -8], '#6a6a70');
  rect(ctx, 7, -6.2, 1, 1, '#ffd040'); line(ctx, -6, -5, -9, -8 + Math.sin(c * 4) * 1, '#6a6a70', 1.5);
  for (let k = 0; k < 4; k++) rect(ctx, -4 + k * 3, -2, 1.4, 2.5, '#5a5a60');
}
