// Raiders marching on the town, drawn with the monster art.
import { TILE } from '../constants';
import { ellipse, rect, line, rgba, type Env } from '../palette';
import { HERO_SCALE, facing, withUnit } from './shared';
import type { Raid } from '../../sim/types';
import { drawMonster } from '../monsters';

// ---- raiders ---------------------------------------------------------------------
function raiderArt(ctx: CanvasRenderingContext2D, monster: string, i: number, env: Env, fighting: boolean): void {
  const lunge = fighting ? Math.max(0, Math.sin(env.clock * 6 + i * 1.3)) : 0;
  drawMonster(ctx, monster, env, 1, 0, -lunge * 0.5);
  if (monster === 'bandit' && env.dark > 0.3) { line(ctx, -4, -6, -5.5, -11, '#5a3a1e', 1.2); ellipse(ctx, -5.5, -12.5, 1.6, 2.4, '#ff9a30'); }
}

export function drawRaid(ctx: CanvasRenderingContext2D, r: Raid, env: Env): void {
  const n = Math.min(8, r.count);
  const dir = facing(r.x, r.path, 7);
  for (let i = 0; i < n; i++) {
    const ox = ((i % 3) * 0.42 - 0.42) * dir, oy = Math.floor(i / 3) * 0.4 - 0.3;
    withUnit(ctx, r.x + ox, r.y + oy, dir, Math.abs(Math.sin(env.clock * 10 + i)) * -1.5, () => raiderArt(ctx, r.monster, i, env, r.phase === 'fight'), HERO_SCALE);
  }
  const px = r.x * TILE + TILE / 2, py = r.y * TILE - 4;
  rect(ctx, px - 15, py - 1, 30, 4, 'rgba(0,0,0,0.6)');
  rect(ctx, px - 14, py, 28 * Math.max(0, r.hp / r.maxHp), 2, '#e04040');
}
