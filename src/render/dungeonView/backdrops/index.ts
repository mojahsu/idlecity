// Dungeon scenes behind the fight, one file per dungeon, plus torches and floor fog.
import { circle, ellipse, rect, rgba, type Env } from '../../palette';
import { PANEL_W } from '../layout';
import type { ViewState } from '../state';
import type { BackdropArt } from './shared';
import { drawGoblinCave } from './goblinCave';
import { drawAncientRuins } from './ancientRuins';
import { drawDarkTower } from './darkTower';

const ART: Record<string, (a: BackdropArt) => void> = { goblinCave: drawGoblinCave, ancientRuins: drawAncientRuins, darkTower: drawDarkTower };

export function drawBackdrop(ctx: CanvasRenderingContext2D, id: string, v: ViewState, env: Env, floorY: number): void {
  // Three parallax layers: far walls crawl, the middle ground walks, the floor runs.
  const far = (v.scroll * 0.35) % 90, mid = (v.scroll * 0.7) % 60, near = v.scroll % 45;
  const c = env.clock;
  (ART[id] ?? drawDarkTower)({ ctx, v, env, floorY, far, mid, near, c });
  // Torches on the walls of the cave and the ruins.
  if (id !== 'darkTower') for (const tx of [40, PANEL_W - 40]) {
    rect(ctx, tx - 4, 22, 8, 2, '#4a3a2a'); rect(ctx, tx - 1, 18, 2, 8, '#5a3a1e');
    const f = 1 + 0.3 * Math.sin(c * 12 + tx);
    const g = ctx.createRadialGradient(tx, 16, 0, tx, 16, 44); g.addColorStop(0, 'rgba(255,170,60,0.38)'); g.addColorStop(1, 'rgba(255,170,60,0)'); ctx.fillStyle = g; ctx.fillRect(tx - 44, -28, 88, 88);
    ellipse(ctx, tx, 15 - 2 * f, 2.4, 4.5 * f, '#ff9a30'); ellipse(ctx, tx, 16 - f, 1.1, 2 * f, '#ffe080');
    for (let k = 0; k < 2; k++) { const tt = (c * 0.8 + k * 0.5 + tx) % 1; circle(ctx, tx + Math.sin(c * 5 + k) * 2, 12 - tt * 14, 0.8, rgba('#ffb040', 1 - tt)); }
  }
  // Low fog drifting along the floor.
  for (let i = 0; i < 4; i++) { const fx = ((c * 6 + i * 80) % (PANEL_W + 60)) - 30; const fg = ctx.createRadialGradient(fx, floorY + 2, 0, fx, floorY + 2, 28); fg.addColorStop(0, 'rgba(200,200,230,0.12)'); fg.addColorStop(1, 'rgba(200,200,230,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(fx, floorY + 2, 28, 7, 0, 0, Math.PI * 2); ctx.fill(); }
}
