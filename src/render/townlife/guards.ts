// Guards pacing the walls, torches lit after dark.
import type { GameState } from '../../sim/types';
import { TILE } from '../constants';
import type { LightSource } from '../buildings';
import type { Env } from '../palette';
import { drawGuard } from '../units';
import type { Actor } from './shared';

export interface Guard { wall: number; seed: number }

export class Guards {
  private guards: Guard[] = [];

  update(s: GameState): void {
    const walls = s.buildings.filter((b) => b.built && b.type === 'walls');
    const want = Math.min(4, Math.ceil(walls.length / 2));
    this.guards = this.guards.filter((g) => walls.some((w) => w.id === g.wall)).slice(0, want);
    for (const w of walls) { if (this.guards.length >= want) break; if (!this.guards.some((g) => g.wall === w.id)) this.guards.push({ wall: w.id, seed: w.id * 13 }); }
  }

  actors(s: GameState): Actor[] {
    const out: Actor[] = [];
    for (const g of this.guards) {
      const b = s.buildings.find((x) => x.id === g.wall);
      if (!b) continue;
      out.push({ y: b.y + 0.96, draw: (ctx, env) => { const ox = Math.sin(env.clock * 0.45 + g.seed) * 0.32; const dir = Math.cos(env.clock * 0.45 + g.seed) >= 0 ? 1 : -1; drawGuard(ctx, b.x + ox, b.y - 1.55, dir, true, env, g.seed); } });
    }
    return out;
  }

  lights(s: GameState, env: Env): LightSource[] {
    const out: LightSource[] = [];
    for (const g of this.guards) {
      const b = s.buildings.find((x) => x.id === g.wall);
      if (!b) continue;
      const ox = Math.sin(env.clock * 0.45 + g.seed) * 0.32;
      out.push({ x: (b.x + ox) * TILE + TILE / 2, y: (b.y - 1.55) * TILE + TILE / 2 - 4, r: 18, color: '#ffa040', flicker: 0.2 });
    }
    return out;
  }
}
