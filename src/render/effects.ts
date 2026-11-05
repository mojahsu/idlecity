// Ambient life and particles: chimney smoke, embers, weather, seasonal drift,
// work debris, birds, farm chickens, a market cart, floating text and
// fireworks. All state here is cosmetic and never saved.
import type { GameState, Worker } from '../sim/types';
import { TILE } from './constants';
import { smokeSources } from './buildings';
import { circle, ellipse, poly, rect, line, groundShadow, hash, rgba, type Env } from './palette';

type Kind = 'smoke' | 'ember' | 'spark' | 'leaf' | 'petal' | 'firefly' | 'rain' | 'snow' | 'splash' | 'chip' | 'dust' | 'rocket' | 'burst' | 'clash' | 'coin';

interface Particle {
  kind: Kind; x: number; y: number; vx: number; vy: number; ttl: number; life: number; size: number; color: string; spin: number;
}

interface FloatText { x: number; y: number; text: string; color: string; ttl: number }
interface Bird { x: number; y: number; vx: number; phase: number }
interface Chicken { x: number; y: number; tx: number; ty: number; home: number; timer: number; peck: number }
interface Cart { x: number; y: number; tx: number; ty: number; px: number; py: number; wheel: number }

const MAX_PARTICLES = 900;

export class Effects {
  private particles: Particle[] = [];
  private floats: FloatText[] = [];
  private birds: Bird[] = [];
  private birdTimer = 12;
  private chickens: Chicken[] = [];
  private cart: Cart | null = null;
  private cartTimer = 0;
  private workTimers = new Map<number, number>();
  private smokeAcc = new Map<string, number>();
  private weatherAcc = 0;
  private ambientAcc = 0;
  private victorySeen = -1;
  private fireworkTimer = 0;

  // ---- update -----------------------------------------------------------------

  update(s: GameState, env: Env, dt: number): void {
    const W = s.width * TILE, H = s.height * TILE;
    this.consumeFx(s);
    this.emitSmoke(s, env, dt);
    this.emitWeather(s, env, dt, W, H);
    this.emitAmbient(s, env, dt);
    this.emitWork(s, env, dt);
    this.updateBirds(env, dt, W, H);
    this.updateChickens(s, env, dt);
    this.updateCart(s, env, dt);
    this.updateFireworks(s, env, dt);
    // Integrate particles.
    const keep: Particle[] = [];
    for (const p of this.particles) {
      p.ttl -= dt;
      if (p.ttl <= 0) { if (p.kind === 'rain') this.spawn('splash', p.x, p.y, 0, 0, 0.25, 1.5, 'rgba(220,235,255,0.7)'); else if (p.kind === 'rocket') this.burst(p.x, p.y, p.color); continue; }
      switch (p.kind) {
        case 'smoke': p.vx += Math.sin(env.clock * 1.5 + p.spin) * 1.5 * dt; p.vy *= 0.995; p.size += 2.4 * dt; break;
        case 'ember': p.vy -= 10 * dt; p.vx += Math.sin(env.clock * 20 + p.spin) * 8 * dt; break;
        case 'leaf': case 'petal': p.vx += Math.sin(env.clock * 2 + p.spin) * 6 * dt; p.vy = Math.min(p.vy + 10 * dt, p.kind === 'leaf' ? 14 : 8); p.spin += dt * 4; break;
        case 'firefly': p.vx += (Math.sin(env.clock * 1.3 + p.spin) * 4 - p.vx * 0.5) * dt; p.vy += (Math.cos(env.clock * 1.1 + p.spin * 2) * 4 - p.vy * 0.5) * dt; break;
        case 'snow': p.vx = Math.sin(env.clock * 1.2 + p.spin) * 6; break;
        case 'chip': case 'coin': p.vy += 60 * dt; break;
        case 'burst': p.vy += 18 * dt; p.vx *= 0.985; p.vy *= 0.985; break;
        case 'rocket': p.vx += Math.sin(env.clock * 10 + p.spin) * 2 * dt; break;
        case 'dust': p.size += 3 * dt; break;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      keep.push(p);
    }
    this.particles = keep;
    this.floats = this.floats.filter((f) => (f.ttl -= dt) > 0);
  }

  private spawn(kind: Kind, x: number, y: number, vx: number, vy: number, life: number, size: number, color: string, spin = Math.random() * 6.28): void {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({ kind, x, y, vx, vy, ttl: life, life, size, color, spin });
  }

  private consumeFx(s: GameState): void {
    for (const f of s.fx) {
      if (f.kind === 'float') { if (f.text === '+0') continue; this.floats.push({ x: f.x, y: f.y, text: f.text, color: f.color ?? '#fff', ttl: 1.6 }); if (f.text.endsWith('g')) this.coins(f.x * TILE + TILE / 2, f.y * TILE + TILE / 2, 10); }
      else if (f.kind === 'hit') {
        const px = f.x * TILE + TILE / 2, py = f.y * TILE + TILE / 2 - 6;
        for (let i = 0; i < 5; i++) { const a = Math.random() * 6.28, sp = 30 + Math.random() * 40; this.spawn('clash', px, py, Math.cos(a) * sp, Math.sin(a) * sp, 0.3, 1.5, '#ffe080'); }
      }
    }
  }

  private emitSmoke(s: GameState, env: Env, dt: number): void {
    for (const src of smokeSources(s, env)) {
      const key = `${src.x},${src.y}`;
      const acc = (this.smokeAcc.get(key) ?? 0) + src.rate * dt;
      if (acc >= 1) {
        this.smokeAcc.set(key, acc - 1);
        this.spawn('smoke', src.x + (Math.random() - 0.5) * 2, src.y, (Math.random() - 0.5) * 3 + (env.rainy ? 6 : 2), -7 - Math.random() * 4, 2.8 + Math.random() * 1.5, src.size, src.color);
        if (src.rate >= 2.5) this.spawn('ember', src.x + (Math.random() - 0.5) * 4, src.y + 4, (Math.random() - 0.5) * 6, -12 - Math.random() * 10, 0.6 + Math.random() * 0.5, 1.2, src.color === '#55504e' ? '#ffb040' : '#ff9030');
      } else this.smokeAcc.set(key, acc);
    }
  }

  private emitWeather(s: GameState, env: Env, dt: number, W: number, H: number): void {
    if (!env.rainy && !env.snowy) return;
    this.weatherAcc += (env.rainy ? 140 : 40) * dt;
    while (this.weatherAcc >= 1) {
      this.weatherAcc -= 1;
      const x = Math.random() * (W + 80) - 40, y = -10 - Math.random() * 20;
      const groundY = Math.random() * H;
      if (env.rainy) this.spawn('rain', x, y, -30, 260, (groundY - y) / 260, 1, 'rgba(190,215,255,0.7)');
      else this.spawn('snow', x, y, 0, 18 + Math.random() * 12, (groundY - y) / 24, 1 + Math.random() * 1.5, 'rgba(255,255,255,0.9)');
    }
    void s;
  }

  private emitAmbient(s: GameState, env: Env, dt: number): void {
    const night = env.dark > 0.5;
    let rate = 0; let kind: Kind | null = null;
    if (env.season === 'autumn' && !env.rainy) { rate = 6; kind = 'leaf'; }
    else if (env.season === 'spring' && !env.rainy) { rate = 3; kind = 'petal'; }
    else if (env.season === 'summer' && night) { rate = 2.5; kind = 'firefly'; }
    if (!kind) return;
    this.ambientAcc += rate * dt;
    while (this.ambientAcc >= 1) {
      this.ambientAcc -= 1;
      // Pick a random forest (or bush) tile as the source.
      for (let tries = 0; tries < 8; tries++) {
        const i = Math.floor(Math.random() * s.tiles.length);
        const t = s.tiles[i];
        if (t.terrain !== 'forest' && t.terrain !== 'bush') continue;
        const x = (i % s.width) * TILE + Math.random() * TILE, y = Math.floor(i / s.width) * TILE + Math.random() * 10;
        if (kind === 'leaf') this.spawn('leaf', x, y, (Math.random() - 0.5) * 10 + 6, 6, 3 + Math.random() * 2, 1.6, ['#d9822b', '#c8501f', '#e8b43a'][Math.floor(Math.random() * 3)]);
        else if (kind === 'petal') this.spawn('petal', x, y, (Math.random() - 0.5) * 8 + 4, 4, 3 + Math.random() * 2, 1.2, ['#f7c6dc', '#ffe3ee', '#fff'][Math.floor(Math.random() * 3)]);
        else this.spawn('firefly', x, y + 6, 0, 0, 4 + Math.random() * 4, 1, '#e8ff80');
        break;
      }
    }
  }

  private emitWork(s: GameState, env: Env, dt: number): void {
    const seen = new Set<number>();
    for (const w of s.workers) {
      if (!w.task || !('phase' in w.task) || w.task.phase !== 'work') continue;
      seen.add(w.id);
      const t = (this.workTimers.get(w.id) ?? 0.3) - dt;
      if (t > 0) { this.workTimers.set(w.id, t); continue; }
      this.workTimers.set(w.id, 0.45 + Math.random() * 0.2);
      this.workDebris(w, env);
    }
    for (const k of [...this.workTimers.keys()]) if (!seen.has(k)) this.workTimers.delete(k);
  }

  private workDebris(w: Worker, env: Env): void {
    const px = w.x * TILE + TILE / 2 + 6, py = w.y * TILE + TILE / 2;
    const task = w.task!;
    const res = task.kind === 'gather' ? task.resource : task.kind === 'farm' ? 'food' : 'build';
    if (res === 'wood') for (let i = 0; i < 4; i++) this.spawn('chip', px, py - 2, (Math.random() - 0.3) * 40, -30 - Math.random() * 30, 0.6, 1.4, i % 2 ? '#d6a86c' : '#8a5a30');
    else if (res === 'stone' || res === 'iron') { for (let i = 0; i < 3; i++) this.spawn('chip', px, py, (Math.random() - 0.3) * 40, -20 - Math.random() * 30, 0.5, 1.2, '#a8a8a4'); this.spawn('spark', px, py - 2, (Math.random() - 0.5) * 50, -40, 0.25, 1.2, '#ffe080'); }
    else if (res === 'build') { this.spawn('dust', px - 4, py + 4, (Math.random() - 0.5) * 6, -4, 0.8, 2, 'rgba(200,180,140,0.5)'); if (Math.random() < 0.5) this.spawn('spark', px, py - 4, (Math.random() - 0.5) * 30, -30, 0.2, 1, '#ffe080'); }
    else this.spawn('dust', px - 4, py + 4, (Math.random() - 0.5) * 6, -3, 0.7, 1.8, 'rgba(160,130,80,0.5)');
    void env;
  }

  private updateBirds(env: Env, dt: number, W: number, H: number): void {
    this.birdTimer -= dt;
    if (this.birdTimer <= 0 && env.dark < 0.4 && !env.rainy) {
      this.birdTimer = (env.season === 'winter' ? 60 : 25) + Math.random() * 25;
      const dir = Math.random() < 0.5 ? 1 : -1, n = 3 + Math.floor(Math.random() * 4), y = 20 + Math.random() * (H * 0.5);
      for (let i = 0; i < n; i++) this.birds.push({ x: dir > 0 ? -20 - i * 9 : W + 20 + i * 9, y: y + (i % 2) * 6 + i * 2, vx: dir * (38 + Math.random() * 8), phase: Math.random() * 6 });
    }
    for (const b of this.birds) { b.x += b.vx * dt; b.y += Math.sin(env.clock * 0.7 + b.phase) * 3 * dt; }
    this.birds = this.birds.filter((b) => b.x > -40 && b.x < W + 40);
  }

  private updateChickens(s: GameState, env: Env, dt: number): void {
    const farms = s.buildings.filter((b) => b.built && b.type === 'farm').slice(0, 3);
    const want = farms.length * 2;
    while (this.chickens.length < want) { const f = farms[Math.floor(this.chickens.length / 2)]; this.chickens.push({ x: f.x + 0.5, y: f.y + 1.1, tx: f.x + 0.5, ty: f.y + 1.1, home: f.id, timer: Math.random(), peck: 0 }); }
    if (this.chickens.length > want) this.chickens.length = want;
    this.chickens.forEach((c, i) => {
      const f = farms[Math.floor(i / 2)];
      if (!f) return;
      c.timer -= dt;
      if (c.timer <= 0) { c.timer = 1.5 + Math.random() * 3; c.tx = f.x + 0.5 + (Math.random() - 0.5) * 1.6; c.ty = f.y + 0.9 + (Math.random() - 0.3) * 1.2; c.peck = Math.random() < 0.6 ? 1.2 : 0; }
      const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
      if (d > 0.02 && env.dark < 0.7) { const sp = Math.min(d, 0.45 * dt); c.x += dx / d * sp; c.y += dy / d * sp; }
      if (c.peck > 0) c.peck -= dt;
    });
  }

  private updateCart(s: GameState, env: Env, dt: number): void {
    const market = s.buildings.find((b) => b.built && b.type === 'market');
    const roads: number[] = [];
    if (market && env.dark < 0.6) {
      if (!this.cart) {
        this.cartTimer -= dt;
        if (this.cartTimer <= 0) {
          for (let i = 0; i < s.tiles.length; i++) if (s.tiles[i].terrain === 'road') roads.push(i);
          if (roads.length > 6) { const i = roads[Math.floor(Math.random() * roads.length)]; const x = i % s.width, y = Math.floor(i / s.width); this.cart = { x, y, tx: x, ty: y, px: -1, py: -1, wheel: 0 }; }
          this.cartTimer = 20 + Math.random() * 30;
        }
        return;
      }
      const c = this.cart;
      const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
      if (d < 0.01) {
        const opts: [number, number][] = [];
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
          const nx = c.tx + ox, ny = c.ty + oy;
          if (nx < 0 || ny < 0 || nx >= s.width || ny >= s.height) continue;
          if (s.tiles[ny * s.width + nx].terrain !== 'road') continue;
          if (nx === c.px && ny === c.py && Math.random() < 0.9) continue;
          opts.push([nx, ny]);
        }
        if (!opts.length) { this.cart = null; this.cartTimer = 15; return; }
        const [nx, ny] = opts[Math.floor(Math.random() * opts.length)];
        c.px = c.tx; c.py = c.ty; c.tx = nx; c.ty = ny;
      } else { const sp = Math.min(d, 1.1 * dt); c.x += dx / d * sp; c.y += dy / d * sp; c.wheel += sp * 6; }
    } else if (this.cart) { this.cart = null; this.cartTimer = 10; }
  }

  private updateFireworks(s: GameState, env: Env, dt: number): void {
    if (!s.victory) return;
    if (this.victorySeen < 0) this.victorySeen = env.clock;
    const since = env.clock - this.victorySeen;
    this.fireworkTimer -= dt;
    if (this.fireworkTimer > 0) return;
    this.fireworkTimer = since < 90 ? 0.9 + Math.random() * 0.8 : 18 + Math.random() * 20;
    const keep = s.buildings.find((b) => b.built && b.type === 'keep');
    const ox = (keep ? keep.x : s.center.x) * TILE + TILE / 2 + (Math.random() - 0.5) * 120, oy = (keep ? keep.y : s.center.y) * TILE;
    const colors = ['#ff6060', '#ffd040', '#60c0ff', '#c080ff', '#80ff90', '#ffffff'];
    this.spawn('rocket', ox, oy + 10, (Math.random() - 0.5) * 10, -120 - Math.random() * 40, 0.7 + Math.random() * 0.4, 1.5, colors[Math.floor(Math.random() * colors.length)]);
  }

  private burst(x: number, y: number, color: string): void {
    const n = 26;
    for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + Math.random() * 0.2, sp = 45 + Math.random() * 25; this.spawn('burst', x, y, Math.cos(a) * sp, Math.sin(a) * sp, 1 + Math.random() * 0.5, 1.6, i % 3 ? color : '#ffffff'); }
  }

  /** Coins scatter when a party deposits loot. */
  coins(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) this.spawn('coin', x, y - 6, (Math.random() - 0.5) * 50, -50 - Math.random() * 30, 0.7, 1.4, '#f0d050');
  }

  // ---- drawing ---------------------------------------------------------------------

  /** Things that stand on the ground; the renderer sorts them with units. */
  groundActors(): { y: number; draw: (ctx: CanvasRenderingContext2D, env: Env) => void }[] {
    const out: { y: number; draw: (ctx: CanvasRenderingContext2D, env: Env) => void }[] = [];
    for (const c of this.chickens) out.push({ y: c.y, draw: (ctx, env) => drawChicken(ctx, c, env) });
    if (this.cart) { const c = this.cart; out.push({ y: c.y + 0.3, draw: (ctx, env) => drawCart(ctx, c, env) }); }
    return out;
  }

  /** Low particles: chips, dust, sparks, clashes, coins. Drawn right above the units. */
  drawLow(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const a = Math.min(1, p.ttl / p.life * 2);
      switch (p.kind) {
        case 'chip': case 'coin': ctx.fillStyle = p.color; ctx.globalAlpha = a; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); break;
        case 'dust': ctx.globalAlpha = a * 0.6; circle(ctx, p.x, p.y, p.size, p.color); break;
        case 'spark': case 'clash': ctx.globalAlpha = a; line(ctx, p.x, p.y, p.x - p.vx * 0.03, p.y - p.vy * 0.03, p.color, 1.5); break;
        default: continue;
      }
      ctx.globalAlpha = 1;
    }
  }

  /** High particles: smoke, embers, leaves, petals, fireflies, fireworks. */
  drawHigh(ctx: CanvasRenderingContext2D, env: Env): void {
    for (const p of this.particles) {
      const k = p.ttl / p.life;
      switch (p.kind) {
        case 'smoke': ctx.globalAlpha = Math.min(0.45, k * 0.6) * (1 - Math.pow(1 - k, 3)); circle(ctx, p.x, p.y, p.size, p.color); break;
        case 'ember': ctx.globalAlpha = k; circle(ctx, p.x, p.y, p.size * k + 0.4, p.color); break;
        case 'leaf': ctx.globalAlpha = Math.min(1, k * 3); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin); ellipse(ctx, 0, 0, p.size * 1.6, p.size * 0.9, p.color); ctx.restore(); break;
        case 'petal': ctx.globalAlpha = Math.min(1, k * 3); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin); ellipse(ctx, 0, 0, p.size * 1.4, p.size * 0.8, p.color); ctx.restore(); break;
        case 'firefly': { const bl = 0.5 + 0.5 * Math.sin(env.clock * 6 + p.spin * 7); ctx.globalAlpha = Math.min(1, k * 3) * bl; circle(ctx, p.x, p.y, 2.5, rgba('#e8ff80', 0.35)); circle(ctx, p.x, p.y, 1, '#f8ffb0'); break; }
        case 'rocket': ctx.globalAlpha = 1; circle(ctx, p.x, p.y, 1.5, '#fff8d0'); line(ctx, p.x, p.y, p.x - p.vx * 0.05, p.y - p.vy * 0.05, rgba('#ffd080', 0.7), 1.2); break;
        case 'burst': ctx.globalAlpha = k; circle(ctx, p.x, p.y, p.size * (0.6 + k * 0.6), p.color); break;
        default: continue;
      }
      ctx.globalAlpha = 1;
    }
  }

  drawWeather(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      if (p.kind === 'rain') line(ctx, p.x, p.y, p.x + p.vx * 0.03, p.y + p.vy * 0.03, p.color, 1);
      else if (p.kind === 'snow') circle(ctx, p.x, p.y, p.size, p.color);
      else if (p.kind === 'splash') { const k = 1 - p.ttl / p.life; ctx.strokeStyle = `rgba(220,235,255,${0.6 * (1 - k)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(p.x, p.y, 2 + 4 * k, 1 + 2 * k, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
  }

  drawBirds(ctx: CanvasRenderingContext2D, env: Env): void {
    for (const b of this.birds) {
      const flap = Math.sin(env.clock * 12 + b.phase) * 3;
      const d = Math.sign(b.vx);
      ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1.2; ctx.beginPath();
      ctx.moveTo(b.x - 4 * d, b.y - flap); ctx.quadraticCurveTo(b.x - 1 * d, b.y + 1, b.x, b.y); ctx.quadraticCurveTo(b.x + 1 * d, b.y + 1, b.x + 4 * d, b.y - flap); ctx.stroke();
    }
  }

  drawFloats(ctx: CanvasRenderingContext2D): void {
    ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'center';
    for (const f of this.floats) {
      const k = 1 - f.ttl / 1.6; // 0 → 1 over its life
      const rise = (1 - Math.pow(1 - k, 2)) * 22;
      const px = f.x * TILE + TILE / 2, py = f.y * TILE - 2 - rise;
      ctx.globalAlpha = f.ttl < 0.5 ? f.ttl * 2 : 1;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineJoin = 'round'; ctx.strokeText(f.text, px, py);
      ctx.fillStyle = f.color; ctx.fillText(f.text, px, py);
    }
    ctx.globalAlpha = 1;
  }

  /** Positions of glowing particles for the night pass. */
  nightLights(): { x: number; y: number; r: number; color: string; a: number }[] {
    const out: { x: number; y: number; r: number; color: string; a: number }[] = [];
    for (const p of this.particles) {
      if (p.kind === 'firefly') out.push({ x: p.x, y: p.y, r: 10, color: '#e8ff80', a: 0.5 });
      else if (p.kind === 'burst') out.push({ x: p.x, y: p.y, r: 8, color: p.color, a: 0.5 * p.ttl / p.life });
      else if (p.kind === 'rocket') out.push({ x: p.x, y: p.y, r: 10, color: '#ffe0a0', a: 0.6 });
    }
    return out;
  }
}

function drawChicken(ctx: CanvasRenderingContext2D, c: Chicken, env: Env): void {
  const px = c.x * TILE, py = c.y * TILE;
  const moving = Math.hypot(c.tx - c.x, c.ty - c.y) > 0.03;
  const bob = moving ? Math.abs(Math.sin(env.clock * 14 + c.home)) * -1 : 0;
  const peck = c.peck > 0 ? Math.max(0, Math.sin(env.clock * 10)) * 2 : 0;
  const dir = c.tx >= c.x ? 1 : -1;
  groundShadow(ctx, px, py + 1, 3, 1.3, 0.2);
  ctx.save(); ctx.translate(px, py + bob); ctx.scale(dir, 1);
  ellipse(ctx, 0, -3, 3.2, 2.4, '#f4f0e6'); poly(ctx, [-3, -4, -5, -6.5, -2.5, -5], '#e8e4d8');
  circle(ctx, 2.6, -5.5 + peck, 1.7, '#f4f0e6'); poly(ctx, [3.8, -5.5 + peck, 5.5, -5 + peck, 3.8, -4.5 + peck], '#f0a030'); rect(ctx, 2.6, -7.5 + peck, 1.2, 1.4, '#e04040');
  rect(ctx, 3, -6 + peck, 0.6, 0.6, '#222');
  rect(ctx, -1, -1, 0.8, 1.5, '#f0a030'); rect(ctx, 1, -1, 0.8, 1.5, '#f0a030');
  ctx.restore();
}

function drawCart(ctx: CanvasRenderingContext2D, c: Cart, env: Env): void {
  const px = c.x * TILE + TILE / 2, py = c.y * TILE + TILE / 2 + 6;
  const dir = c.tx > c.x ? 1 : c.tx < c.x ? -1 : 1;
  groundShadow(ctx, px, py + 1, 11, 2.5, 0.25);
  ctx.save(); ctx.translate(px, py); ctx.scale(dir, 1);
  // Horse.
  const trot = Math.sin(c.wheel * 2) * 1.2;
  ellipse(ctx, 7, -6, 5.5, 3.2, '#7a4a2a'); rect(ctx, 11, -10, 3, 5, '#7a4a2a'); poly(ctx, [11, -10, 12, -12.5, 13, -10], '#7a4a2a');
  for (let k = 0; k < 4; k++) rect(ctx, 3 + k * 2.6, -4, 1.2, 4 + (k % 2 ? trot : -trot), '#5a3a1e');
  poly(ctx, [2, -7, -1, -9, 1, -5], '#3a2a1a');
  // Cart.
  rect(ctx, -9, -9, 10, 6, '#a8824c'); rect(ctx, -9, -9, 10, 1.2, '#c9a062'); line(ctx, -9, -6, 1, -6, '#6b4a2b', 0.8);
  ellipse(ctx, -5, -11, 4, 2.2, '#d8c090'); circle(ctx, -3, -11.5, 1.2, '#d83a4a'); circle(ctx, -6.5, -11.2, 1.2, '#f7d94c');
  line(ctx, 1, -5, 4, -5, '#5a3a1e', 1.2);
  for (const wx of [-6, -1]) { circle(ctx, wx, -2, 2.6, '#3a2a1a'); ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(wx - Math.cos(c.wheel) * 2.2, -2 - Math.sin(c.wheel) * 2.2); ctx.lineTo(wx + Math.cos(c.wheel) * 2.2, -2 + Math.sin(c.wheel) * 2.2); ctx.moveTo(wx - Math.sin(c.wheel) * 2.2, -2 + Math.cos(c.wheel) * 2.2); ctx.lineTo(wx + Math.sin(c.wheel) * 2.2, -2 - Math.cos(c.wheel) * 2.2); ctx.stroke(); }
  ctx.restore();
  void env; void hash;
}
