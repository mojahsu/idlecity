// Rockets over the keep after the victory and on festival nights.
import type { GameState } from '../../sim/types';
import { TILE } from '../constants';
import type { Env } from '../palette';
import type { Particles } from './particles';

export class Fireworks {
  private victorySeen = -1;
  private fireworkTimer = 0;

  updateFireworks(s: GameState, env: Env, dt: number, P: Particles): void {
    if (!s.victory && !env.festival) return;
    if (s.victory && this.victorySeen < 0) this.victorySeen = env.clock;
    const since = s.victory ? env.clock - this.victorySeen : Infinity;
    this.fireworkTimer -= dt;
    if (this.fireworkTimer > 0) return;
    this.fireworkTimer = since < 90 ? 0.9 + Math.random() * 0.8 : env.festival && env.dark > 0.5 ? 3 + Math.random() * 4 : 18 + Math.random() * 20;
    const keep = s.buildings.find((b) => b.built && b.type === 'keep');
    const ox = (keep ? keep.x : s.center.x) * TILE + TILE / 2 + (Math.random() - 0.5) * 120, oy = (keep ? keep.y : s.center.y) * TILE;
    const colors = ['#ff6060', '#ffd040', '#60c0ff', '#c080ff', '#80ff90', '#ffffff'];
    P.spawn('rocket', ox, oy + 10, (Math.random() - 0.5) * 10, -120 - Math.random() * 40, 0.7 + Math.random() * 0.4, 1.5, colors[Math.floor(Math.random() * colors.length)]);
    P.events.push('rocket');
  }

}
