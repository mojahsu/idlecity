// Volumetric shafts of sunlight ("God Rays") and floating golden dust motes.
import { circle, type Env } from '../palette';

export function drawRays(ctx: CanvasRenderingContext2D, env: Env, W: number, H: number): void {
  const f = env.dayFrac;
  const morning = f > 0.18 && f < 0.38, evening = f > 0.64 && f < 0.82;
  const midday = f >= 0.38 && f <= 0.64;
  if ((!morning && !evening && !midday) || env.rainy || env.snowy) return;
  const k = morning
    ? 1 - Math.abs(f - 0.28) / 0.1
    : evening
      ? 1 - Math.abs(f - 0.73) / 0.09
      : 0.38;
  const a = Math.max(0, k) * (midday ? 0.055 : 0.115);
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const fromRight = morning || midday;
  const fromX = fromRight ? W + 90 : -90;
  const col = evening ? '255,195,125' : '255,232,170';
  for (let i = 0; i < 6; i++) {
    const y0 = -50 + i * 82 + Math.sin(env.clock * 0.22 + i) * 22, w = 44 + (i % 3) * 24;
    const g = ctx.createLinearGradient(fromX, 0, fromRight ? 0 : W, 0);
    g.addColorStop(0, `rgba(${col},${a})`);
    g.addColorStop(0.55, `rgba(${col},${a * 0.45})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.beginPath();
    ctx.moveTo(fromX, y0); ctx.lineTo(fromX, y0 + w);
    ctx.lineTo(fromRight ? 0 : W, y0 + w + 165);
    ctx.lineTo(fromRight ? 0 : W, y0 + 165 - w * 0.45);
    ctx.closePath(); ctx.fill();
  }
  // Sunlit atmospheric dust motes floating through the shafts of light.
  const moteA = Math.min(0.55, a * 4.2);
  for (let i = 0; i < 22; i++) {
    const mx = ((i * 97 + env.clock * (3.2 + (i % 3)) + Math.sin(env.clock * 0.7 + i) * 14) % (W - 20)) + 10;
    const my = ((i * 61 - env.clock * 1.8 + Math.cos(env.clock * 0.5 + i * 1.3) * 10) % (H - 20) + H) % (H - 20) + 10;
    const pulse = 0.4 + 0.6 * Math.sin(env.clock * 2.3 + i * 1.7);
    circle(ctx, mx, my, 0.9 + (i % 2) * 0.4, `rgba(255,244,200,${moteA * pulse})`);
  }
  ctx.restore();
}
