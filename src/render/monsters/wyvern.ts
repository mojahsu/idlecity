// wyvern: crimson volcanic drake, drawn around (0,0) = feet centre, facing +x.
import { ellipse, poly, rect } from '../palette';
import type { MonsterArt } from './shared';

export function drawWyvern(art: MonsterArt): void {
  const { ctx, c, breathe } = art;
  const w = Math.sin(c * 5) * 3.5;
  poly(ctx, [-2, -10, -12, -19 - w, -5, -6], '#8a281c');
  ellipse(ctx, 0, -8 + breathe * 0.4, 7, 4.2, '#a83424');
  rect(ctx, -2, -4, 2, 4, '#6e1e14');
  rect(ctx, 2, -4, 2, 4, '#6e1e14');
  ellipse(ctx, 6, -13 + breathe * 0.5, 4, 2.5, '#b83c28');
  rect(ctx, 7, -14, 1.3, 1.1, '#ffe050');
}
