// What is in the sky: lightning and its flash, the rainbow after rain, shooting
// stars, the moon and the winter aurora. Also draws the falling rain and snow.
import { circle, ellipse, line, rgba, type Env } from '../palette';
import type { Particles } from './particles';

interface Bolt { pts: number[]; ttl: number }

export class Sky {
  private boltTimer = 6;
  private bolts: Bolt[] = [];
  private flash = 0;
  private meteorTimer = 20;

  /** Lightning in storms, shooting stars on clear nights. */
  updateSky(env: Env, dt: number, W: number, H: number, P: Particles): void {
    this.flash = Math.max(0, this.flash - dt * 4);
    this.bolts = this.bolts.filter((b) => (b.ttl -= dt) > 0);
    if (env.storm) {
      this.boltTimer -= dt;
      if (this.boltTimer <= 0) {
        this.boltTimer = 6 + Math.random() * 18;
        this.flash = 1;
        P.events.push('lightning');
        const pts: number[] = [];
        let x = 60 + Math.random() * (W - 120), y = -10;
        const endY = H * (0.25 + Math.random() * 0.5);
        while (y < endY) { pts.push(x, y); x += (Math.random() - 0.5) * 28; y += 12 + Math.random() * 16; }
        pts.push(x, endY);
        this.bolts.push({ pts, ttl: 0.28 });
        // A short side branch.
        const k = 2 * Math.floor(pts.length / 4);
        const bp = [pts[k], pts[k + 1], pts[k] + (Math.random() - 0.5) * 50, pts[k + 1] + 30 + Math.random() * 30];
        this.bolts.push({ pts: bp, ttl: 0.18 });
      }
    } else this.boltTimer = Math.min(this.boltTimer, 4);
    if (env.clearNight) {
      this.meteorTimer -= dt;
      if (this.meteorTimer <= 0) {
        this.meteorTimer = 14 + Math.random() * 40;
        const x = Math.random() * W, y = Math.random() * H * 0.45;
        const a = 0.5 + Math.random() * 0.6, sp = 260 + Math.random() * 120, d = Math.random() < 0.5 ? 1 : -1;
        P.spawn('meteor', x, y, Math.cos(a) * sp * d, Math.sin(a) * sp * 0.5, 0.45 + Math.random() * 0.3, 1.6, '#fff8e0');
      }
    }
  }

  /** A rainbow after the rain, drawn before the lighting pass. */
  drawRainbow(ctx: CanvasRenderingContext2D, env: Env, W: number, H: number): void {
    if (env.rainbow <= 0) return;
    const cx = W * 0.55, cy = H * 1.15, r0 = H * 0.95;
    const colors = ['#ff4040', '#ff9a30', '#f7e040', '#50c850', '#40a0ff', '#8060e0'];
    ctx.save(); ctx.globalAlpha = 0.22 * env.rainbow; ctx.lineWidth = 5;
    colors.forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(cx, cy, r0 - i * 5, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); });
    ctx.restore();
  }

  /** Things in the sky that must stay bright at night: the storm flash, shooting stars, the aurora. */
  drawSky(ctx: CanvasRenderingContext2D, env: Env, W: number, H: number, P: Particles): void {
    if (this.flash > 0) { ctx.fillStyle = `rgba(235,240,255,${0.55 * this.flash * this.flash})`; ctx.fillRect(0, 0, W, H); }
    if (env.dark > 0.3 && !env.rainy && !env.snowy) this.drawMoon(ctx, env, W);
    if (env.clearNight && env.season === 'winter' && env.day % 2 === 0) this.drawAurora(ctx, env, W, H);
    for (const p of P.list) {
      if (p.kind !== 'meteor') continue;
      const k = p.ttl / p.life;
      ctx.globalAlpha = Math.min(1, k * 2);
      const tail = 0.12;
      const g = ctx.createLinearGradient(p.x, p.y, p.x - p.vx * tail, p.y - p.vy * tail);
      g.addColorStop(0, 'rgba(255,250,230,0.95)'); g.addColorStop(1, 'rgba(255,250,230,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * tail, p.y - p.vy * tail); ctx.stroke();
      circle(ctx, p.x, p.y, 1.4, '#ffffff');
    }
    ctx.globalAlpha = 1;
  }

  /** The moon in the top right corner, waxing and waning over eight days. */
  private drawMoon(ctx: CanvasRenderingContext2D, env: Env, W: number): void {
    const a = Math.min(1, (env.dark - 0.3) / 0.4);
    const x = W - 48, y = 34, r = 9;
    const phase = (env.day % 8) / 8; // 0 new → 0.5 full → 1 new
    ctx.save(); ctx.globalAlpha = a;
    circle(ctx, x, y, r * 2.4, rgba('#d0d8ff', 0.08)); circle(ctx, x, y, r * 1.5, rgba('#d0d8ff', 0.08));
    circle(ctx, x, y, r, '#f2f0e0');
    circle(ctx, x - 3, y - 2, 1.6, rgba('#c8c4b0', 0.5)); circle(ctx, x + 2.5, y + 3, 1.1, rgba('#c8c4b0', 0.5)); circle(ctx, x + 1, y - 4, 0.8, rgba('#c8c4b0', 0.5));
    // Shadow disc slides across to make the phase.
    const lit = 1 - Math.abs(phase - 0.5) * 2; // 0 new → 1 full
    if (lit < 0.98) circle(ctx, x + (phase < 0.5 ? -1 : 1) * lit * r * 2.3, y, r + 0.5, 'rgba(14,20,55,0.92)');
    ctx.restore();
  }

  private drawAurora(ctx: CanvasRenderingContext2D, env: Env, W: number, H: number): void {
    const a = Math.min(1, (env.dark - 0.6) / 0.4) * 0.5;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const bands: [string, number, number][] = [['#40e090', 0, 0.9], ['#60c0ff', 36, 0.6], ['#c070e0', 64, 0.45]];
    for (const [col, off, str] of bands) {
      const g = ctx.createLinearGradient(0, 0, 0, 110);
      g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.3, rgba(col, 0.22 * a * str)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let x = -20; x <= W + 20; x += 16) { const y = 10 + off + Math.sin(x * 0.012 + env.clock * 0.35 + off) * 18 + Math.sin(x * 0.031 - env.clock * 0.2) * 8; if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      for (let x = W + 20; x >= -20; x -= 16) { const y = 10 + off + Math.sin(x * 0.012 + env.clock * 0.35 + off) * 18 + Math.sin(x * 0.031 - env.clock * 0.2) * 8; ctx.lineTo(x, y + 90 + Math.sin(x * 0.02 + env.clock * 0.5) * 12); }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    void H;
  }

  drawWeather(ctx: CanvasRenderingContext2D, P: Particles): void {
    for (const b of this.bolts) {
      const a = Math.min(1, b.ttl * 5);
      ctx.lineJoin = 'round';
      for (const [w, c] of [[6, `rgba(180,200,255,${0.25 * a})`], [2.4, `rgba(220,230,255,${0.8 * a})`], [1, `rgba(255,255,255,${a})`]] as [number, string][]) {
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(b.pts[0], b.pts[1]);
        for (let i = 2; i < b.pts.length; i += 2) ctx.lineTo(b.pts[i], b.pts[i + 1]);
        ctx.stroke();
      }
    }
    for (const p of P.list) {
      if (p.kind === 'rain') line(ctx, p.x, p.y, p.x + p.vx * 0.03, p.y + p.vy * 0.03, p.color, 1);
      else if (p.kind === 'snow') circle(ctx, p.x, p.y, p.size, p.color);
      else if (p.kind === 'splash') { const k = 1 - p.ttl / p.life; ctx.strokeStyle = `rgba(220,235,255,${0.6 * (1 - k)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, p.y, 2 + 4 * k, 1 + 2 * k, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
  }
}
