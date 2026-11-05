// Ancient ruins: broken arches, moonlight, vines, runes, mossy flagstones.
import { circle, ellipse, poly, rect, roundRect, rgba, hash } from '../../palette';
import { PANEL_H, PANEL_W } from '../layout';
import type { BackdropArt } from './shared';

export function drawAncientRuins(art: BackdropArt): void {
  const { ctx, floorY, far, mid, near, c } = art;
  const g = ctx.createLinearGradient(0, 0, 0, PANEL_H); g.addColorStop(0, '#1a1e30'); g.addColorStop(1, '#2e3246'); ctx.fillStyle = g; ctx.fillRect(0, 0, PANEL_W, PANEL_H);
  // Far broken walls with arches.
  for (let i = -1; i < 5; i++) { const x = i * 90 - far; rect(ctx, x, 20 + hash(i, 12) * 10, 90, floorY, '#262a3c'); ctx.fillStyle = '#1a1e30'; ctx.beginPath(); ctx.roundRect(x + 28, 36, 24, floorY, [12, 12, 0, 0]); ctx.fill(); rect(ctx, x + 60, 12 + hash(i, 13) * 14, 14, 20, '#262a3c'); }
  // A shaft of moonlight through the broken roof.
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const ml = ctx.createLinearGradient(0, 0, 0, floorY); ml.addColorStop(0, 'rgba(180,200,255,0.16)'); ml.addColorStop(1, 'rgba(180,200,255,0.03)');
  ctx.fillStyle = ml; ctx.beginPath(); ctx.moveTo(120 - mid * 0.3, 0); ctx.lineTo(160 - mid * 0.3, 0); ctx.lineTo(200 - mid * 0.3, floorY); ctx.lineTo(110 - mid * 0.3, floorY); ctx.closePath(); ctx.fill();
  ctx.restore();
  // Mid columns, vines, glowing runes, a fallen statue head.
  for (let i = -1; i < 6; i++) {
    const x = i * 60 - mid, broken = hash(i, 14) > 0.6, top = broken ? 30 + hash(i, 15) * 20 : 6;
    rect(ctx, x + 8, top, 11, floorY - top, '#4a5068'); rect(ctx, x + 8, top, 2.5, floorY - top, '#6a7088'); rect(ctx, x + 16.5, top, 2.5, floorY - top, '#3a4058');
    if (!broken) rect(ctx, x + 5, 3, 17, 4, '#5a6078'); else poly(ctx, [x + 8, top, x + 12, top - 5, x + 19, top], '#4a5068');
    rect(ctx, x + 5, floorY - 4, 17, 4, '#5a6078');
    ctx.strokeStyle = '#3f7f33'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 10, top + 4); ctx.quadraticCurveTo(x + 4 + Math.sin(c * 0.7 + i) * 2, top + 24, x + 12, top + 44); ctx.stroke();
    for (let k = 0; k < 4; k++) circle(ctx, x + 7 + (k % 2) * 4, top + 10 + k * 9, 1.8, k % 2 ? '#4f9a3f' : '#5fb04a');
    if (hash(i, 16) > 0.5) { const ra = 0.5 + 0.5 * Math.sin(c * 1.5 + i); for (let k = 0; k < 3; k++) rect(ctx, x + 32 + k * 6, 40 + (k % 2) * 6, 3, 3, rgba('#60e0e0', 0.3 + 0.5 * ra)); circle(ctx, x + 38, 44, 10, rgba('#60e0e0', 0.08 * ra)); }
    if (hash(i, 17) > 0.75) { ctx.save(); ctx.translate(x + 42, floorY - 4); ctx.rotate(0.6); rect(ctx, -4, -4, 8, 8, '#6a7088'); rect(ctx, -2.5, -1.5, 1.5, 1.5, '#262a3c'); rect(ctx, 1, -1.5, 1.5, 1.5, '#262a3c'); ctx.restore(); }
  }
  // Floor: flagstones with moss and rubble.
  rect(ctx, 0, floorY, PANEL_W, PANEL_H - floorY, '#3a3e50'); rect(ctx, 0, floorY, PANEL_W, 2, '#6a6e80');
  for (let r = 0; r < 3; r++) for (let i = -1; i < 10; i++) { const x = i * 30 - near + (r % 2) * 15, y = floorY + 3 + r * 7; rect(ctx, x, y, 28, 6, hash(i, 20 + r) > 0.5 ? '#40445a' : '#363a4e'); if (hash(i, 25 + r) > 0.7) ellipse(ctx, x + 8 + hash(i, r) * 12, y + 3, 4, 1.6, rgba('#4f9a3f', 0.5)); }
  for (let i = -1; i < 7; i++) { const x = i * 45 - near; circle(ctx, x + 10, floorY + 5, 2, '#5a5e70'); circle(ctx, x + 14, floorY + 6, 1.4, '#6a6e80'); }
}
