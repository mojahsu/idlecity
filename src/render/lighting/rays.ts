// Soft shafts of low sunlight around sunrise and sunset.
import type { Env } from '../palette';

export function drawRays(ctx: CanvasRenderingContext2D, env: Env, W: number, H: number): void {
  const f = env.dayFrac;
  const morning = f > 0.2 && f < 0.36, evening = f > 0.66 && f < 0.8;
  if ((!morning && !evening) || env.rainy || env.snowy) return;
  const k = morning ? 1 - Math.abs(f - 0.28) / 0.08 : 1 - Math.abs(f - 0.73) / 0.07;
  const a = Math.max(0, k) * 0.09;
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const fromX = morning ? W + 100 : -100;
  for (let i = 0; i < 5; i++) {
    const y0 = -40 + i * 90 + Math.sin(env.clock * 0.25 + i) * 20, w = 50 + (i % 2) * 30;
    const g = ctx.createLinearGradient(fromX, 0, morning ? 0 : W, 0);
    g.addColorStop(0, `rgba(255,220,150,${a})`); g.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(fromX, y0); ctx.lineTo(fromX, y0 + w); ctx.lineTo(morning ? 0 : W, y0 + w + 160); ctx.lineTo(morning ? 0 : W, y0 + 160 - w * 0.5); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
