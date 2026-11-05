// Embers pouring out of a burning building.
import type { GameState } from '../../sim/types';
import { TILE } from '../constants';
import type { Env } from '../palette';
import type { Particles } from './particles';

export class Blaze {
  private fireAcc = 0;

  /** Embers and black smoke pour out of a burning building. */
  emitBlaze(s: GameState, env: Env, dt: number, P: Particles): void {
    const f = s.fire;
    if (!f) return;
    const b = s.buildings.find((x) => x.id === f.buildingId);
    if (!b) return;
    this.fireAcc += (6 + 30 * f.intensity) * dt;
    const px = b.x * TILE, py = b.y * TILE;
    while (this.fireAcc >= 1) {
      this.fireAcc -= 1;
      P.spawn('ember', px + 2 + Math.random() * (TILE - 4), py + TILE - 4 - Math.random() * 20 * f.intensity, (Math.random() - 0.5) * 14, -20 - Math.random() * 30, 0.7 + Math.random() * 0.8, 1.4, Math.random() < 0.3 ? '#ffe080' : '#ff8030');
    }
    void env;
  }

}
