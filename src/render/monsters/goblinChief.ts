// goblinChief: drawn around (0,0) = feet centre, facing +x.
import { circle, poly, rect } from '../palette';
import type { MonsterArt } from './shared';

export function drawGoblinChief(art: MonsterArt): void {
  const { ctx, breathe } = art;
  rect(ctx, -3, -4, 2.4, 4, '#3a4a2a'); rect(ctx, 0.8, -4, 2.4, 4, '#3a4a2a');
  rect(ctx, -4.5, -11.5, 9, 8, '#6a3a2a'); rect(ctx, -4.5, -8, 9, 1.5, '#e0b040'); circle(ctx, 0, -14 + breathe, 4, '#5a8a30');
  poly(ctx, [-4, -15, -7.5, -17, -4, -13], '#5a8a30'); poly(ctx, [4, -15, 7.5, -17, 4, -13], '#5a8a30');
  poly(ctx, [-3.5, -17.5, -2, -21, 0, -18, 2, -21, 3.5, -17.5], '#e0b040'); rect(ctx, 1, -14.5, 1.2, 1.2, '#ff4040');
  ctx.save(); ctx.translate(5.5, -9); ctx.rotate(-0.5); rect(ctx, -0.8, -11, 1.6, 11, '#6a4a2a'); poly(ctx, [-3.5, -11, 0, -14, 3.5, -11, 0, -9], '#8a8f96'); ctx.restore();
}
