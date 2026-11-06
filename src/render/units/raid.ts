// Raiders marching on the town, drawn with the monster art.
import { TILE } from '../constants';
import { t } from '../../i18n';
import { ellipse, rect, line, type Env } from '../palette';
import { HERO_SCALE, bubble, facing, withUnit } from './shared';
import type { Raid } from '../../sim/types';
import { drawMonster } from '../monsters';

// ---- raiders ---------------------------------------------------------------------
function raiderArt(ctx: CanvasRenderingContext2D, monster: string, i: number, env: Env, fighting: boolean): void {
  const lunge = fighting ? Math.max(0, Math.sin(env.clock * 2.5 + i * 1.3 + 1.5)) : 0;
  drawMonster(ctx, monster, env, 1, 0, -lunge * 0.6);
  if (monster === 'bandit' && env.dark > 0.3) { line(ctx, -4, -6, -5.5, -11, '#5a3a1e', 1.2); ellipse(ctx, -5.5, -12.5, 1.6, 2.4, '#ff9a30'); }
}

export function drawRaid(ctx: CanvasRenderingContext2D, r: Raid, env: Env, defenders: { x: number; y: number }[] = []): void {
  const n = Math.min(8, r.count);
  const fighting = r.phase === 'fight';
  // Marching they face the way they walk; fighting they face the nearest defender (or the town).
  let dir = facing(r.x, r.path, 7);
  if (fighting) { const d = defenders.sort((a, b) => Math.hypot(a.x - r.x, a.y - r.y) - Math.hypot(b.x - r.x, b.y - r.y))[0]; if (d) dir = d.x >= r.x ? 1 : -1; }
  for (let i = 0; i < n; i++) {
    const ox = ((i % 3) * 0.42 - 0.42) * dir, oy = Math.floor(i / 3) * 0.4 - 0.3;
    const lunge = fighting ? Math.max(0, Math.sin(env.clock * 2.5 + i * 1.3 + 1.5)) : 0;
    const bob = fighting ? -lunge * 1.5 : Math.abs(Math.sin(env.clock * 6 + i)) * -1.5;
    withUnit(ctx, r.x + ox + dir * lunge * 0.3, r.y + oy, dir, bob, () => raiderArt(ctx, r.monster, i, env, fighting), HERO_SCALE);
  }
  const px = r.x * TILE + TILE / 2, py = r.y * TILE - 4;
  rect(ctx, px - 15, py - 1, 30, 4, 'rgba(0,0,0,0.6)');
  rect(ctx, px - 14, py, 28 * Math.max(0, r.hp / r.maxHp), 2, '#e04040');
  const kt = (env.clock * 0.35) % 1;
  if (kt < 0.45) bubble(ctx, px, py - 8, t(Math.floor(env.clock * 0.35) % 2 ? 'talk.m.raid.0' : 'talk.m.raid.1'), 0.95, '#ffd8e4', true);
}
