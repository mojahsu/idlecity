// Townsfolk gather and cheer when a party sets out, comes home with loot, or slays the Demon Lord.
import type { GameState } from '../../sim/types';
import { t } from '../../i18n';
import { TILE } from '../constants';
import { hash, type Env } from '../palette';
import { drawTownsfolk } from '../units';
import { bubble } from '../units/shared';
import type { Bits } from './bits';
import type { Actor, Roads } from './shared';

export interface Cheer { x: number; y: number; seed: number; ttl: number; sayKey?: string }

export class Cheers {
  private cheers: Cheer[] = [];
  private returning = new Set<number>();
  private travelling = new Set<number>();
  private victorySeen: boolean | null = null;

  /** Townsfolk wave a departing party off, cheer a returning one, and flood the square on victory. */
  update(s: GameState, env: Env, dt: number, roads: Roads, bits: Bits): void {
    const nowRet = new Set<number>();
    const nowTrav = new Set<number>();
    for (const p of s.parties) {
      if (p.phase === 'return') nowRet.add(p.id);
      if (p.phase === 'travel') nowTrav.add(p.id);
    }
    // Send-off crowd when a party leaves the guild/tavern.
    for (const id of nowTrav) if (!this.travelling.has(id)) {
      const guild = s.buildings.find((b) => b.built && b.type === 'guildHall') ?? s.buildings.find((b) => b.built && b.type === 'tavern') ?? s.center;
      for (const [i, pt] of roads.freeTilesAround(s, guild, 3).entries()) {
        this.cheers.push({
          x: pt.x + (hash(i, id, 3) - 0.5) * 0.35,
          y: pt.y + (hash(i, id, 4) - 0.5) * 0.3,
          seed: id * 19 + i,
          ttl: 4.2 + i * 0.25,
          sayKey: i === 0 ? (id % 2 ? 'talk.w.sendoff.0' : 'talk.w.sendoff.1') : undefined,
        });
      }
    }
    // Welcome-home crowd when a party finishes returning.
    for (const id of this.returning) if (!nowRet.has(id)) {
      const tav = s.buildings.find((b) => b.built && b.type === 'tavern') ?? s.center;
      for (const [i, pt] of roads.freeTilesAround(s, tav, 5).entries()) {
        this.cheers.push({ x: pt.x + (hash(i, id, 1) - 0.5) * 0.4, y: pt.y + (hash(i, id, 2) - 0.5) * 0.3, seed: id * 13 + i, ttl: 5 + i * 0.3 });
        for (let k = 0; k < 6; k++) bits.push({ x: pt.x * TILE + TILE / 2, y: pt.y * TILE, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 40, ttl: 1.2 + Math.random(), color: ['#f06a4f', '#f7d94c', '#60c0ff', '#f29ac6'][k % 4] });
      }
    }
    // Grand victory parade when the Demon Lord falls.
    if (this.victorySeen === false && s.victory) {
      for (const [i, pt] of roads.freeTilesAround(s, s.center, 10).entries()) {
        this.cheers.push({
          x: pt.x + (hash(i, 77, 1) - 0.5) * 0.4,
          y: pt.y + (hash(i, 77, 2) - 0.5) * 0.3,
          seed: 700 + i,
          ttl: 14 + (i % 4),
          sayKey: i % 3 === 0 ? 'talk.w.victory' : undefined,
        });
        for (let k = 0; k < 10; k++) bits.push({ x: pt.x * TILE + TILE / 2, y: pt.y * TILE, vx: (Math.random() - 0.5) * 55, vy: -50 - Math.random() * 50, ttl: 1.8 + Math.random(), color: ['#ffd040', '#ff80a0', '#60e0ff', '#ffffff'][k % 4] });
      }
    }
    this.victorySeen = s.victory;
    this.returning = nowRet;
    this.travelling = nowTrav;
    this.cheers = this.cheers.filter((c) => (c.ttl -= dt) > 0);
    void env;
  }

  actors(): Actor[] {
    return this.cheers.map((c) => ({
      y: c.y + 0.8,
      draw: (ctx, env) => {
        const a = Math.min(1, c.ttl);
        ctx.globalAlpha = a;
        drawTownsfolk(ctx, c.x, c.y, hash(c.seed, 9) > 0.5 ? 1 : -1, false, env, c.seed, { cheer: true });
        if (c.sayKey && c.ttl > 0.8) {
          bubble(ctx, c.x * TILE + TILE / 2, c.y * TILE + TILE / 2 - 20, t(c.sayKey), Math.min(1, c.ttl - 0.5), '#7a4018');
        }
        ctx.globalAlpha = 1;
      },
    }));
  }
}
