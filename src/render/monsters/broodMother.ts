// broodMother: giant crystal-crowned spider queen, drawn around (0,0) = feet centre, facing +x.
import { circle, ellipse, line, poly } from '../palette';
import type { MonsterArt } from './shared';

export function drawBroodMother(art: MonsterArt): void {
  const { ctx, c, breathe } = art;
  ellipse(ctx, -6, -10 + breathe * 0.5, 9, 7, '#18342a');
  poly(ctx, [-9, -15, -6, -24, -3, -15], '#40f0b0');
  poly(ctx, [-5, -15, -2, -22, 1, -15], '#80ffd8');
  circle(ctx, 3, -8, 5, '#22483a');
  circle(ctx, 5, -9.5, 1.3, '#ff4070');
  circle(ctx, 5.5, -7, 1.1, '#ff4070');
  for (let i = 0; i < 4; i++) {
    const sw = Math.sin(c * 7 + i) * 2;
    line(ctx, -4 + i * 2.5, -6, -6 + i * 3.2 + sw, 0, '#122820', 1.8);
  }
}
