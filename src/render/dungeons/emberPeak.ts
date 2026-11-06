// Ember Peak entrance: a volcanic crag with a molten fissure and rising sparks.
import { circle, ellipse, poly, groundShadow, glow, rgba } from '../palette';
import type { DungeonArt } from './shared';

export function drawEmberPeak(art: DungeonArt): void {
  const { ctx, env, cx, cy } = art;
  const pulse = 0.5 + 0.5 * Math.sin(env.clock * 3);
  groundShadow(ctx, cx, cy + 10, 14, 4);
  // Jagged volcanic crag.
  poly(ctx, [cx - 13, cy + 8, cx - 8, cy - 12, cx - 2, cy - 7, cx + 3, cy - 15, cx + 10, cy - 8, cx + 13, cy + 8], '#3a2220');
  poly(ctx, [cx - 10, cy + 8, cx - 6, cy - 9, cx, cy - 5, cx + 3, cy - 12, cx + 8, cy + 8], '#4e2c28');
  // Glowing lava maw.
  poly(ctx, [cx - 5, cy + 8, cx - 3, cy - 2, cx + 3, cy - 2, cx + 5, cy + 8], '#1e0c0a');
  ellipse(ctx, cx, cy + 7, 5.5, 2.2, rgba('#ff6820', 0.75 + 0.2 * pulse));
  ellipse(ctx, cx, cy + 7, 3.2, 1.2, '#ffd060');
  glow(ctx, cx, cy + 3, 12, '#ff6020', 0.22 + 0.15 * pulse);
  for (let i = 0; i < 3; i++) {
    const t = (env.clock * 0.9 + i * 0.33) % 1;
    circle(ctx, cx + Math.sin(env.clock * 3 + i * 2) * 4, cy + 2 - t * 18, 1.1 * (1 - t), rgba('#ffa040', 0.9 * (1 - t)));
  }
}
