// Dungeon entrances on the map, one file per dungeon.
import type { GameState } from '../../sim/types';
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, rgba, type Env } from '../palette';
import type { DungeonArt, DungeonState } from './shared';
import { drawGoblinCave } from './goblinCave';
import { drawAncientRuins } from './ancientRuins';
import { drawEmeraldCavern } from './emeraldCavern';
import { drawEmberPeak } from './emberPeak';
import { drawDarkTower } from './darkTower';

const ART: Record<DungeonState['id'], (a: DungeonArt) => void> = {
  goblinCave: drawGoblinCave,
  ancientRuins: drawAncientRuins,
  emeraldCavern: drawEmeraldCavern,
  emberPeak: drawEmberPeak,
  darkTower: drawDarkTower,
};

export function drawDungeonEntrance(ctx: CanvasRenderingContext2D, s: GameState, d: DungeonState, env: Env): void {
  const px = d.x * TILE, py = d.y * TILE;
  const cx = px + TILE / 2, cy = py + TILE / 2;
  if (!d.unlocked) {
    // Overgrown and unremarkable until the town is big enough to notice it.
    ellipse(ctx, cx, cy + 3, 10, 6, rgba('#3a4a2a', 0.35));
    circle(ctx, cx - 4, cy + 1, 3, '#4f8a3a'); circle(ctx, cx + 3, cy + 2, 3.5, '#45803a');
    return;
  }
  ART[d.id]({ ctx, s, d, env, px, py, cx, cy });
  if (d.bossDefeated) { rect(ctx, px + TILE - 2, cy - 16, 1.2, 12, '#5a3a1e'); poly(ctx, [px + TILE - 1, cy - 16, px + TILE + 6, cy - 14.5 + Math.sin(env.clock * 6) * 1, px + TILE - 1, cy - 12], '#f0d050'); }
}
