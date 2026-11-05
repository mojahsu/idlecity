// well: drawn in its tile; the shared pieces live in shared.ts.
import { ellipse, rect, line, groundShadow, rgba } from '../palette';
import type { BuildingArt } from './shared';
import { roofShingles } from './shared';

export function drawWell(art: BuildingArt): void {
  const { ctx, env, cx, cy, snow } = art;
  groundShadow(ctx, cx, cy + 8, 9, 3);
  ellipse(ctx, cx, cy + 4, 8, 4.5, '#7f8ba0'); ellipse(ctx, cx, cy + 3, 8, 4.5, '#9aa5b8');
  ellipse(ctx, cx, cy + 3, 5, 2.8, '#2f5f8f');
  ellipse(ctx, cx - 1, cy + 2.5, 2, 1, rgba('#ffffff', 0.4));
  rect(ctx, cx - 7, cy - 9, 1.8, 13, '#6b4a2b'); rect(ctx, cx + 5.2, cy - 9, 1.8, 13, '#6b4a2b');
  roofShingles(ctx, cx - 10, cy - 8, cx + 10, cy - 8, cx, cy - 14, snow ? '#e9edf0' : '#4f5b70');
  line(ctx, cx, cy - 8, cx, cy - 1 + Math.sin(env.clock) * 1.5, '#3a3a3a', 0.8);
  rect(ctx, cx - 1.5, cy - 1 + Math.sin(env.clock) * 1.5, 3, 2.5, '#8a6a3a');
}
