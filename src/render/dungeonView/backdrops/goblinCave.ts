// Goblin cave: stalactites, roots, glowing mushrooms, bones, puddles.
import { circle, ellipse, poly, rect, rgba, hash } from '../../palette';
import { PANEL_H, PANEL_W } from '../layout';
import type { BackdropArt } from './shared';

export function drawGoblinCave(art: BackdropArt): void {
  const { ctx, floorY, far, mid, near, c } = art;
  const g = ctx.createLinearGradient(0, 0, 0, PANEL_H); g.addColorStop(0, '#241a14'); g.addColorStop(1, '#3e2e24'); ctx.fillStyle = g; ctx.fillRect(0, 0, PANEL_W, PANEL_H);
  // Far rock masses.
  for (let i = -1; i < 5; i++) { const x = i * 90 - far; ctx.fillStyle = '#2e2219'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 10, 30 + hash(i, 7) * 14); ctx.lineTo(x + 26, 8); ctx.lineTo(x + 40, 36 + hash(i, 8) * 12); ctx.lineTo(x + 58, 4); ctx.lineTo(x + 72, 26 + hash(i, 9) * 10); ctx.lineTo(x + 90, 0); ctx.closePath(); ctx.fill(); }
  // Mid stalactites with a lit edge, hanging roots, glowing mushrooms, bones.
  for (let i = -1; i < 6; i++) {
    const x = i * 60 - mid, h = 18 + hash(i, 1) * 12;
    poly(ctx, [x, 0, x + 7, h, x + 14, 0], '#4a3a2e'); poly(ctx, [x, 0, x + 7, h, x + 4, 0], '#5a4a3c');
    poly(ctx, [x + 30, 0, x + 38, h * 0.7, x + 46, 0], '#4a3a2e'); poly(ctx, [x + 30, 0, x + 38, h * 0.7, x + 34, 0], '#5a4a3c');
    ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 22, 0); ctx.quadraticCurveTo(x + 18 + Math.sin(c + i) * 2, 14, x + 24, 24 + hash(i, 4) * 10); ctx.stroke();
    const mxs = x + 12 + hash(i, 5) * 30;
    for (let k = 0; k < 3; k++) { const gm = 0.6 + 0.4 * Math.sin(c * 2 + i + k); circle(ctx, mxs + k * 4, floorY - 2 - (k % 2) * 2, 4, rgba('#60c0ff', 0.12 * gm)); rect(ctx, mxs + k * 4 - 0.5, floorY - 4 + (k % 2), 1, 3, '#c8d8e8'); circle(ctx, mxs + k * 4, floorY - 4 + (k % 2), 1.6, rgba('#8ae0ff', 0.7 + 0.3 * gm)); }
    if (hash(i, 6) > 0.5) { rect(ctx, x + 44, floorY - 1.5, 7, 1.2, '#e8e4d8'); circle(ctx, x + 44, floorY - 1.2, 1.2, '#e8e4d8'); circle(ctx, x + 51, floorY - 1.2, 1.2, '#e8e4d8'); }
    if (hash(i, 10) > 0.7) { circle(ctx, x + 6, floorY - 2.5, 2.6, '#e8e4d8'); rect(ctx, x + 4.5, floorY - 3.5, 1, 1, '#1a1410'); rect(ctx, x + 6.5, floorY - 3.5, 1, 1, '#1a1410'); }
  }
  // Floor: packed earth, pebbles, puddles.
  rect(ctx, 0, floorY, PANEL_W, PANEL_H - floorY, '#2a1e16'); rect(ctx, 0, floorY, PANEL_W, 2, '#5a4a3a');
  for (let i = -1; i < 8; i++) { const x = i * 45 - near; ellipse(ctx, x + 20, floorY + 12, 9, 2.5, rgba('#4a6a8a', 0.5)); ellipse(ctx, x + 18, floorY + 11.5, 3, 0.8, rgba('#ffffff', 0.25)); circle(ctx, x + 36, floorY + 8 + hash(i, 11) * 8, 1.6, '#4a3e36'); circle(ctx, x + 6, floorY + 16, 1.2, '#4a3e36'); }
}
