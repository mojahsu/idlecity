// blacksmith: drawn in its tile; the shared pieces live in shared.ts.
import { TILE } from '../constants';
import { rect, groundShadow, rgba } from '../palette';
import type { BuildingArt } from './shared';
import { roofShingles, wallBox, chimney } from './shared';

export function drawBlacksmith(art: BuildingArt): void {
  const { ctx, env, px, py, cx, bottom, snow, v } = art;
  groundShadow(ctx, cx + 2, bottom + 1, 14, 4);
  wallBox(ctx, px + 2, py + 5, TILE - 4, TILE - 7, '#5a5a5e', true);
  roofShingles(ctx, px - 1, py + 6, px + TILE + 1, py + 6, cx, py - 3, snow ? '#e9edf0' : '#3a3a40');
  chimney(ctx, px + TILE - 8, py - 1);
  // Open forge: glowing arch.
  const pulse = 0.6 + 0.4 * Math.sin(env.clock * 5 + v * 4);
  ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(cx - 3, py + TILE - 3, 5, Math.PI, 0); ctx.fill();
  ctx.fillStyle = `rgba(255,${120 + 60 * pulse},40,${0.75 + 0.25 * pulse})`; ctx.beginPath(); ctx.arc(cx - 3, py + TILE - 3, 3.2, Math.PI, 0); ctx.fill();
  // Anvil.
  rect(ctx, px + TILE - 9, py + TILE - 7, 6, 2, '#2a2a2a'); rect(ctx, px + TILE - 7, py + TILE - 5, 2, 3, '#2a2a2a'); rect(ctx, px + TILE - 10, py + TILE - 8, 8, 1.5, '#4a4a50');
}
