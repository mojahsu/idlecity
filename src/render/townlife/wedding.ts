// Bride and groom stroll from the chapel with petals and hearts in the air.
import type { GameState } from '../../sim/types';
import { TILE } from '../constants';
import type { Env } from '../palette';
import type { Bits } from './bits';
import type { Music } from './music';
import { walkerActor, type Actor, type Roads, type Walker } from './shared';

export class Wedding {
  private wedding: Walker[] = [];
  private weddingTimer = 600;
  private weddingsSeen = 0;

  /** Bride and groom stroll from the chapel with petals in the air. */
  update(s: GameState, env: Env, dt: number, roads: Roads, bits: Bits, music: Music): void {
    const chapel = s.buildings.find((b) => b.built && b.type === 'chapel');
    const weddings = s.log.filter((e) => e.key === 'log.wedding').length;
    if (this.weddingsSeen < 0 || weddings < this.weddingsSeen) this.weddingsSeen = weddings;
    if (!this.wedding.length) {
      this.weddingTimer -= dt;
      const announced = weddings > this.weddingsSeen;
      if (announced) this.weddingsSeen = weddings;
      if (chapel && (announced || this.weddingTimer <= 0) && env.dark < 0.3 && !env.rainy && !env.snowy) {
        this.weddingTimer = 900 + Math.random() * 600;
        const a = roads.spawnWalker(s, false, 0.8, chapel);
        if (a) { a.ttl = 30; a.basket = false; a.opts = { bride: true, tunic: '#f8f4ec' }; const b = { ...a, seed: a.seed + 3, opts: { tunic: '#2a2a3a' } }; this.wedding = [a, b]; music.notes.push({ x: a.x * TILE + TILE / 2, y: a.y * TILE, ttl: 2.2, glyph: '♥', color: '#ff80a0' }); }
      }
      return;
    }
    const [lead, tail] = this.wedding;
    lead.ttl -= dt; tail.ttl = lead.ttl;
    lead.fade = tail.fade = lead.ttl < 1 ? Math.max(0, lead.fade - dt * 2) : Math.min(1, lead.fade + dt * 1.5);
    if (!roads.step(s, lead, dt)) lead.ttl = 0;
    const dx = tail.tx - tail.x, dy = tail.ty - tail.y, d = Math.hypot(dx, dy);
    if (d < 0.01) { if (lead.px >= 0 && (lead.px !== tail.tx || lead.py !== tail.ty)) { tail.px = tail.tx; tail.py = tail.ty; tail.tx = lead.px; tail.ty = lead.py; } }
    else { const sp = Math.min(d, tail.speed * 1.05 * dt); tail.x += dx / d * sp; tail.y += dy / d * sp; }
    if (Math.random() < dt * 6) bits.push({ x: lead.x * TILE + TILE / 2 + (Math.random() - 0.5) * 20, y: lead.y * TILE - 10, vx: (Math.random() - 0.5) * 10, vy: 6 + Math.random() * 6, ttl: 2, color: Math.random() < 0.5 ? '#f7c6dc' : '#ffffff' });
    if (Math.random() < dt * 0.7) music.notes.push({ x: lead.x * TILE + TILE / 2, y: lead.y * TILE, ttl: 2.2, glyph: '♥', color: '#ff80a0' });
    if (lead.ttl <= 0) this.wedding = [];
  }

  actors(): Actor[] { return this.wedding.map(walkerActor); }
}
