// After dark: the lamplighter doing the round at dusk, a watchman with a
// lantern walking the streets, patrons stumbling home from the tavern, a fox
// creeping up on the hens, and an owl on a roof.
import type { GameState, Point } from '../../sim/types';
import { TILE } from '../constants';
import type { LightSource } from '../buildings';
import { lampPosts } from '../buildings';
import { circle, ellipse, poly, rect, line, groundShadow, rgba, type Env } from '../palette';
import { drawTownsfolk } from '../units';
import { walkerActor, type Actor, type Roads, type Walker } from './shared';

interface Fox { x: number; y: number; tx: number; ty: number; phase: 'creep' | 'flee'; fade: number; timer: number }

export class NightLife {
  private watchman: Walker | null = null;
  private patrons: Walker[] = [];
  private patronTimer = 4;
  private fox: Fox | null = null;
  private foxTimer = 60;
  private lamplighter: Walker | null = null;

  update(s: GameState, env: Env, dt: number, roads: Roads): void {
    const night = env.dark > 0.5;
    // The watchman walks all night once the town has walls; he carries a lantern.
    const hasWalls = s.buildings.some((b) => b.built && b.type === 'walls');
    if (night && hasWalls && !this.watchman) { const w = roads.spawnWalker(s, false, 0.5); if (w) { w.ttl = 999; w.basket = false; w.opts = { tunic: '#3a3a4a' }; this.watchman = w; } }
    if (this.watchman) {
      this.watchman.fade = night ? Math.min(1, this.watchman.fade + dt) : Math.max(0, this.watchman.fade - dt);
      if (!roads.step(s, this.watchman, dt) || (!night && this.watchman.fade <= 0)) this.watchman = null;
    }
    // Patrons leave the tavern late and weave home.
    const tavern = s.buildings.find((b) => b.built && b.type === 'tavern');
    if (tavern && night && env.dayFrac > 0.85 && env.dayFrac < 0.97) {
      this.patronTimer -= dt;
      if (this.patronTimer <= 0 && this.patrons.length < 2) {
        this.patronTimer = 6 + Math.random() * 8;
        const w = roads.spawnWalker(s, false, 0.45, tavern);
        if (w) { w.ttl = 16 + Math.random() * 10; w.basket = false; w.opts = { tipsy: true }; this.patrons.push(w); }
      }
    }
    for (const w of this.patrons) { w.ttl -= dt; w.fade = w.ttl < 1 ? Math.max(0, w.fade - dt * 2) : Math.min(1, w.fade + dt * 1.5); if (!roads.step(s, w, dt)) w.ttl = 0; }
    this.patrons = this.patrons.filter((w) => w.ttl > 0);
    // The lamplighter walks from lamp to lamp at dusk.
    const lamps = lampPosts(s);
    if (lamps.length && env.dayFrac > 0.69 && env.dayFrac < 0.705 + lamps.length * 0.012 + 0.01) {
      const idx = Math.min(lamps.length - 1, Math.max(0, Math.floor((env.dayFrac - 0.705) / 0.012) + 1));
      const l = lamps[idx];
      if (!this.lamplighter) this.lamplighter = { x: l.x, y: l.y + 0.3, tx: l.x, ty: l.y + 0.3, px: -1, py: -1, seed: 4242, ttl: 99, speed: 1.2, basket: false, child: false, fade: 0, opts: { tunic: '#6a5a3a' } };
      const w = this.lamplighter; w.tx = l.x; w.ty = l.y + 0.3; w.fade = Math.min(1, w.fade + dt * 2);
      const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy); if (d > 0.01) { const sp = Math.min(d, 1.6 * dt); w.x += dx / d * sp; w.y += dy / d * sp; }
    } else if (this.lamplighter) { this.lamplighter.fade -= dt * 2; if (this.lamplighter.fade <= 0) this.lamplighter = null; }
    // A fox creeps out of the woods towards a farm, then bolts.
    const farm = s.buildings.find((b) => b.built && b.type === 'farm');
    if (!this.fox) {
      this.foxTimer -= dt;
      if (this.foxTimer <= 0 && night && farm && !env.rainy) {
        this.foxTimer = 90 + Math.random() * 120;
        let from: Point | null = null;
        for (let tries = 0; tries < 30 && !from; tries++) { const i = Math.floor(Math.random() * s.tiles.length); const x = i % s.width, y = Math.floor(i / s.width); if (s.tiles[i].terrain === 'forest' && Math.hypot(x - farm.x, y - farm.y) < 9) from = { x, y }; }
        if (from) this.fox = { x: from.x, y: from.y + 0.5, tx: farm.x + 0.5, ty: farm.y + 1.1, phase: 'creep', fade: 0, timer: 0 };
      }
    } else {
      const f = this.fox;
      f.fade = Math.min(1, f.fade + dt);
      const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy);
      const speed = f.phase === 'creep' ? 0.5 : 2.4;
      if (d > 0.05) { const sp = Math.min(d, speed * dt); f.x += dx / d * sp; f.y += dy / d * sp; }
      else if (f.phase === 'creep') { f.timer += dt; if (f.timer > 1.5) { f.phase = 'flee'; f.tx = f.x + (Math.random() < 0.5 ? -9 : 9); f.ty = f.y - 3; } }
      else this.fox = null;
      if (f && f.x < -1 || f && f.x > s.width + 1) this.fox = null;
    }
  }

  /** Where the fox is, so the hens scatter. */
  scare(): Point[] { return this.fox && this.fox.phase === 'creep' ? [{ x: this.fox.x, y: this.fox.y }] : []; }

  actors(s: GameState, env: Env): Actor[] {
    const out: Actor[] = [];
    if (this.watchman) { const w = this.watchman; out.push({ y: w.y + 0.8, draw: (ctx, e) => { ctx.globalAlpha = w.fade; drawTownsfolk(ctx, w.x, w.y, w.tx >= w.x ? 1 : -1, true, e, w.seed, w.opts); const px = w.x * TILE + TILE / 2, py = w.y * TILE + TILE / 2 + 5, dir = w.tx >= w.x ? 1 : -1; line(ctx, px + dir * 5, py - 9, px + dir * 7, py - 5, '#5a3a1e', 1); rect(ctx, px + dir * 7 - 1.5, py - 5, 3, 4, '#ffd070'); ctx.globalAlpha = 1; } }); }
    for (const w of this.patrons) out.push(walkerActor(w));
    if (this.lamplighter) { const w = this.lamplighter; out.push({ y: w.y + 0.8, draw: (ctx, e) => { ctx.globalAlpha = w.fade; drawTownsfolk(ctx, w.x, w.y, w.tx >= w.x ? 1 : -1, Math.hypot(w.tx - w.x, w.ty - w.y) > 0.02, e, w.seed, w.opts); const px = w.x * TILE + TILE / 2, py = w.y * TILE + TILE / 2 + 5; line(ctx, px + 4, py - 6, px + 6, py - 22, '#6b4a2b', 1); circle(ctx, px + 6, py - 22, 1.2, '#ffb040'); ctx.globalAlpha = 1; } }); }
    if (this.fox) { const f = this.fox; out.push({ y: f.y + 0.8, draw: (ctx, e) => drawFox(ctx, f, e) }); }
    // An owl on a roof on clear nights, eyes blinking.
    if (env.clearNight) {
      const h = s.buildings.find((b) => b.built && b.type === 'house');
      if (h) out.push({ y: h.y + 0.96, draw: (ctx, e) => drawOwl(ctx, h.x * TILE + 6, h.y * TILE - 20, e) });
    }
    return out;
  }

  lights(): LightSource[] {
    const out: LightSource[] = [];
    if (this.watchman && this.watchman.fade > 0) { const w = this.watchman, dir = w.tx >= w.x ? 1 : -1; out.push({ x: w.x * TILE + TILE / 2 + dir * 7, y: w.y * TILE + TILE / 2 + 2, r: 20, color: '#ffc870', flicker: 0.1 }); }
    if (this.lamplighter) out.push({ x: this.lamplighter.x * TILE + TILE / 2 + 6, y: this.lamplighter.y * TILE + TILE / 2 - 17, r: 12, color: '#ffb040', flicker: 0.2 });
    return out;
  }
}

function drawFox(ctx: CanvasRenderingContext2D, f: Fox, env: Env): void {
  const px = f.x * TILE + TILE / 2, py = f.y * TILE + TILE / 2 + 5;
  const dir = f.tx >= f.x ? 1 : -1;
  const trot = Math.sin(env.clock * (f.phase === 'flee' ? 18 : 6)) * 1;
  ctx.save(); ctx.globalAlpha = f.fade; ctx.translate(px, py); ctx.scale(dir, 1);
  groundShadow(ctx, 0, 0.5, 4.5, 1.5, 0.2);
  for (let k = 0; k < 4; k++) rect(ctx, -3.5 + k * 2.2, -2.5, 1, 2.5 + (k % 2 ? trot : -trot) * 0.5, '#8a4a2a');
  ellipse(ctx, 0, -4, 4.8, 2.2, f.phase === 'creep' ? '#b85a2a' : '#c86a30'); ellipse(ctx, 0, -3, 3, 1, '#f0d8c0');
  circle(ctx, 4.5, -5.5, 1.9, '#c86a30'); poly(ctx, [6, -5.5, 8, -5, 6, -4.2], '#2a1a1a'); poly(ctx, [3, -7, 3.6, -9.5, 4.4, -7], '#c86a30'); poly(ctx, [4.8, -7, 5.6, -9.5, 6.2, -7], '#c86a30');
  const eye = env.dark > 0.3 ? '#ffe040' : '#1a1a1a'; rect(ctx, 4.8, -6.4, 0.7, 0.7, eye);
  line(ctx, -4.5, -4, -9, -3 + Math.sin(env.clock * 3) * 1.2, '#c86a30', 2); circle(ctx, -9, -3 + Math.sin(env.clock * 3) * 1.2, 1.2, '#f0d8c0');
  ctx.restore();
}

function drawOwl(ctx: CanvasRenderingContext2D, px: number, py: number, env: Env): void {
  const blink = Math.sin(env.clock * 0.7) > 0.95;
  ellipse(ctx, px, py, 3, 3.6, '#5a4a3a'); circle(ctx, px, py - 3.5, 2.4, '#6a5a4a');
  poly(ctx, [px - 2.2, py - 5, px - 1.6, py - 7, px - 0.6, py - 5], '#5a4a3a'); poly(ctx, [px + 0.6, py - 5, px + 1.6, py - 7, px + 2.2, py - 5], '#5a4a3a');
  if (!blink) { circle(ctx, px - 1, py - 3.8, 0.9, '#ffe040'); circle(ctx, px + 1, py - 3.8, 0.9, '#ffe040'); }
  poly(ctx, [px - 0.5, py - 2.8, px + 0.5, py - 2.8, px, py - 2], '#e0a030');
  circle(ctx, px, py - 3.8, 6, rgba('#ffe040', blink ? 0 : 0.05));
}
