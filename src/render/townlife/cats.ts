// Cats on the house roofs; eyes glow at night.
import type { GameState } from '../../sim/types';
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, hash, type Env } from '../palette';
import type { Actor } from './shared';

export interface Cat { house: number; timer: number; fade: number; seed: number }

export class Cats {
  private cats: Cat[] = [];

  update(s: GameState, dt: number): void {
    const houses = s.buildings.filter((b) => b.built && b.type === 'house');
    const want = Math.min(3, Math.floor(houses.length / 3));
    while (this.cats.length < want) this.cats.push({ house: houses[Math.floor(Math.random() * houses.length)].id, timer: 20 + Math.random() * 30, fade: 0, seed: Math.random() * 100 });
    if (this.cats.length > want) this.cats.length = want;
    for (const c of this.cats) {
      c.timer -= dt;
      if (c.timer <= 0) {
        if (c.fade > 0) c.fade = Math.max(0, c.fade - dt * 2);
        else { c.house = houses[Math.floor(Math.random() * houses.length)].id; c.timer = 25 + Math.random() * 40; }
      } else c.fade = Math.min(1, c.fade + dt * 1.5);
    }
  }

  actors(s: GameState): Actor[] {
    const out: Actor[] = [];
    for (const c of this.cats) {
      const b = s.buildings.find((x) => x.id === c.house);
      if (!b || !b.built) continue;
      out.push({ y: b.y + 0.96, draw: (ctx, env) => drawCat(ctx, b.x * TILE + TILE - 7, b.y * TILE - 13, c, env) });
    }
    return out;
  }
}

function drawCat(ctx: CanvasRenderingContext2D, px: number, py: number, c: Cat, env: Env): void {
  ctx.save(); ctx.globalAlpha = c.fade;
  const col = hash(Math.floor(c.seed), 1) > 0.5 ? '#3a3a3a' : '#c88a4a';
  ellipse(ctx, px, py, 3.6, 2.2, col); circle(ctx, px + 2.6, py - 2, 1.8, col);
  poly(ctx, [px + 1.4, py - 3, px + 1.8, py - 4.8, px + 2.6, py - 3.2], col); poly(ctx, [px + 3, py - 3.2, px + 3.6, py - 4.8, px + 3.9, py - 3], col);
  const tail = Math.sin(env.clock * 2 + c.seed) * 1.5;
  ctx.strokeStyle = col; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(px - 3.4, py); ctx.quadraticCurveTo(px - 6, py - 1 + tail, px - 5.5, py - 4 + tail); ctx.stroke();
  const eye = env.dark > 0.4 ? '#e8ff60' : '#1a1a1a';
  rect(ctx, px + 2, py - 2.4, 0.7, 0.7, eye); rect(ctx, px + 3.4, py - 2.4, 0.7, 0.7, eye);
  ctx.restore();
}
