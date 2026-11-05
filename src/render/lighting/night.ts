// Night: a dark layer with holes cut where lights are, then warm glows on top.
import type { LightSource } from '../buildings';
import { rgba, type Env } from '../palette';
import type { GlowDot } from './shared';

export function drawNight(ctx: CanvasRenderingContext2D, env: Env, W: number, H: number, lights: LightSource[], dots: GlowDot[], layer: HTMLCanvasElement): void {
  const dark = env.dark;
  if (layer.width !== W || layer.height !== H) { layer.width = W; layer.height = H; }
  const n = layer.getContext('2d')!;
  n.globalCompositeOperation = 'source-over';
  n.clearRect(0, 0, W, H);
  n.fillStyle = `rgba(10,16,55,${0.68 * dark})`;
  n.fillRect(0, 0, W, H);
  // Moonlight: slightly lighter band so the night isn't flat.
  const moon = n.createLinearGradient(0, 0, W, H);
  moon.addColorStop(0, `rgba(120,150,220,${0.08 * dark})`); moon.addColorStop(1, 'rgba(120,150,220,0)');
  n.fillStyle = moon; n.fillRect(0, 0, W, H);
  // Cut holes where lights are.
  n.globalCompositeOperation = 'destination-out';
  for (const l of lights) {
    const r = l.r * 0.9 * (1 + l.flicker * Math.sin(env.clock * 9 + l.x * 0.3));
    const g = n.createRadialGradient(l.x, l.y, 1, l.x, l.y, r);
    g.addColorStop(0, `rgba(0,0,0,${0.8 * dark})`); g.addColorStop(0.45, `rgba(0,0,0,${0.35 * dark})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    n.fillStyle = g; n.beginPath(); n.arc(l.x, l.y, r, 0, Math.PI * 2); n.fill();
  }
  for (const d of dots) {
    const g = n.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
    g.addColorStop(0, `rgba(0,0,0,${d.a * dark})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    n.fillStyle = g; n.beginPath(); n.arc(d.x, d.y, d.r, 0, Math.PI * 2); n.fill();
  }
  ctx.drawImage(layer, 0, 0);
  // Warm additive glow on top of the lights.
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    const r = l.r * 0.8 * (1 + l.flicker * Math.sin(env.clock * 9 + l.x * 0.3));
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
    g.addColorStop(0, rgba(l.color, 0.34 * dark)); g.addColorStop(0.6, rgba(l.color, 0.12 * dark)); g.addColorStop(1, rgba(l.color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l.x, l.y, r, 0, Math.PI * 2); ctx.fill();
  }
  for (const d of dots) {
    const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
    g.addColorStop(0, rgba(d.color, 0.3 * d.a * dark)); g.addColorStop(1, rgba(d.color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}
