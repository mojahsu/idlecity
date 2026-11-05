// People and creatures on the map: workers, adventurers, parties, raiders.
import type { Adventurer, AdventurerClass, GameState, Party, Raid, Worker } from '../sim/types';
import { JOBS } from '../data/jobs';
import { CLASSES } from '../data/adventurers';
import { TILE } from './constants';
import { circle, ellipse, poly, rect, line, groundShadow, shade, rgba, hash, type Env } from './palette';
import { drawMonster } from './monsters';

const SKIN = ['#f2c9a0', '#e8b88a', '#c98f62', '#8d5a3b'];
const HAIR = ['#2b1d12', '#5a3a1e', '#a8702a', '#d9b65a', '#8a8a8a', '#b03a2a'];

/** Which way a unit faces: +1 right, -1 left. */
function facing(x: number, path: { x: number; y: number }[], id: number): number {
  if (path.length) { const dx = path[0].x - x; if (Math.abs(dx) > 0.01) return dx > 0 ? 1 : -1; }
  return hash(id, 3) > 0.5 ? 1 : -1;
}

interface Pose { walk: number; bob: number; swing: number }

function pose(moving: boolean, working: boolean, clock: number, id: number): Pose {
  const t = clock * 11 + id;
  return {
    walk: moving ? Math.sin(t) : 0,
    bob: moving ? Math.abs(Math.sin(t)) * -1.2 : working ? Math.abs(Math.sin(clock * 8 + id)) * -1 : Math.sin(clock * 2 + id) * 0.3,
    swing: working ? Math.sin(clock * 8 + id) : 0,
  };
}

/** Body shared by everyone: legs, tunic, head. Drawn around (0,0) = feet centre, facing +x. */
function body(ctx: CanvasRenderingContext2D, tunic: string, skin: string, hair: string, p: Pose, robe = false): void {
  // Legs.
  const legA = p.walk * 2, legB = -p.walk * 2;
  if (!robe) {
    rect(ctx, -2.6 + legA * 0.3, -4, 2.2, 4, '#4a3a2a'); rect(ctx, 0.4 + legB * 0.3, -4, 2.2, 4, '#3f3222');
  }
  // Tunic / robe.
  if (robe) poly(ctx, [-4.5, 0, -3, -10, 3, -10, 4.5, 0], tunic);
  else { rect(ctx, -3.2, -10.5, 6.4, 7, tunic); rect(ctx, -3.2, -5, 6.4, 1.2, shade(tunic, -0.35)); }
  rect(ctx, -3.2, -10.5, 6.4, 1.2, shade(tunic, 0.2));
  // Arms.
  rect(ctx, -4.4, -9.5, 1.6, 4.5, tunic); rect(ctx, 2.8, -9.5, 1.6, 4.5, tunic);
  // Head.
  circle(ctx, 0, -13, 3.4, skin);
  ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(0, -13.6, 3.4, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  rect(ctx, 1.2, -13.4, 0.9, 0.9, '#2a1a1a');
}

function withUnit(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, bob: number, draw: () => void): void {
  const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2 + 7;
  groundShadow(ctx, px, py + 0.5, 4.5, 2, 0.25);
  ctx.save(); ctx.translate(px, py + bob); ctx.scale(dir, 1);
  draw();
  ctx.restore();
}

// ---- workers -----------------------------------------------------------------

function tool(ctx: CanvasRenderingContext2D, w: Worker, p: Pose): void {
  // Held at the right hand (3.5,-6), swung forward when working.
  ctx.save(); ctx.translate(3.6, -6); ctx.rotate(p.swing * 0.9 - 0.4);
  switch (w.job) {
    case 'lumberjack': line(ctx, 0, 0, 0, -9, '#8a5a2a', 1.4); poly(ctx, [-0.5, -9.5, 3.5, -8.5, 3.5, -5.5, -0.5, -6.5], '#b8bec6'); break;
    case 'quarryman': case 'miner': line(ctx, 0, 0, 0, -9, '#8a5a2a', 1.4); poly(ctx, [-3.5, -8, 0, -10, 3.5, -8, 0, -8.5], '#8a8f96'); break;
    case 'builder': line(ctx, 0, 0, 0, -8, '#8a5a2a', 1.4); rect(ctx, -2.5, -10, 5, 3, '#6a6a70'); break;
    case 'farmer': line(ctx, 0, 0, 0, -10, '#8a5a2a', 1.4); poly(ctx, [-0.5, -10.5, 3.5, -9.5, 3.5, -8.5, -0.5, -8.5], '#8a8f96'); break;
    case 'forager': ctx.rotate(-p.swing * 0.9 + 0.4); ellipse(ctx, 1, 1, 3, 2, '#b08a52'); circle(ctx, 0, 0, 1, '#d83a4a'); circle(ctx, 2, 0.5, 1, '#f7d94c'); break;
  }
  ctx.restore();
}

function hat(ctx: CanvasRenderingContext2D, job: string): void {
  switch (job) {
    case 'farmer': ellipse(ctx, 0, -15.5, 5.5, 1.6, '#d8b860'); ellipse(ctx, 0, -16.5, 3, 2, '#e0c468'); break;
    case 'miner': ctx.fillStyle = '#5a6a8a'; ctx.beginPath(); ctx.arc(0, -14, 3.6, Math.PI, 0); ctx.fill(); circle(ctx, 2.2, -15, 1, '#ffd870'); break;
    case 'builder': ctx.fillStyle = '#b8862a'; ctx.beginPath(); ctx.arc(0, -14, 3.6, Math.PI, 0); ctx.fill(); rect(ctx, 0, -14.5, 5, 1.2, '#b8862a'); break;
    case 'forager': ctx.fillStyle = '#4f8a3a'; ctx.beginPath(); ctx.arc(0, -13.6, 3.9, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); break;
    case 'quarryman': rect(ctx, -3.4, -15, 6.8, 1.4, '#a0a0a0'); break;
    default: break;
  }
}

function load(ctx: CanvasRenderingContext2D, w: Worker): void {
  if (!w.carrying) return;
  // Carried on the back/shoulder, behind the head.
  switch (w.carrying) {
    case 'wood': for (let i = 0; i < 3; i++) { circle(ctx, -5 + i * 2.2, -16 - (i % 2) * 1.5, 1.6, '#8a5a30'); circle(ctx, -5 + i * 2.2, -16 - (i % 2) * 1.5, 0.8, '#d6a86c'); } break;
    case 'stone': rect(ctx, -5.5, -18.5, 6, 4.5, '#9a9a96'); rect(ctx, -5.5, -18.5, 6, 1.2, '#c0c0bc'); break;
    case 'food': ellipse(ctx, -3.5, -16.5, 3.4, 2.2, '#b08a52'); circle(ctx, -4.5, -17.5, 1, '#d83a4a'); circle(ctx, -2.5, -18, 1, '#f7d94c'); circle(ctx, -3.5, -16.8, 1, '#8fcf7a'); break;
    case 'iron': rect(ctx, -5.5, -18, 6, 3.5, '#5a6a8a'); rect(ctx, -5.5, -18, 6, 1, '#8a9ab8'); break;
    case 'gold': circle(ctx, -3.5, -17, 2.2, '#e0b040'); break;
  }
}

export function drawWorker(ctx: CanvasRenderingContext2D, w: Worker, env: Env): void {
  const moving = w.path.length > 0;
  const working = !!w.task && 'phase' in w.task && w.task.phase === 'work';
  const p = pose(moving, working, env.clock, w.id);
  const dir = facing(w.x, w.path, w.id);
  const skin = SKIN[Math.floor(hash(w.id, 1) * SKIN.length)], hair = HAIR[Math.floor(hash(w.id, 2) * HAIR.length)];
  withUnit(ctx, w.x, w.y, dir, p.bob, () => {
    load(ctx, w);
    body(ctx, JOBS[w.job].color, skin, hair, p);
    hat(ctx, w.job);
    if (working || !w.carrying) tool(ctx, w, p);
  });
}

// ---- adventurers -------------------------------------------------------------

function classArt(ctx: CanvasRenderingContext2D, cls: AdventurerClass, p: Pose, moving: boolean, env: Env, level: number): void {
  const flutter = moving ? Math.sin(env.clock * 9) * 1.5 : Math.sin(env.clock * 2) * 0.4;
  switch (cls) {
    case 'warrior': {
      poly(ctx, [-3, -10, -6 - flutter, -1, -2, -2, -2, -10], '#8a2a2a'); // cape
      body(ctx, '#b84034', '#f2c9a0', '#3a2a1a', p);
      rect(ctx, -3.2, -9, 6.4, 4, '#9aa0a8'); // breastplate
      ctx.fillStyle = '#8a9098'; ctx.beginPath(); ctx.arc(0, -14, 3.8, Math.PI, 0); ctx.fill(); rect(ctx, -3.8, -14, 7.6, 1.6, '#6a7078');
      poly(ctx, [0, -19, 1.5, -16, -1.5, -16], '#d04040'); // plume
      circle(ctx, -4.5, -6, 3, '#6a4a2a'); circle(ctx, -4.5, -6, 1.8, '#c0a060'); // shield
      ctx.save(); ctx.translate(4, -7); ctx.rotate(p.walk * 0.3 - 0.5); rect(ctx, -0.6, -10, 1.2, 10, '#d8dde3'); rect(ctx, -2, 0, 4, 1.2, '#b8862a'); ctx.restore();
      break;
    }
    case 'archer': {
      body(ctx, '#3f8a3a', '#e8b88a', '#a8702a', p);
      rect(ctx, -4.5, -11, 2.5, 7, '#6a4a2a'); for (let i = 0; i < 3; i++) rect(ctx, -4.2 + i, -13 - (i % 2), 0.6, 2.5, '#d8d8d8'); // quiver
      ctx.fillStyle = '#2f6a2a'; ctx.beginPath(); ctx.arc(0, -13.4, 3.9, Math.PI * 0.9, Math.PI * 2.1); ctx.fill(); // hood
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(4, -8, 6, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
      line(ctx, 4, -14, 4, -2, '#e0e0e0', 0.5);
      break;
    }
    case 'mage': {
      poly(ctx, [-3, -10, -6 - flutter, 0, -2, -1, -2, -10], '#2a3a8a');
      body(ctx, '#3a4ac0', '#f2c9a0', '#d9b65a', p, true);
      poly(ctx, [-5, -15.5, 0, -24, 4.5, -15.5], '#2a3a9a'); ellipse(ctx, 0, -15.5, 5.8, 1.6, '#2a3a9a'); circle(ctx, 1, -19, 0.8, '#f7d94c');
      rect(ctx, 4, -14, 1.2, 14, '#6a4a2a');
      const g = 0.6 + 0.4 * Math.sin(env.clock * 4);
      circle(ctx, 4.6, -15.5, 2.6, rgba('#80c0ff', 0.35 * g)); circle(ctx, 4.6, -15.5, 1.5, '#a0e0ff');
      break;
    }
    case 'priest': {
      body(ctx, '#e8e0c8', '#c98f62', '#2b1d12', p, true);
      rect(ctx, -3, -10.5, 6, 1.5, '#e0b040'); rect(ctx, -0.6, -10, 1.2, 8, '#e0b040');
      ctx.fillStyle = '#f4efe0'; ctx.beginPath(); ctx.arc(0, -13.4, 3.9, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
      rect(ctx, 4, -14, 1.2, 14, '#8a6a3a'); rect(ctx, 3.3, -17, 2.6, 2.6, '#e0b040'); rect(ctx, 4.1, -18, 1, 4.6, '#e0b040');
      circle(ctx, 0, -18.5, 4.2, rgba('#ffe890', 0.25 + 0.1 * Math.sin(env.clock * 3)));
      break;
    }
  }
  if (level >= 10) circle(ctx, -4.5, -17.5, 1.3, '#f0d050');
}

/** Draw a class figure at absolute logical pixels (used by the dungeon view). */
export function drawClassFigure(ctx: CanvasRenderingContext2D, cls: AdventurerClass, level: number, env: Env, moving: boolean, px: number, py: number, dir: number, scale: number, hurt = false): void {
  const p = pose(moving, false, env.clock, level * 7);
  ctx.save(); ctx.translate(px, py + p.bob * scale); ctx.scale(dir * scale, scale);
  if (hurt) { ctx.filter = 'brightness(1.8) saturate(0.3)'; ctx.translate(Math.sin(env.clock * 60) * 1.5, 0); }
  classArt(ctx, cls, p, moving, env, level);
  ctx.restore();
}

export function drawAdventurer(ctx: CanvasRenderingContext2D, a: Adventurer, env: Env, x = a.x, y = a.y, moving = a.path.length > 0): void {
  const p = pose(moving, false, env.clock, a.id);
  const dir = facing(a.x, a.path, a.id);
  withUnit(ctx, x, y, dir, p.bob, () => classArt(ctx, a.cls, p, moving, env, a.level));
  if (a.status === 'resting' && a.hp < a.maxHp * 0.6) {
    const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2 - 16;
    rect(ctx, px - 6, py, 12, 2, '#3a1a1a'); rect(ctx, px - 6, py, 12 * (a.hp / a.maxHp), 2, '#7ad07a');
  }
}

export function drawParty(ctx: CanvasRenderingContext2D, s: GameState, p: Party, env: Env): void {
  if (p.phase === 'explore' || p.phase === 'fight') return; // underground: the dungeon view shows them
  const team = p.memberIds.map((id) => s.adventurers.find((a) => a.id === id)!).filter((a) => a && a.status === 'questing');
  const px = p.x * TILE + TILE / 2, py = p.y * TILE + TILE / 2;
  const dir = facing(p.x, p.path, p.id);
  team.forEach((a, i) => {
    const ox = ((i % 2) * 0.42 - 0.21) * dir - i * 0.08 * dir, oy = Math.floor(i / 2) * 0.32 - 0.16;
    const pz = pose(true, false, env.clock, a.id);
    withUnit(ctx, p.x + ox, p.y + oy, dir, pz.bob, () => classArt(ctx, a.cls, pz, true, env, a.level));
  });
  // Banner carried by the leader.
  const bx = px + dir * 7, by = py - 4;
  rect(ctx, bx - 0.6, by - 24, 1.2, 24, '#5a3a1e');
  const wave = Math.sin(env.clock * 7 + p.id) * 1.5;
  const c = p.phase === 'return' ? '#f0d050' : '#8a3ad0';
  poly(ctx, [bx, by - 24, bx + dir * 9, by - 22 + wave, bx + dir * 7, by - 19, bx + dir * 9, by - 16 + wave, bx, by - 15], c);
  circle(ctx, bx + dir * 3.5, by - 19.5, 1.3, shade(c, 0.5));
  if (p.phase === 'return') { ellipse(ctx, px - dir * 6, py + 2, 3.5, 2.8, '#b08a52'); circle(ctx, px - dir * 6, py + 1.5, 1, '#e0b040'); }
}

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
    withUnit(ctx, r.x + ox, r.y + oy, dir, Math.abs(Math.sin(env.clock * 10 + i)) * -1.5, () => raiderArt(ctx, r.monster, i, env, r.phase === 'fight'));
  }
  const px = r.x * TILE + TILE / 2, py = r.y * TILE - 8;
  rect(ctx, px - 15, py - 1, 30, 4, 'rgba(0,0,0,0.6)');
  rect(ctx, px - 14, py, 28 * Math.max(0, r.hp / r.maxHp), 2, '#e04040');
}
