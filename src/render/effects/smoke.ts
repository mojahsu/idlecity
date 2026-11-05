// Chimney and fire smoke, with embers from the hot ones.
import type { GameState } from '../../sim/types';
import { smokeSources } from '../buildings';
import type { Env } from '../palette';
import type { Particles } from './particles';

export class Smoke {
  private smokeAcc = new Map<string, number>();

  emitSmoke(s: GameState, env: Env, dt: number, P: Particles): void {
    for (const src of smokeSources(s, env)) {
      const key = `${src.x},${src.y}`;
      const acc = (this.smokeAcc.get(key) ?? 0) + src.rate * dt;
      if (acc >= 1) {
        this.smokeAcc.set(key, acc - 1);
        P.spawn('smoke', src.x + (Math.random() - 0.5) * 2, src.y, (Math.random() - 0.5) * 3 + (env.rainy ? 6 : 2), -7 - Math.random() * 4, 2.8 + Math.random() * 1.5, src.size, src.color);
        if (src.rate >= 2.5) P.spawn('ember', src.x + (Math.random() - 0.5) * 4, src.y + 4, (Math.random() - 0.5) * 6, -12 - Math.random() * 10, 0.6 + Math.random() * 0.5, 1.2, src.color === '#55504e' ? '#ffb040' : '#ff9030');
      } else this.smokeAcc.set(key, acc);
    }
  }

}
