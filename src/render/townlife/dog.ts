// A dog that tags along with whoever is working, and naps by the fire at night.
import type { GameState } from '../../sim/types';
import { isIndoors } from '../../sim/workers';
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, line, groundShadow, type Env } from '../palette';
import type { Actor } from './shared';

export interface Dog { x: number; y: number; target: number; timer: number; wag: number; face: number }

export class TownDog {
  private dog: Dog | null = null;

  update(s: GameState, env: Env, dt: number): void {
    if (s.workers.length < 4) { this.dog = null; return; }
    if (!this.dog) { const c = s.center; this.dog = { x: c.x + 1.2, y: c.y + 1, target: -1, timer: 0, wag: 0, face: 1 }; }
    const d = this.dog;
    d.timer -= dt;
    let w = s.workers.find((x) => x.id === d.target);
    if (!w || d.timer <= 0 || isIndoors(s, w) || w.task?.kind === 'sleep') {
      const awake = s.workers.filter((x) => !isIndoors(s, x) && x.task?.kind !== 'sleep' && x.task?.kind !== 'arrive');
      w = awake.length ? awake[Math.floor(Math.random() * awake.length)] : undefined;
      d.target = w ? w.id : -1; d.timer = 30 + Math.random() * 40;
    }
    const goal = w ? { x: w.x - 0.45 * (w.path.length ? Math.sign(w.path[0].x - w.x) || 1 : 1), y: w.y + 0.3 } : { x: s.center.x + 1.2, y: s.center.y + 1 };
    const dx = goal.x - d.x, dy = goal.y - d.y, dist = Math.hypot(dx, dy);
    if (dist > 8) { d.x = goal.x; d.y = goal.y; }
    else if (dist > 0.15) { const sp = Math.min(dist, 2.6 * dt); d.x += dx / dist * sp; d.y += dy / dist * sp; d.wag += dt * 14; if (Math.abs(dx) > 0.05) d.face = dx > 0 ? 1 : -1; }
    else d.wag += dt * 6;
    void env;
  }

  actors(): Actor[] {
    if (!this.dog) return [];
    const d = this.dog;
    return [{ y: d.y + 0.8, draw: (ctx, env) => drawDog(ctx, d, env) }];
  }
}

function drawDog(ctx: CanvasRenderingContext2D, d: Dog, env: Env): void {
  const px = d.x * TILE + TILE / 2, py = d.y * TILE + TILE / 2 + 5;
  groundShadow(ctx, px, py + 0.5, 4, 1.5, 0.22);
  ctx.save(); ctx.translate(px, py + Math.abs(Math.sin(d.wag)) * -0.8);
  ctx.scale(d.face, 1);
  void env;
  const trot = Math.sin(d.wag) * 1;
  for (let k = 0; k < 4; k++) rect(ctx, -3 + k * 1.9, -2.5, 1, 2.5 + (k % 2 ? trot : -trot) * 0.6, '#6a4a2a');
  ellipse(ctx, 0, -4, 4.2, 2.2, '#8a6a3a'); ellipse(ctx, 0, -3.2, 3, 1.2, '#c8a878');
  circle(ctx, 4, -5.5, 1.9, '#8a6a3a'); poly(ctx, [5.5, -5.5, 7, -5, 5.5, -4.3], '#6a4a2a'); poly(ctx, [2.8, -7, 3.6, -8.5, 4.4, -7], '#6a4a2a');
  rect(ctx, 5.1, -6, 0.6, 0.6, '#222');
  const tail = Math.sin(d.wag * 1.6) * 0.8;
  line(ctx, -4, -5, -6.5, -8 + tail, '#8a6a3a', 1.2);
  ctx.restore();
}
