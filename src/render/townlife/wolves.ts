// Wolves lurking at a forest edge far from town on clear nights.
import type { GameState, Point } from '../../sim/types';
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, line, groundShadow, type Env } from '../palette';
import type { Actor } from './shared';
import { drawSprite, townSprites } from '../sprites';
import { ANIMAL } from '../spriteMap';

export interface Wolf { x: number; y: number; seed: number; fade: number }

export class Wolves {
  private wolves: Wolf[] = [];
  private wolfDen: Point | null = null;

  /** Wolves lurk at a forest edge far from town on clear nights. */
  update(s: GameState, env: Env, dt: number): void {
    const prowl = env.night && !env.rainy && s.workers.length >= 8;
    if (prowl && !this.wolves.length && !this.wolfDen) {
      for (let tries = 0; tries < 30; tries++) {
        const i = Math.floor(Math.random() * s.tiles.length), x = i % s.width, y = Math.floor(i / s.width);
        if (s.tiles[i].terrain !== 'forest' || Math.hypot(x - s.center.x, y - s.center.y) < 11) continue;
        this.wolfDen = { x, y };
        const n = 2 + Math.floor(Math.random() * 2);
        for (let k = 0; k < n; k++) this.wolves.push({ x: x + 0.5 + (k - 1) * 0.7, y: y + 1.2 + (k % 2) * 0.4, seed: k * 17 + i, fade: 0 });
        break;
      }
    }
    for (const w of this.wolves) { w.fade = prowl ? Math.min(1, w.fade + dt * 0.5) : Math.max(0, w.fade - dt); w.x += Math.sin(env.clock * 0.6 + w.seed) * 0.08 * dt; }
    if (!prowl && this.wolves.every((w) => w.fade <= 0)) { this.wolves = []; this.wolfDen = null; }
  }

  actors(): Actor[] { return this.wolves.map((w) => ({ y: w.y + 0.8, draw: (ctx, env) => drawWolf(ctx, w, env) })); }
}

function drawWolf(ctx: CanvasRenderingContext2D, w: Wolf, env: Env): void {
  if (w.fade <= 0) return;
  const px = w.x * TILE + TILE / 2, py = w.y * TILE + TILE / 2 + 5;
  const dir = Math.sin(env.clock * 0.6 + w.seed) >= 0 ? 1 : -1;
  ctx.save(); ctx.globalAlpha = w.fade; ctx.translate(px, py); ctx.scale(dir, 1);
  groundShadow(ctx, 0, 0.5, 5, 1.6, 0.25);
  if (townSprites()) {
    drawSprite(ctx, ANIMAL.wolf, 0, 1, 16, { sy: 1 + Math.sin(env.clock * 3 + w.seed) * 0.03 });
    if (env.dark > 0.3) { rect(ctx, 1.5, -10, 1, 1, '#ffe040'); rect(ctx, 4, -10, 1, 1, '#ffe040'); }
    ctx.restore(); return;
  }
  for (let k = 0; k < 4; k++) rect(ctx, -4 + k * 2.4, -3, 1.1, 3, '#4a4a52');
  ellipse(ctx, 0, -5, 5.5, 2.6, '#5a5a64'); ellipse(ctx, 0, -4, 3.5, 1.3, '#8a8a94');
  circle(ctx, 5, -6.5, 2.2, '#5a5a64'); poly(ctx, [6.5, -6.5, 9, -6, 6.5, -5], '#5a5a64');
  poly(ctx, [3.5, -8, 4.2, -10.5, 5.2, -8], '#5a5a64'); poly(ctx, [5.2, -8, 6, -10.5, 6.8, -8], '#5a5a64');
  line(ctx, -5, -5, -8, -3 + Math.sin(env.clock * 2 + w.seed), '#5a5a64', 1.3);
  const eye = env.dark > 0.3 ? '#ffe040' : '#1a1a1a';
  rect(ctx, 5.3, -7.2, 0.8, 0.8, eye); rect(ctx, 6.5, -7.2, 0.8, 0.8, eye);
  ctx.restore();
}
