// A fisherman rowing down the river now and then, and fish jumping.
import type { GameState } from '../../sim/types';
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, line, type Env } from '../palette';
import type { Actor } from './shared';
import { drawSprite, townSprites } from '../sprites';
import { ANIMAL } from '../spriteMap';

export interface Boat { y: number; x: number; fade: number; cast: number }
export interface Fish { x: number; y: number; t: number }

export class River {
  private boat: Boat | null = null;
  private boatTimer = 120;
  private fish: Fish[] = [];
  private fishTimer = 8;

  /** A fisherman rows down the river now and then; fish jump. */
  update(s: GameState, env: Env, dt: number): void {
    if (!this.boat) {
      this.boatTimer -= dt;
      if (this.boatTimer <= 0 && env.dark < 0.4 && !env.storm) { this.boatTimer = 150 + Math.random() * 150; this.boat = { x: 1.5, y: -1, fade: 0, cast: 0 }; }
    } else {
      const b = this.boat;
      b.y += 0.45 * dt; b.cast += dt;
      b.fade = b.y > s.height - 2 ? Math.max(0, b.fade - dt) : Math.min(1, b.fade + dt);
      if (b.y > s.height + 1) this.boat = null;
    }
    this.fishTimer -= dt;
    if (this.fishTimer <= 0 && env.dark < 0.6) {
      this.fishTimer = 10 + Math.random() * 15;
      for (let tries = 0; tries < 20; tries++) {
        const i = Math.floor(Math.random() * s.tiles.length);
        if (s.tiles[i].terrain !== 'water') continue;
        this.fish.push({ x: (i % s.width) + 0.3 + Math.random() * 0.4, y: Math.floor(i / s.width) + 0.5, t: 0 });
        break;
      }
    }
    for (const f of this.fish) f.t += dt;
    this.fish = this.fish.filter((f) => f.t < 1.1);
  }

  actors(): Actor[] {
    const out: Actor[] = [];
    if (this.boat) { const b = this.boat; out.push({ y: b.y + 0.5, draw: (ctx, env) => drawBoat(ctx, b, env) }); }
    for (const f of this.fish) out.push({ y: f.y + 0.3, draw: (ctx) => drawFish(ctx, f) });
    return out;
  }
}

function drawBoat(ctx: CanvasRenderingContext2D, b: Boat, env: Env): void {
  const px = b.x * TILE + TILE / 2, py = b.y * TILE + TILE / 2;
  const rock = Math.sin(env.clock * 1.6) * 1;
  ctx.save(); ctx.globalAlpha = b.fade; ctx.translate(px, py + rock * 0.5);
  ellipse(ctx, 0, 6, 10, 2.5, 'rgba(255,255,255,0.18)');
  poly(ctx, [-9, 0, 9, 0, 6, 5, -6, 5], '#7a5a34'); rect(ctx, -9, -1, 18, 1.5, '#a0784c'); line(ctx, -8, 2.5, 8, 2.5, '#5a3a1e', 0.8);
  // Fisherman with a rod; the line twitches when something bites.
  ctx.save(); ctx.translate(0, 0); ctx.scale(0.55, 0.55);
  rect(ctx, -3, -10, 6, 7, '#6a8ab8'); circle(ctx, 0, -13, 3.4, '#e8b88a'); ellipse(ctx, 0, -15.5, 5, 1.5, '#b89b5a');
  ctx.restore();
  const bite = (b.cast % 9) > 8.3 ? Math.sin(env.clock * 30) * 1.5 : 0;
  line(ctx, 2, -6, 12, -14, '#5a3a1e', 1); line(ctx, 12, -14, 14 + bite, 3, 'rgba(255,255,255,0.6)', 0.6);
  if (env.dark > 0.3) { circle(ctx, -6, -4, 1.4, '#ffd070'); }
  ctx.restore();
}

function drawFish(ctx: CanvasRenderingContext2D, f: Fish): void {
  const px = f.x * TILE, py = f.y * TILE;
  const k = f.t;
  if (k < 0.6) {
    const h = Math.sin(k / 0.6 * Math.PI) * 9;
    ctx.save(); ctx.translate(px, py - h); ctx.rotate((k / 0.6 - 0.5) * 2.2);
    if (townSprites()) drawSprite(ctx, ANIMAL.fish[Math.floor(f.x * 7) % ANIMAL.fish.length], 0, 4, 9);
    else { ellipse(ctx, 0, 0, 3.2, 1.3, '#b8c8d8'); poly(ctx, [-3, 0, -5, -1.8, -5, 1.8], '#b8c8d8'); rect(ctx, 1.5, -0.5, 0.6, 0.6, '#222'); }
    ctx.restore();
  }
  if (k > 0.45) { const q = (k - 0.45) / 0.65; ctx.strokeStyle = `rgba(230,240,255,${0.7 * (1 - q)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(px, py, 2 + q * 8, 1 + q * 3.5, 0, 0, Math.PI * 2); ctx.stroke(); }
}
