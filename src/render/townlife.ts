// Ambient town life that lives only in the renderer: villagers strolling the
// streets, children chasing each other, a dog that tags along with workers,
// cats on the roofs, guards pacing the walls, music from the tavern and the
// chapel bell. Nothing here touches the simulation.
import type { GameState, Point } from '../sim/types';
import { isIndoors } from '../sim/workers';
import { findPath, isPassable } from '../sim/world';
import { t } from '../i18n';
import { TILE } from './constants';
import type { LightSource } from './buildings';
import { drawGuard, drawStatue, drawTownsfolk, type TownsfolkOpts } from './units';
import { circle, ellipse, poly, rect, line, groundShadow, hash, rgba, type Env } from './palette';

interface Walker { x: number; y: number; tx: number; ty: number; px: number; py: number; seed: number; ttl: number; speed: number; basket: boolean; child: boolean; fade: number; opts?: TownsfolkOpts }
interface Cheer { x: number; y: number; seed: number; ttl: number }
interface Bit { x: number; y: number; vx: number; vy: number; ttl: number; color: string }
interface Procession { pts: Point[]; d: number; len: number; mourn: number; fade: number; seeds: number[] }
interface Sparkle { x: number; y: number; ttl: number; text: string }
interface Wolf { x: number; y: number; seed: number; fade: number }
interface Deer { x: number; y: number; tx: number; ty: number; home: Point; phase: 'go' | 'drink' | 'back'; timer: number; fade: number }
interface Boat { y: number; x: number; fade: number; cast: number }
interface Fish { x: number; y: number; t: number }
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
  private cheers: Cheer[] = [];
  private bits: Bit[] = [];
  private returning = new Set<number>();
  private processions: Procession[] = [];
  private graves = -1;
  private sparkles: Sparkle[] = [];
  private levels = new Map<number, number>();
  private equipment = -1;
  private forge = 0;
  private wedding: Walker[] = [];
  private weddingTimer = 200;
  private wolves: Wolf[] = [];
  private wolfDen: Point | null = null;
  private deer: Deer | null = null;
  private deerTimer = 90;
  private boat: Boat | null = null;
  private boatTimer = 120;
  private fish: Fish[] = [];
  private fishTimer = 8;
  private statueSpot: Point | null = null;

  update(s: GameState, env: Env, dt: number): void {
    this.refreshRoads(s);
    this.updateWalkers(s, env, dt);
    this.updateKids(s, env, dt);
    this.updateDog(s, env, dt);
    this.updateCats(s, dt);
    this.updateGuards(s);
    this.updateMusic(s, env, dt);
    this.updateCheers(s, env, dt);
    this.updateProcessions(s, dt);
    this.updateSparkles(s, dt);
    this.updateWedding(s, env, dt);
    this.updateWolves(s, env, dt);
    this.updateDeer(s, env, dt);
    this.updateRiver(s, env, dt);
  }

  /** Free tiles around a spot, nearest first (for crowds that must not stand in buildings). */
  private freeTilesAround(s: GameState, at: Point, n: number): Point[] {
    const out: Point[] = [];
    for (let r = 1; r <= 3 && out.length < n; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = at.x + dx, y = at.y + dy;
      if (isPassable(s, x, y) && s.tiles[y * s.width + x].terrain !== 'water') out.push({ x, y });
    }
    return out.slice(0, n);
  }

  /** Townsfolk gather and cheer when a party comes home with loot. */
  private updateCheers(s: GameState, env: Env, dt: number): void {
    const now = new Set<number>();
    for (const p of s.parties) if (p.phase === 'return') now.add(p.id);
    for (const id of this.returning) if (!now.has(id)) {
      const tav = s.buildings.find((b) => b.built && b.type === 'tavern') ?? s.center;
      for (const [i, pt] of this.freeTilesAround(s, tav, 5).entries()) {
        this.cheers.push({ x: pt.x + (hash(i, id, 1) - 0.5) * 0.4, y: pt.y + (hash(i, id, 2) - 0.5) * 0.3, seed: id * 13 + i, ttl: 5 + i * 0.3 });
        for (let k = 0; k < 6; k++) this.bits.push({ x: pt.x * TILE + TILE / 2, y: pt.y * TILE, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 40, ttl: 1.2 + Math.random(), color: ['#f06a4f', '#f7d94c', '#60c0ff', '#f29ac6'][k % 4] });
      }
    }
    this.returning = now;
    this.cheers = this.cheers.filter((c) => (c.ttl -= dt) > 0);
    for (const b of this.bits) { b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 50 * dt; b.vx *= 0.98; }
    this.bits = this.bits.filter((b) => (b.ttl -= dt) > 0);
    void env;
  }

  /** A funeral walks from the tavern to each new grave. */
  private updateProcessions(s: GameState, dt: number): void {
    const graves = s.buildings.filter((b) => b.type === 'grave');
    if (this.graves < 0) this.graves = graves.length;
    if (graves.length > this.graves) {
      const tav = s.buildings.find((b) => b.built && b.type === 'tavern') ?? s.center;
      const g = graves[graves.length - 1];
      const pts = [{ x: tav.x, y: tav.y + 1 }, ...findPath(s, { x: tav.x, y: tav.y + 1 }, g)];
      let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (len > 1) this.processions.push({ pts, d: 0, len, mourn: 7, fade: 0, seeds: [g.id * 7, g.id * 7 + 1, g.id * 7 + 2, g.id * 7 + 3] });
    }
    this.graves = graves.length;
    for (const pr of this.processions) {
      if (pr.d < pr.len + 2.1) { pr.d += 0.9 * dt; pr.fade = Math.min(1, pr.fade + dt); }
      else if (pr.mourn > 0) pr.mourn -= dt;
      else pr.fade -= dt;
    }
    this.processions = this.processions.filter((pr) => pr.fade > 0 || pr.mourn > 0);
  }

  /** Stars when a resting adventurer levels up; sparks when the smith forges better gear. */
  private updateSparkles(s: GameState, dt: number): void {
    for (const a of s.adventurers) {
      const last = this.levels.get(a.id);
      if (last !== undefined && a.level > last && (a.status === 'resting' || a.status === 'arriving')) this.sparkles.push({ x: a.x, y: a.y, ttl: 1.6, text: t('ui.levelUpShort', { level: a.level }) });
      this.levels.set(a.id, a.level);
    }
    if (this.equipment >= 0 && s.equipment > this.equipment) {
      const sm = s.buildings.find((b) => b.built && b.type === 'blacksmith');
      if (sm) { this.forge = 1.2; for (let k = 0; k < 24; k++) this.bits.push({ x: sm.x * TILE + TILE / 2 - 3, y: sm.y * TILE + TILE - 6, vx: (Math.random() - 0.5) * 70, vy: -30 - Math.random() * 60, ttl: 0.5 + Math.random() * 0.5, color: k % 3 ? '#ffd040' : '#ffffff' }); }
    }
    this.equipment = s.equipment;
    this.forge = Math.max(0, this.forge - dt);
    this.sparkles = this.sparkles.filter((sp) => (sp.ttl -= dt) > 0);
  }

  /** Bride and groom stroll from the chapel with petals in the air. */
  private updateWedding(s: GameState, env: Env, dt: number): void {
    const chapel = s.buildings.find((b) => b.built && b.type === 'chapel');
    if (!this.wedding.length) {
      this.weddingTimer -= dt;
      if (chapel && this.weddingTimer <= 0 && env.dark < 0.3 && !env.rainy && !env.snowy) {
        this.weddingTimer = 400 + Math.random() * 400;
        const a = this.spawnWalker(s, false, 0.8, chapel);
        if (a) { a.ttl = 30; a.basket = false; a.opts = { bride: true, tunic: '#f8f4ec' }; const b = { ...a, seed: a.seed + 3, opts: { tunic: '#2a2a3a' } }; this.wedding = [a, b]; this.notes.push({ x: a.x * TILE + TILE / 2, y: a.y * TILE, ttl: 2.2, glyph: '♥', color: '#ff80a0' }); }
      }
      return;
    }
    const [lead, tail] = this.wedding;
    lead.ttl -= dt; tail.ttl = lead.ttl;
    lead.fade = tail.fade = lead.ttl < 1 ? Math.max(0, lead.fade - dt * 2) : Math.min(1, lead.fade + dt * 1.5);
    if (!this.stepRoad(s, lead, dt)) lead.ttl = 0;
    const dx = tail.tx - tail.x, dy = tail.ty - tail.y, d = Math.hypot(dx, dy);
    if (d < 0.01) { if (lead.px >= 0 && (lead.px !== tail.tx || lead.py !== tail.ty)) { tail.px = tail.tx; tail.py = tail.ty; tail.tx = lead.px; tail.ty = lead.py; } }
    else { const sp = Math.min(d, tail.speed * 1.05 * dt); tail.x += dx / d * sp; tail.y += dy / d * sp; }
    if (Math.random() < dt * 6) this.bits.push({ x: lead.x * TILE + TILE / 2 + (Math.random() - 0.5) * 20, y: lead.y * TILE - 10, vx: (Math.random() - 0.5) * 10, vy: 6 + Math.random() * 6, ttl: 2, color: Math.random() < 0.5 ? '#f7c6dc' : '#ffffff' });
    if (Math.random() < dt * 0.7) this.notes.push({ x: lead.x * TILE + TILE / 2, y: lead.y * TILE, ttl: 2.2, glyph: '♥', color: '#ff80a0' });
    if (lead.ttl <= 0) this.wedding = [];
  }

  /** Wolves lurk at a forest edge far from town on clear nights. */
  private updateWolves(s: GameState, env: Env, dt: number): void {
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

  /** A deer wanders down from the woods to drink at the river by day. */
  private updateDeer(s: GameState, env: Env, dt: number): void {
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

  /** A fisherman rows down the river now and then; fish jump. */
  private updateRiver(s: GameState, env: Env, dt: number): void {
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
  groundActors(s: GameState, env0: Env): Drawable[] {
    const out: Drawable[] = [];
    for (const w of [...this.walkers, ...this.kids]) out.push({ y: w.y + 0.8, draw: (ctx, env) => { ctx.globalAlpha = w.fade; drawTownsfolk(ctx, w.x, w.y, w.tx >= w.x ? 1 : -1, Math.hypot(w.tx - w.x, w.ty - w.y) > 0.02, env, w.seed, { child: w.child, basket: w.basket }); ctx.globalAlpha = 1; } });
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
    for (const c of this.cheers) out.push({ y: c.y + 0.8, draw: (ctx, env) => { ctx.globalAlpha = Math.min(1, c.ttl); drawTownsfolk(ctx, c.x, c.y, hash(c.seed, 9) > 0.5 ? 1 : -1, false, env, c.seed, { cheer: true }); ctx.globalAlpha = 1; } });
    for (const w of this.wedding) out.push({ y: w.y + 0.8, draw: (ctx, env) => { ctx.globalAlpha = w.fade; drawTownsfolk(ctx, w.x, w.y, w.tx >= w.x ? 1 : -1, Math.hypot(w.tx - w.x, w.ty - w.y) > 0.02, env, w.seed, w.opts); ctx.globalAlpha = 1; } });
    for (const pr of this.processions) {
      pr.seeds.forEach((seed, i) => {
        const pos = alongPath(pr.pts, pr.d - i * 0.7);
        const moving = pr.d < pr.len + 2.1;
        out.push({ y: pos.y + 0.8, draw: (ctx, env) => { ctx.globalAlpha = Math.max(0, Math.min(1, pr.fade)); drawTownsfolk(ctx, pos.x, pos.y, pos.dir, moving, env, seed, { tunic: i === 0 ? '#1e1e26' : '#2e2e3a' }); if (i === 0 && moving) { const px = pos.x * TILE + TILE / 2, py = pos.y * TILE + TILE / 2 - 4; rect(ctx, px - 7, py, 14, 2.5, '#5a3a1e'); rect(ctx, px - 5, py - 2.5, 10, 2.5, '#e8e0d0'); } ctx.globalAlpha = 1; } });
      });
    }
    if (env0.festival) {
      const c = s.center;
      for (let i = 0; i < 8; i++) {
        const arm = i % 4, inner = i >= 4;
        const r = inner ? 0.5 : 1.15 + Math.sin(env0.clock * 2.2 + i) * 0.3;
        const ang = inner ? Math.PI / 4 + arm * Math.PI / 2 + env0.clock * 0.8 : arm * Math.PI / 2;
        const x = c.x + Math.cos(ang) * r, y = c.y + Math.sin(ang) * r * 0.8;
        out.push({ y: y + 0.8, draw: (ctx, env) => drawTownsfolk(ctx, x, y, Math.cos(ang) >= 0 ? -1 : 1, true, env, 900 + i, { child: i >= 6 }) });
      }
    }
    for (const w of this.wolves) out.push({ y: w.y + 0.8, draw: (ctx, env) => drawWolf(ctx, w, env) });
    if (this.deer) { const d = this.deer; out.push({ y: d.y + 0.8, draw: (ctx, env) => drawDeer(ctx, d, env) }); }
    if (this.boat) { const b = this.boat; out.push({ y: b.y + 0.5, draw: (ctx, env) => drawBoat(ctx, b, env) }); }
    for (const f of this.fish) out.push({ y: f.y + 0.3, draw: (ctx) => drawFish(ctx, f) });
    if (s.victory) {
      // The hero's statue stands on the first free spot beside the keep.
      const keep = s.buildings.find((b) => b.built && b.type === 'keep');
      if (keep && !this.statueSpot) this.statueSpot = this.freeTilesAround(s, keep, 1)[0] ?? null;
      const sp = this.statueSpot;
      if (sp) out.push({ y: sp.y + 0.8, draw: (ctx, env) => drawStatue(ctx, sp.x, sp.y, env) });
    }
    return out;
  }

  /** Music notes and bell rings, drawn above the lighting so they read at night. */
  drawOverlay(ctx: CanvasRenderingContext2D, env: Env, s: GameState): void {
    for (const b of this.bits) { ctx.globalAlpha = Math.min(1, b.ttl); rect(ctx, b.x - 1, b.y - 1, 2, 2, b.color); }
    for (const sp of this.sparkles) {
      const k = 1 - sp.ttl / 1.6, px = sp.x * TILE + TILE / 2, py = sp.y * TILE + TILE / 2;
      ctx.globalAlpha = sp.ttl < 0.5 ? sp.ttl * 2 : 1;
      for (let i = 0; i < 6; i++) { const a = i * 1.05 + k * 2, r = 6 + k * 14; star(ctx, px + Math.cos(a) * r, py - 8 + Math.sin(a) * r * 0.6 - k * 10, 2.2, '#ffe060'); }
      ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(sp.text, px, py - 20 - k * 12); ctx.fillStyle = '#ffe060'; ctx.fillText(sp.text, px, py - 20 - k * 12);
    }
    ctx.globalAlpha = 1;
    if (this.forge > 0) { const sm = s.buildings.find((b) => b.built && b.type === 'blacksmith'); if (sm) circle(ctx, sm.x * TILE + TILE / 2 - 3, sm.y * TILE + TILE - 4, 14 * this.forge, rgba('#ffb040', 0.35 * this.forge)); }
    if (env.festival) {
      // Lantern strings over the square and a title.
      const c = s.center, cx = c.x * TILE + TILE / 2, cy = c.y * TILE + TILE / 2 - 22;
      for (const [ax, ay] of [[1, 0], [0, 1]] as [number, number][]) {
        const x1 = cx - ax * 2.6 * TILE, y1 = cy - ay * 2.6 * TILE, x2 = cx + ax * 2.6 * TILE, y2 = cy + ay * 2.6 * TILE;
        line(ctx, x1, y1, x2, y2, 'rgba(60,40,20,0.7)', 1);
        for (let k = 0; k <= 8; k++) { const q = k / 8, lx = x1 + (x2 - x1) * q, ly = y1 + (y2 - y1) * q + Math.sin(q * Math.PI) * 4 + Math.sin(env.clock * 3 + k) * 1.5; const col = k % 2 ? '#ff8040' : '#ffd040'; rect(ctx, lx - 2, ly, 4, 5, col); rect(ctx, lx - 2.5, ly, 5, 1, '#5a3a1e'); if (env.dark > 0.3) circle(ctx, lx, ly + 2.5, 7, rgba(col, 0.25)); }
      }
      ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(t('ui.festival'), cx, cy - 34); ctx.fillStyle = '#ffd060'; ctx.fillText(t('ui.festival'), cx, cy - 34);
    }
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
    if (env.festival) { const c = s.center; for (const [ax, ay] of [[1, 0], [0, 1]] as [number, number][]) for (let k = 0; k <= 8; k++) { const q = k / 8 - 0.5; out.push({ x: c.x * TILE + TILE / 2 + ax * q * 5.2 * TILE, y: c.y * TILE + TILE / 2 - 20 + ay * q * 5.2 * TILE, r: 16, color: k % 2 ? '#ff9050' : '#ffd060', flicker: 0.1 }); } }
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

/** Position and facing at distance `d` along a polyline of tile points. */
function alongPath(pts: Point[], d: number): { x: number; y: number; dir: number } {
  if (d <= 0 || pts.length < 2) return { x: pts[0].x, y: pts[0].y, dir: 1 };
  let left = d;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], seg = Math.hypot(b.x - a.x, b.y - a.y);
    const dir = b.x > a.x ? 1 : b.x < a.x ? -1 : 1;
    if (left <= seg) { const q = left / seg; return { x: a.x + (b.x - a.x) * q, y: a.y + (b.y - a.y) * q, dir }; }
    left -= seg;
  }
  const last = pts[pts.length - 1], prev = pts[pts.length - 2];
  return { x: last.x, y: last.y, dir: last.x >= prev.x ? 1 : -1 };
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}

function drawWolf(ctx: CanvasRenderingContext2D, w: Wolf, env: Env): void {
  if (w.fade <= 0) return;
  const px = w.x * TILE + TILE / 2, py = w.y * TILE + TILE / 2 + 5;
  const dir = Math.sin(env.clock * 0.6 + w.seed) >= 0 ? 1 : -1;
  ctx.save(); ctx.globalAlpha = w.fade; ctx.translate(px, py); ctx.scale(dir, 1);
  groundShadow(ctx, 0, 0.5, 5, 1.6, 0.25);
  for (let k = 0; k < 4; k++) rect(ctx, -4 + k * 2.4, -3, 1.1, 3, '#4a4a52');
  ellipse(ctx, 0, -5, 5.5, 2.6, '#5a5a64'); ellipse(ctx, 0, -4, 3.5, 1.3, '#8a8a94');
  circle(ctx, 5, -6.5, 2.2, '#5a5a64'); poly(ctx, [6.5, -6.5, 9, -6, 6.5, -5], '#5a5a64');
  poly(ctx, [3.5, -8, 4.2, -10.5, 5.2, -8], '#5a5a64'); poly(ctx, [5.2, -8, 6, -10.5, 6.8, -8], '#5a5a64');
  line(ctx, -5, -5, -8, -3 + Math.sin(env.clock * 2 + w.seed), '#5a5a64', 1.3);
  const eye = env.dark > 0.3 ? '#ffe040' : '#1a1a1a';
  rect(ctx, 5.3, -7.2, 0.8, 0.8, eye); rect(ctx, 6.5, -7.2, 0.8, 0.8, eye);
  ctx.restore();
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
    ellipse(ctx, 0, 0, 3.2, 1.3, '#b8c8d8'); poly(ctx, [-3, 0, -5, -1.8, -5, 1.8], '#b8c8d8'); rect(ctx, 1.5, -0.5, 0.6, 0.6, '#222');
    ctx.restore();
  }
  if (k > 0.45) { const q = (k - 0.45) / 0.65; ctx.strokeStyle = `rgba(230,240,255,${0.7 * (1 - q)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(px, py, 2 + q * 8, 1 + q * 3.5, 0, 0, Math.PI * 2); ctx.stroke(); }
}
