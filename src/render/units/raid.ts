// Raiders marching on the town, drawn with the monster art.
import { TILE } from '../constants';
import { t } from '../../i18n';
import { circle, ellipse, poly, rect, line, rgba, type Env } from '../palette';
import { HERO_SCALE, bubble, facing, withUnit } from './shared';
import type { GameState, Raid } from '../../sim/types';
import { drawMonster } from '../monsters';

// ---- raiders ---------------------------------------------------------------------
function raiderArt(ctx: CanvasRenderingContext2D, monster: string, i: number, env: Env, fighting: boolean): void {
  const lunge = fighting ? Math.max(0, Math.sin(env.clock * 2.5 + i * 1.3 + 1.5)) : 0;
  drawMonster(ctx, monster, env, 1, 0, -lunge * 0.6);
  if (monster === 'bandit' && env.dark > 0.3) { line(ctx, -4, -6, -5.5, -11, '#5a3a1e', 1.2); ellipse(ctx, -5.5, -12.5, 1.6, 2.4, '#ff9a30'); }
}

export function drawRaid(ctx: CanvasRenderingContext2D, r: Raid, env: Env, defenders: { x: number; y: number }[] = [], s?: GameState): void {
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
  if (r.siege && r.bossMonster) {
    const lunge = fighting ? Math.max(0, Math.sin(env.clock * 2.2)) : 0;
    const bob = fighting ? -lunge * 2 : Math.abs(Math.sin(env.clock * 4.5)) * -1.8;
    const bx = r.x + dir * (0.45 + lunge * 0.35), by = r.y + 0.12;
    circle(ctx, bx * TILE + TILE / 2, by * TILE + TILE / 2 + 2, 11, rgba('#ff5030', 0.22 + 0.1 * Math.sin(env.clock * 4)));
    withUnit(ctx, bx, by, dir, bob, () => drawMonster(ctx, r.bossMonster!, env, 1, 0, -lunge * 0.7), HERO_SCALE * 1.38);
  }
  // Defensive arrow volleys from keep or walls during a fight.
  if (fighting && s) {
    const fort = s.buildings.find((b) => b.built && (b.type === 'keep' || b.type === 'walls'));
    if (fort) {
      const sx = fort.x * TILE + TILE / 2, sy = fort.y * TILE + 2;
      const tx = r.x * TILE + TILE / 2, ty = r.y * TILE + TILE / 2 - 4;
      for (let k = 0; k < (r.siege ? 3 : 2); k++) {
        const q = (env.clock * 1.25 + k * 0.33) % 1;
        if (q > 0.55) continue;
        const p = q / 0.55;
        const ax = sx + (tx + (k - 1) * 6 - sx) * p, ay = sy + (ty - sy) * p - Math.sin(p * Math.PI) * 14;
        const d = tx >= sx ? 1 : -1;
        line(ctx, ax - 4 * d, ay + 1.5, ax, ay, '#e8dcc0', 1.2);
        poly(ctx, [ax, ay, ax - 2 * d, ay - 1.2, ax - 2 * d, ay + 1.2], '#d0d0d8');
      }
    }
  }
  const px = r.x * TILE + TILE / 2, py = r.y * TILE - (r.siege ? 10 : 4);
  const bw = r.siege ? 38 : 30;
  rect(ctx, px - bw / 2, py - 1, bw, r.siege ? 5 : 4, 'rgba(0,0,0,0.65)');
  rect(ctx, px - bw / 2 + 1, py, (bw - 2) * Math.max(0, r.hp / r.maxHp), r.siege ? 3 : 2, r.siege ? '#ff9030' : '#e04040');
  const kt = (env.clock * 0.35) % 1;
  if (kt < 0.45) {
    const msgKey = r.siege ? 'talk.m.siege' : (Math.floor(env.clock * 0.35) % 2 ? 'talk.m.raid.0' : 'talk.m.raid.1');
    bubble(ctx, px, py - 8, t(msgKey), 0.95, r.siege ? '#ffe090' : '#ffd8e4', true);
  }
}
