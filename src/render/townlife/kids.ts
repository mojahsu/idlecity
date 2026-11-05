// Children: the town's real children by name, or a pair of playmates chasing each other before any are born.
import type { GameState, Point } from '../../sim/types';
import { TILE } from '../constants';
import { circle, type Env } from '../palette';
import { walkerActor, type Actor, type Roads, type Walker } from './shared';

export class Kids {
  private kids: Walker[] = [];
  private kidTimer = 30;
  private kidsById = new Map<number, Walker>();

  update(s: GameState, env: Env, dt: number, roads: Roads): void {
    const playtime = env.dark < 0.4 && !env.night && !env.rainy && s.workers.length >= 6;
    // The town's real children wander the streets by day, each with a name in the sim.
    const real = s.children ?? [];
    for (const c of real) {
      let w = this.kidsById.get(c.id);
      if (!w) { const nw = roads.spawnWalker(s, true, 1.3, s.buildings.find((b) => b.built && (b.type === 'house' || b.type === 'hut')) ?? s.center); if (!nw) continue; w = nw; w.seed = c.id * 31; w.basket = false; this.kidsById.set(c.id, w); }
      w.ttl = 99;
      w.fade = playtime ? Math.min(1, w.fade + dt * 1.5) : Math.max(0, w.fade - dt * 2);
      if (w.fade > 0 && !roads.step(s, w, dt)) { const nw = roads.spawnWalker(s, true, 1.3); if (nw) { nw.seed = w.seed; this.kidsById.set(c.id, nw); } }
    }
    for (const id of [...this.kidsById.keys()]) if (!real.some((c) => c.id === id)) this.kidsById.delete(id);
    if (real.length) { this.kids = []; return; }
    if (!this.kids.length) {
      this.kidTimer -= dt;
      if (playtime && this.kidTimer <= 0) {
        const a = roads.spawnWalker(s, true, 1.9);
        if (a) { const b = { ...a, seed: a.seed + 7, basket: false }; a.ttl = b.ttl = 25 + Math.random() * 25; this.kids = [a, b]; }
        this.kidTimer = 25 + Math.random() * 40;
      }
      return;
    }
    const [lead, tail] = this.kids;
    lead.ttl -= dt; tail.ttl = lead.ttl;
    lead.fade = tail.fade = lead.ttl < 1 || !playtime ? Math.max(0, lead.fade - dt * 2) : Math.min(1, lead.fade + dt * 1.5);
    if (!roads.step(s, lead, dt)) lead.ttl = 0;
    // The second child chases the first along its trail.
    const dx = tail.tx - tail.x, dy = tail.ty - tail.y, d = Math.hypot(dx, dy);
    if (d < 0.01) { if (lead.px >= 0 && (lead.px !== tail.tx || lead.py !== tail.ty)) { tail.px = tail.tx; tail.py = tail.ty; tail.tx = lead.px; tail.ty = lead.py; } }
    else { const sp = Math.min(d, tail.speed * 1.05 * dt); tail.x += dx / d * sp; tail.y += dy / d * sp; }
    if (lead.ttl <= 0 || (lead.fade <= 0 && !playtime)) { this.kids = []; this.kidTimer = 20 + Math.random() * 30; }
  }

  actors(env: Env): Actor[] {
    const out = [...this.kids, ...this.kidsById.values()].map(walkerActor);
    // Two children close together toss a ball back and forth.
    const near = [...this.kidsById.values(), ...this.kids].filter((w) => w.fade > 0.9);
    const paired = new Set<Walker>();
    for (let i = 0; i < near.length; i++) {
      const a = near[i];
      if (paired.has(a)) continue;
      const b = near.find((o) => o !== a && !paired.has(o) && Math.hypot(a.x - o.x, a.y - o.y) <= 4);
      if (!b) continue;
      paired.add(a); paired.add(b);
      out.push({ y: Math.max(a.y, b.y) + 0.9, draw: (ctx, e) => {
        const k = (e.clock * 0.9 + i) % 1, q = k < 0.5 ? k * 2 : (1 - k) * 2;
        const x = (a.x + (b.x - a.x) * q) * TILE + TILE / 2, y = (a.y + (b.y - a.y) * q) * TILE + TILE / 2 - 4 - Math.sin(q * Math.PI) * 9;
        circle(ctx, x, y, 2.2, '#d84a4a'); circle(ctx, x - 0.6, y - 0.7, 1, '#f08080');
      } });
    }
    void env;
    return out;
  }

  /** Where the children are, so the hens can scatter. */
  spots(): Point[] { return [...this.kidsById.values(), ...this.kids].filter((w) => w.fade > 0.5).map((w) => ({ x: w.x, y: w.y })); }
}
