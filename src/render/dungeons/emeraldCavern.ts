// Emerald Cavern entrance: a mossy grotto framed by glowing emerald crystals.
import { circle, ellipse, poly, groundShadow, glow, rgba } from '../palette';
import type { DungeonArt } from './shared';

export function drawEmeraldCavern(art: DungeonArt): void {
  const { ctx, env, cx, cy } = art;
  const pulse = 0.5 + 0.5 * Math.sin(env.clock * 2.4);
  groundShadow(ctx, cx, cy + 9, 13, 4);
  ellipse(ctx, cx, cy + 2, 12, 8, '#283e34');
  ellipse(ctx, cx, cy + 1, 10, 6.5, '#355244');
  ellipse(ctx, cx, cy + 4, 6.5, 4.8, '#0c1814');
  // Glowing emerald crystal spires flanking the mouth.
  for (const [dx, dy, h] of [[-9, 3, 9], [-6, -1, 12], [8, 2, 10], [5, -2, 11]] as [number, number, number][]) {
    poly(ctx, [cx + dx - 2, cy + dy, cx + dx, cy + dy - h, cx + dx + 2, cy + dy], '#2ac88a');
    poly(ctx, [cx + dx - 1, cy + dy, cx + dx, cy + dy - h * 0.85, cx + dx + 1, cy + dy], '#80ffd0');
  }
  glow(ctx, cx, cy - 1, 11, '#30e8a0', 0.18 + 0.14 * pulse);
  circle(ctx, cx - 2.5, cy + 3, 1, rgba('#60ffc0', 0.6 + 0.3 * pulse));
  circle(ctx, cx + 2.5, cy + 3, 1, rgba('#60ffc0', 0.6 + 0.3 * pulse));
}
