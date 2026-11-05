// rat: drawn around (0,0) = feet centre, facing +x.
import { circle, ellipse, rect, line } from '../palette';
import type { MonsterArt } from './shared';

export function drawRat(art: MonsterArt): void {
  const { ctx, c, breathe } = art;
  ellipse(ctx, 0, -3, 5, 2.6 + breathe * 0.3, '#7a6a5a'); circle(ctx, 4.5, -4, 2.2, '#8a7a6a'); circle(ctx, 4, -6, 1, '#9a8a7a'); rect(ctx, 5.6, -4.5, 0.8, 0.8, '#ff4040');
  line(ctx, -5, -3, -10, -1 + Math.sin(c * 5) * 1.5, '#b08a7a', 1);
}
