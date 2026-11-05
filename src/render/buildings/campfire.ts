// campfire: drawn in its tile; the shared pieces live in shared.ts.
import { poly, rect, groundShadow } from '../palette';
import type { BuildingArt } from './shared';

export function drawCampfire(art: BuildingArt): void {
  const { ctx, b, env, cx, cy } = art;
  groundShadow(ctx, cx, cy + 6, 9, 3, 0.2);
  for (let i = 0; i < 6; i++) { const a = i * 1.05; rect(ctx, cx + Math.cos(a) * 7 - 1.5, cy + 4 + Math.sin(a) * 3 - 1, 3, 2.5, '#8c8c86'); }
  rect(ctx, cx - 8, cy + 1, 16, 3, '#5a3a1e'); rect(ctx, cx - 2, cy - 4, 3, 10, '#6b4a2b');
  const f = 1 + 0.25 * Math.sin(env.clock * 9 + b.x), f2 = 1 + 0.3 * Math.sin(env.clock * 13 + 1.7);
  poly(ctx, [cx - 6, cy + 2, cx - 1, cy - 8 * f, cx + 1, cy - 4, cx + 6, cy + 2], '#ff7a20');
  poly(ctx, [cx - 4, cy + 2, cx + 1, cy - 11 * f2, cx + 4, cy + 2], '#ffa030');
  poly(ctx, [cx - 2, cy + 2, cx, cy - 5 * f, cx + 2, cy + 2], '#fff0a0');
}
