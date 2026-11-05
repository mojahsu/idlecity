// bandit: drawn around (0,0) = feet centre, facing +x.
import { circle, rect, line } from '../palette';
import type { MonsterArt } from './shared';

export function drawBandit(art: MonsterArt): void {
  const { ctx, breathe } = art;
  rect(ctx, -2.4, -4, 2, 4, '#2a2a30'); rect(ctx, 0.6, -4, 2, 4, '#2a2a30');
  rect(ctx, -3.2, -10.5, 6.4, 7, '#3a3240'); circle(ctx, 0, -13 + breathe, 3.3, '#e8b88a');
  ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.arc(0, -13.4 + breathe, 3.6, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();
  rect(ctx, -3, -13 + breathe, 6, 1.6, '#8a2a2a'); line(ctx, 3.5, -7, 6.5, -10, '#d0d0d8', 1.2);
}
