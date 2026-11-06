// Drifting overhead cloud shadows that sweep softly across the town by day,
// giving the terrain HD-2D depth and living atmospheric motion.
import type { Env } from '../palette';

export function drawCloudShadows(ctx: CanvasRenderingContext2D, env: Env, W: number, H: number): void {
  if (env.rainy || env.snowy || env.dark > 0.65) return;
  const vis = Math.max(0, 1 - env.dark * 1.4);
  if (vis <= 0.02) return;
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const span = W + 340;
    const cx = ((env.clock * (4.2 + (i % 2) * 1.3) + i * 215) % span) - 170;
    const cy = ((i * 137 + Math.sin(env.clock * 0.08 + i) * 35) % (H + 60)) - 30;
    const rx = 95 + (i % 3) * 32;
    const ry = 42 + (i % 2) * 18;
    const g = ctx.createRadialGradient(cx, cy, rx * 0.15, cx, cy, rx);
    g.addColorStop(0, `rgba(12, 22, 42, ${0.095 * vis})`);
    g.addColorStop(0.6, `rgba(12, 22, 42, ${0.045 * vis})`);
    g.addColorStop(1, 'rgba(12, 22, 42, 0)');
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
