// orc: drawn around (0,0) = feet centre, facing +x.
import { circle, rect } from '../palette';
import type { MonsterArt } from './shared';

export function drawOrc(art: MonsterArt): void {
  const { ctx, breathe } = art;
  rect(ctx, -3, -4, 2.4, 4, '#3a3a2a'); rect(ctx, 0.8, -4, 2.4, 4, '#3a3a2a');
  rect(ctx, -4.5, -12, 9, 8.5, '#4a7a3a'); rect(ctx, -4.5, -8, 9, 1.5, '#5a3a1a');
  circle(ctx, 0, -14.5 + breathe, 3.6, '#5a8a40'); rect(ctx, -2, -13, 1.2, 1.5, '#f4f4f4'); rect(ctx, 1, -13, 1.2, 1.5, '#f4f4f4'); rect(ctx, 1.2, -15.5, 1, 1, '#ff4040');
  ctx.save(); ctx.translate(5, -9); ctx.rotate(-0.6); rect(ctx, -0.8, -10, 1.6, 10, '#6a4a2a'); circle(ctx, 0, -10, 2.5, '#5a5a5a'); ctx.restore();
}
