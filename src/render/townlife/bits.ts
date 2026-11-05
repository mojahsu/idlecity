// Little coloured squares: confetti over a cheering crowd, sparks at the forge, petals at a wedding.
import { rect } from '../palette';

export interface Bit { x: number; y: number; vx: number; vy: number; ttl: number; color: string }

export class Bits {
  list: Bit[] = [];

  push(b: Bit): void { this.list.push(b); }

  update(dt: number): void {
    for (const b of this.list) { b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 50 * dt; b.vx *= 0.98; }
    this.list = this.list.filter((b) => (b.ttl -= dt) > 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const b of this.list) { ctx.globalAlpha = Math.min(1, b.ttl); rect(ctx, b.x - 1, b.y - 1, 2, 2, b.color); }
    ctx.globalAlpha = 1;
  }
}
