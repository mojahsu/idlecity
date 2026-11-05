// A deer that wanders down from the woods to drink at the river by day.
import type { GameState, Point } from '../../sim/types';
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, line, groundShadow, type Env } from '../palette';
import type { Actor } from './shared';

export interface Deer { x: number; y: number; tx: number; ty: number; home: Point; phase: 'go' | 'drink' | 'back'; timer: number; fade: number }

export class DeerVisits {
  private deer: Deer | null = null;
  private deerTimer = 90;

  /** A deer wanders down from the woods to drink at the river by day. */
  update(s: GameState, env: Env, dt: number): void {
    if (!this.deer) {
      this.deerTimer -= dt;
      if (this.deerTimer <= 0 && env.dark < 0.3 && !env.rainy) {
        this.deerTimer = 120 + Math.random() * 150;
        for (let tries = 0; tries < 40; tries++) {
          const i = Math.floor(Math.random() * s.tiles.length), x = i % s.width, y = Math.floor(i / s.width);
          if (s.tiles[i].terrain !== 'forest' || x > 11 || Math.hypot(x - s.center.x, y - s.center.y) < 8) continue;
          let wx = -1; for (let k = x; k >= 0; k--) if (s.tiles[y * s.width + k].terrain === 'water') { wx = k; break; }
          if (wx < 0) continue;
          this.deer = { x: x + 0.5, y: y + 0.8, tx: wx + 1.3, ty: y + 0.6, home: { x: x + 0.5, y: y + 0.8 }, phase: 'go', timer: 0, fade: 0 };
          break;
        }
      }
      return;
    }
    const d = this.deer;
    d.fade = d.phase === 'back' && Math.hypot(d.tx - d.x, d.ty - d.y) < 0.5 ? Math.max(0, d.fade - dt) : Math.min(1, d.fade + dt);
    if (d.phase === 'drink') { d.timer -= dt; if (d.timer <= 0 || env.night) { d.phase = 'back'; d.tx = d.home.x; d.ty = d.home.y; } return; }
    const dx = d.tx - d.x, dy = d.ty - d.y, dist = Math.hypot(dx, dy);
    if (dist < 0.05) { if (d.phase === 'go') { d.phase = 'drink'; d.timer = 7 + Math.random() * 5; } else if (d.fade <= 0) this.deer = null; }
    else { const sp = Math.min(dist, 1.1 * dt); d.x += dx / dist * sp; d.y += dy / dist * sp; }
  }

  actors(): Actor[] { const d = this.deer; return d ? [{ y: d.y + 0.8, draw: (ctx, env) => drawDeer(ctx, d, env) }] : []; }
}

function drawDeer(ctx: CanvasRenderingContext2D, d: Deer, env: Env): void {
  const px = d.x * TILE + TILE / 2, py = d.y * TILE + TILE / 2 + 5;
  const moving = d.phase !== 'drink';
  const dir = d.tx >= d.x ? 1 : -1;
  const trot = moving ? Math.sin(env.clock * 9) * 1.2 : 0;
  const dip = d.phase === 'drink' ? 3 + Math.sin(env.clock * 1.5) * 1 : 0;
  ctx.save(); ctx.globalAlpha = d.fade; ctx.translate(px, py); ctx.scale(dir, 1);
  groundShadow(ctx, 0, 0.5, 6, 2, 0.22);
  for (let k = 0; k < 4; k++) rect(ctx, -4.5 + k * 3, -6, 1, 6 + (k % 2 ? trot : -trot) * 0.5, '#7a5a3a');
  ellipse(ctx, 0, -8, 6, 3, '#a07848'); ellipse(ctx, -1, -7, 3.5, 1.5, '#e0c8a0');
  ctx.save(); ctx.translate(5, -10); ctx.rotate(dip * 0.25);
  rect(ctx, -1, -5, 2.2, 6, '#a07848'); circle(ctx, 1, -6, 2, '#a07848'); poly(ctx, [2.5, -6.5, 4.5, -6, 2.5, -5], '#8a6838');
  line(ctx, 0, -7.5, -2, -12, '#5a3a1e', 1); line(ctx, -1.2, -10, -3, -11.5, '#5a3a1e', 1); line(ctx, 1, -7.5, 2.5, -12, '#5a3a1e', 1); line(ctx, 1.8, -10, 3.5, -11.5, '#5a3a1e', 1);
  rect(ctx, 1.6, -6.8, 0.7, 0.7, '#1a1a1a');
  ctx.restore();
  poly(ctx, [-6, -8, -8, -9.5, -6.5, -6.5], '#e0c8a0');
  ctx.restore();
}
