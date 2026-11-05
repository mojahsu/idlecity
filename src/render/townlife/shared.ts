// Shared by every town-life subsystem: the walker record, the actor shape the
// renderer sorts, and the road network people wander along.
import type { GameState, Point } from '../../sim/types';
import { isPassable } from '../../sim/world';
import type { Env } from '../palette';
import { drawTownsfolk, type TownsfolkOpts } from '../units';

export interface Walker { x: number; y: number; tx: number; ty: number; px: number; py: number; seed: number; ttl: number; speed: number; basket: boolean; child: boolean; fade: number; opts?: TownsfolkOpts }

export type Actor = { y: number; draw: (ctx: CanvasRenderingContext2D, env: Env) => void };

/** A villager walking the streets, drawn with their fade. */
export function walkerActor(w: Walker): Actor {
  return { y: w.y + 0.8, draw: (ctx, env) => { ctx.globalAlpha = w.fade; drawTownsfolk(ctx, w.x, w.y, w.tx >= w.x ? 1 : -1, Math.hypot(w.tx - w.x, w.ty - w.y) > 0.02, env, w.seed, w.opts ?? { child: w.child, basket: w.basket }); ctx.globalAlpha = 1; } };
}

/** The road tiles, refreshed when buildings change, and random walks along them. */
export class Roads {
  private roads: number[] = [];
  private roadStamp = -1;

  refresh(s: GameState): void {
    const stamp = s.buildings.length * 1000 + s.stats.built;
    if (stamp === this.roadStamp) return;
    this.roadStamp = stamp;
    this.roads = [];
    for (let i = 0; i < s.tiles.length; i++) if (s.tiles[i].terrain === 'road') this.roads.push(i);
  }

  /** Random walk along road tiles, never doubling straight back. Returns false when stuck. */
  step(s: GameState, w: Walker, dt: number): boolean {
    const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
    if (d < 0.01) {
      const opts: [number, number][] = [];
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
        const nx = w.tx + ox, ny = w.ty + oy;
        const tile = s.tiles[ny * s.width + nx];
        if (nx < 0 || ny < 0 || nx >= s.width || ny >= s.height || !tile || tile.terrain !== 'road') continue;
        if (nx === w.px && ny === w.py && Math.random() < 0.85) continue;
        opts.push([nx, ny]);
      }
      if (!opts.length) return false;
      const [nx, ny] = opts[Math.floor(Math.random() * opts.length)];
      w.px = w.tx; w.py = w.ty; w.tx = nx; w.ty = ny;
      return true;
    }
    const sp = Math.min(d, w.speed * dt);
    w.x += dx / d * sp; w.y += dy / d * sp;
    return true;
  }

  spawnWalker(s: GameState, child: boolean, speed: number, near?: { x: number; y: number }): Walker | null {
    if (this.roads.length < 8) return null;
    let i = this.roads[Math.floor(Math.random() * this.roads.length)];
    if (near) {
      // Prefer a road tile close to the given spot.
      let best = Infinity;
      for (let k = 0; k < 12; k++) { const j = this.roads[Math.floor(Math.random() * this.roads.length)]; const d = Math.hypot(j % s.width - near.x, Math.floor(j / s.width) - near.y); if (d < best) { best = d; i = j; } }
    }
    const x = i % s.width, y = Math.floor(i / s.width);
    return { x, y, tx: x, ty: y, px: -1, py: -1, seed: Math.floor(Math.random() * 1e6), ttl: 18 + Math.random() * 25, speed, basket: Math.random() < 0.4, child, fade: 0 };
  }

  /** Free tiles around a spot, nearest first (for crowds that must not stand in buildings). */
  freeTilesAround(s: GameState, at: Point, n: number): Point[] {
    const out: Point[] = [];
    for (let r = 1; r <= 3 && out.length < n; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = at.x + dx, y = at.y + dy;
      if (isPassable(s, x, y) && s.tiles[y * s.width + x].terrain !== 'water') out.push({ x, y });
    }
    return out.slice(0, n);
  }
}
