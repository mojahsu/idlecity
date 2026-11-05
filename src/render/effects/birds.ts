// Flocks crossing the map.
import type { Env } from '../palette';

interface Bird { x: number; y: number; vx: number; phase: number }

export class Birds {
  private birds: Bird[] = [];
  private birdTimer = 12;

  update(env: Env, dt: number, W: number, H: number): void {
    this.birdTimer -= dt;
    if (this.birdTimer <= 0 && env.dark < 0.4 && !env.rainy) {
      this.birdTimer = (env.season === 'winter' ? 60 : 25) + Math.random() * 25;
      const dir = Math.random() < 0.5 ? 1 : -1, n = 3 + Math.floor(Math.random() * 4), y = 20 + Math.random() * (H * 0.5);
      for (let i = 0; i < n; i++) this.birds.push({ x: dir > 0 ? -20 - i * 9 : W + 20 + i * 9, y: y + (i % 2) * 6 + i * 2, vx: dir * (38 + Math.random() * 8), phase: Math.random() * 6 });
    }
    for (const b of this.birds) { b.x += b.vx * dt; b.y += Math.sin(env.clock * 0.7 + b.phase) * 3 * dt; }
    this.birds = this.birds.filter((b) => b.x > -40 && b.x < W + 40);
  }

  draw(ctx: CanvasRenderingContext2D, env: Env): void {
    for (const b of this.birds) {
      const flap = Math.sin(env.clock * 12 + b.phase) * 3;
      const d = Math.sign(b.vx);
      ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1.2; ctx.beginPath();
      ctx.moveTo(b.x - 4 * d, b.y - flap); ctx.quadraticCurveTo(b.x - 1 * d, b.y + 1, b.x, b.y); ctx.quadraticCurveTo(b.x + 1 * d, b.y + 1, b.x + 4 * d, b.y - flap); ctx.stroke();
    }
  }
}
