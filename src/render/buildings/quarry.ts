// quarry: drawn in its tile; the shared pieces live in shared.ts.
import { TILE } from '../constants';
import { ellipse, rect, line } from '../palette';
import type { BuildingArt } from './shared';

export function drawQuarry(art: BuildingArt): void {
  const { ctx, env, px, py, cx, cy, snow, v } = art;
  // Pit with cut blocks and a crane arm.
  ellipse(ctx, cx, cy + 3, 12, 8, '#6e6e6a');
  ellipse(ctx, cx, cy + 3, 9, 5.5, '#4e4e4a');
  for (let i = 0; i < 3; i++) { rect(ctx, px + 3 + i * 6, py + 2 + (i % 2) * 2, 5, 4, '#a9a9a3'); rect(ctx, px + 3 + i * 6, py + 2 + (i % 2) * 2, 5, 1, '#c6c6c0'); }
  rect(ctx, px + TILE - 6, py + 4, 2, 16, '#6b4a2b');
  const swing = Math.sin(env.clock * 0.8 + v * 6) * 2;
  line(ctx, px + TILE - 5, py + 5, px + TILE - 14 + swing, py + 1, '#6b4a2b', 2);
  line(ctx, px + TILE - 14 + swing, py + 1, px + TILE - 14 + swing, py + 9, '#3a3a3a', 0.8);
  rect(ctx, px + TILE - 16 + swing, py + 9, 4, 3, '#a9a9a3');
  if (snow) ellipse(ctx, cx - 4, cy - 2, 5, 2, '#f4f7f9');
}
