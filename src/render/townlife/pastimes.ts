// Scenery and extras for the villagers' pastimes: the bard and their audience,
// the archery target with its arrows, hosts at the door of a visited house,
// the chess table, snowmen that stay the day, and snowballs in flight.
import type { GameState, Point, Worker } from '../../sim/types';
import { archeryTarget, bardSpot, chessSeats } from '../../sim/leisure';
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, line, groundShadow, hash, type Env } from '../palette';
import { drawTownsfolk } from '../units';
import type { Music } from './music';
import type { Actor } from './shared';

interface Snowman { x: number; y: number; day: number; seed: number }

function resting(s: GameState, activity: string): Worker[] {
  return s.workers.filter((w) => w.task?.kind === 'rest' && w.task.phase === 'do' && w.task.activity === activity);
}

export class Pastimes {
  private snowmen: Snowman[] = [];
  private noteTimer = 0;
  private hits: { x: number; y: number; ttl: number }[] = [];

  update(s: GameState, env: Env, dt: number, music: Music): void {
    // The bard plays while there is an audience; notes drift up.
    if (resting(s, 'listen').length) {
      this.noteTimer -= dt;
      if (this.noteTimer <= 0) { this.noteTimer = 0.5 + Math.random() * 0.5; const b = bardSpot(s); music.notes.push({ x: b.x * TILE + TILE / 2 + (Math.random() - 0.5) * 8, y: b.y * TILE, ttl: 2.2, glyph: Math.random() < 0.5 ? '♪' : '♫', color: '#ffe080' }); }
    }
    // A snowman is finished when its builder's break runs out.
    for (const w of resting(s, 'snowman')) {
      if (w.timer > 0.15) continue;
      const t = w.task as { x: number; y: number; dir: number };
      if (!this.snowmen.some((m) => m.x === t.x + t.dir && m.y === t.y)) this.snowmen.push({ x: t.x + t.dir, y: t.y, day: env.day, seed: w.id });
    }
    this.snowmen = this.snowmen.filter((m) => m.day === env.day && env.season === 'winter');
    // Snowballs land: a puff where they hit.
    const throwers = resting(s, 'snowball');
    for (let i = 0; i + 1 < throwers.length; i += 2) {
      const a = throwers[i], b = throwers[i + 1];
      const k = (env.clock * 0.8 + a.id * 0.37) % 1;
      if (k < dt * 0.8 + 0.001) this.hits.push({ x: (k < 0.5 ? b : a).x, y: (k < 0.5 ? b : a).y, ttl: 0.4 });
    }
    this.hits = this.hits.filter((h) => (h.ttl -= dt) > 0);
  }

  actors(s: GameState, env: Env): Actor[] {
    const out: Actor[] = [];
    // The bard, just north of the fire, strumming.
    if (resting(s, 'listen').length) {
      const b = bardSpot(s);
      out.push({ y: b.y + 0.8, draw: (ctx, e) => { drawTownsfolk(ctx, b.x, b.y, 1, false, e, 777, { tunic: '#b86a2a' }); const px = b.x * TILE + TILE / 2, py = b.y * TILE + TILE / 2 + 5; const st = Math.sin(e.clock * 8) * 0.6; ellipse(ctx, px + 3, py - 5, 2.6, 1.8, '#8a5a2a'); rect(ctx, px + 4.5, py - 11, 1, 6, '#5a3a1e'); line(ctx, px + 2, py - 6 + st, px + 4.5, py - 4 + st, '#e8dcc0', 0.6); } });
    }
    // The archery target, with arrows stuck in it and one in flight per shooter.
    const shooters = resting(s, 'archery');
    const target = shooters.length ? archeryTarget(s) : null;
    if (target) {
      out.push({ y: target.y + 0.8, draw: (ctx, e) => {
        const px = target.x * TILE + TILE / 2, py = target.y * TILE + TILE / 2 + 5;
        groundShadow(ctx, px, py + 1, 5, 2, 0.25);
        rect(ctx, px - 1, py - 8, 2, 8, '#6b4a2b');
        for (const [r, c] of [[6, '#e8dcc0'], [4.5, '#d84a4a'], [3, '#e8dcc0'], [1.5, '#d84a4a']] as [number, string][]) circle(ctx, px, py - 10, r, c);
        for (let i = 0; i < 3; i++) { const h = hash(i, target.x, 3); line(ctx, px - 6 + h * 8 - 5, py - 12 + h * 4 - 1, px - 6 + h * 8, py - 12 + h * 4, '#e8dcc0', 0.8); }
        for (const w of shooters) { const k = (e.clock * 1.5 + w.id) % (Math.PI * 2) / (Math.PI * 2); const fly = k > 0.5 ? (k - 0.5) * 2 : -1; if (fly < 0) continue; const sx = w.x * TILE + TILE / 2 + 6, sy = w.y * TILE + TILE / 2 - 3; const x = sx + (px - sx) * fly, y = sy + (py - 10 - sy) * fly - Math.sin(fly * Math.PI) * 6; line(ctx, x - 5, y + 1, x, y, '#e8dcc0', 1.2); poly(ctx, [x, y, x - 2, y - 1.2, x - 2, y + 1.2], '#d0d0d8'); }
      } });
    }
    // Someone comes to the door when a neighbour calls.
    for (const w of resting(s, 'visit')) {
      const t = w.task as { buildingId?: number };
      const h = s.buildings.find((b) => b.id === t.buildingId);
      if (!h) continue;
      out.push({ y: h.y + 0.97, draw: (ctx, e) => drawTownsfolk(ctx, h.x, h.y + 0.35, w.x > h.x ? 1 : -1, false, e, h.id * 5) });
    }
    // The chess table waits even when nobody is playing.
    const seats = chessSeats(s);
    if (seats && s.buildings.some((b) => b.built && b.type === 'tavern')) {
      const sx = seats[0].x * TILE + TILE / 2 + 12, sy = seats[0].y * TILE + TILE / 2 + 1;
      if (!resting(s, 'chess').length) out.push({ y: seats[0].y + 0.7, draw: (ctx) => { rect(ctx, sx - 6, sy + 2, 12, 3, '#6b4a2b'); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) rect(ctx, sx - 6 + c * 3, sy - 5 + r * 1.8, 3, 1.8, (r + c) % 2 ? '#e8dcc0' : '#4a3a2a'); } });
    }
    for (const m of this.snowmen) out.push({ y: m.y + 0.8, draw: (ctx, e) => drawSnowman(ctx, m, e) });
    // Snowballs between pairs of throwers.
    const throwers = resting(s, 'snowball');
    for (let i = 0; i + 1 < throwers.length; i += 2) {
      const a = throwers[i], b = throwers[i + 1];
      out.push({ y: Math.max(a.y, b.y) + 0.9, draw: (ctx, e) => {
        const k = (e.clock * 0.8 + a.id * 0.37) % 1;
        const from = k < 0.5 ? a : b, to = k < 0.5 ? b : a, q = (k % 0.5) * 2;
        const x = (from.x + (to.x - from.x) * q) * TILE + TILE / 2, y = (from.y + (to.y - from.y) * q) * TILE + TILE / 2 - 8 - Math.sin(q * Math.PI) * 10;
        circle(ctx, x, y, 2, '#f4f7f9'); circle(ctx, x - 0.6, y - 0.6, 1, '#ffffff');
      } });
    }
    for (const h of this.hits) out.push({ y: h.y + 0.9, draw: (ctx) => { const k = 1 - h.ttl / 0.4; ctx.globalAlpha = 1 - k; for (let i = 0; i < 5; i++) circle(ctx, h.x * TILE + TILE / 2 + Math.cos(i * 1.26) * (3 + k * 8), h.y * TILE + TILE / 2 - 8 + Math.sin(i * 1.26) * (2 + k * 5), 1.5, '#ffffff'); ctx.globalAlpha = 1; } });
    void env;
    return out;
  }
}

function drawSnowman(ctx: CanvasRenderingContext2D, m: Snowman, env: Env): void {
  const px = m.x * TILE + TILE / 2, py = m.y * TILE + TILE / 2 + 5;
  groundShadow(ctx, px, py + 1, 7, 2.5, 0.2);
  circle(ctx, px, py - 5, 6.5, '#f4f7f9'); circle(ctx, px, py - 14, 4.8, '#f4f7f9'); circle(ctx, px, py - 21, 3.6, '#f4f7f9');
  circle(ctx, px - 2, py - 6, 5, '#ffffff'); circle(ctx, px - 1.5, py - 15, 3.6, '#ffffff'); circle(ctx, px - 1, py - 22, 2.6, '#ffffff');
  rect(ctx, px - 1.2, py - 22, 1.2, 1.2, '#1a1a1a'); rect(ctx, px + 0.8, py - 22, 1.2, 1.2, '#1a1a1a'); poly(ctx, [px + 0.5, py - 20.5, px + 4.5, py - 19.8, px + 0.5, py - 19.2], '#f08a30');
  for (let i = 0; i < 3; i++) rect(ctx, px - 0.6, py - 16 + i * 2.5, 1.2, 1.2, '#1a1a1a');
  line(ctx, px - 4, py - 14, px - 11, py - 19 + Math.sin(env.clock + m.seed) * 0.5, '#5a3a1e', 1.2); line(ctx, px + 4, py - 14, px + 11, py - 18, '#5a3a1e', 1.2);
  rect(ctx, px - 4, py - 25, 8, 1.2, '#2a2a2a'); rect(ctx, px - 2.5, py - 29, 5, 4.5, '#2a2a2a');
  const sc = ['#d84a4a', '#3a7ac0', '#4f9a3f'][m.seed % 3]; rect(ctx, px - 4.5, py - 11, 9, 2, sc); rect(ctx, px + 2, py - 11, 2, 5, sc);
}
