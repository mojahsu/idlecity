// Grass detail: blades, tufts, clover, flowers, mushrooms, pebbles, puddles.
import { circle, ellipse, rect, line, shade, rgba, hash, PALETTE, type Env } from '../palette';

export function drawGrassDetail(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, env: Env, underTree = false): void {
  const pal = PALETTE[env.season];
  const n = hash(x, y, 3);
  if (env.season === 'winter') {
    if (n > 0.7) ellipse(ctx, px + 6 + n * 10, py + 8 + hash(x, y, 4) * 8, 5, 2.5, '#f2f5f7');
    return;
  }
  // Fine texture: a few short blades per tile in two shades, so the ground never reads flat.
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const bx = px + 2 + hash(x, y, 60 + i) * 20, by = py + 3 + hash(y, x, 70 + i) * 18;
    ctx.strokeStyle = rgba(i === 1 ? pal.grassDark : pal.tuft, 0.55);
    ctx.beginPath(); ctx.moveTo(bx, by + 2); ctx.lineTo(bx + 1, by - 2); ctx.stroke();
  }
  // Grass tufts.
  if (n > 0.35) {
    const tx = px + 4 + hash(x, y, 5) * 16, ty = py + 6 + hash(x, y, 6) * 14;
    ctx.strokeStyle = pal.tuft; ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(tx + i * 1.4, ty); ctx.lineTo(tx + i * 2.4, ty - 4 - (2 - Math.abs(i))); ctx.stroke(); }
  }
  // Clover patch.
  if (n > 0.62 && n < 0.7 && !underTree) {
    for (let i = 0; i < 5; i++) { const cx = px + 5 + hash(x + 3, y + i, 15) * 14, cy = py + 5 + hash(x + i, y + 3, 16) * 14; circle(ctx, cx, cy, 1.4, shade(pal.grassDark, 0.1)); circle(ctx, cx - 0.5, cy - 0.5, 0.5, pal.tuft); }
  }
  // Flowers, in small clusters.
  if (!underTree && pal.flowers.length && n > 0.84) {
    const c = pal.flowers[Math.floor(hash(x, y, 7) * pal.flowers.length)];
    const ox = px + 6 + hash(x, y, 17) * 12, oy = py + 6 + hash(y, x, 18) * 12;
    for (let i = 0; i < 5; i++) {
      const fx = ox + (hash(x + i, y, 8) - 0.5) * 9, fy = oy + (hash(x, y + i, 9) - 0.5) * 8;
      line(ctx, fx, fy + 3, fx, fy, pal.grassDark, 0.8);
      circle(ctx, fx, fy, 1.4, c); circle(ctx, fx, fy, 0.55, '#f7d94c');
    }
  }
  // Mushrooms in the shade of the woods.
  if (underTree && (env.season === 'autumn' || env.season === 'spring') && n > 0.7) {
    const mx = px + 4 + hash(x, y, 19) * 14, my = py + 14 + hash(y, x, 20) * 6;
    for (let i = 0; i < 2; i++) { rect(ctx, mx + i * 4, my - 2, 1.6, 3, '#e8dcc0'); ctx.fillStyle = i ? '#c8503a' : '#b08a52'; ctx.beginPath(); ctx.arc(mx + i * 4 + 0.8, my - 2, 2.4, Math.PI, 0); ctx.fill(); if (!i) { rect(ctx, mx - 0.5, my - 3.5, 0.8, 0.8, '#fff'); rect(ctx, mx + 1.5, my - 3, 0.8, 0.8, '#fff'); } }
  }
  // Small pebbles.
  if (n < 0.08) { circle(ctx, px + 8 + n * 80, py + 14, 1.5, '#9c9a90'); circle(ctx, px + 11 + n * 80, py + 15.5, 1, '#b5b2a6'); }
  // Puddles on rainy days.
  if (env.rainy && !underTree && hash(x, y, 21) > 0.88) {
    const qx = px + 6 + hash(x, y, 22) * 12, qy = py + 8 + hash(y, x, 23) * 8;
    ellipse(ctx, qx, qy, 6, 3, rgba('#3e86bd', 0.45)); ellipse(ctx, qx - 1.5, qy - 0.8, 2.5, 1, rgba('#ffffff', 0.35));
  }
}
