// The season's special days: seed scattered over the fields at sowing, the
// fishing contest's banner and crowd, lantern strings and window candles on
// midwinter night, and the blizzard's wind.
import type { GameState } from '../../sim/types';
import { t } from '../../i18n';
import { TILE } from '../constants';
import type { LightSource } from '../buildings';
import { circle, line, rect, rgba, type Env } from '../palette';
import { drawTownsfolk } from '../units';
import type { Actor, Roads } from './shared';

interface Seed { x: number; y: number; vx: number; vy: number; ttl: number }
interface Gust { x: number; y: number; len: number; ttl: number; vx: number }

export class Seasonal {
  private seeds: Seed[] = [];
  private gusts: Gust[] = [];

  update(s: GameState, env: Env, dt: number, roads: Roads): void {
    void roads;
    if (env.seasonal === 'sowing' && env.dark < 0.4) {
      const farms = s.buildings.filter((b) => b.built && b.type === 'farm');
      for (const f of farms) if (Math.random() < dt * 6) this.seeds.push({ x: f.x * TILE + 4 + Math.random() * 16, y: f.y * TILE + 2 + Math.random() * 10, vx: (Math.random() - 0.5) * 20, vy: -14 - Math.random() * 10, ttl: 0.8 });
    }
    for (const sd of this.seeds) { sd.x += sd.vx * dt; sd.y += sd.vy * dt; sd.vy += 60 * dt; }
    this.seeds = this.seeds.filter((sd) => (sd.ttl -= dt) > 0);
    if (env.seasonal === 'blizzard') {
      const W = s.width * TILE, H = s.height * TILE;
      if (Math.random() < dt * 18) this.gusts.push({ x: -40, y: Math.random() * H, len: 30 + Math.random() * 60, ttl: (W + 100) / 320, vx: 320 });
    }
    for (const g of this.gusts) { g.x += g.vx * dt; g.y += 25 * dt; }
    this.gusts = this.gusts.filter((g) => (g.ttl -= dt) > 0);
  }

  actors(s: GameState, env: Env): Actor[] {
    const out: Actor[] = [];
    // Contest day: a banner on the bank and a small crowd behind the anglers in the afternoon.
    if (env.seasonal === 'fishing' && env.dayFrac > 0.48 && env.dayFrac < 0.8) {
      const anglers = s.workers.filter((w) => w.task?.kind === 'rest' && w.task.activity === 'fish');
      if (anglers.length) {
        const a = anglers[0];
        out.push({ y: a.y + 0.5, draw: (ctx, e) => { const px = (a.x + 1) * TILE + TILE / 2, py = a.y * TILE; rect(ctx, px - 0.6, py - 24, 1.2, 28, '#5a3a1e'); const wv = Math.sin(e.clock * 5) * 1.5; ctx.fillStyle = '#3a7ac0'; ctx.beginPath(); ctx.moveTo(px, py - 24); ctx.lineTo(px + 14, py - 22 + wv); ctx.lineTo(px + 12, py - 16); ctx.lineTo(px + 14, py - 10 + wv); ctx.lineTo(px, py - 8); ctx.closePath(); ctx.fill(); circle(ctx, px + 6, py - 16, 2, '#f4f0e6'); } });
        anglers.slice(0, 3).forEach((w, i) => out.push({ y: w.y + 0.8, draw: (ctx, e) => drawTownsfolk(ctx, w.x + 1.6, w.y + (i - 1) * 0.5, -1, false, e, 500 + i, { cheer: Math.sin(e.clock + i) > 0.6 }) }));
      }
    }
    return out;
  }

  overlay(ctx: CanvasRenderingContext2D, env: Env, s: GameState): void {
    ctx.fillStyle = '#e8d080';
    for (const sd of this.seeds) rect(ctx, sd.x, sd.y, 1.2, 1.2, '#e8d080');
    if (env.seasonal === 'solstice' && env.dark > 0.4) {
      // Lantern strings between neighbouring houses.
      for (const b of s.buildings) {
        if (!b.built || (b.type !== 'house' && b.type !== 'hut')) continue;
        const right = s.buildings.find((o) => o.built && o.x === b.x + 1 && o.y === b.y && (o.type === 'house' || o.type === 'hut'));
        if (!right) continue;
        const x1 = b.x * TILE + 12, x2 = right.x * TILE + 12, y = b.y * TILE - 16;
        line(ctx, x1, y, x2, y + 3, 'rgba(60,40,20,0.8)', 1);
        for (let k = 1; k < 4; k++) { const q = k / 4, lx = x1 + (x2 - x1) * q, ly = y + 3 * q + Math.sin(q * Math.PI) * 3 + Math.sin(env.clock * 3 + k + b.x) * 1; const col = k % 2 ? '#ff8040' : '#ffd040'; rect(ctx, lx - 1.5, ly, 3, 4, col); circle(ctx, lx, ly + 2, 6, rgba(col, 0.2)); }
      }
      if (env.dayFrac > 0.8 && env.dayFrac < 0.86) { const c = s.center, cx = c.x * TILE + TILE / 2, cy = c.y * TILE - 30; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(t('log.solstice').split(/[:：]/)[0], cx, cy); ctx.fillStyle = '#ffd060'; ctx.fillText(t('log.solstice').split(/[:：]/)[0], cx, cy); }
    }
    if (env.seasonal === 'blizzard') {
      const W = s.width * TILE, H = s.height * TILE;
      ctx.fillStyle = 'rgba(230,236,245,0.28)'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.2;
      for (const g of this.gusts) { ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x - g.len, g.y - g.len * 0.08); ctx.stroke(); }
    }
  }

  lights(s: GameState, env: Env): LightSource[] {
    const out: LightSource[] = [];
    if (env.seasonal !== 'solstice' || env.dark <= 0.4) return out;
    for (const b of s.buildings) {
      if (!b.built || (b.type !== 'house' && b.type !== 'hut')) continue;
      const right = s.buildings.find((o) => o.built && o.x === b.x + 1 && o.y === b.y && (o.type === 'house' || o.type === 'hut'));
      if (right) out.push({ x: b.x * TILE + 24, y: b.y * TILE - 14, r: 18, color: '#ffb060', flicker: 0.08 });
    }
    return out;
  }
}
