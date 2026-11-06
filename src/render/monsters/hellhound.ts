// hellhound: magma hound with a fiery mane, drawn around (0,0) = feet centre, facing +x.
import { circle, ellipse, poly, rect } from '../palette';
import type { MonsterArt } from './shared';

export function drawHellhound(art: MonsterArt): void {
  const { ctx, c, breathe } = art;
  rect(ctx, -5, -5, 2, 5, '#3a1814');
  rect(ctx, 2, -5, 2, 5, '#3a1814');
  ellipse(ctx, -1, -7 + breathe * 0.3, 6.5, 3.8, '#4e1e18');
  poly(ctx, [-2, -10, 1, -14 - Math.sin(c * 10) * 1.5, 4, -9], '#ff7820');
  ellipse(ctx, 5, -9, 3.5, 2.6, '#5a221a');
  circle(ctx, 6.5, -9.8, 1, '#ffe060');
}
