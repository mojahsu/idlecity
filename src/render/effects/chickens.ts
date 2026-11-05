// Farm hens that peck about and flock to anyone scattering feed.
import type { GameState } from '../../sim/types';
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, groundShadow, type Env } from '../palette';
import type { Actor } from './shared';

interface Chicken { x: number; y: number; tx: number; ty: number; home: number; timer: number; peck: number }

export class Chickens {
  private chickens: Chicken[] = [];

  update(s: GameState, env: Env, dt: number, scare: { x: number; y: number }[] = []): void {
    const farms = s.buildings.filter((b) => b.built && b.type === 'farm').slice(0, 3);
    const want = farms.length * 2;
    while (this.chickens.length < want) { const f = farms[Math.floor(this.chickens.length / 2)]; this.chickens.push({ x: f.x + 0.5, y: f.y + 1.1, tx: f.x + 0.5, ty: f.y + 1.1, home: f.id, timer: Math.random(), peck: 0 }); }
    if (this.chickens.length > want) this.chickens.length = want;
    this.chickens.forEach((c, i) => {
      const f = farms[Math.floor(i / 2)];
      if (!f) return;
      c.timer -= dt;
      // A worker scattering feed at this farm draws the flock over.
      // Children running at the hens send them scattering.
      const kid = scare.find((k) => Math.hypot(k.x - c.x, k.y - c.y) < 0.9);
      if (kid) { let dx = c.x - kid.x, dy = c.y - kid.y; let d = Math.hypot(dx, dy); if (d < 0.05) { const a = Math.random() * 6.28; dx = Math.cos(a); dy = Math.sin(a); d = 1; } c.tx = c.x + dx / d * 1.2; c.ty = c.y + dy / d * 0.8; c.timer = 0.6; c.peck = 0; const sp = 1.6 * dt; c.x += dx / d * sp; c.y += dy / d * sp; return; }
      const feeder = s.workers.find((w) => w.task?.kind === 'rest' && w.task.activity === 'feed' && w.task.phase === 'do' && w.task.buildingId === f.id);
      if (feeder && c.timer <= 0) { c.timer = 0.8 + Math.random(); c.tx = feeder.x + (i % 2 ? 0.45 : -0.45) + (Math.random() - 0.5) * 0.3; c.ty = feeder.y + 0.35 + Math.random() * 0.3; c.peck = 1; return; }
      if (c.timer <= 0) { c.timer = 1.5 + Math.random() * 3; c.tx = f.x + 0.5 + (Math.random() - 0.5) * 1.6; c.ty = f.y + 0.9 + (Math.random() - 0.3) * 1.2; c.peck = Math.random() < 0.6 ? 1.2 : 0; }
      const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
      if (d > 0.02 && env.dark < 0.7) { const sp = Math.min(d, 0.45 * dt); c.x += dx / d * sp; c.y += dy / d * sp; }
      if (c.peck > 0) c.peck -= dt;
    });
  }

  actors(): Actor[] {
    return this.chickens.map((c) => ({ y: c.y, draw: (ctx, env) => drawChicken(ctx, c, env) }));
  }
}

function drawChicken(ctx: CanvasRenderingContext2D, c: Chicken, env: Env): void {
  const px = c.x * TILE, py = c.y * TILE;
  const moving = Math.hypot(c.tx - c.x, c.ty - c.y) > 0.03;
  const bob = moving ? Math.abs(Math.sin(env.clock * 14 + c.home)) * -1 : 0;
  const peck = c.peck > 0 ? Math.max(0, Math.sin(env.clock * 10)) * 2 : 0;
  const dir = c.tx >= c.x ? 1 : -1;
  groundShadow(ctx, px, py + 1, 3, 1.3, 0.2);
  ctx.save(); ctx.translate(px, py + bob); ctx.scale(dir, 1);
  ellipse(ctx, 0, -3, 3.2, 2.4, '#f4f0e6'); poly(ctx, [-3, -4, -5, -6.5, -2.5, -5], '#e8e4d8');
  circle(ctx, 2.6, -5.5 + peck, 1.7, '#f4f0e6'); poly(ctx, [3.8, -5.5 + peck, 5.5, -5 + peck, 3.8, -4.5 + peck], '#f0a030'); rect(ctx, 2.6, -7.5 + peck, 1.2, 1.4, '#e04040');
  rect(ctx, 3, -6 + peck, 0.6, 0.6, '#222');
  rect(ctx, -1, -1, 0.8, 1.5, '#f0a030'); rect(ctx, 1, -1, 0.8, 1.5, '#f0a030');
  ctx.restore();
}
