// After dark: the lamplighter doing the round at dusk, a watchman with a
// lantern walking the streets, patrons stumbling home from the tavern, a fox
// creeping up on the hens, an owl on a roof, and a midnight thief chase.
import type { GameState, Point } from '../../sim/types';
import { t } from '../../i18n';
import { TILE } from '../constants';
import type { LightSource } from '../buildings';
import { lampPosts } from '../buildings';
import { circle, ellipse, poly, rect, line, groundShadow, rgba, type Env } from '../palette';
import { drawTownsfolk } from '../units';
import { bubble } from '../units/shared';
import { walkerActor, type Actor, type Roads, type Walker } from './shared';

interface Fox { x: number; y: number; tx: number; ty: number; phase: 'creep' | 'flee'; fade: number; timer: number }
interface ThiefChase { x: number; y: number; tx: number; ty: number; fade: number; coins: { x: number; y: number; ttl: number }[] }

export class NightLife {
  private watchman: Walker | null = null;
  private patrons: Walker[] = [];
  private patronTimer = 4;
  private fox: Fox | null = null;
  private foxTimer = 60;
  private lamplighter: Walker | null = null;
  private chase: ThiefChase | null = null;
  private chaseTimer = 45;

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
    // Midnight thief chase: a masked thief bolts from the market or granary pursued by a guard and dog.
    const targetBld = s.buildings.find((b) => b.built && (b.type === 'market' || b.type === 'granary'));
    if (!this.chase) {
      this.chaseTimer -= dt;
      if (this.chaseTimer <= 0 && night && targetBld && !env.storm) {
        this.chaseTimer = 85 + Math.random() * 95;
        const exitX = targetBld.x > s.width / 2 ? s.width - 1.5 : 3.2;
        const exitY = Math.max(2, Math.min(s.height - 2, targetBld.y + (Math.random() < 0.5 ? -4 : 4)));
        this.chase = { x: targetBld.x + 0.5, y: targetBld.y + 0.8, tx: exitX, ty: exitY, fade: 0, coins: [] };
      }
    } else {
      const ch = this.chase;
      ch.fade = night ? Math.min(1, ch.fade + dt * 2) : Math.max(0, ch.fade - dt * 2);
      const dx = ch.tx - ch.x, dy = ch.ty - ch.y, d = Math.hypot(dx, dy);
      if (d > 0.1 && ch.fade > 0) {
        const sp = Math.min(d, 2.1 * dt);
        ch.x += (dx / d) * sp; ch.y += (dy / d) * sp;
        if (Math.random() < dt * 7) ch.coins.push({ x: ch.x * TILE + TILE / 2 + (Math.random() - 0.5) * 4, y: ch.y * TILE + TILE / 2 + 3, ttl: 1.6 });
      } else {
        this.chase = null;
      }
      if (this.chase) {
        for (const c of ch.coins) c.ttl -= dt;
        ch.coins = ch.coins.filter((c) => c.ttl > 0);
      }
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
    if (this.chase) { const ch = this.chase; out.push({ y: ch.y + 0.82, draw: (ctx, e) => drawThiefChase(ctx, ch, e) }); }
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
    if (this.chase && this.chase.fade > 0) {
      const ch = this.chase, dir = ch.tx >= ch.x ? 1 : -1;
      out.push({ x: (ch.x - dir * 0.7) * TILE + TILE / 2, y: ch.y * TILE + TILE / 2, r: 24, color: '#ffc860', flicker: 0.15 });
    }
    return out;
  }
}

function drawThiefChase(ctx: CanvasRenderingContext2D, ch: ThiefChase, env: Env): void {
  const dir = ch.tx >= ch.x ? 1 : -1;
  ctx.save(); ctx.globalAlpha = ch.fade;
  // Dropped glittering gold coins behind the thief.
  for (const c of ch.coins) {
    ctx.globalAlpha = ch.fade * Math.min(1, c.ttl);
    circle(ctx, c.x, c.y, 1.3, '#ffd040');
    circle(ctx, c.x - 0.3, c.y - 0.3, 0.6, '#fff8c0');
  }
  ctx.globalAlpha = ch.fade;
  // Masked thief in front carrying a bulging loot sack.
  drawTownsfolk(ctx, ch.x, ch.y, dir, true, env, 991, { tunic: '#262430' });
  const tpx = ch.x * TILE + TILE / 2, tpy = ch.y * TILE + TILE / 2 + 5;
  ellipse(ctx, tpx - dir * 3.5, tpy - 7, 3.2, 2.6, '#b89458');
  rect(ctx, tpx - 2.2, tpy - 12.5, 4.4, 1.4, '#14141a'); // eye mask

  // Guard chasing 0.75 tiles behind with a lantern and spear.
  const gx = ch.x - dir * 0.78, gy = ch.y + 0.08;
  drawTownsfolk(ctx, gx, gy, dir, true, env, 992, { tunic: '#384868' });
  const gpx = gx * TILE + TILE / 2, gpy = gy * TILE + TILE / 2 + 5;
  line(ctx, gpx + dir * 4, gpy - 8, gpx + dir * 6.5, gpy - 4, '#5a3a1e', 1);
  rect(ctx, gpx + dir * 6.5 - 1.5, gpy - 4, 3, 3.5, '#ffd060');
  const k = (env.clock * 0.5) % 1;
  if (k < 0.55) bubble(ctx, gpx, gpy - 22, t('talk.v.stopThief'), 0.95, '#c84030');
  ctx.restore();
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
