// Sun-cast shadows that swing with the time of day.
import type { Env } from './env';

/**
 * Direction and length of shadows cast by the sun: long and pointing west at
 * sunrise, short at noon, long and pointing east at sunset. `alpha` fades them
 * out at night and under heavy cloud.
 */
export function sunShadow(env: Env): { sx: number; sy: number; alpha: number } {
  const k = Math.max(-1, Math.min(1, (env.dayFrac - 0.5) / 0.26));
  const len = 0.35 + 1.1 * Math.pow(Math.abs(k), 1.4);
  const alpha = 0.2 * (1 - env.dark) * (env.rainy || env.snowy ? 0.35 : env.foggy ? 0.6 : 1);
  return { sx: k * len, sy: 0.28 * len, alpha };
}

/** Shadow of an upright thing of width `w` and height `h` standing at (x, y). */
export function castShadow(ctx: CanvasRenderingContext2D, env: Env, x: number, y: number, w: number, h: number, round = false): void {
  const { sx, sy, alpha } = sunShadow(env);
  if (alpha <= 0.01) return;
  ctx.fillStyle = `rgba(10,20,10,${alpha})`;
  const tx = x + sx * h, ty = y + sy * h;
  if (round) {
    ctx.beginPath(); ctx.moveTo(x - w * 0.3, y); ctx.lineTo(x + w * 0.3, y); ctx.lineTo(tx + w * 0.3, ty); ctx.lineTo(tx - w * 0.3, ty); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(tx, ty, w * 0.55, w * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(tx + w / 2, ty); ctx.lineTo(tx - w / 2, ty); ctx.closePath(); ctx.fill();
  }
}
