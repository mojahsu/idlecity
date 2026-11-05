// The hero's statue on the first free spot beside the keep, once the Demon Lord is dead.
import type { GameState, Point } from '../../sim/types';
import { drawStatue } from '../units';
import type { Actor, Roads } from './shared';

export class Statue {
  private spot: Point | null = null;

  actors(s: GameState, roads: Roads): Actor[] {
    if (!s.victory) return [];
    const keep = s.buildings.find((b) => b.built && b.type === 'keep');
    if (keep && !this.spot) this.spot = roads.freeTilesAround(s, keep, 1)[0] ?? null;
    const sp = this.spot;
    return sp ? [{ y: sp.y + 0.8, draw: (ctx, env) => drawStatue(ctx, sp.x, sp.y, env) }] : [];
  }
}
