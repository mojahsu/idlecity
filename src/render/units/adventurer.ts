// Adventurers resting in town and parties on the road with their banner.
import { TILE } from '../constants';
import { t } from '../../i18n';
import { circle, ellipse, poly, rect, line, shade, rgba, groundShadow, type Env } from '../palette';
import { HERO_SCALE, bubble, facing, pose, spriteFigures, withUnit } from './shared';
import { drawSprite } from '../sprites';
import { ANIMAL } from '../spriteMap';
import type { Adventurer, GameState, Party } from '../../sim/types';
import { classArt } from './classes';

export function drawAdventurer(ctx: CanvasRenderingContext2D, a: Adventurer, env: Env, gear = 0, x = a.x, y = a.y, moving = a.path.length > 0, raid?: { x: number; y: number } | null): void {
  const training = a.status === 'resting' && a.pastime === 'train' && !moving;
  const drinking = a.status === 'resting' && a.pastime === 'drink' && !moving;
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
  withUnit(ctx, lx, y, dir, p.bob, () => {
    classArt(ctx, a.cls, p, moving, env, a.level, gear);
    if (drinking) {
      const lift = Math.max(0, Math.sin(env.clock * 2.2 + a.id)) * 2.5;
      rect(ctx, 3.8, -7.5 - lift, 2.8, 3.2, '#e0a838');
      rect(ctx, 3.8, -8.3 - lift, 2.8, 1.1, '#fff8e0');
    }
  }, HERO_SCALE);
  const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2;
  if (a.hero) {
    // Golden Hero Starlight aura ring underfoot and floating ★ crown above head.
    ctx.strokeStyle = rgba('#ffe066', 0.72);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(px, py + 3.5, 6.8 + Math.sin(env.clock * 4) * 0.8, 2.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe060';
    ctx.fillText('★', px, py - 15 + Math.sin(env.clock * 4) * 1.2);
  }
  if (training && p.swing > 0.55) {
    // Sparks fly off the training dummy at the peak of each blow.
    const sx = px + dir * 7, sy = py - 5;
    for (let i = 0; i < 3; i++) {
      const ang = env.clock * 12 + i * 2.1;
      circle(ctx, sx + Math.cos(ang) * 3, sy + Math.sin(ang) * 2.5, 0.9, i % 2 ? '#ffe890' : '#ff9040');
    }
  }
  if (sally) { const k = (env.clock * 0.32 + a.id * 0.27) % 1; bubble(ctx, px + dir * 2, py - 22, t(a.id % 2 ? 'talk.h.defend.0' : 'talk.h.defend.1'), k < 0.3 ? 1 : 0, '#9a3020'); }
  else if (training) { const k = (env.clock * 0.32 + a.id * 0.23) % 1; bubble(ctx, px + dir * 2, py - 21, a.id % 2 ? t('talk.a.train') : '!', k < 0.24 ? 1 : 0, '#c85030'); }
  else if (drinking) { const k = (env.clock * 0.35 + a.id * 0.19) % 1; bubble(ctx, px + dir * 2, py - 21, a.id % 2 ? t('talk.w.drink') : '♪', k < 0.3 ? 1 : 0, '#c87820'); }
  else if (sitting) { const k = (env.clock * 0.25 + a.id * 0.31) % 1; bubble(ctx, px + dir * 2, py - 19, '…', k < 0.25 ? 1 : 0); }
  if (sally && raid && !melee) drawShot(ctx, a, x, y, raid, env);
  if (sally && lunge > 0.8) { const sx = lx * TILE + TILE / 2 + dir * 9, sy = y * TILE + TILE / 2 - 8; ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(sx, sy, 7, dir > 0 ? -1.3 : Math.PI - 0.5, dir > 0 ? 0.5 : Math.PI + 1.3); ctx.stroke(); }
  if (sally) { rect(ctx, px - 6, py - 12, 12, 2, 'rgba(0,0,0,0.6)'); rect(ctx, px - 6, py - 12, 12 * Math.max(0, a.hp / a.maxHp), 2, a.hp > a.maxHp * 0.5 ? '#7ad07a' : '#e0b040'); }
  if (a.status === 'resting' && a.hp < a.maxHp * 0.6) {
    rect(ctx, px - 5, py - 12, 10, 1.5, '#3a1a1a'); rect(ctx, px - 5, py - 12, 10 * (a.hp / a.maxHp), 1.5, '#7ad07a');
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
  const guild = s.buildings.find((b) => b.built && b.type === 'guildHall') ?? s.center;
  const departing = p.phase === 'travel' && Math.hypot(p.x - guild.x, p.y - guild.y) < 3.6;
  if (departing) {
    // Horn-blast ripple around the departing party at the guild gates.
    const rip = (env.clock * 1.4 + p.id * 0.3) % 1;
    ctx.strokeStyle = `rgba(255,216,100,${0.7 * (1 - rip)})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.ellipse(px, py + 4, 6 + rip * 14, 2.5 + rip * 5, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // A two-by-two column in battle-line order: the warrior leads, the mage brings up the rear.
  const n = team.length;
  team.forEach((a, i) => {
    const ox = (i >= n - 2 ? 0.24 : -0.24) * dir, oy = (i % 2 ? 0.2 : -0.2);
    const pz = pose(true, false, env.clock, a.id);
    if (departing && i === n - 1) pz.swing = 0.9; // lead warrior raises weapon on departure
    const mounted = a.level >= 12 || (!!a.hero && a.level >= 8);
    if (mounted) {
      const mx = (p.x + ox) * TILE + TILE / 2, my = (p.y + oy) * TILE + TILE / 2 + 5;
      const trot = Math.sin(env.clock * 11 + a.id * 1.7) * 1.2;
      groundShadow(ctx, mx, my + 1, 7.5, 2.2, 0.28);
      if (spriteFigures()) {
        drawSprite(ctx, ANIMAL.horse, mx, my + 1 + Math.abs(trot) * 0.4, 21, { flip: dir < 0 });
        rect(ctx, mx - 3, my - 11, 6, 2.5, '#c89838');
      } else {
        ctx.save(); ctx.translate(mx, my); ctx.scale(dir, 1);
        for (let k = 0; k < 4; k++) rect(ctx, -4 + k * 2.6, -4, 1.2, 4 + (k % 2 ? trot : -trot), '#5a4a3a');
        ellipse(ctx, 0, -6.5, 5.8, 3, '#f0ece0'); rect(ctx, 4, -10.8, 2.6, 5.2, '#f0ece0');
        poly(ctx, [4, -10.8, 4.6, -13.6, 5.6, -10.8], '#f0ece0');
        rect(ctx, -3.5, -8.5, 7, 2.4, '#c89838');
        ctx.restore();
      }
      withUnit(ctx, p.x + ox, p.y + oy, dir, pz.bob - 4.5, () => classArt(ctx, a.cls, pz, false, env, a.level, s.equipment), HERO_SCALE);
    } else {
      withUnit(ctx, p.x + ox, p.y + oy, dir, pz.bob, () => classArt(ctx, a.cls, pz, true, env, a.level, s.equipment), HERO_SCALE);
    }
  });
  if (departing) bubble(ctx, px + dir * 6, py - 22, '!', 0.9, '#c85030');
  // Banner carried at the head of the column.
  const bx = px + dir * 10, by = py - 2;
  rect(ctx, bx - 0.5, by - 18, 1, 18, '#5a3a1e');
  const wave = Math.sin(env.clock * 7 + p.id) * 1.2;
  const c = p.phase === 'return' ? '#f0d050' : '#8a3ad0';
  poly(ctx, [bx, by - 18, bx + dir * 7, by - 16.5 + wave, bx + dir * 5.5, by - 14, bx + dir * 7, by - 11.5 + wave, bx, by - 11], c);
  circle(ctx, bx + dir * 2.8, by - 14.5, 1, shade(c, 0.5));
  if (p.phase === 'return') {
    ellipse(ctx, px - dir * 5, py + 3, 2.6, 2, '#b08a52'); circle(ctx, px - dir * 5, py + 2.6, 0.8, '#e0b040');
    // Trailing gold motes and a golden finial when returning with loot.
    circle(ctx, bx, by - 19, 1.3, '#ffe880');
    for (let i = 0; i < 4; i++) {
      const kt = (env.clock * 1.3 + i * 0.25 + p.id) % 1;
      circle(ctx, px - dir * (2 + kt * 12) + Math.sin(env.clock * 4 + i) * 2, py - 8 - kt * 8, 1.1 * (1 - kt) + 0.3, `rgba(255,224,110,${0.85 * (1 - kt)})`);
    }
  }
}
