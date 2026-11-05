// Conifer: trunk and three stacked tiers, snow-capped in winter.
import { poly, shade } from '../../palette';
import type { TreeArt } from './shared';

export function drawPine(art: TreeArt): void {
  const { ctx, env, size, sway, cx, cy } = art;
// Conifer: trunk and three stacked tiers, snow-capped in winter.
const col = env.season === 'autumn' ? '#4f7f3a' : env.season === 'winter' ? '#4a6f4a' : '#3a7a3a';
ctx.fillStyle = '#4a2e18'; ctx.fillRect(cx - 1.4, cy - 2, 2.8, 10 * size);
for (let i = 0; i < 3; i++) {
  const ty = cy + 2 - i * 7 * size, w = (11 - i * 2.5) * size, h = 9 * size;
  poly(ctx, [cx - w + sway * 0.3 * i, ty, cx + sway * 0.5 * (i + 1), ty - h, cx + w + sway * 0.3 * i, ty], shade(col, -0.18 + i * 0.1));
  poly(ctx, [cx - w * 0.5 + sway * 0.3 * i, ty - h * 0.15, cx + sway * 0.5 * (i + 1), ty - h, cx + sway * 0.5 * (i + 1), ty - h * 0.1], shade(col, 0.12 + i * 0.08));
  if (env.season === 'winter') poly(ctx, [cx - w * 0.6 + sway * 0.3 * i, ty - h * 0.35, cx + sway * 0.5 * (i + 1), ty - h, cx + w * 0.6 + sway * 0.3 * i, ty - h * 0.35], '#f4f7f9');
}
}
