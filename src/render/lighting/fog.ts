// Morning fog drifting across the map.
import type { Env } from '../palette';

export function drawFog(ctx: CanvasRenderingContext2D, env: Env, W: number, H: number): void {
  const k = 1 - Math.abs(env.dayFrac - 0.28) / 0.08; // fades in and out over the morning
  const a = Math.max(0, Math.min(1, k));
  if (a <= 0) return;
  ctx.fillStyle = `rgba(225,232,240,${0.16 * a})`; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 5; i++) {
    const x = ((env.clock * (6 + i * 2) + i * 230) % (W + 300)) - 150, y = H * (0.15 + i * 0.18) + Math.sin(env.clock * 0.3 + i) * 20;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 170);
    g.addColorStop(0, `rgba(235,240,245,${0.22 * a})`); g.addColorStop(1, 'rgba(235,240,245,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, 170, 60, 0, 0, Math.PI * 2); ctx.fill();
  }
}
