// People and creatures on the map: workers, adventurers, parties, raiders.
import type { Adventurer, AdventurerClass, Caravan, GameState, Party, Raid, Worker } from '../sim/types';
import { JOBS } from '../data/jobs';
import { CLASSES } from '../data/adventurers';
import { TILE } from './constants';
import { circle, ellipse, poly, rect, line, groundShadow, shade, rgba, hash, type Env } from './palette';
import { drawMonster } from './monsters';

/** People are drawn small relative to buildings; adventurers a touch larger than townsfolk. */
export const WORKER_SCALE = 0.6;
export const HERO_SCALE = 0.7;
const OUTLINE = 'rgba(20,15,10,0.45)';

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
  // Tunic / robe, with a thin outline so small figures still read against grass.
  ctx.lineWidth = 1; ctx.strokeStyle = OUTLINE;
  if (robe) { poly(ctx, [-4.5, 0, -3, -10, 3, -10, 4.5, 0], tunic); ctx.stroke(); }
  else { rect(ctx, -3.2, -10.5, 6.4, 7, tunic); ctx.strokeRect(-3.2, -10.5, 6.4, 7); rect(ctx, -3.2, -5, 6.4, 1.2, shade(tunic, -0.35)); }
  rect(ctx, -3.2, -10.5, 6.4, 1.2, shade(tunic, 0.2));
  // Arms.
  rect(ctx, -4.4, -9.5, 1.6, 4.5, tunic); rect(ctx, 2.8, -9.5, 1.6, 4.5, tunic);
  // Head.
  circle(ctx, 0, -13, 3.4, skin); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(0, -13.6, 3.4, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  rect(ctx, 1.2, -13.4, 0.9, 0.9, '#2a1a1a');
}

function withUnit(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, bob: number, draw: () => void, scale = WORKER_SCALE): void {
  const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2 + 5;
  groundShadow(ctx, px, py + 0.5, 4.5 * scale + 1, 2 * scale + 0.5, 0.3);
  ctx.save(); ctx.translate(px, py + bob * scale); ctx.scale(dir * scale, scale);
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

/** A wooden bucket: empty on the way to the well, full and sloshing on the way back, tipped when thrown. */
function bucket(ctx: CanvasRenderingContext2D, env: Env, phase: 'fetch' | 'carry' | 'throw', id: number): void {
  ctx.save(); ctx.translate(3.6, -6);
  ctx.rotate(phase === 'throw' ? -1.4 + 0.6 * Math.sin(env.clock * 12 + id) : phase === 'carry' ? 0.1 + 0.15 * Math.sin(env.clock * 9 + id) : 0.25);
  line(ctx, 0, 0, 0, 3, '#5a3a1e', 0.8);
  poly(ctx, [-2.5, 3, 2.5, 3, 2, 8, -2, 8], '#8a6a3a'); rect(ctx, -2.5, 3, 5, 1, '#6b4a2b');
  if (phase !== 'fetch') ellipse(ctx, 0, 3.5, 2, 0.9, '#5aa0e0');
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
  const sleeping = w.task?.kind === 'sleep' && w.task.phase === 'sleep';
  const dousing = w.task?.kind === 'douse';
  const p = pose(moving, working, env.clock, w.id);
  const dir = facing(w.x, w.path, w.id);
  const skin = SKIN[Math.floor(hash(w.id, 1) * SKIN.length)], hair = HAIR[Math.floor(hash(w.id, 2) * HAIR.length)];
  if (sleeping) {
    // Dozing by the campfire: sat down, head nodding, the odd "z".
    const nod = Math.sin(env.clock * 1.5 + w.id) * 0.6;
    withUnit(ctx, w.x, w.y, dir, 3 + nod, () => { body(ctx, JOBS[w.job].color, skin, hair, { walk: 0, bob: 0, swing: 0 }, true); hat(ctx, w.job); });
    const zt = (env.clock * 0.6 + w.id * 0.37) % 1;
    if (zt < 0.7) { ctx.font = 'bold 6px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = `rgba(230,235,255,${0.8 * (1 - zt / 0.7)})`; ctx.fillText('z', w.x * TILE + TILE / 2 + dir * 5 + zt * 4, w.y * TILE + TILE / 2 - 6 - zt * 10); }
    return;
  }
  withUnit(ctx, w.x, w.y, dir, p.bob, () => {
    load(ctx, w);
    body(ctx, JOBS[w.job].color, skin, hair, p);
    hat(ctx, w.job);
    if (dousing) bucket(ctx, env, (w.task as { phase: 'fetch' | 'carry' | 'throw' }).phase, w.id);
    else if (working || !w.carrying) tool(ctx, w, p);
  });
}

// ---- townsfolk (ambient, not in the simulation) ---------------------------------

const TUNICS = ['#b85a4a', '#6a8ab8', '#8a9a5a', '#b8a060', '#9a6a9a', '#7a8a8a', '#c08a5a', '#5a8a7a'];

/**
 * A generic villager at absolute tile coordinates. `seed` picks the colours;
 * `child` draws a half-height figure. Used by the ambient town life layer.
 */
export function drawTownsfolk(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, moving: boolean, env: Env, seed: number, child = false, basket = false): void {
  const p = pose(moving, false, env.clock, seed);
  const skin = SKIN[Math.floor(hash(seed, 1) * SKIN.length)], hair = HAIR[Math.floor(hash(seed, 2) * HAIR.length)];
  const tunic = TUNICS[Math.floor(hash(seed, 4) * TUNICS.length)];
  withUnit(ctx, x, y, dir, p.bob, () => {
    body(ctx, tunic, skin, hair, p, hash(seed, 5) > 0.5 && !child);
    if (!child && hash(seed, 6) > 0.6) { ctx.fillStyle = shade(tunic, -0.3); ctx.beginPath(); ctx.arc(0, -13.4, 3.9, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); }
    if (basket) { ellipse(ctx, 4.5, -5, 2.6, 1.8, '#b08a52'); circle(ctx, 3.8, -6, 0.9, '#d83a4a'); circle(ctx, 5.4, -6.2, 0.9, '#8fcf7a'); }
  }, child ? WORKER_SCALE * 0.68 : WORKER_SCALE);
}

/** A town guard pacing a wall: grey tunic, kettle helmet, spear, torch after dark. */
export function drawGuard(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, moving: boolean, env: Env, seed: number): void {
  const p = pose(moving, false, env.clock, seed);
  withUnit(ctx, x, y, dir, p.bob, () => {
    body(ctx, '#7a7a86', '#e8b88a', '#3a2a1a', p);
    rect(ctx, -3.2, -9.5, 6.4, 3, '#9aa0a8');
    ctx.fillStyle = '#8a9098'; ctx.beginPath(); ctx.arc(0, -14, 3.8, Math.PI, 0); ctx.fill(); ellipse(ctx, 0, -14, 5, 1.2, '#7a8088');
    line(ctx, 4.5, 2, 4.5, -18, '#8a6a3a', 1.2); poly(ctx, [3.6, -18, 4.5, -22, 5.4, -18], '#d8dde3');
    if (env.dark > 0.25) { line(ctx, -4.5, -6, -4.5, -12, '#5a3a1e', 1.2); const f = 1 + 0.3 * Math.sin(env.clock * 11 + seed); ellipse(ctx, -4.5, -13.5 * f, 1.8, 2.6 * f, '#ff9a30'); ellipse(ctx, -4.5, -13 * f, 0.9, 1.4 * f, '#ffe080'); }
  });
}

/** Merchant on foot, two laden mules and a covered wagon. */
export function drawCaravan(ctx: CanvasRenderingContext2D, c: Caravan, env: Env): void {
  const moving = c.phase !== 'trade';
  const dir = facing(c.x, c.path, 11);
  const px = c.x * TILE + TILE / 2, py = c.y * TILE + TILE / 2 + 6;
  const step = moving ? env.clock * 10 : 0;
  // Wagon (behind), then mules, then the merchant leading.
  for (let i = 1; i >= 0; i--) {
    const mx = px - dir * (14 + i * 11), my = py - 1 + (i ? 1 : -1);
    const trot = moving ? Math.sin(step + i * 2) * 1.2 : 0;
    groundShadow(ctx, mx, my + 1, 7, 2, 0.25);
    ctx.save(); ctx.translate(mx, my); ctx.scale(dir, 1);
    for (let k = 0; k < 4; k++) rect(ctx, -4 + k * 2.6, -4, 1.2, 4 + (k % 2 ? trot : -trot), '#5a4a3a');
    ellipse(ctx, 0, -6.5, 5.5, 3, '#8a7a6a'); rect(ctx, 4, -10.5, 2.6, 5, '#8a7a6a'); poly(ctx, [4, -10.5, 4.5, -13.5, 5.5, -10.5], '#8a7a6a'); poly(ctx, [6, -10.5, 6.5, -13.5, 7.2, -10.5], '#8a7a6a');
    poly(ctx, [-5, -7, -7.5, -9, -6, -5], '#4a3a2a');
    // Packs.
    rect(ctx, -3.5, -11.5, 7, 4.5, i ? '#b85a4a' : '#5a7ab0'); rect(ctx, -3.5, -11.5, 7, 1, i ? '#d88a7a' : '#8aa0d0'); line(ctx, 0, -11.5, 0, -7, '#3a2a1a', 0.8);
    ctx.restore();
  }
  if (c.phase === 'trade') {
    // Spread a rug with wares next to the wagon.
    rect(ctx, px + dir * 4 - 8, py + 2, 16, 6, '#b84040'); rect(ctx, px + dir * 4 - 7, py + 3, 14, 4, '#d8a040');
    circle(ctx, px + dir * 4 - 4, py + 4.5, 1.4, '#5aa0e0'); circle(ctx, px + dir * 4, py + 4.5, 1.4, '#f0d050'); circle(ctx, px + dir * 4 + 4, py + 4.5, 1.4, '#8fcf7a');
  }
  // Merchant leads on foot with a staff and a wide hat.
  const p = pose(moving, false, env.clock, 11);
  withUnit(ctx, c.x + dir * 0.05, c.y, dir, p.bob, () => {
    body(ctx, '#7a4a8a', '#e8b88a', '#2b1d12', p, true);
    ellipse(ctx, 0, -15.5, 6, 1.8, '#5a3a2a'); ellipse(ctx, 0, -16.5, 3.2, 2.2, '#6a4a3a');
    line(ctx, 4.5, 0, 4.5, -14, '#8a6a3a', 1.2);
    ellipse(ctx, -4.5, -6, 2.4, 2, '#b08a52');
  });
  // Covered wagon at the back.
  const wx = px - dir * 34, wy = py;
  groundShadow(ctx, wx, wy + 1, 12, 3, 0.25);
  ctx.save(); ctx.translate(wx, wy); ctx.scale(dir, 1);
  const wheel = moving ? env.clock * 4 : 0;
  rect(ctx, -11, -9, 22, 6, '#8a6a3a'); rect(ctx, -11, -9, 22, 1.2, '#b08a52');
  ctx.fillStyle = '#e8dcc0'; ctx.beginPath(); ctx.moveTo(-10, -9); ctx.quadraticCurveTo(-10, -20, 0, -20); ctx.quadraticCurveTo(10, -20, 10, -9); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(k * 5, -9); ctx.quadraticCurveTo(k * 5, -17, k * 4, -19.5); ctx.stroke(); }
  for (const x of [-6, 6]) { circle(ctx, x, -2, 3, '#3a2a1a'); ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - Math.cos(wheel) * 2.5, -2 - Math.sin(wheel) * 2.5); ctx.lineTo(x + Math.cos(wheel) * 2.5, -2 + Math.sin(wheel) * 2.5); ctx.moveTo(x - Math.sin(wheel) * 2.5, -2 + Math.cos(wheel) * 2.5); ctx.lineTo(x + Math.sin(wheel) * 2.5, -2 - Math.cos(wheel) * 2.5); ctx.stroke(); }
  if (env.dark > 0.3) { rect(ctx, 11, -14, 1, 5, '#5a3a1e'); circle(ctx, 11.5, -15, 1.4, '#ffd070'); }
  ctx.restore();
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
  withUnit(ctx, x, y, dir, p.bob, () => classArt(ctx, a.cls, p, moving, env, a.level), HERO_SCALE);
  if (a.status === 'resting' && a.hp < a.maxHp * 0.6) {
    const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2 - 12;
    rect(ctx, px - 5, py, 10, 1.5, '#3a1a1a'); rect(ctx, px - 5, py, 10 * (a.hp / a.maxHp), 1.5, '#7ad07a');
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
    withUnit(ctx, p.x + ox, p.y + oy, dir, pz.bob, () => classArt(ctx, a.cls, pz, true, env, a.level), HERO_SCALE);
  });
  // Banner carried by the leader.
  const bx = px + dir * 6, by = py - 2;
  rect(ctx, bx - 0.5, by - 18, 1, 18, '#5a3a1e');
  const wave = Math.sin(env.clock * 7 + p.id) * 1.2;
  const c = p.phase === 'return' ? '#f0d050' : '#8a3ad0';
  poly(ctx, [bx, by - 18, bx + dir * 7, by - 16.5 + wave, bx + dir * 5.5, by - 14, bx + dir * 7, by - 11.5 + wave, bx, by - 11], c);
  circle(ctx, bx + dir * 2.8, by - 14.5, 1, shade(c, 0.5));
  if (p.phase === 'return') { ellipse(ctx, px - dir * 5, py + 3, 2.6, 2, '#b08a52'); circle(ctx, px - dir * 5, py + 2.6, 0.8, '#e0b040'); }
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
    withUnit(ctx, r.x + ox, r.y + oy, dir, Math.abs(Math.sin(env.clock * 10 + i)) * -1.5, () => raiderArt(ctx, r.monster, i, env, r.phase === 'fight'), HERO_SCALE);
  }
  const px = r.x * TILE + TILE / 2, py = r.y * TILE - 4;
  rect(ctx, px - 15, py - 1, 30, 4, 'rgba(0,0,0,0.6)');
  rect(ctx, px - 14, py, 28 * Math.max(0, r.hp / r.maxHp), 2, '#e04040');
}
