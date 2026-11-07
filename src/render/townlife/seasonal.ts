// The season's special days and vignettes: seed scattered over the fields at
// sowing, the fishing contest's banner and crowd, summer night fireflies,
// winter riverbank ice skating, lantern strings on midwinter night, and the blizzard's wind.
import type { GameState } from '../../sim/types';
import { t } from '../../i18n';
import { TILE } from '../constants';
import type { LightSource } from '../buildings';
import { circle, ellipse, line, rect, rgba, type Env } from '../palette';
import { drawTownsfolk } from '../units';
import { bubble } from '../units/shared';
import type { Actor, Roads } from './shared';

interface Seed { x: number; y: number; vx: number; vy: number; ttl: number }
interface Gust { x: number; y: number; len: number; ttl: number; vx: number }
interface Firefly { x: number; y: number; vx: number; vy: number; phase: number; ttl: number }

export class Seasonal {
  private seeds: Seed[] = [];
  private gusts: Gust[] = [];
  private fireflies: Firefly[] = [];

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
    // Summer night fireflies drifting near trees and meadows.
    if (env.season === 'summer' && env.dark > 0.28 && !env.rainy && this.fireflies.length < 18 && Math.random() < dt * 5) {
      const fx = (3 + Math.random() * (s.width - 5)) * TILE;
      const fy = (2 + Math.random() * (s.height - 4)) * TILE;
      this.fireflies.push({ x: fx, y: fy, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 6, phase: Math.random() * 6.28, ttl: 5 + Math.random() * 5 });
    }
    for (const ff of this.fireflies) {
      ff.x += (ff.vx + Math.sin(env.clock * 2 + ff.phase) * 4) * dt;
      ff.y += (ff.vy + Math.cos(env.clock * 1.7 + ff.phase) * 3) * dt;
    }
    this.fireflies = this.fireflies.filter((ff) => (ff.ttl -= dt) > 0 && env.dark > 0.2);
  }

  actors(s: GameState, env: Env): Actor[] {
    const out: Actor[] = [];
    // Contest day: a banner on the bank and a small crowd behind the anglers in the afternoon.
    if (!s.raid && env.seasonal === 'fishing' && env.dayFrac > 0.48 && env.dayFrac < 0.8 && s.workers.length >= 2) {
      const anglers = s.workers.filter((w) => w.task?.kind === 'rest' && w.task.activity === 'fish');
      if (anglers.length) {
        const a = anglers[0];
        out.push({ y: a.y + 0.5, draw: (ctx, e) => { const px = (a.x + 1) * TILE + TILE / 2, py = a.y * TILE; rect(ctx, px - 0.6, py - 24, 1.2, 28, '#5a3a1e'); const wv = Math.sin(e.clock * 5) * 1.5; ctx.fillStyle = '#3a7ac0'; ctx.beginPath(); ctx.moveTo(px, py - 24); ctx.lineTo(px + 14, py - 22 + wv); ctx.lineTo(px + 12, py - 16); ctx.lineTo(px + 14, py - 10 + wv); ctx.lineTo(px, py - 8); ctx.closePath(); ctx.fill(); circle(ctx, px + 6, py - 16, 2, '#f4f0e6'); } });
        if (s.workers.length >= 4) {
          anglers.slice(0, 3).forEach((w, i) => out.push({ y: w.y + 0.8, draw: (ctx, e) => drawTownsfolk(ctx, w.x + 1.6, w.y + (i - 1) * 0.5, -1, false, e, 500 + i, { cheer: Math.sin(e.clock + i) > 0.6 }) }));
        }
      }
    }
    // Winter riverbank ice skating during the day (only once the settlement has multiple residents and no raid).
    if (!s.raid && env.season === 'winter' && env.dark < 0.45 && !env.storm && s.workers.length >= 3) {
      const iy = Math.max(3, Math.min(s.height - 4, s.center.y));
      let ix = 1.6;
      for (let x = 0; x < s.width; x++) if (s.tiles[iy * s.width + x]?.terrain === 'water') ix = x + 0.5;
      const hasKids = (s.children?.length ?? 0) > 0;
      out.push({
        y: iy + 0.65,
        draw: (ctx, e) => {
          const px = ix * TILE + TILE / 2, py = iy * TILE + TILE / 2;
          // Frozen ice sheet on the river edge with figure-eight skate marks.
          ellipse(ctx, px, py + 2, 16, 8, 'rgba(210,238,255,0.68)');
          ellipse(ctx, px, py + 2, 13, 6, 'rgba(235,248,255,0.55)');
          ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.ellipse(px - 4, py + 2, 5, 2.5, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(px + 4, py + 2, 5, 2.5, 0, 0, Math.PI * 2); ctx.stroke();
          for (let i = 0; i < 2; i++) {
            const ang = e.clock * 1.8 + i * Math.PI;
            const sx = ix + Math.sin(ang) * 0.42;
            const sy = iy + Math.sin(ang * 2) * 0.18;
            const dir = Math.cos(ang) >= 0 ? 1 : -1;
            drawTownsfolk(ctx, sx, sy, dir, true, e, 810 + i, { child: i === 1 && hasKids });
            if (i === 1 && (e.clock * 0.4) % 1 < 0.3) {
              bubble(ctx, sx * TILE + TILE / 2, sy * TILE + TILE / 2 - 16, '♪', 0.85, '#4088c8');
            }
          }
        },
      });
    }
    return out;
  }

  overlay(ctx: CanvasRenderingContext2D, env: Env, s: GameState): void {
    ctx.fillStyle = '#e8d080';
    for (const sd of this.seeds) rect(ctx, sd.x, sd.y, 1.2, 1.2, '#e8d080');
    // Summer night fireflies glowing above the darkness layer.
    for (const ff of this.fireflies) {
      const pulse = 0.45 + 0.55 * Math.sin(env.clock * 5 + ff.phase);
      const a = Math.min(1, ff.ttl) * pulse;
      circle(ctx, ff.x, ff.y, 3.2, rgba('#b8ff50', 0.28 * a));
      circle(ctx, ff.x, ff.y, 1.1, rgba('#eeff90', 0.95 * a));
    }
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
    for (const ff of this.fireflies) {
      out.push({ x: ff.x, y: ff.y, r: 9, color: '#c8ff60', flicker: 0.2 });
    }
    if (env.seasonal !== 'solstice' || env.dark <= 0.4) return out;
    for (const b of s.buildings) {
      if (!b.built || (b.type !== 'house' && b.type !== 'hut')) continue;
      const right = s.buildings.find((o) => o.built && o.x === b.x + 1 && o.y === b.y && (o.type === 'house' || o.type === 'hut'));
      if (right) out.push({ x: b.x * TILE + 24, y: b.y * TILE - 14, r: 18, color: '#ffb060', flicker: 0.08 });
    }
    return out;
  }
}
