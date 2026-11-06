// Adventurers resting in town and parties on the road with their banner.
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, line, shade, rgba, type Env } from '../palette';
import { HERO_SCALE, facing, pose, withUnit } from './shared';
import type { Adventurer, GameState, Party } from '../../sim/types';
import { classArt } from './classes';

export function drawAdventurer(ctx: CanvasRenderingContext2D, a: Adventurer, env: Env, gear = 0, x = a.x, y = a.y, moving = a.path.length > 0, raid?: { x: number; y: number } | null): void {
  const training = a.status === 'resting' && a.pastime === 'train' && !moving;
  const sally = a.status === 'resting' && a.pastime === 'sally' && !moving && !!raid;
  const sitting = a.status === 'resting' && a.pastime === 'sit' && !moving;
  const p = pose(moving, training, env.clock, a.id);
  let dir = facing(a.x, a.path, a.id);
  if (sally && raid) dir = raid.x >= a.x - 0.05 ? 1 : -1;
  if (training) dir = (a.id % 2) ? 1 : -1; // face the post
  // In a fight the warrior lunges at the raiders in turn and recoils; the others shoot from their line.
  const melee = a.cls === 'warrior';
  const lunge = sally && melee ? Math.max(0, Math.sin(env.clock * 2.5 + a.id * 1.9)) : 0;
  const lx = x + dir * lunge * 0.35;
  if (sitting) p.bob = 3;
  withUnit(ctx, lx, y, dir, p.bob, () => classArt(ctx, a.cls, p, moving, env, a.level, gear), HERO_SCALE);
  if (sally && raid && !melee) drawShot(ctx, a, x, y, raid, env);
  if (sally && lunge > 0.8) { const px = lx * TILE + TILE / 2 + dir * 9, py = y * TILE + TILE / 2 - 8; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, py, 7, dir > 0 ? -1.3 : Math.PI - 0.5, dir > 0 ? 0.5 : Math.PI + 1.3); ctx.stroke(); }
  if (sally) { const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2 - 12; rect(ctx, px - 6, py, 12, 2, 'rgba(0,0,0,0.6)'); rect(ctx, px - 6, py, 12 * Math.max(0, a.hp / a.maxHp), 2, a.hp > a.maxHp * 0.5 ? '#7ad07a' : '#e0b040'); }
  if (a.status === 'resting' && a.hp < a.maxHp * 0.6) {
    const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2 - 12;
    rect(ctx, px - 5, py, 10, 1.5, '#3a1a1a'); rect(ctx, px - 5, py, 10 * (a.hp / a.maxHp), 1.5, '#7ad07a');
  }
}

/** Arrows, bolts and holy light flying from the back line to the raiders. */
function drawShot(ctx: CanvasRenderingContext2D, a: Adventurer, x: number, y: number, raid: { x: number; y: number }, env: Env): void {
  const k = (env.clock * 1.1 + a.id * 0.37) % 1;
  if (k > 0.45) return;
  const q = k / 0.45;
  const sx = x * TILE + TILE / 2, sy = y * TILE + TILE / 2 - 8;
  const tx = raid.x * TILE + TILE / 2 + Math.sin(a.id * 3.1) * 6, ty = raid.y * TILE + TILE / 2 - 4;
  const px = sx + (tx - sx) * q, py = sy + (ty - sy) * q - Math.sin(q * Math.PI) * 6;
  const d = tx > sx ? 1 : -1;
  if (a.cls === 'archer') { line(ctx, px - 4 * d, py + 1, px, py, '#e8dcc0', 1.2); poly(ctx, [px, py, px - 2 * d, py - 1.2, px - 2 * d, py + 1.2], '#d0d0d8'); }
  else if (a.cls === 'mage') { circle(ctx, px, py, 2.4, rgba('#80c0ff', 0.5)); circle(ctx, px, py, 1.3, '#e0f4ff'); circle(ctx, px - 3 * d, py + 1, 1, rgba('#a0e0ff', 0.4)); }
  else { circle(ctx, px, py, 2.6, rgba('#fff0a0', 0.5)); circle(ctx, px, py, 1.4, '#ffffff'); }
}

export function drawParty(ctx: CanvasRenderingContext2D, s: GameState, p: Party, env: Env): void {
  if (p.phase === 'explore' || p.phase === 'fight') return; // underground: the dungeon view shows them
  const team = p.memberIds.map((id) => s.adventurers.find((a) => a.id === id)!).filter((a) => a && a.status === 'questing');
  const px = p.x * TILE + TILE / 2, py = p.y * TILE + TILE / 2;
  const dir = facing(p.x, p.path, p.id);
  // A two-by-two column in battle-line order: the warrior leads, the mage brings up the rear.
  const n = team.length;
  team.forEach((a, i) => {
    const ox = (i >= n - 2 ? 0.24 : -0.24) * dir, oy = (i % 2 ? 0.2 : -0.2);
    const pz = pose(true, false, env.clock, a.id);
    withUnit(ctx, p.x + ox, p.y + oy, dir, pz.bob, () => classArt(ctx, a.cls, pz, true, env, a.level, s.equipment), HERO_SCALE);
  });
  // Banner carried at the head of the column.
  const bx = px + dir * 10, by = py - 2;
  rect(ctx, bx - 0.5, by - 18, 1, 18, '#5a3a1e');
  const wave = Math.sin(env.clock * 7 + p.id) * 1.2;
  const c = p.phase === 'return' ? '#f0d050' : '#8a3ad0';
  poly(ctx, [bx, by - 18, bx + dir * 7, by - 16.5 + wave, bx + dir * 5.5, by - 14, bx + dir * 7, by - 11.5 + wave, bx, by - 11], c);
  circle(ctx, bx + dir * 2.8, by - 14.5, 1, shade(c, 0.5));
  if (p.phase === 'return') { ellipse(ctx, px - dir * 5, py + 3, 2.6, 2, '#b08a52'); circle(ctx, px - dir * 5, py + 2.6, 0.8, '#e0b040'); }
}
