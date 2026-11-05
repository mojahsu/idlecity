// Dark Tower: a tall spire with bats and a pulsing glow, gold once the Demon Lord is dead.
import { circle, poly, rect, roundRect, groundShadow, glow, rgba } from '../palette';
import type { DungeonArt } from './shared';

export function drawDarkTower(art: DungeonArt): void {
  const { ctx, s, env, cx, cy } = art;
  // Dark tower: tall spire, bats, a pulsing purple glow (gold once the Demon Lord is dead).
  const col = s.victory ? '#f0d050' : '#a040e0';
  const pulse = 0.5 + 0.5 * Math.sin(env.clock * 2);
  groundShadow(ctx, cx, cy + 10, 11, 4, 0.35);
  rect(ctx, cx - 7, cy - 18, 14, 28, '#2a1a3a'); rect(ctx, cx - 7, cy - 18, 2, 28, '#3a2a4a');
  rect(ctx, cx - 9, cy - 22, 18, 5, '#3a2a4a'); for (let i = 0; i < 4; i++) rect(ctx, cx - 9 + i * 5, cy - 26, 3, 4, '#3a2a4a');
  poly(ctx, [cx - 4, cy - 26, cx, cy - 38, cx + 4, cy - 26], '#1f1230');
  for (const wy of [cy - 14, cy - 6, cy + 2]) { rect(ctx, cx - 1.5, wy, 3, 4, s.victory ? '#f0d050' : `rgba(${160 + 60 * pulse},60,${220},1)`); }
  ctx.fillStyle = '#0d0810'; ctx.beginPath(); ctx.roundRect(cx - 3, cy + 3, 6, 8, [3, 3, 0, 0]); ctx.fill();
  if (!s.victory) for (let i = 0; i < 3; i++) {
    const a = env.clock * 1.5 + i * 2.1, bx = cx + Math.cos(a) * (12 + i * 3), by = cy - 28 + Math.sin(a * 1.7) * 6;
    const fl = Math.sin(env.clock * 14 + i) * 2;
    poly(ctx, [bx - 3, by - fl, bx, by + 1, bx + 3, by - fl, bx, by - 1], '#1a1020');
  }
  if (s.victory) circle(ctx, cx, cy - 40, 2, '#f0d050');
  void col;
}
