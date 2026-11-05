// A funeral walks from the tavern to each new grave.
import type { GameState, Point } from '../../sim/types';
import { findPath } from '../../sim/world';
import { TILE } from '../constants';
import { rect } from '../palette';
import { drawTownsfolk } from '../units';
import type { Actor } from './shared';

export interface Procession { pts: Point[]; d: number; len: number; mourn: number; fade: number; seeds: number[] }

export class Processions {
  private processions: Procession[] = [];
  private graves = -1;

  /** A funeral walks from the tavern to each new grave. */
  update(s: GameState, dt: number): void {
    const graves = s.buildings.filter((b) => b.type === 'grave');
    if (this.graves < 0) this.graves = graves.length;
    if (graves.length > this.graves) {
      const tav = s.buildings.find((b) => b.built && b.type === 'tavern') ?? s.center;
      const g = graves[graves.length - 1];
      const pts = [{ x: tav.x, y: tav.y + 1 }, ...findPath(s, { x: tav.x, y: tav.y + 1 }, g)];
      let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (len > 1) this.processions.push({ pts, d: 0, len, mourn: 7, fade: 0, seeds: [g.id * 7, g.id * 7 + 1, g.id * 7 + 2, g.id * 7 + 3] });
    }
    this.graves = graves.length;
    for (const pr of this.processions) {
      if (pr.d < pr.len + 2.1) { pr.d += 0.9 * dt; pr.fade = Math.min(1, pr.fade + dt); }
      else if (pr.mourn > 0) pr.mourn -= dt;
      else pr.fade -= dt;
    }
    this.processions = this.processions.filter((pr) => pr.fade > 0 || pr.mourn > 0);
  }

  actors(): Actor[] {
    const out: Actor[] = [];
    for (const pr of this.processions) {
      pr.seeds.forEach((seed, i) => {
        const pos = alongPath(pr.pts, pr.d - i * 0.7);
        const moving = pr.d < pr.len + 2.1;
        out.push({ y: pos.y + 0.8, draw: (ctx, env) => { ctx.globalAlpha = Math.max(0, Math.min(1, pr.fade)); drawTownsfolk(ctx, pos.x, pos.y, pos.dir, moving, env, seed, { tunic: i === 0 ? '#1e1e26' : '#2e2e3a' }); if (i === 0 && moving) { const px = pos.x * TILE + TILE / 2, py = pos.y * TILE + TILE / 2 - 4; rect(ctx, px - 7, py, 14, 2.5, '#5a3a1e'); rect(ctx, px - 5, py - 2.5, 10, 2.5, '#e8e0d0'); } ctx.globalAlpha = 1; } });
      });
    }
    return out;
  }
}

/** Position and facing at distance `d` along a polyline of tile points. */
function alongPath(pts: Point[], d: number): { x: number; y: number; dir: number } {
  if (d <= 0 || pts.length < 2) return { x: pts[0].x, y: pts[0].y, dir: 1 };
  let left = d;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], seg = Math.hypot(b.x - a.x, b.y - a.y);
    const dir = b.x > a.x ? 1 : b.x < a.x ? -1 : 1;
    if (left <= seg) { const q = left / seg; return { x: a.x + (b.x - a.x) * q, y: a.y + (b.y - a.y) * q, dir }; }
    left -= seg;
  }
  const last = pts[pts.length - 1], prev = pts[pts.length - 2];
  return { x: last.x, y: last.y, dir: last.x >= prev.x ? 1 : -1 };
}
