// Ambient town life that lives only in the renderer: villagers strolling the
// streets, children chasing each other, a dog that tags along with workers,
// cats on the roofs, guards pacing the walls, music from the tavern and the
// chapel bell. Nothing here touches the simulation.
import type { GameState } from '../sim/types';
import { isIndoors } from '../sim/workers';
import { TILE } from './constants';
import type { LightSource } from './buildings';
import { drawGuard, drawTownsfolk } from './units';
import { circle, ellipse, poly, rect, line, groundShadow, hash, type Env } from './palette';

interface Walker { x: number; y: number; tx: number; ty: number; px: number; py: number; seed: number; ttl: number; speed: number; basket: boolean; child: boolean; fade: number }
interface Dog { x: number; y: number; target: number; timer: number; wag: number; face: number }
interface Cat { house: number; timer: number; fade: number; seed: number }
interface Guard { wall: number; seed: number }
interface Note { x: number; y: number; ttl: number; glyph: string; color: string }
interface Ring { x: number; y: number; ttl: number }

type Drawable = { y: number; draw: (ctx: CanvasRenderingContext2D, env: Env) => void };

export class TownLife {
  private walkers: Walker[] = [];
  private kids: Walker[] = [];
  private kidTimer = 30;
  private dog: Dog | null = null;
  private cats: Cat[] = [];
  private guards: Guard[] = [];
  private notes: Note[] = [];
  private rings: Ring[] = [];
  private noteTimer = 0;
  private bellTimer = 0;
  private roads: number[] = [];
  private roadStamp = -1;

  update(s: GameState, env: Env, dt: number): void {
    this.refreshRoads(s);
    this.updateWalkers(s, env, dt);
    this.updateKids(s, env, dt);
    this.updateDog(s, env, dt);
    this.updateCats(s, dt);
    this.updateGuards(s);
    this.updateMusic(s, env, dt);
  }

  private refreshRoads(s: GameState): void {
    const stamp = s.buildings.length * 1000 + s.stats.built;
    if (stamp === this.roadStamp) return;
    this.roadStamp = stamp;
    this.roads = [];
    for (let i = 0; i < s.tiles.length; i++) if (s.tiles[i].terrain === 'road') this.roads.push(i);
  }

  /** Random walk along road tiles, never doubling straight back. Returns false when stuck. */
  private stepRoad(s: GameState, w: Walker, dt: number): boolean {
    const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
    if (d < 0.01) {
      const opts: [number, number][] = [];
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
        const nx = w.tx + ox, ny = w.ty + oy;
        const tile = s.tiles[ny * s.width + nx];
        if (nx < 0 || ny < 0 || nx >= s.width || ny >= s.height || !tile || tile.terrain !== 'road') continue;
        if (nx === w.px && ny === w.py && Math.random() < 0.85) continue;
        opts.push([nx, ny]);
      }
      if (!opts.length) return false;
      const [nx, ny] = opts[Math.floor(Math.random() * opts.length)];
      w.px = w.tx; w.py = w.ty; w.tx = nx; w.ty = ny;
      return true;
    }
    const sp = Math.min(d, w.speed * dt);
    w.x += dx / d * sp; w.y += dy / d * sp;
    return true;
  }

  private spawnWalker(s: GameState, child: boolean, speed: number, near?: { x: number; y: number }): Walker | null {
    if (this.roads.length < 8) return null;
    let i = this.roads[Math.floor(Math.random() * this.roads.length)];
    if (near) {
      // Prefer a road tile close to the given spot.
      let best = Infinity;
      for (let k = 0; k < 12; k++) { const j = this.roads[Math.floor(Math.random() * this.roads.length)]; const d = Math.hypot(j % s.width - near.x, Math.floor(j / s.width) - near.y); if (d < best) { best = d; i = j; } }
    }
    const x = i % s.width, y = Math.floor(i / s.width);
    return { x, y, tx: x, ty: y, px: -1, py: -1, seed: Math.floor(Math.random() * 1e6), ttl: 18 + Math.random() * 25, speed, basket: Math.random() < 0.4, child, fade: 0 };
  }

  private updateWalkers(s: GameState, env: Env, dt: number): void {
    const homes = s.buildings.filter((b) => b.built && (b.type === 'house' || b.type === 'hut')).length;
    let want = env.dark < 0.5 && !env.night ? Math.min(4, Math.floor(homes / 2)) : 0;
    if (env.rainy || env.snowy) want = Math.floor(want / 2);
    if (this.walkers.length < want && Math.random() < dt * 0.4) { const w = this.spawnWalker(s, false, 0.9 + Math.random() * 0.3); if (w) this.walkers.push(w); }
    for (const w of this.walkers) {
      w.ttl -= dt;
      w.fade = Math.min(1, w.fade + dt * 1.5);
      if (w.ttl < 1 || this.walkers.length > want) w.fade = Math.max(0, w.fade - dt * 2);
      if (!this.stepRoad(s, w, dt)) w.ttl = 0;
    }
    this.walkers = this.walkers.filter((w) => w.ttl > 0 && !(w.fade <= 0 && w.ttl < 1));
  }

  private updateKids(s: GameState, env: Env, dt: number): void {
    const playtime = env.dark < 0.4 && !env.night && !env.rainy && s.workers.length >= 6;
    if (!this.kids.length) {
      this.kidTimer -= dt;
      if (playtime && this.kidTimer <= 0) {
        const a = this.spawnWalker(s, true, 1.9);
        if (a) { const b = { ...a, seed: a.seed + 7, basket: false }; a.ttl = b.ttl = 25 + Math.random() * 25; this.kids = [a, b]; }
        this.kidTimer = 25 + Math.random() * 40;
      }
      return;
    }
    const [lead, tail] = this.kids;
    lead.ttl -= dt; tail.ttl = lead.ttl;
    lead.fade = tail.fade = lead.ttl < 1 || !playtime ? Math.max(0, lead.fade - dt * 2) : Math.min(1, lead.fade + dt * 1.5);
    if (!this.stepRoad(s, lead, dt)) lead.ttl = 0;
    // The second child chases the first along its trail.
    const dx = tail.tx - tail.x, dy = tail.ty - tail.y, d = Math.hypot(dx, dy);
    if (d < 0.01) { if (lead.px >= 0 && (lead.px !== tail.tx || lead.py !== tail.ty)) { tail.px = tail.tx; tail.py = tail.ty; tail.tx = lead.px; tail.ty = lead.py; } }
    else { const sp = Math.min(d, tail.speed * 1.05 * dt); tail.x += dx / d * sp; tail.y += dy / d * sp; }
    if (lead.ttl <= 0 || (lead.fade <= 0 && !playtime)) { this.kids = []; this.kidTimer = 20 + Math.random() * 30; }
  }

  private updateDog(s: GameState, env: Env, dt: number): void {
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

  private updateCats(s: GameState, dt: number): void {
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

  private updateGuards(s: GameState): void {
    const walls = s.buildings.filter((b) => b.built && b.type === 'walls');
    const want = Math.min(4, Math.ceil(walls.length / 2));
    this.guards = this.guards.filter((g) => walls.some((w) => w.id === g.wall)).slice(0, want);
    for (const w of walls) { if (this.guards.length >= want) break; if (!this.guards.some((g) => g.wall === w.id)) this.guards.push({ wall: w.id, seed: w.id * 13 }); }
  }

  private updateMusic(s: GameState, env: Env, dt: number): void {
    this.notes = this.notes.filter((n) => (n.ttl -= dt) > 0);
    this.rings = this.rings.filter((r) => (r.ttl -= dt) > 0);
    const tavern = s.buildings.find((b) => b.built && b.type === 'tavern');
    if (tavern && env.dark > 0.5 && env.dayFrac > 0.82) {
      this.noteTimer -= dt;
      if (this.noteTimer <= 0) {
        this.noteTimer = 1 + Math.random() * 1.6;
        this.notes.push({ x: tavern.x * TILE + TILE / 2 + (Math.random() - 0.5) * 10, y: tavern.y * TILE + 4, ttl: 2.2, glyph: Math.random() < 0.5 ? '♪' : '♫', color: '#ffd070' });
      }
    }
    const chapel = s.buildings.find((b) => b.built && b.type === 'chapel');
    if (chapel && env.bell > 0) {
      this.bellTimer -= dt;
      if (this.bellTimer <= 0) {
        this.bellTimer = 0.55;
        const bx = chapel.x * TILE + TILE / 2, by = chapel.y * TILE + TILE - (TILE + 9) * 1.5;
        this.notes.push({ x: bx + (Math.random() - 0.5) * 8, y: by, ttl: 2, glyph: '♪', color: '#f8f0d0' });
        this.rings.push({ x: bx, y: by, ttl: 1.2 });
      }
    }
  }

  /** Things standing on the ground, sorted with units by the renderer. */
  groundActors(s: GameState): Drawable[] {
    const out: Drawable[] = [];
    for (const w of [...this.walkers, ...this.kids]) out.push({ y: w.y + 0.8, draw: (ctx, env) => { ctx.globalAlpha = w.fade; drawTownsfolk(ctx, w.x, w.y, w.tx >= w.x ? 1 : -1, Math.hypot(w.tx - w.x, w.ty - w.y) > 0.02, env, w.seed, w.child, w.basket); ctx.globalAlpha = 1; } });
    if (this.dog) { const d = this.dog; out.push({ y: d.y + 0.8, draw: (ctx, env) => drawDog(ctx, d, env) }); }
    for (const c of this.cats) {
      const b = s.buildings.find((x) => x.id === c.house);
      if (!b || !b.built) continue;
      out.push({ y: b.y + 0.96, draw: (ctx, env) => drawCat(ctx, b.x * TILE + TILE - 7, b.y * TILE - 13, c, env) });
    }
    for (const g of this.guards) {
      const b = s.buildings.find((x) => x.id === g.wall);
      if (!b) continue;
      out.push({ y: b.y + 0.96, draw: (ctx, env) => { const ox = Math.sin(env.clock * 0.45 + g.seed) * 0.32; const dir = Math.cos(env.clock * 0.45 + g.seed) >= 0 ? 1 : -1; drawGuard(ctx, b.x + ox, b.y - 1.55, dir, true, env, g.seed); } });
    }
    return out;
  }

  /** Music notes and bell rings, drawn above the lighting so they read at night. */
  drawOverlay(ctx: CanvasRenderingContext2D): void {
    ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center';
    for (const n of this.notes) {
      const k = 1 - n.ttl / 2.2;
      ctx.globalAlpha = n.ttl < 0.6 ? n.ttl / 0.6 : 1;
      ctx.fillStyle = n.color; ctx.fillText(n.glyph, n.x + Math.sin(k * 9) * 3, n.y - k * 26);
    }
    for (const r of this.rings) {
      const k = 1 - r.ttl / 1.2;
      ctx.globalAlpha = (1 - k) * 0.5; ctx.strokeStyle = '#fff4d0'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(r.x, r.y, 4 + k * 26, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /** Guard torches at night. */
  lights(s: GameState, env: Env): LightSource[] {
    const out: LightSource[] = [];
    if (env.dark <= 0.25) return out;
    for (const g of this.guards) {
      const b = s.buildings.find((x) => x.id === g.wall);
      if (!b) continue;
      const ox = Math.sin(env.clock * 0.45 + g.seed) * 0.32;
      out.push({ x: (b.x + ox) * TILE + TILE / 2, y: (b.y - 1.55) * TILE + TILE / 2 - 4, r: 18, color: '#ffa040', flicker: 0.2 });
    }
    return out;
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
