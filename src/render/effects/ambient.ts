// Seasonal drift: leaves, petals, fireflies, butterflies, morning dust motes.
import type { GameState } from '../../sim/types';
import { TILE } from '../constants';
import type { Env } from '../palette';
import type { Kind, Particles } from './particles';

export class Ambient {
  private ambientAcc = 0;

  emitAmbient(s: GameState, env: Env, dt: number, P: Particles): void {
    const night = env.dark > 0.5;
    let rate = 0; let kind: Kind | null = null;
    if (env.season === 'autumn' && !env.rainy) { rate = 6; kind = 'leaf'; }
    else if (env.season === 'spring' && !env.rainy) { rate = 3; kind = 'petal'; }
    else if (env.season === 'summer' && night) { rate = 2.5; kind = 'firefly'; }
    // Butterflies over the meadows on warm days, dust motes drifting in the low morning sun.
    if ((env.season === 'spring' || env.season === 'summer') && env.dark < 0.2 && !env.rainy && P.list.filter((p) => p.kind === 'butterfly').length < 6 && Math.random() < dt * 0.4) {
      for (let tries = 0; tries < 8; tries++) { const i = Math.floor(Math.random() * s.tiles.length); if (s.tiles[i].terrain !== 'grass') continue; P.spawn('butterfly', (i % s.width) * TILE + Math.random() * TILE, Math.floor(i / s.width) * TILE + Math.random() * TILE, (Math.random() - 0.5) * 10, -2, 12 + Math.random() * 10, 1, ['#f7d94c', '#f29ac6', '#ffffff', '#80c0ff'][Math.floor(Math.random() * 4)]); break; }
    }
    if (env.dayFrac > 0.2 && env.dayFrac < 0.4 && env.dark < 0.6 && !env.rainy && !env.snowy && Math.random() < dt * 6) {
      P.spawn('mote', Math.random() * s.width * TILE, Math.random() * s.height * TILE, 3 + Math.random() * 4, -2 + Math.random() * 3, 4 + Math.random() * 4, 1, '#fff4d0');
    }
    if (!kind) return;
    this.ambientAcc += rate * dt;
    while (this.ambientAcc >= 1) {
      this.ambientAcc -= 1;
      // Pick a random forest (or bush) tile as the source.
      for (let tries = 0; tries < 8; tries++) {
        const i = Math.floor(Math.random() * s.tiles.length);
        const t = s.tiles[i];
        if (t.terrain !== 'forest' && t.terrain !== 'bush') continue;
        const x = (i % s.width) * TILE + Math.random() * TILE, y = Math.floor(i / s.width) * TILE + Math.random() * 10;
        if (kind === 'leaf') P.spawn('leaf', x, y, (Math.random() - 0.5) * 10 + 6, 6, 3 + Math.random() * 2, 1.6, ['#d9822b', '#c8501f', '#e8b43a'][Math.floor(Math.random() * 3)]);
        else if (kind === 'petal') P.spawn('petal', x, y, (Math.random() - 0.5) * 8 + 4, 4, 3 + Math.random() * 2, 1.2, ['#f7c6dc', '#ffe3ee', '#fff'][Math.floor(Math.random() * 3)]);
        else P.spawn('firefly', x, y + 6, 0, 0, 4 + Math.random() * 4, 1, '#e8ff80');
        break;
      }
    }
  }

}
