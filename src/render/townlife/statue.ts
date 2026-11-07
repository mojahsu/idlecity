// Trophy monuments for each slain dungeon boss and the hero's statue once the Demon Lord is dead.
import type { GameState, Point } from '../../sim/types';
import type { LightSource } from '../buildings';
import { TILE } from '../constants';
import { drawTownsfolk, drawTrophyMonument } from '../units';
import { bubble } from '../units/shared';
import type { Actor, Roads } from './shared';

export class Statue {
  private spots = new Map<string, Point>();

  actors(s: GameState, roads: Roads): Actor[] {
    const out: Actor[] = [];
    const anchor = s.buildings.find((b) => b.built && b.type === 'keep')
      ?? s.buildings.find((b) => b.built && b.type === 'guildHall')
      ?? s.center;
    const slain = s.dungeons.filter((d) => d.bossDefeated);
    if (!slain.length && !s.victory) return out;

    const candidates = [...roads.freeTilesAround(s, anchor, 1), ...roads.freeTilesAround(s, s.center, 2)];
    for (const d of slain) {
      if (!this.spots.has(d.id)) {
        const used = [...this.spots.values()];
        const free = candidates.find((c) => !used.some((u) => u.x === c.x && u.y === c.y));
        if (free) this.spots.set(d.id, free);
      }
      const sp = this.spots.get(d.id);
      if (!sp) continue;
      out.push({ y: sp.y + 0.8, draw: (ctx, env) => drawTrophyMonument(ctx, sp.x, sp.y, d.id, env) });
    }
    // An admirer stops by one of the monuments during the day (when not under raid).
    const firstSpot = [...this.spots.values()][0];
    if (firstSpot && !s.raid && s.workers.length >= 2) {
      out.push({
        y: firstSpot.y + 0.88,
        draw: (ctx, env) => {
          if (env.dark > 0.65 || Math.sin(env.clock * 0.18) < -0.2) return;
          const ax = firstSpot.x - 0.52, ay = firstSpot.y + 0.12;
          drawTownsfolk(ctx, ax, ay, 1, false, env, 314);
          const k = (env.clock * 0.35) % 1;
          bubble(ctx, ax * TILE + TILE / 2 + 2, ay * TILE + TILE / 2 - 18, '✦', k < 0.35 ? 1 : 0, '#d89820');
        },
      });
    }
    return out;
  }

  lights(): LightSource[] {
    const out: LightSource[] = [];
    for (const [id, sp] of this.spots) {
      if (id === 'ancientRuins') out.push({ x: sp.x * TILE + TILE / 2, y: sp.y * TILE, r: 16, color: '#b060ff', flicker: 0.12 });
      else if (id === 'emeraldCavern') out.push({ x: sp.x * TILE + TILE / 2, y: sp.y * TILE, r: 16, color: '#40e890', flicker: 0.08 });
      else if (id === 'emberPeak') out.push({ x: sp.x * TILE + TILE / 2, y: sp.y * TILE, r: 14, color: '#ff6020', flicker: 0.18 });
      else if (id === 'darkTower') out.push({ x: sp.x * TILE + TILE / 2, y: sp.y * TILE, r: 18, color: '#ffe080', flicker: 0.06 });
    }
    return out;
  }
}
