// The river: static base with banks, foam and lily pads, plus animated flow.
import type { GameState } from '../../sim/types';
import { TILE } from '../constants';
import { circle, ellipse, rect, rgba, hash, PALETTE, type Env } from '../palette';

export function drawWaterBase(ctx: CanvasRenderingContext2D, s: GameState, x: number, y: number, env: Env): void {
  const pal = PALETTE[env.season];
  const px = x * TILE, py = y * TILE;
  const land = (dx: number, dy: number) => { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= s.width || ny >= s.height) return false; return s.tiles[ny * s.width + nx].terrain !== 'water'; };
  // Bank (sand) drawn on the neighbouring land side.
  ctx.fillStyle = pal.bank;
  if (land(1, 0)) ctx.fillRect(px + TILE, py, 4, TILE);
  if (land(-1, 0)) ctx.fillRect(px - 4, py, 4, TILE);
  if (land(0, 1)) ctx.fillRect(px, py + TILE, TILE, 4);
  if (land(0, -1)) ctx.fillRect(px, py - 4, TILE, 4);
  const deep = !land(1, 0) && !land(-1, 0);
  ctx.fillStyle = deep ? pal.waterDeep : pal.water;
  ctx.fillRect(px, py, TILE, TILE);
  // Gentle depth variation and a few darker swirls.
  ellipse(ctx, px + TILE / 2 + (hash(x, y, 42) - 0.5) * 8, py + TILE / 2 + (hash(y, x, 43) - 0.5) * 8, 9, 5, rgba(deep ? '#1f4c74' : pal.waterDeep, 0.35));
  // Foam and a lighter shallow strip along the bank.
  if (land(1, 0)) { rect(ctx, px + TILE - 4, py, 4, TILE, rgba('#ffffff', 0.18)); for (let i = 0; i < 3; i++) rect(ctx, px + TILE - 3, py + 2 + i * 8 + hash(x, y, 44 + i) * 4, 2, 2, rgba('#ffffff', 0.5)); }
  if (land(-1, 0)) rect(ctx, px, py, 4, TILE, rgba('#ffffff', 0.18));
  if (land(0, 1)) rect(ctx, px, py + TILE - 3, TILE, 3, rgba('#ffffff', 0.14));
  if (land(0, -1)) rect(ctx, px, py, TILE, 3, rgba('#ffffff', 0.14));
  // Lily pads in the calm shallows.
  if (!deep && env.season !== 'winter' && hash(x, y, 45) > 0.72) {
    const lx = px + 6 + hash(x, y, 46) * 12, ly = py + 6 + hash(y, x, 47) * 12;
    ctx.fillStyle = '#4f9a3f'; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.arc(lx, ly, 3.2, 0.4, Math.PI * 2 - 0.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3f7f33'; ctx.beginPath(); ctx.moveTo(lx + 1, ly + 1); ctx.arc(lx + 1, ly + 1, 2.2, 0.4, Math.PI * 2 - 0.3); ctx.closePath(); ctx.fill();
    if (env.season === 'summer' && hash(x, y, 48) > 0.5) circle(ctx, lx + 3, ly - 2, 1.4, '#f8c8e0');
  }
  // Reeds on the bank.
  if (hash(x, y, 13) > 0.65 && land(1, 0) && env.season !== 'winter') {
    const rx = px + TILE + 1, ry = py + 6 + hash(x, y, 14) * 12;
    ctx.strokeStyle = '#5f8f3a'; ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(rx + i * 2, ry + 6); ctx.lineTo(rx + i * 2 + 1, ry - 4 - i); ctx.stroke(); }
    rect(ctx, rx + 2, ry - 6, 2, 4, '#7a5a3a');
  }
}

/** Animated layer: water ripples and swaying trees (sorted into the scene by y). */
export function drawWater(ctx: CanvasRenderingContext2D, s: GameState, env: Env): void {
  const c = env.clock;
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
    const t = s.tiles[y * s.width + x];
    if (t.terrain !== 'water') continue;
    const px = x * TILE, py = y * TILE;
    // Flowing highlights drifting downstream.
    const phase = (c * 0.6 + t.v * 3 + y * 0.35) % 1;
    const o = phase * TILE;
    ctx.strokeStyle = `rgba(255,255,255,${0.12 + 0.18 * Math.sin(phase * Math.PI)})`; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(px + 3, py + o); ctx.quadraticCurveTo(px + 10, py + o - 3, px + 17, py + o); ctx.stroke();
    if (env.dark > 0.4 && hash(x, y, 40) > 0.6) {
      const sp = 0.5 + 0.5 * Math.sin(c * 3 + t.v * 20);
      ctx.fillStyle = `rgba(220,235,255,${0.35 * sp * env.dark})`; ctx.fillRect(px + 6 + t.v * 10, py + 12 + hash(x, y, 41) * 8, 2, 1);
    }
  }
}
