// demonLord: drawn around (0,0) = feet centre, facing +x.
import { circle, poly, rect, rgba } from '../palette';
import type { MonsterArt } from './shared';

export function drawDemonLord(art: MonsterArt): void {
  const { ctx, c, breathe } = art;
  const aura = 0.25 + 0.15 * Math.sin(c * 3);
  circle(ctx, 0, -14, 20, rgba('#a020e0', aura * 0.5)); circle(ctx, 0, -14, 13, rgba('#ff3060', aura * 0.4));
  rect(ctx, -4.5, -6, 3.4, 6, '#2a0a2a'); rect(ctx, 1.1, -6, 3.4, 6, '#2a0a2a');
  poly(ctx, [-8, -6, -7, -20, 7, -20, 8, -6], '#3a0a3a'); rect(ctx, -7, -20, 14, 2, '#8a2060'); rect(ctx, -3, -17, 6, 8, '#1a0a1a');
  circle(ctx, 0, -24 + breathe, 5, '#4a1040'); poly(ctx, [-4, -27, -8, -36, -2, -29], '#1a0a1a'); poly(ctx, [4, -27, 8, -36, 2, -29], '#1a0a1a');
  rect(ctx, -2.8, -25.5, 2, 1.4, '#ff3030'); rect(ctx, 0.8, -25.5, 2, 1.4, '#ff3030'); rect(ctx, -2, -22, 4, 1, '#ff6040');
  { const w = Math.sin(c * 5) * 4; poly(ctx, [-7, -16, -20, -24 - w, -16, -8], '#1a0a1a'); poly(ctx, [7, -16, 20, -24 - w, 16, -8], '#1a0a1a'); }
  ctx.save(); ctx.translate(9, -12); ctx.rotate(-0.4); rect(ctx, -1, -18, 2, 18, '#2a1a2a'); poly(ctx, [-4, -18, 0, -26, 4, -18], '#ff3060'); circle(ctx, 0, -18, 2, rgba('#ff80a0', 0.8)); ctx.restore();
}
