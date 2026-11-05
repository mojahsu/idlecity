// A market cart that trundles along the roads by day.
import type { GameState } from '../../sim/types';
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, line, groundShadow, hash, type Env } from '../palette';
import type { Actor } from './shared';

interface Cart { x: number; y: number; tx: number; ty: number; px: number; py: number; wheel: number }

export class MarketCart {
  private cart: Cart | null = null;
  private cartTimer = 0;

  update(s: GameState, env: Env, dt: number): void {
    const market = s.buildings.find((b) => b.built && b.type === 'market');
    const roads: number[] = [];
    if (market && env.dark < 0.6) {
      if (!this.cart) {
        this.cartTimer -= dt;
        if (this.cartTimer <= 0) {
          for (let i = 0; i < s.tiles.length; i++) if (s.tiles[i].terrain === 'road') roads.push(i);
          if (roads.length > 6) { const i = roads[Math.floor(Math.random() * roads.length)]; const x = i % s.width, y = Math.floor(i / s.width); this.cart = { x, y, tx: x, ty: y, px: -1, py: -1, wheel: 0 }; }
          this.cartTimer = 20 + Math.random() * 30;
        }
        return;
      }
      const c = this.cart;
      const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
      if (d < 0.01) {
        const opts: [number, number][] = [];
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
          const nx = c.tx + ox, ny = c.ty + oy;
          if (nx < 0 || ny < 0 || nx >= s.width || ny >= s.height) continue;
          if (s.tiles[ny * s.width + nx].terrain !== 'road') continue;
          if (nx === c.px && ny === c.py && Math.random() < 0.9) continue;
          opts.push([nx, ny]);
        }
        if (!opts.length) { this.cart = null; this.cartTimer = 15; return; }
        const [nx, ny] = opts[Math.floor(Math.random() * opts.length)];
        c.px = c.tx; c.py = c.ty; c.tx = nx; c.ty = ny;
      } else { const sp = Math.min(d, 0.75 * dt); c.x += dx / d * sp; c.y += dy / d * sp; c.wheel += sp * 6; }
    } else if (this.cart) { this.cart = null; this.cartTimer = 10; }
  }

  actors(): Actor[] {
    if (!this.cart) return [];
    const c = this.cart;
    return [{ y: c.y + 0.3, draw: (ctx, env) => drawCart(ctx, c, env) }];
  }
}

function drawCart(ctx: CanvasRenderingContext2D, c: Cart, env: Env): void {
  const px = c.x * TILE + TILE / 2, py = c.y * TILE + TILE / 2 + 6;
  const dir = c.tx > c.x ? 1 : c.tx < c.x ? -1 : 1;
  groundShadow(ctx, px, py + 1, 11, 2.5, 0.25);
  ctx.save(); ctx.translate(px, py); ctx.scale(dir, 1);
  // Horse.
  const trot = Math.sin(c.wheel * 2) * 1.2;
  ellipse(ctx, 7, -6, 5.5, 3.2, '#7a4a2a'); rect(ctx, 11, -10, 3, 5, '#7a4a2a'); poly(ctx, [11, -10, 12, -12.5, 13, -10], '#7a4a2a');
  for (let k = 0; k < 4; k++) rect(ctx, 3 + k * 2.6, -4, 1.2, 4 + (k % 2 ? trot : -trot), '#5a3a1e');
  poly(ctx, [2, -7, -1, -9, 1, -5], '#3a2a1a');
  // Cart.
  rect(ctx, -9, -9, 10, 6, '#a8824c'); rect(ctx, -9, -9, 10, 1.2, '#c9a062'); line(ctx, -9, -6, 1, -6, '#6b4a2b', 0.8);
  ellipse(ctx, -5, -11, 4, 2.2, '#d8c090'); circle(ctx, -3, -11.5, 1.2, '#d83a4a'); circle(ctx, -6.5, -11.2, 1.2, '#f7d94c');
  line(ctx, 1, -5, 4, -5, '#5a3a1e', 1.2);
  for (const wx of [-6, -1]) { circle(ctx, wx, -2, 2.6, '#3a2a1a'); ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(wx - Math.cos(c.wheel) * 2.2, -2 - Math.sin(c.wheel) * 2.2); ctx.lineTo(wx + Math.cos(c.wheel) * 2.2, -2 + Math.sin(c.wheel) * 2.2); ctx.moveTo(wx - Math.sin(c.wheel) * 2.2, -2 + Math.cos(c.wheel) * 2.2); ctx.lineTo(wx + Math.sin(c.wheel) * 2.2, -2 - Math.cos(c.wheel) * 2.2); ctx.stroke(); }
  ctx.restore();
  void env; void hash;
}
