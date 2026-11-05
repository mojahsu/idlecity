// Oak: the layered round canopy, apples in summer, blossom in spring.
import { circle, shade, rgba, hash } from '../../palette';
import type { TreeArt } from './shared';

export function drawOak(art: TreeArt): void {
  const { ctx, x, y, t, env, pal, size, r, sway, cx, cy, base } = art;
// Trunk.
ctx.fillStyle = '#5a3a1e'; ctx.fillRect(cx - 1.6, cy - 1, 3.2, 9 * size);
ctx.fillStyle = '#7a5230'; ctx.fillRect(cx - 1.6, cy - 1, 1.2, 9 * size);
// Layered canopy.
circle(ctx, cx + sway * 0.4 + 1, cy - 2, r, pal.canopyShade);
circle(ctx, cx + sway * 0.6 - r * 0.45, cy - 1, r * 0.75, base);
circle(ctx, cx + sway * 0.6 + r * 0.45, cy - 1, r * 0.75, base);
circle(ctx, cx + sway, cy - r * 0.55, r * 0.85, shade(base, 0.08));
circle(ctx, cx + sway - r * 0.25, cy - r * 0.85, r * 0.45, shade(base, 0.25));
// Leaf texture: a few darker dabs along the lower canopy.
for (let i = 0; i < 3; i++) circle(ctx, cx + sway + (hash(x, y, 90 + i) - 0.5) * r * 1.3, cy - 2 + (hash(y, x, 95 + i) - 0.5) * r * 0.6, r * 0.22, rgba(pal.canopyShade, 0.5));
if (env.season === 'spring' && t.v > 0.6) {
  for (let i = 0; i < 4; i++) circle(ctx, cx + sway + Math.cos(i * 1.7 + t.v * 6) * r * 0.6, cy - r * 0.5 + Math.sin(i * 2.1 + t.v) * r * 0.5, 1.2, '#f7c6dc');
}
if (env.season === 'summer' && t.v > 0.78) {
  for (let i = 0; i < 4; i++) { const ax = cx + sway + Math.cos(i * 1.9 + t.v * 5) * r * 0.55, ay = cy - r * 0.45 + Math.sin(i * 2.3 + t.v) * r * 0.45; circle(ctx, ax, ay, 1.3, '#d83a3a'); circle(ctx, ax - 0.4, ay - 0.4, 0.5, '#ff9a9a'); }
}
if (env.season === 'autumn' && t.v > 0.4) {
  circle(ctx, cx + sway + r * 0.3, cy - r * 0.9, r * 0.35, '#e8c040');
}
if (env.season === 'winter') {
  ctx.fillStyle = '#f4f7f9';
  ctx.beginPath(); ctx.arc(cx + sway, cy - r * 0.55, r * 0.85, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + sway - r * 0.45, cy - 1, r * 0.75, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
}
}
