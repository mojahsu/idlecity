// Dark Tower: a tall spire with bats and a pulsing glow, gold once the Demon Lord is dead.
import { circle, line, poly, rect, groundShadow, glow, rgba } from '../palette';
import type { DungeonArt } from './shared';

export function drawDarkTower(art: DungeonArt): void {
  const { ctx, s, env, cx, cy } = art;
  // Dark tower: tall spire, bats, a pulsing purple glow (gold and blooming with doves once the Demon Lord is dead).
  const pulse = 0.5 + 0.5 * Math.sin(env.clock * 2);
  const besieged = !s.victory && s.parties.some((p) => p.dungeon === 'darkTower' && (p.phase === 'explore' || p.phase === 'fight'));
  groundShadow(ctx, cx, cy + 10, 11, 4, 0.35);
  if (besieged) {
    glow(ctx, cx, cy - 22, 22, '#d02070', 0.25 + 0.2 * Math.sin(env.clock * 6));
    // Crackling dark-magic lightning around the spire during an active assault.
    if (Math.sin(env.clock * 11) > 0.2) {
      const side = Math.sin(env.clock * 7) > 0 ? 1 : -1;
      line(ctx, cx, cy - 38, cx + side * 8, cy - 24, '#ff70c0', 1.1);
      line(ctx, cx + side * 8, cy - 24, cx + side * 4, cy - 12, '#ffe0ff', 0.9);
    }
  }
  rect(ctx, cx - 7, cy - 18, 14, 28, s.victory ? '#4a4656' : '#2a1a3a'); rect(ctx, cx - 7, cy - 18, 2, 28, s.victory ? '#625e70' : '#3a2a4a');
  rect(ctx, cx - 9, cy - 22, 18, 5, s.victory ? '#5a5468' : '#3a2a4a'); for (let i = 0; i < 4; i++) rect(ctx, cx - 9 + i * 5, cy - 26, 3, 4, s.victory ? '#5a5468' : '#3a2a4a');
  poly(ctx, [cx - 4, cy - 26, cx, cy - 38, cx + 4, cy - 26], s.victory ? '#3a4a68' : '#1f1230');
  for (const wy of [cy - 14, cy - 6, cy + 2]) { rect(ctx, cx - 1.5, wy, 3, 4, s.victory ? '#ffe080' : `rgba(${160 + 60 * pulse},60,${220},1)`); }
  ctx.fillStyle = '#0d0810'; ctx.beginPath(); ctx.roundRect(cx - 3, cy + 3, 6, 8, [3, 3, 0, 0]); ctx.fill();
  for (let i = 0; i < 3; i++) {
    const a = env.clock * 1.5 + i * 2.1, bx = cx + Math.cos(a) * (12 + i * 3), by = cy - 28 + Math.sin(a * 1.7) * 6;
    const fl = Math.sin(env.clock * 14 + i) * 2;
    poly(ctx, [bx - 3, by - fl, bx, by + 1, bx + 3, by - fl, bx, by - 1], s.victory ? '#f8f8fc' : '#1a1020');
  }
  if (s.victory) {
    glow(ctx, cx, cy - 40, 13, '#ffe070', 0.35 + 0.15 * pulse);
    circle(ctx, cx, cy - 40, 2.2, '#fff0a0');
    // Greenery and flowers reclaiming the tower base.
    circle(ctx, cx - 7, cy + 9, 2.2, '#4f9a48'); circle(ctx, cx + 7, cy + 9, 2.2, '#4f9a48');
    circle(ctx, cx - 6.5, cy + 8.5, 1, '#f7d94c'); circle(ctx, cx + 6.5, cy + 8.5, 1, '#ffffff');
  }
}
