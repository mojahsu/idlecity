// Children: the town's real children by name, or a pair of playmates chasing each other before any are born.
import type { GameState, Point } from '../../sim/types';
import { t } from '../../i18n';
import { TILE } from '../constants';
import { circle, poly, rect, rgba, type Env } from '../palette';
import { bubble } from '../units/shared';
import { walkerActor, type Actor, type Roads, type Walker } from './shared';

export class Kids {
  private kids: Walker[] = [];
  private kidTimer = 30;
  private kidsById = new Map<number, Walker>();

  update(s: GameState, env: Env, dt: number, roads: Roads): void {
    const playtime = !s.raid && env.dark < 0.4 && !env.night && !env.rainy && s.workers.length >= 6;
    // The town's real children wander the streets by day, each with a name in the sim.
    const real = s.children ?? [];
    for (const c of real) {
      let w = this.kidsById.get(c.id);
      if (!w) { const nw = roads.spawnWalker(s, true, 0.95, s.buildings.find((b) => b.built && (b.type === 'house' || b.type === 'hut')) ?? s.center); if (!nw) continue; w = nw; w.seed = c.id * 31; w.basket = false; this.kidsById.set(c.id, w); }
      w.ttl = 99;
      w.fade = playtime ? Math.min(1, w.fade + dt * 1.5) : Math.max(0, w.fade - dt * 2);
      if (w.fade > 0 && !roads.step(s, w, dt)) { const nw = roads.spawnWalker(s, true, 0.95); if (nw) { nw.seed = w.seed; this.kidsById.set(c.id, nw); } }
    }
    for (const id of [...this.kidsById.keys()]) if (!real.some((c) => c.id === id)) this.kidsById.delete(id);
    if (real.length) { this.kids = []; return; }
    if (!this.kids.length) {
      this.kidTimer -= dt;
      if (playtime && this.kidTimer <= 0) {
        const a = roads.spawnWalker(s, true, 1.3);
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

  actors(s: GameState, env: Env): Actor[] {
    const out = [...this.kids, ...this.kidsById.values()].map(walkerActor);
    // Highlight the village-born Protagonist child with a golden starlight aura, red hero scarf, and wooden practice sword!
    const heroChild = (s.children ?? []).find((c) => c.hero);
    if (heroChild) {
      const hw = this.kidsById.get(heroChild.id);
      if (hw && hw.fade > 0.2) {
        out.push({
          y: hw.y + 0.86,
          draw: (ctx, e) => {
            const px = hw.x * TILE + TILE / 2;
            const py = hw.y * TILE + TILE / 2 + 2;
            const dir = hw.tx >= hw.x ? 1 : -1;
            const swing = Math.sin(e.clock * 8 + heroChild.id) * 2.2;
            ctx.save();
            ctx.globalAlpha = hw.fade;
            // Golden starlight ring underfoot
            ctx.strokeStyle = rgba('#ffe066', 0.78);
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.ellipse(px, py + 1.5, 5.5 + Math.sin(e.clock * 4) * 0.8, 2.2, 0, 0, Math.PI * 2);
            ctx.stroke();
            // Fluttering red hero scarf
            const wave = Math.sin(e.clock * 9) * 1.4;
            poly(ctx, [px - dir * 1.5, py - 5.5, px - dir * 6.5, py - 4.2 + wave, px - dir * 5.2, py - 2.2 + wave], '#d83838');
            // Miniature wooden practice sword
            rect(ctx, px + dir * 2.8, py - 6.5 + swing * 0.4, dir * 4.5, 1.3, '#d2a058');
            rect(ctx, px + dir * 2.4, py - 7.4 + swing * 0.4, 1.2, 3, '#8a5a2b');
            // Floating golden star emblem above head
            ctx.font = 'bold 8px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffe060';
            ctx.fillText('★', px, py - 13 + Math.sin(e.clock * 4) * 1.2);
            const talkPhase = (e.clock * 0.22 + heroChild.id * 0.17) % 1;
            if (talkPhase < 0.24) {
              bubble(ctx, px, py - 21, t(talkPhase < 0.12 ? 'talk.kid.hero.0' : 'talk.kid.hero.1'), 1, '#c88820');
            }
            ctx.restore();
          },
        });
      }
    }
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

  /** Named children currently playing outdoors, for kid-and-hero skits. */
  namedSpots(s: GameState): { id: number; name: string; x: number; y: number }[] {
    const out: { id: number; name: string; x: number; y: number }[] = [];
    for (const c of s.children ?? []) {
      const w = this.kidsById.get(c.id);
      if (w && w.fade > 0.6) out.push({ id: c.id, name: c.name, x: w.x, y: w.y });
    }
    if (!out.length && this.kids.length && this.kids[0].fade > 0.6) {
      out.push({ id: -1, name: '', x: this.kids[0].x, y: this.kids[0].y });
    }
    return out;
  }
}
