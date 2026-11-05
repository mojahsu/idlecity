// campfire: drawn in its tile; the shared pieces live in shared.ts.
import { circle, ellipse, poly, rect, groundShadow } from '../palette';
import type { BuildingArt } from './shared';

export function drawCampfire(art: BuildingArt): void {
  const { ctx, b, env, cx, cy, s } = art;
  const tier = s.tier;
  // The square grows with the town: a stone ring, then paving and a bench or two.
  if (tier === 'city') { ellipse(ctx, cx, cy + 4, 20, 12, '#a89c8a'); ellipse(ctx, cx, cy + 4, 18, 10.5, '#b8ac98'); ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(cx - 18, cy + 4 + k * 4); ctx.lineTo(cx + 18, cy + 4 + k * 4); ctx.stroke(); } }
  if (tier === 'town' || tier === 'city') { for (let i = 0; i < 10; i++) { const a = i * 0.628; circle(ctx, cx + Math.cos(a) * 14, cy + 4 + Math.sin(a) * 8, 1.6, '#8c8c86'); } rect(ctx, cx - 20, cy + 1, 9, 2, '#8a6a3a'); rect(ctx, cx - 19, cy + 3, 1.2, 3, '#6b4a2b'); rect(ctx, cx - 13, cy + 3, 1.2, 3, '#6b4a2b'); rect(ctx, cx + 11, cy + 1, 9, 2, '#8a6a3a'); rect(ctx, cx + 12, cy + 3, 1.2, 3, '#6b4a2b'); rect(ctx, cx + 18, cy + 3, 1.2, 3, '#6b4a2b'); }
  groundShadow(ctx, cx, cy + 6, 9, 3, 0.2);
  for (let i = 0; i < 6; i++) { const a = i * 1.05; rect(ctx, cx + Math.cos(a) * 7 - 1.5, cy + 4 + Math.sin(a) * 3 - 1, 3, 2.5, '#8c8c86'); }
  rect(ctx, cx - 8, cy + 1, 16, 3, '#5a3a1e'); rect(ctx, cx - 2, cy - 4, 3, 10, '#6b4a2b');
  const f = 1 + 0.25 * Math.sin(env.clock * 9 + b.x), f2 = 1 + 0.3 * Math.sin(env.clock * 13 + 1.7);
  poly(ctx, [cx - 6, cy + 2, cx - 1, cy - 8 * f, cx + 1, cy - 4, cx + 6, cy + 2], '#ff7a20');
  poly(ctx, [cx - 4, cy + 2, cx + 1, cy - 11 * f2, cx + 4, cy + 2], '#ffa030');
  poly(ctx, [cx - 2, cy + 2, cx, cy - 5 * f, cx + 2, cy + 2], '#fff0a0');
}
