// Townsfolk gather and cheer when a party comes home with loot.
import type { GameState } from '../../sim/types';
import { TILE } from '../constants';
import { hash, type Env } from '../palette';
import { drawTownsfolk } from '../units';
import type { Bits } from './bits';
import type { Actor, Roads } from './shared';

export interface Cheer { x: number; y: number; seed: number; ttl: number }

export class Cheers {
  private cheers: Cheer[] = [];
  private returning = new Set<number>();

  /** Townsfolk gather and cheer when a party comes home with loot. */
  update(s: GameState, env: Env, dt: number, roads: Roads, bits: Bits): void {
    const now = new Set<number>();
    for (const p of s.parties) if (p.phase === 'return') now.add(p.id);
    for (const id of this.returning) if (!now.has(id)) {
      const tav = s.buildings.find((b) => b.built && b.type === 'tavern') ?? s.center;
      for (const [i, pt] of roads.freeTilesAround(s, tav, 5).entries()) {
        this.cheers.push({ x: pt.x + (hash(i, id, 1) - 0.5) * 0.4, y: pt.y + (hash(i, id, 2) - 0.5) * 0.3, seed: id * 13 + i, ttl: 5 + i * 0.3 });
        for (let k = 0; k < 6; k++) bits.push({ x: pt.x * TILE + TILE / 2, y: pt.y * TILE, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 40, ttl: 1.2 + Math.random(), color: ['#f06a4f', '#f7d94c', '#60c0ff', '#f29ac6'][k % 4] });
      }
    }
    this.returning = now;
    this.cheers = this.cheers.filter((c) => (c.ttl -= dt) > 0);
    void env;
  }

  actors(): Actor[] {
    return this.cheers.map((c) => ({ y: c.y + 0.8, draw: (ctx, env) => { ctx.globalAlpha = Math.min(1, c.ttl); drawTownsfolk(ctx, c.x, c.y, hash(c.seed, 9) > 0.5 ? 1 : -1, false, env, c.seed, { cheer: true }); ctx.globalAlpha = 1; } }));
  }
}
