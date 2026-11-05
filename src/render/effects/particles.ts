// The particle pool every effect draws from: smoke, embers, weather, leaves,
// fireflies, debris, coins, fireworks. Capped so a storm never stalls a frame.
import { circle, ellipse, line, rect, rgba, type Env } from '../palette';

export type Kind = 'smoke' | 'ember' | 'spark' | 'leaf' | 'petal' | 'firefly' | 'rain' | 'snow' | 'splash' | 'chip' | 'dust' | 'rocket' | 'burst' | 'clash' | 'coin' | 'drop' | 'meteor' | 'mote' | 'butterfly';

export interface Particle {
  kind: Kind; x: number; y: number; vx: number; vy: number; ttl: number; life: number; size: number; color: string; spin: number;
}

const MAX_PARTICLES = 900;

export class Particles {
  list: Particle[] = [];
  /** Things that happened this frame that the soundtrack wants to know about. */
  events: string[] = [];

  spawn(kind: Kind, x: number, y: number, vx: number, vy: number, life: number, size: number, color: string, spin = Math.random() * 6.28): void {
    if (this.list.length >= MAX_PARTICLES) return;
    this.list.push({ kind, x, y, vx, vy, ttl: life, life, size, color, spin });
  }

  burst(x: number, y: number, color: string): void {
    const n = 26;
    for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + Math.random() * 0.2, sp = 45 + Math.random() * 25; this.spawn('burst', x, y, Math.cos(a) * sp, Math.sin(a) * sp, 1 + Math.random() * 0.5, 1.6, i % 3 ? color : '#ffffff'); }
  }

  /** Coins scatter when a party deposits loot. */
  coins(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) this.spawn('coin', x, y - 6, (Math.random() - 0.5) * 50, -50 - Math.random() * 30, 0.7, 1.4, '#f0d050');
  }

  /** Move every particle one step and drop the dead ones. */
  integrate(env: Env, dt: number): void {
  const keep: Particle[] = [];
  for (const p of this.list) {
    p.ttl -= dt;
    if (p.ttl <= 0) { if (p.kind === 'rain') this.spawn('splash', p.x, p.y, 0, 0, 0.25, 1.5, 'rgba(220,235,255,0.7)'); else if (p.kind === 'rocket') { this.burst(p.x, p.y, p.color); this.events.push('burst'); } continue; }
    switch (p.kind) {
      case 'smoke': p.vx += Math.sin(env.clock * 1.5 + p.spin) * 1.5 * dt; p.vy *= 0.995; p.size += 2.4 * dt; break;
      case 'ember': p.vy -= 10 * dt; p.vx += Math.sin(env.clock * 20 + p.spin) * 8 * dt; break;
      case 'leaf': case 'petal': p.vx += Math.sin(env.clock * 2 + p.spin) * 6 * dt; p.vy = Math.min(p.vy + 10 * dt, p.kind === 'leaf' ? 14 : 8); p.spin += dt * 4; break;
      case 'firefly': p.vx += (Math.sin(env.clock * 1.3 + p.spin) * 4 - p.vx * 0.5) * dt; p.vy += (Math.cos(env.clock * 1.1 + p.spin * 2) * 4 - p.vy * 0.5) * dt; break;
      case 'snow': p.vx = Math.sin(env.clock * 1.2 + p.spin) * 6; break;
      case 'chip': case 'coin': case 'drop': p.vy += 60 * dt; break;
      case 'burst': p.vy += 18 * dt; p.vx *= 0.985; p.vy *= 0.985; break;
      case 'rocket': p.vx += Math.sin(env.clock * 10 + p.spin) * 2 * dt; break;
      case 'dust': p.size += 3 * dt; break;
      case 'butterfly': p.vx += (Math.sin(env.clock * 1.7 + p.spin) * 14 - p.vx * 0.6) * dt; p.vy += (Math.cos(env.clock * 2.3 + p.spin * 1.3) * 10 - p.vy * 0.6) * dt; break;
      case 'mote': p.vy += Math.sin(env.clock + p.spin) * 2 * dt; break;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    keep.push(p);
  }
    this.list = keep;
  }

  /** Low particles: chips, dust, sparks, clashes, coins. Drawn right above the units. */
  drawLow(ctx: CanvasRenderingContext2D): void {
    for (const p of this.list) {
      const a = Math.min(1, p.ttl / p.life * 2);
      switch (p.kind) {
        case 'chip': case 'coin': ctx.fillStyle = p.color; ctx.globalAlpha = a; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); break;
        case 'drop': ctx.globalAlpha = a * 0.9; circle(ctx, p.x, p.y, p.size * 0.8, p.color); break;
        case 'dust': ctx.globalAlpha = a * 0.6; circle(ctx, p.x, p.y, p.size, p.color); break;
        case 'spark': case 'clash': ctx.globalAlpha = a; line(ctx, p.x, p.y, p.x - p.vx * 0.03, p.y - p.vy * 0.03, p.color, 1.5); break;
        default: continue;
      }
      ctx.globalAlpha = 1;
    }
  }

  /** High particles: smoke, embers, leaves, petals, fireflies, fireworks. */
  drawHigh(ctx: CanvasRenderingContext2D, env: Env): void {
    for (const p of this.list) {
      const k = p.ttl / p.life;
      switch (p.kind) {
        case 'smoke': ctx.globalAlpha = Math.min(0.45, k * 0.6) * (1 - Math.pow(1 - k, 3)); circle(ctx, p.x, p.y, p.size, p.color); break;
        case 'ember': ctx.globalAlpha = k; circle(ctx, p.x, p.y, p.size * k + 0.4, p.color); break;
        case 'leaf': ctx.globalAlpha = Math.min(1, k * 3); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin); ellipse(ctx, 0, 0, p.size * 1.6, p.size * 0.9, p.color); ctx.restore(); break;
        case 'petal': ctx.globalAlpha = Math.min(1, k * 3); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin); ellipse(ctx, 0, 0, p.size * 1.4, p.size * 0.8, p.color); ctx.restore(); break;
        case 'firefly': { const bl = 0.5 + 0.5 * Math.sin(env.clock * 6 + p.spin * 7); ctx.globalAlpha = Math.min(1, k * 3) * bl; circle(ctx, p.x, p.y, 2.5, rgba('#e8ff80', 0.35)); circle(ctx, p.x, p.y, 1, '#f8ffb0'); break; }
        case 'butterfly': { const flap = Math.abs(Math.sin(env.clock * 14 + p.spin)); ctx.globalAlpha = Math.min(1, k * 4, (1 - k) * 4 + 0.2); const d = Math.sign(p.vx) || 1; ellipse(ctx, p.x - d * 1.6 * flap, p.y, 1.7 * flap + 0.3, 1.3, p.color); ellipse(ctx, p.x + d * 1.6 * flap, p.y, 1.7 * flap + 0.3, 1.3, p.color); rect(ctx, p.x - 0.4, p.y - 1.2, 0.8, 2.4, '#3a2a1a'); break; }
        case 'mote': { const tw = 0.5 + 0.5 * Math.sin(env.clock * 5 + p.spin * 9); ctx.globalAlpha = Math.min(1, k * 3) * tw * 0.7; circle(ctx, p.x, p.y, 1.1, p.color); break; }
        case 'rocket': ctx.globalAlpha = 1; circle(ctx, p.x, p.y, 1.5, '#fff8d0'); line(ctx, p.x, p.y, p.x - p.vx * 0.05, p.y - p.vy * 0.05, rgba('#ffd080', 0.7), 1.2); break;
        case 'burst': ctx.globalAlpha = k; circle(ctx, p.x, p.y, p.size * (0.6 + k * 0.6), p.color); break;
        default: continue;
      }
      ctx.globalAlpha = 1;
    }
  }

  /** Positions of glowing particles for the night pass. */
  nightLights(): { x: number; y: number; r: number; color: string; a: number }[] {
    const out: { x: number; y: number; r: number; color: string; a: number }[] = [];
    for (const p of this.list) {
      if (p.kind === 'firefly') out.push({ x: p.x, y: p.y, r: 10, color: '#e8ff80', a: 0.5 });
      else if (p.kind === 'burst') out.push({ x: p.x, y: p.y, r: 8, color: p.color, a: 0.5 * p.ttl / p.life });
      else if (p.kind === 'rocket') out.push({ x: p.x, y: p.y, r: 10, color: '#ffe0a0', a: 0.6 });
      else if (p.kind === 'ember' && p.life > 0.65) out.push({ x: p.x, y: p.y, r: 6, color: '#ff9040', a: 0.35 * p.ttl / p.life });
    }
    return out;
  }
}
