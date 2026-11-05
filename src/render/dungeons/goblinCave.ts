// Goblin cave entrance: a rocky mound with a dark mouth, bones and a skull on a stake.
import { TILE } from '../constants';
import { circle, ellipse, rect, groundShadow, rgba } from '../palette';
import type { DungeonArt } from './shared';

export function drawGoblinCave(art: DungeonArt): void {
  const { ctx, env, px, py, cx, cy } = art;
  groundShadow(ctx, cx, cy + 9, 13, 4);
  ellipse(ctx, cx, cy + 3, 13, 9, '#6a5a4a'); ellipse(ctx, cx - 3, cy, 9, 6, '#7d6c5a');
  if (env.season === 'winter') ellipse(ctx, cx - 3, cy - 3, 7, 2.5, '#f4f7f9');
  ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.arc(cx, cy + 5, 6.5, Math.PI, 0); ctx.fill(); ctx.fillRect(cx - 6.5, cy + 5, 13, 6);
  // Bones and a skull on a stake.
  rect(ctx, px + 2, py + TILE - 3, 5, 1.2, '#e8e4d8'); rect(ctx, px + TILE - 7, py + TILE - 2.5, 4, 1.2, '#e8e4d8');
  rect(ctx, px + TILE - 4, cy - 9, 1.2, 12, '#5a3a1e'); circle(ctx, px + TILE - 3.4, cy - 10, 2.4, '#efeadc'); rect(ctx, px + TILE - 4.6, cy - 10.5, 1, 1, '#1a1410'); rect(ctx, px + TILE - 2.8, cy - 10.5, 1, 1, '#1a1410');
  if (env.dark > 0.3) { const g = 0.5 + 0.5 * Math.sin(env.clock * 3); rect(ctx, cx - 2.5, cy + 6, 1.2, 1.2, `rgba(255,220,60,${g})`); rect(ctx, cx + 1.5, cy + 6, 1.2, 1.2, `rgba(255,220,60,${g})`); }
}
