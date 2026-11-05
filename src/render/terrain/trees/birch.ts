// Birch: pale banded trunk and a loose, light canopy.
import { circle, shade, hash } from '../../palette';
import type { TreeArt } from './shared';

export function drawBirch(art: TreeArt): void {
  const { ctx, x, y, t, env, size, r, sway, cx, cy, base } = art;
// Birch: pale trunk with dark bands and a looser, lighter canopy.
ctx.fillStyle = '#e8e4dc'; ctx.fillRect(cx - 1.4, cy - 2, 2.8, 10 * size);
ctx.fillStyle = '#3a3a3a'; for (let i = 0; i < 3; i++) ctx.fillRect(cx - 1.4 + (i % 2), cy + i * 3 * size, 1.4, 1);
const light = env.season === 'autumn' ? '#e8c040' : shade(base, 0.2);
for (let i = 0; i < 6; i++) { const a = i * 1.05 + t.v * 4, rr = r * (0.55 + 0.25 * hash(x, y, 80 + i)); circle(ctx, cx + sway + Math.cos(a) * r * 0.5, cy - r * 0.5 + Math.sin(a) * r * 0.42, rr, i % 2 ? light : shade(base, 0.05)); }
circle(ctx, cx + sway - r * 0.2, cy - r * 0.8, r * 0.4, shade(light, 0.2));
if (env.season === 'winter') { ctx.fillStyle = '#f4f7f9'; ctx.beginPath(); ctx.arc(cx + sway, cy - r * 0.6, r * 0.7, Math.PI, 0); ctx.fill(); }
}
