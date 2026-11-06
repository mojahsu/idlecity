// elderDragon: ancient crimson-gold dragon lord of Ember Peak, drawn around (0,0) = feet centre, facing +x.
import { ellipse, line, poly, rect, rgba } from '../palette';
import type { MonsterArt } from './shared';

export function drawElderDragon(art: MonsterArt): void {
  const { ctx, c, breathe, attacking } = art;
  const w = Math.sin(c * 4) * 5;
  poly(ctx, [-5, -12, -19, -23 - w, -9, -7], '#7a1c18');
  poly(ctx, [2, -13, 12, -25 - w, 7, -9], '#9a241e');
  ellipse(ctx, -2, -8, 10.5, 6 + breathe * 0.5, '#b82e24');
  ellipse(ctx, -2, -6, 8, 3, '#f0b848');
  for (let k = 0; k < 4; k++) rect(ctx, -8 + k * 4.5, -3, 2.4, 3, '#7a1c18');
  line(ctx, -11, -8, -19, -3 + Math.sin(c * 2) * 2, '#9a241e', 3.4);
  ellipse(ctx, 9, -15 + breathe, 5.8, 3.6, '#b82e24');
  poly(ctx, [6, -18, 3, -23, 8, -17], '#ffd060');
  rect(ctx, 10.5, -16.5, 1.6, 1.3, '#fff080');
  if (attacking > 0.3) {
    ellipse(ctx, 21, -14, 8 * attacking, 3.5 * attacking, rgba('#ff6010', 0.85));
    ellipse(ctx, 19, -14, 4.5 * attacking, 2 * attacking, '#fff080');
  }
}
