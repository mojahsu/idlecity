// Dark Tower: stained glass, chandeliers, tapestries, candelabras, a throne, a red carpet.
import { circle, ellipse, poly, rect, line, roundRect, rgba, hash } from '../../palette';
import { PANEL_H, PANEL_W } from '../layout';
import type { BackdropArt } from './shared';

export function drawDarkTower(art: BackdropArt): void {
  const { ctx, v, floorY, far, mid, near, c } = art;
  const g = ctx.createLinearGradient(0, 0, 0, PANEL_H); g.addColorStop(0, '#14081e'); g.addColorStop(1, '#241236'); ctx.fillStyle = g; ctx.fillRect(0, 0, PANEL_W, PANEL_H);
  // Far: tall stained-glass windows glowing, chandeliers.
  for (let i = -1; i < 5; i++) {
    const x = i * 90 - far + 20, gl = 0.5 + 0.3 * Math.sin(c * 1.2 + i);
    ctx.fillStyle = '#2a1a3a'; ctx.beginPath(); ctx.roundRect(x, 6, 26, floorY - 14, [13, 13, 0, 0]); ctx.fill();
    const panes: [string, number, number, number, number][] = [['#8030c0', 3, 10, 9, 18], ['#c03060', 14, 10, 9, 18], ['#3050c0', 3, 30, 9, 14], ['#c0a030', 14, 30, 9, 14], ['#8030c0', 3, 46, 20, 14]];
    for (const [col, px, py, w, h] of panes) rect(ctx, x + px, py, w, Math.min(h, floorY - 16 - py), rgba(col, 0.35 + 0.35 * gl));
    rect(ctx, x + 12.5, 10, 1.2, floorY - 24, '#1a0c26'); rect(ctx, x + 3, 28, 20, 1.2, '#1a0c26'); rect(ctx, x + 3, 44, 20, 1.2, '#1a0c26');
    circle(ctx, x + 13, 40, 22, rgba('#a060e0', 0.06 * gl));
    const cx = x + 58, sw = Math.sin(c * 0.8 + i) * 1.5;
    line(ctx, cx, 0, cx + sw, 14, '#5a4a3a', 0.8); rect(ctx, cx - 9 + sw, 14, 18, 2, '#6a5030');
    for (let k = 0; k < 3; k++) { const kx = cx - 7 + k * 7 + sw, f = 1 + 0.3 * Math.sin(c * 9 + k + i); rect(ctx, kx - 0.6, 10, 1.2, 4, '#e8dcc0'); ellipse(ctx, kx, 9 - f, 1, 2 * f, '#c070ff'); circle(ctx, kx, 9, 6, rgba('#c070ff', 0.1)); }
  }
  // Mid: tapestries with gold trim, candelabras, floating runes.
  for (let i = -1; i < 6; i++) {
    const x = i * 60 - mid;
    if (hash(i, 30) > 0.45) {
      poly(ctx, [x + 10, 8, x + 30, 8, x + 30, 40, x + 20, 48, x + 10, 40], '#4a1a3a'); poly(ctx, [x + 12, 10, x + 28, 10, x + 28, 39, x + 20, 45, x + 12, 39], '#5a2448');
      rect(ctx, x + 10, 8, 20, 1.5, '#c8a050'); circle(ctx, x + 20, 24, 4, rgba('#c8a050', 0.8)); circle(ctx, x + 20, 24, 2, '#5a2448');
    } else {
      rect(ctx, x + 19, floorY - 22, 2, 22, '#5a4a3a'); rect(ctx, x + 12, floorY - 22, 16, 1.5, '#6a5030');
      for (let k = 0; k < 3; k++) { const kx = x + 13 + k * 7, f = 1 + 0.35 * Math.sin(c * 10 + k * 2 + i); rect(ctx, kx - 0.6, floorY - 27, 1.2, 5, '#e8dcc0'); ellipse(ctx, kx, floorY - 28 - f, 1.1, 2.4 * f, '#d080ff'); ellipse(ctx, kx, floorY - 27.5 - f * 0.5, 0.5, 1.2 * f, '#ffffff'); circle(ctx, kx, floorY - 28, 7, rgba('#d080ff', 0.12)); }
    }
    const ra = c * 0.8 + i;
    for (let k = 0; k < 3; k++) { const rx = x + 42 + Math.cos(ra + k * 2.1) * 7, ry = 34 + Math.sin(ra + k * 2.1) * 5; ctx.strokeStyle = rgba('#d080ff', 0.5 + 0.3 * Math.sin(c * 3 + k)); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(rx, ry, 2, 0, Math.PI * 1.5); ctx.stroke(); }
  }
  // The throne behind a boss.
  if (v.boss && v.hadEncounter) { const tx = PANEL_W * 0.74 + 18; rect(ctx, tx - 10, floorY - 34, 20, 34, '#2a1230'); poly(ctx, [tx - 12, floorY - 34, tx, floorY - 44, tx + 12, floorY - 34], '#3a1a40'); rect(ctx, tx - 8, floorY - 30, 16, 26, '#4a1a3a'); for (let k = -1; k <= 1; k++) circle(ctx, tx + k * 6, floorY - 36, 1.5, '#c8a050'); }
  // Floor: checkered polished stone with a red carpet.
  rect(ctx, 0, floorY, PANEL_W, PANEL_H - floorY, '#140c1e'); rect(ctx, 0, floorY, PANEL_W, 2, '#4a2a6a');
  for (let r = 0; r < 3; r++) for (let i = -1; i < 12; i++) { const x = i * 24 - (near % 48) + (r % 2) * 12, y = floorY + 2 + r * 7; rect(ctx, x, y, 12, 7, ((i + r) % 2) ? '#1c1228' : '#241a30'); }
  rect(ctx, 0, floorY + 9, PANEL_W, 6, 'rgba(140,20,40,0.55)'); rect(ctx, 0, floorY + 9, PANEL_W, 1, 'rgba(200,160,80,0.5)'); rect(ctx, 0, floorY + 14, PANEL_W, 1, 'rgba(200,160,80,0.5)');
  for (let i = 0; i < 6; i++) { const rx = (i * 47 + c * 8) % PANEL_W, ry = floorY - 4 - ((c * 10 + i * 30) % 60); circle(ctx, rx, ry, 1, rgba('#d080ff', 0.5)); }
}
