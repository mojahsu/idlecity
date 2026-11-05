// Ambient life and particles. Each file is one effect; this class wires them
// to the frame and exposes the draw passes the renderer calls in order.
import type { GameState } from '../../sim/types';
import { TILE } from '../constants';
import type { Env } from '../palette';
import { Particles } from './particles';
import { Smoke } from './smoke';
import { Weather } from './weather';
import { Ambient } from './ambient';
import { WorkDebris } from './work';
import { Fireworks } from './fireworks';
import { Blaze } from './blaze';
import { Sky } from './sky';
import { Birds } from './birds';
import { Chickens } from './chickens';
import { MarketCart } from './cart';
import { Floats } from './floats';
import type { Actor } from './shared';
export type { Actor } from './shared';

export class Effects {
  private P = new Particles();
  private smoke = new Smoke();
  private weather = new Weather();
  private ambient = new Ambient();
  private work = new WorkDebris();
  private fireworks = new Fireworks();
  private blaze = new Blaze();
  private sky = new Sky();
  private birds = new Birds();
  private chickens = new Chickens();
  private cart = new MarketCart();
  private floats = new Floats();
  /** Points the hens run from (the children), set by the renderer each frame. */
  scare: { x: number; y: number }[] = [];

  /** Things that happened this frame that the soundtrack wants to know about. */
  get events(): string[] { return this.P.events; }
  set events(v: string[]) { this.P.events = v; }

  update(s: GameState, env: Env, dt: number): void {
    const W = s.width * TILE, H = s.height * TILE;
    const P = this.P;
    this.consumeFx(s, P);
    this.smoke.emitSmoke(s, env, dt, P);
    this.weather.emitWeather(s, env, dt, W, H, P);
    this.ambient.emitAmbient(s, env, dt, P);
    this.work.emitWork(s, env, dt, P);
    this.birds.update(env, dt, W, H);
    this.chickens.update(s, env, dt, this.scare);
    this.cart.update(s, env, dt);
    this.fireworks.updateFireworks(s, env, dt, P);
    this.sky.updateSky(env, dt, W, H, P);
    this.blaze.emitBlaze(s, env, dt, P);
    P.integrate(env, dt);
    this.floats.update(dt);
  }

  private consumeFx(s: GameState, P: Particles): void {
    for (const f of s.fx) {
      if (f.kind === 'float') { if (f.text === '+0') continue; this.floats.list.push({ x: f.x, y: f.y, text: f.text, color: f.color ?? '#fff', ttl: 1.6 }); if (f.text.endsWith('g')) P.coins(f.x * TILE + TILE / 2, f.y * TILE + TILE / 2, 10); }
      else if (f.kind === 'hit') {
        const px = f.x * TILE + TILE / 2, py = f.y * TILE + TILE / 2 - 6;
        for (let i = 0; i < 5; i++) { const a = Math.random() * 6.28, sp = 30 + Math.random() * 40; P.spawn('clash', px, py, Math.cos(a) * sp, Math.sin(a) * sp, 0.3, 1.5, '#ffe080'); }
      } else if (f.kind === 'water') {
        const px = f.x * TILE + TILE / 2, py = f.y * TILE + TILE / 2 - 4;
        for (let i = 0; i < 4; i++) P.spawn('drop', px + (Math.random() - 0.5) * 12, py - Math.random() * 10, (Math.random() - 0.5) * 30, -20 - Math.random() * 30, 0.5 + Math.random() * 0.3, 1.3, '#7ac0f0');
        if (Math.random() < 0.5) P.spawn('smoke', px + (Math.random() - 0.5) * 10, py - 6, (Math.random() - 0.5) * 4, -14, 1.2, 2.5, '#e8e8f0');
      }
    }
  }

  coins(x: number, y: number, n: number): void { this.P.coins(x, y, n); }
  groundActors(): Actor[] { return [...this.chickens.actors(), ...this.cart.actors()]; }
  drawLow(ctx: CanvasRenderingContext2D): void { this.P.drawLow(ctx); }
  drawHigh(ctx: CanvasRenderingContext2D, env: Env): void { this.P.drawHigh(ctx, env); }
  drawWeather(ctx: CanvasRenderingContext2D): void { this.sky.drawWeather(ctx, this.P); }
  drawRainbow(ctx: CanvasRenderingContext2D, env: Env, W: number, H: number): void { this.sky.drawRainbow(ctx, env, W, H); }
  drawSky(ctx: CanvasRenderingContext2D, env: Env, W: number, H: number): void { this.sky.drawSky(ctx, env, W, H, this.P); }
  drawBirds(ctx: CanvasRenderingContext2D, env: Env): void { this.birds.draw(ctx, env); }
  drawFloats(ctx: CanvasRenderingContext2D): void { this.floats.draw(ctx); }
  nightLights(): { x: number; y: number; r: number; color: string; a: number }[] { return this.P.nightLights(); }
}
