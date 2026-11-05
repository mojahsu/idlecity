// Villagers strolling the streets by day; more of them on the holiday.
import type { GameState } from '../../sim/types';
import type { Env } from '../palette';
import { walkerActor, type Actor, type Roads, type Walker } from './shared';

export class Walkers {
  private walkers: Walker[] = [];

  update(s: GameState, env: Env, dt: number, roads: Roads): void {
    const homes = s.buildings.filter((b) => b.built && (b.type === 'house' || b.type === 'hut')).length;
    let want = env.dark < 0.5 && !env.night ? Math.min(env.holiday ? 8 : 4, Math.floor(homes / 2) * (env.holiday ? 2 : 1)) : 0;
    if (env.rainy || env.snowy) want = Math.floor(want / 2);
    if (this.walkers.length < want && Math.random() < dt * 0.4) { const w = roads.spawnWalker(s, false, 0.9 + Math.random() * 0.3); if (w) this.walkers.push(w); }
    for (const w of this.walkers) {
      w.ttl -= dt;
      w.fade = Math.min(1, w.fade + dt * 1.5);
      if (w.ttl < 1 || this.walkers.length > want) w.fade = Math.max(0, w.fade - dt * 2);
      if (!roads.step(s, w, dt)) w.ttl = 0;
    }
    this.walkers = this.walkers.filter((w) => w.ttl > 0 && !(w.fade <= 0 && w.ttl < 1));
  }

  actors(): Actor[] { return this.walkers.map(walkerActor); }
}
