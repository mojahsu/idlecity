// A fisherman rowing down the river now and then, fish jumping, a cast fishing net,
// and a drifting treasure chest washing ashore to be found by a villager.
import type { GameState } from '../../sim/types';
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, line, rgba, type Env } from '../palette';
import { drawTownsfolk } from '../units';
import { bubble } from '../units/shared';
import type { Actor } from './shared';
import { drawSprite, townSprites } from '../sprites';
import { ANIMAL } from '../spriteMap';

export interface Boat { y: number; x: number; fade: number; cast: number }
export interface Fish { x: number; y: number; t: number }
export interface Flotsam { x: number; y: number; landY: number; phase: 'drift' | 'shore' | 'claim'; timer: number; fade: number }

export class River {
  private boat: Boat | null = null;
  private boatTimer = 120;
  private fish: Fish[] = [];
  private fishTimer = 8;
  private flotsam: Flotsam | null = null;
  private flotsamTimer = 75;

  /** Spawn a jumping fish and splash at the given tile coordinate (used by click easter eggs). */
  spawnSplash(x: number, y: number): void {
    this.fish.push({ x, y, t: 0 });
  }

  /** A fisherman rows down the river now and then; fish jump; flotsam chest drifts ashore. */
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

    // Drifting treasure chest washing ashore near the town's latitude.
    if (!this.flotsam) {
      this.flotsamTimer -= dt;
      if (this.flotsamTimer <= 0 && env.dark < 0.5) {
        this.flotsamTimer = 95 + Math.random() * 90;
        const landY = Math.max(3, Math.min(s.height - 4, s.center.y + (Math.random() - 0.5) * 4));
        // Find eastern water edge at landY.
        let waterX = 1.6;
        for (let x = 0; x < s.width; x++) {
          if (s.tiles[Math.floor(landY) * s.width + x]?.terrain === 'water') waterX = x + 0.75;
        }
        this.flotsam = { x: Math.max(0.8, waterX - 0.6), y: 0.5, landY, phase: 'drift', timer: 0, fade: 0 };
      }
    } else {
      const fl = this.flotsam;
      fl.fade = Math.min(1, fl.fade + dt * 1.5);
      if (fl.phase === 'drift') {
        fl.y += 0.55 * dt;
        fl.x += 0.08 * dt;
        if (fl.y >= fl.landY) { fl.phase = 'shore'; fl.timer = 0; }
      } else if (fl.phase === 'shore') {
        fl.timer += dt;
        if (fl.timer > 3.5) { fl.phase = 'claim'; fl.timer = 0; }
      } else {
        fl.timer += dt;
        if (fl.timer > 3.2) fl.fade -= dt * 1.5;
        if (fl.fade <= 0) this.flotsam = null;
      }
    }
  }

  actors(): Actor[] {
    const out: Actor[] = [];
    if (this.boat) { const b = this.boat; out.push({ y: b.y + 0.5, draw: (ctx, env) => drawBoat(ctx, b, env) }); }
    for (const f of this.fish) out.push({ y: f.y + 0.3, draw: (ctx) => drawFish(ctx, f) });
    if (this.flotsam) { const fl = this.flotsam; out.push({ y: fl.y + 0.55, draw: (ctx, env) => drawFlotsam(ctx, fl, env) }); }
    return out;
  }
}

function drawBoat(ctx: CanvasRenderingContext2D, b: Boat, env: Env): void {
  const px = b.x * TILE + TILE / 2, py = b.y * TILE + TILE / 2;
  const rock = Math.sin(env.clock * 1.6) * 1;
  ctx.save(); ctx.globalAlpha = b.fade; ctx.translate(px, py + rock * 0.5);
  ellipse(ctx, 0, 6, 10, 2.5, 'rgba(255,255,255,0.18)');
  poly(ctx, [-9, 0, 9, 0, 6, 5, -6, 5], '#7a5a34'); rect(ctx, -9, -1, 18, 1.5, '#a0784c'); line(ctx, -8, 2.5, 8, 2.5, '#5a3a1e', 0.8);
  // Fisherman with a rod; the line twitches when something bites, and periodically casts a net.
  ctx.save(); ctx.translate(0, 0); ctx.scale(0.55, 0.55);
  rect(ctx, -3, -10, 6, 7, '#6a8ab8'); circle(ctx, 0, -13, 3.4, '#e8b88a'); ellipse(ctx, 0, -15.5, 5, 1.5, '#b89b5a');
  ctx.restore();
  const netCycle = b.cast % 12;
  if (netCycle > 4 && netCycle < 8.5) {
    // Cast fishing net spread on the water beside the boat.
    const nk = Math.sin(((netCycle - 4) / 4.5) * Math.PI);
    ctx.strokeStyle = rgba('#e8dcc0', 0.65 * nk); ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.ellipse(-11, 4, 6 * nk, 3 * nk, 0, 0, Math.PI * 2); ctx.stroke();
    line(ctx, -3, -3, -11, 4, rgba('#d8cca8', 0.6 * nk), 0.7);
    if (nk > 0.6) circle(ctx, -11 + Math.sin(env.clock * 16) * 1.5, 4, 1.2, '#d0e8ff');
  }
  const bite = (b.cast % 9) > 8.3 ? Math.sin(env.clock * 30) * 1.5 : 0;
  line(ctx, 2, -6, 12, -14, '#5a3a1e', 1); line(ctx, 12, -14, 14 + bite, 3, 'rgba(255,255,255,0.6)', 0.6);
  if (env.dark > 0.3) { circle(ctx, -6, -4, 1.4, '#ffd070'); }
  ctx.restore();
}

function drawFlotsam(ctx: CanvasRenderingContext2D, fl: Flotsam, env: Env): void {
  const px = fl.x * TILE + TILE / 2, py = fl.y * TILE + TILE / 2;
  const bob = fl.phase === 'drift' ? Math.sin(env.clock * 3.2) * 1.3 : 0;
  ctx.save(); ctx.globalAlpha = Math.max(0, fl.fade);
  // Water ripple around the floating chest.
  ellipse(ctx, px, py + 2 + bob, 6.5, 2.2, 'rgba(235,248,255,0.35)');
  // Wooden treasure chest with brass bands.
  rect(ctx, px - 4.5, py - 3 + bob, 9, 5.5, '#8a5828');
  rect(ctx, px - 4.5, py - 3 + bob, 9, 2, '#b07838');
  rect(ctx, px - 4.5, py - 1.2 + bob, 9, 0.9, '#e8c048');
  rect(ctx, px - 1, py - 1.6 + bob, 2, 1.8, '#ffe070');
  // Glint on the chest.
  const gt = (env.clock * 0.9) % 1;
  circle(ctx, px + Math.sin(env.clock * 3) * 3, py - 3 - gt * 7, 1 * (1 - gt) + 0.3, rgba('#ffe880', 0.85 * (1 - gt)));
  if (fl.phase === 'claim') {
    const vx = fl.x + 0.65, vy = fl.y;
    drawTownsfolk(ctx, vx, vy, -1, false, env, 612, { cheer: true });
    bubble(ctx, vx * TILE + TILE / 2, vy * TILE + TILE / 2 - 19, '✦', 0.95, '#e0a020');
  }
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
