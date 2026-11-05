// grave: drawn in its tile; the shared pieces live in shared.ts.
import { circle, ellipse, rect, roundRect, rgba } from '../palette';
import type { BuildingArt } from './shared';

export function drawGrave(art: BuildingArt): void {
  const { ctx, cx, cy, snow, v } = art;
  const tilt = (v - 0.5) * 0.25;
  ctx.save(); ctx.translate(cx, cy + 5); ctx.rotate(tilt);
  ellipse(ctx, 0, 1, 6, 2.5, rgba('#4a3a2a', 0.35));
  ctx.fillStyle = '#9a9a96'; ctx.beginPath(); ctx.roundRect(-4, -10, 8, 11, [4, 4, 0, 0]); ctx.fill();
  ctx.fillStyle = '#7a7a76'; ctx.fillRect(2.5, -10, 1.5, 11);
  rect(ctx, -0.6, -8, 1.2, 5, '#5a5a56'); rect(ctx, -2, -6.5, 4, 1.2, '#5a5a56');
  if (!snow) { circle(ctx, -5, 0, 1.2, '#f7d94c'); circle(ctx, 5.5, 0.5, 1.2, '#f29ac6'); }
  ctx.restore();
}
