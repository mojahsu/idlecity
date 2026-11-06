// The river: static base with wet banks, foam and lily pads, plus animated
// caustics, double-crest shoreline waves, and real-time riverbank reflections.
import type { GameState } from '../../sim/types';
import { TILE } from '../constants';
import { circle, ellipse, rect, rgba, hash, PALETTE, type Env } from '../palette';

export function drawWaterBase(ctx: CanvasRenderingContext2D, s: GameState, x: number, y: number, env: Env): void {
  const pal = PALETTE[env.season];
  const px = x * TILE, py = y * TILE;
  const land = (dx: number, dy: number) => { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= s.width || ny >= s.height) return false; return s.tiles[ny * s.width + nx].terrain !== 'water'; };
  // Bank (sand + wet shoreline rim) drawn on the neighbouring land side.
  ctx.fillStyle = pal.bank;
  if (land(1, 0)) { ctx.fillRect(px + TILE, py, 4.5, TILE); rect(ctx, px + TILE, py, 2, TILE, 'rgba(35,25,15,0.22)'); }
  if (land(-1, 0)) { ctx.fillRect(px - 4.5, py, 4.5, TILE); rect(ctx, px - 2, py, 2, TILE, 'rgba(35,25,15,0.22)'); }
  if (land(0, 1)) { ctx.fillRect(px, py + TILE, TILE, 4.5); rect(ctx, px, py + TILE, TILE, 2, 'rgba(35,25,15,0.22)'); }
  if (land(0, -1)) { ctx.fillRect(px, py - 4.5, TILE, 4.5); rect(ctx, px, py - 2, TILE, 2, 'rgba(35,25,15,0.22)'); }
  const deep = !land(1, 0) && !land(-1, 0);
  ctx.fillStyle = deep ? pal.waterDeep : pal.water;
  ctx.fillRect(px, py, TILE, TILE);
  // Subtle depth gradient across the channel.
  if (land(1, 0)) {
    const g = ctx.createLinearGradient(px, py, px + TILE, py);
    g.addColorStop(0, rgba(pal.waterDeep, 0.45));
    g.addColorStop(1, 'rgba(180,235,255,0.16)');
    ctx.fillStyle = g; ctx.fillRect(px, py, TILE, TILE);
  }
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

/** Animated layer: water caustics, shoreline ripples, and real-time riverbank reflections. */
export function drawWater(ctx: CanvasRenderingContext2D, s: GameState, env: Env): void {
  const c = env.clock;
  const pal = PALETTE[env.season];
  const goldenHour = (env.dayFrac > 0.2 && env.dayFrac < 0.34) || (env.dayFrac > 0.66 && env.dayFrac < 0.8);
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
    const t = s.tiles[y * s.width + x];
    if (t.terrain !== 'water') continue;
    const px = x * TILE, py = y * TILE;
    const eastTile = x + 1 < s.width ? s.tiles[y * s.width + (x + 1)] : null;
    const isShore = !!eastTile && eastTile.terrain !== 'water';

    // 1. Real-time sine-rippled reflection of trees/buildings along the eastern bank.
    if (isShore && eastTile.terrain === 'forest' && eastTile.amount >= 1) {
      const canopyCol = pal.canopy[Math.floor(eastTile.v * pal.canopy.length) % pal.canopy.length];
      for (let sRow = 0; sRow < 4; sRow++) {
        const rip = Math.sin(c * 3.2 + y * 1.7 + sRow * 1.3) * 2.2;
        ellipse(ctx, px + TILE - 6 - sRow * 2.2 + rip, py + 5 + sRow * 4.5, 6 - sRow * 0.8, 1.8, rgba(canopyCol, 0.24 - sRow * 0.04));
      }
    }

    // 2. Shimmering underwater caustic light-webs in daytime.
    if (env.dark < 0.55) {
      const caustA = (1 - env.dark * 1.5) * (isShore ? 0.16 : 0.1);
      const cw = Math.sin(c * 2.1 + x * 1.3 + y * 0.9) * 2.5;
      ctx.strokeStyle = `rgba(205,248,255,${caustA})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(px + 11 + cw, py + 11 - cw * 0.5, 5.5, 0.3, 2.5);
      ctx.stroke();
    }

    // 3. Animated double shoreline foam lapping the eastern bank.
    if (isShore) {
      const lap = (Math.sin(c * 2.4 + y * 0.8) + 1) * 0.5;
      ctx.strokeStyle = `rgba(255,255,255,${0.22 + 0.25 * lap})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(px + TILE - 1.5 - lap * 2.5, py + 1);
      ctx.quadraticCurveTo(px + TILE - 3 - lap * 2.5, py + TILE / 2, px + TILE - 1.5 - lap * 2.5, py + TILE - 1);
      ctx.stroke();
    }

    // 4. Flowing surface highlights & golden-hour / starlight specular glints.
    const phase = (c * 0.6 + t.v * 3 + y * 0.35) % 1;
    const o = phase * TILE;
    const specCol = goldenHour ? '255,215,140' : '255,255,255';
    ctx.strokeStyle = `rgba(${specCol},${(goldenHour ? 0.22 : 0.13) + 0.18 * Math.sin(phase * Math.PI)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(px + 3, py + o); ctx.quadraticCurveTo(px + 10, py + o - 3, px + 17, py + o); ctx.stroke();

    if (env.dark > 0.35 && hash(x, y, 40) > 0.5) {
      const sp = 0.5 + 0.5 * Math.sin(c * 3.2 + t.v * 20);
      ctx.fillStyle = `rgba(225,240,255,${0.42 * sp * env.dark})`;
      ctx.fillRect(px + 5 + t.v * 11, py + 10 + hash(x, y, 41) * 9, 2.2, 1.2);
    }
  }
}
