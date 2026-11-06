// The hero's statue on the first free spot beside the keep, once the Demon Lord is dead.
import type { GameState, Point } from '../../sim/types';
import { TILE } from '../constants';
import { drawStatue, drawTownsfolk } from '../units';
import { bubble } from '../units/shared';
import type { Actor, Roads } from './shared';

export class Statue {
  private spot: Point | null = null;

  actors(s: GameState, roads: Roads): Actor[] {
    if (!s.victory) return [];
    const keep = s.buildings.find((b) => b.built && b.type === 'keep');
    if (keep && !this.spot) this.spot = roads.freeTilesAround(s, keep, 1)[0] ?? null;
    const sp = this.spot;
    if (!sp) return [];
    const out: Actor[] = [{ y: sp.y + 0.8, draw: (ctx, env) => drawStatue(ctx, sp.x, sp.y, env) }];
    out.push({
      y: sp.y + 0.88,
      draw: (ctx, env) => {
        if (env.dark > 0.65 || Math.sin(env.clock * 0.18) < -0.2) return;
        const ax = sp.x - 0.52, ay = sp.y + 0.12;
        drawTownsfolk(ctx, ax, ay, 1, false, env, 314);
        const k = (env.clock * 0.35) % 1;
        bubble(ctx, ax * TILE + TILE / 2 + 2, ay * TILE + TILE / 2 - 18, '✦', k < 0.35 ? 1 : 0, '#d89820');
      },
    });
    return out;
  }
}
