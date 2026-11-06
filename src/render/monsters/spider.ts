// spider: emerald cavern venomous spider, drawn around (0,0) = feet centre, facing +x.
import { circle, ellipse, line } from '../palette';
import type { MonsterArt } from './shared';

export function drawSpider(art: MonsterArt): void {
  const { ctx, c, breathe } = art;
  ellipse(ctx, -4, -6 + breathe * 0.4, 5.5, 4, '#1e3a2e');
  ellipse(ctx, -4, -7 + breathe * 0.4, 3, 1.8, '#30c888');
  circle(ctx, 2, -5, 3.2, '#244638');
  circle(ctx, 3.5, -5.8, 0.9, '#60ffc0');
  circle(ctx, 3.5, -4.2, 0.9, '#60ffc0');
  for (let i = 0; i < 4; i++) {
    const sw = Math.sin(c * 8 + i * 1.4) * 1.5;
    line(ctx, -3 + i * 1.8, -4, -4 + i * 2.2 + sw, 0, '#182e24', 1.2);
  }
}
