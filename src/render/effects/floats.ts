// Floating text (+5 wood, +120g) rising from where it happened.
import { TILE } from '../constants';

export interface FloatText { x: number; y: number; text: string; color: string; ttl: number }

export class Floats {
  list: FloatText[] = [];

  update(dt: number): void { this.list = this.list.filter((f) => (f.ttl -= dt) > 0); }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'center';
    for (const f of this.list) {
      const k = 1 - f.ttl / 1.6; // 0 → 1 over its life
      const rise = (1 - Math.pow(1 - k, 2)) * 22;
      const px = f.x * TILE + TILE / 2, py = f.y * TILE - 2 - rise;
      ctx.globalAlpha = f.ttl < 0.5 ? f.ttl * 2 : 1;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineJoin = 'round'; ctx.strokeText(f.text, px, py);
      ctx.fillStyle = f.color; ctx.fillText(f.text, px, py);
    }
    ctx.globalAlpha = 1;
  }
}
