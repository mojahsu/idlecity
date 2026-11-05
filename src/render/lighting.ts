// Time-of-day colour grading, night darkness with light cut-outs and glows,
// morning fog, rain gloom and a soft vignette.
import type { GameState } from '../sim/types';
import type { LightSource } from './buildings';
import { rgba, skyTint, type Env } from './palette';

export interface GlowDot { x: number; y: number; r: number; color: string; a: number }

export class Lighting {
  private night = document.createElement('canvas');

  draw(ctx: CanvasRenderingContext2D, s: GameState, env: Env, W: number, H: number, lights: LightSource[], dots: GlowDot[]): void {
    const tint = skyTint(env);
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); }
    if (env.rainy) { ctx.fillStyle = 'rgba(40,50,80,0.2)'; ctx.fillRect(0, 0, W, H); }
    if (env.dark > 0) this.drawNight(ctx, env, W, H, lights, dots);
    if (env.foggy) this.drawFog(ctx, env, W, H);
    void s;
  }

  private drawNight(ctx: CanvasRenderingContext2D, env: Env, W: number, H: number, lights: LightSource[], dots: GlowDot[]): void {
    const dark = env.dark;
    if (this.night.width !== W || this.night.height !== H) { this.night.width = W; this.night.height = H; }
    const n = this.night.getContext('2d')!;
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
    ctx.drawImage(this.night, 0, 0);
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

  private drawFog(ctx: CanvasRenderingContext2D, env: Env, W: number, H: number): void {
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
}

export function drawVignette(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
