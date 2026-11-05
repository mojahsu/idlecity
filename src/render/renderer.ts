// Canvas renderer. Reads GameState, never mutates it. Composes the render
// modules in layers: cached terrain → water → depth-sorted scene (trees,
// buildings, people, creatures) → particles → weather → lighting → birds →
// dungeon view → vignette. All drawing uses logical TILE coordinates; the
// canvas transform scales to the displayed size so big screens stay sharp.
import type { GameState, LogEntry } from '../sim/types';
import { t } from '../i18n';
import { TILE } from './constants';
import { makeEnv, type Env } from './palette';
import { TerrainLayer, drawTree, drawTreeShadows, drawWater } from './terrain';
import { drawBuilding, drawBuildingShadows, drawLampPost, lampPosts, lightSources, type LightSource } from './buildings';
import { drawDungeonEntrance } from './dungeons';
import { drawAdventurer, drawCaravan, drawParty, drawRaid, drawWorker } from './units';
import { Effects } from './effects';
import { TownLife } from './townlife';
import { Spotlight } from './spotlight';
import { Lighting, drawVignette } from './lighting';
import { DungeonView } from './dungeonView';
import { isIndoors } from '../sim/workers';
import { trainingPosts } from '../sim/adventurers';
import { drawTrainingPost } from './units/trainingPost';

export { TILE };

interface Drawable { y: number; draw: (ctx: CanvasRenderingContext2D, env: Env) => void }

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private terrain = new TerrainLayer();
  private effects = new Effects();
  private townLife = new TownLife();
  private spotlight = new Spotlight();
  private lighting = new Lighting();
  private dungeonView = new DungeonView();
  private clock = 0;
  private scale = 1;
  private lastLog: LogEntry | null = null;
  private caption: { text: string; ttl: number } | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  /**
   * Match the backing store to the size the canvas is actually shown at
   * (CSS scales it to the stage, including fullscreen) so lines stay crisp.
   */
  resize(s: GameState): void {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const W = s.width * TILE, H = s.height * TILE;
    const rect = this.canvas.getBoundingClientRect();
    const cssW = rect.width || W, cssH = rect.height || H;
    const bw = Math.max(1, Math.round(cssW * dpr)), bh = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== bw || this.canvas.height !== bh) { this.canvas.width = bw; this.canvas.height = bh; }
    this.scale = bw / W;
    this.ctx.setTransform(this.scale, 0, 0, bh / H, 0, 0);
  }

  render(s: GameState, dt: number): void {
    this.resize(s);
    this.clock += dt;
    const ctx = this.ctx;
    const W = s.width * TILE, H = s.height * TILE;
    const env = makeEnv(s, this.clock);

    this.effects.scare = this.townLife.kidSpots();
    this.effects.update(s, env, dt);
    this.townLife.update(s, env, dt);
    this.spotlight.update(s, env, dt);
    this.dungeonView.update(s, env, dt);

    ctx.clearRect(0, 0, W, H);
    this.terrain.draw(ctx, s, env, this.scale);
    drawWater(ctx, s, env);
    drawTreeShadows(ctx, s, env);
    drawBuildingShadows(ctx, s, env);

    // Depth-sorted scene.
    const items: Drawable[] = [];
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
      const t = s.tiles[y * s.width + x];
      if (t.terrain === 'forest' && t.amount >= 1) items.push({ y: y + 0.6, draw: (c, e) => drawTree(c, x, y, t, e) });
    }
    for (const b of s.buildings) items.push({ y: b.y + 0.95, draw: (c, e) => drawBuilding(c, s, b, e) });
    for (const d of s.dungeons) items.push({ y: d.y + 0.95, draw: (c, e) => drawDungeonEntrance(c, s, d, e) });
    lampPosts(s).forEach((l, i) => items.push({ y: l.y + 0.3, draw: (c, e) => drawLampPost(c, l.x, l.y, e, i) }));
    for (const w of s.workers) if (!isIndoors(s, w)) items.push({ y: w.y + 0.8, draw: (c, e) => drawWorker(c, w, e) });
    if (s.caravan) { const cv = s.caravan; items.push({ y: cv.y + 0.9, draw: (c, e) => drawCaravan(c, cv, e) }); }
    const raidPos = s.raid && s.raid.phase === 'fight' ? { x: s.raid.x, y: s.raid.y } : null;
    for (const a of s.adventurers) if (a.status === 'resting' || a.status === 'arriving') items.push({ y: a.y + 0.8, draw: (c, e) => drawAdventurer(c, a, e, s.equipment, a.x, a.y, a.path.length > 0, raidPos) });
    for (const p of trainingPosts(s)) items.push({ y: p.y + 0.7, draw: (c, e) => drawTrainingPost(c, p.x, p.y, e) });
    for (const p of s.parties) if (p.phase === 'travel' || p.phase === 'return') items.push({ y: p.y + 0.9, draw: (c, e) => drawParty(c, s, p, e) });
    if (s.raid) { const r = s.raid; const defenders = s.adventurers.filter((a) => a.status === 'resting' && a.pastime === 'sally').map((a) => ({ x: a.x, y: a.y })); items.push({ y: r.y + 0.9, draw: (c, e) => drawRaid(c, r, e, defenders) }); }
    for (const g of this.effects.groundActors()) items.push(g);
    for (const g of this.townLife.groundActors(s, env)) items.push(g);
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw(ctx, env);

    this.effects.drawLow(ctx);
    this.effects.drawFloats(ctx);
    this.effects.drawHigh(ctx, env);
    this.effects.drawWeather(ctx);
    this.effects.drawRainbow(ctx, env, W, H);

    const lights: LightSource[] = env.dark > 0 ? [...lightSources(s, env), ...this.unitLights(s, env), ...this.townLife.lights(s, env)] : [];
    this.lighting.draw(ctx, s, env, W, H, lights, env.dark > 0 ? this.effects.nightLights() : []);
    this.effects.drawSky(ctx, env, W, H);
    this.townLife.drawOverlay(ctx, env, s);
    this.spotlight.draw(ctx, s, env, W);
    this.effects.drawBirds(ctx, env);
    this.drawCaption(ctx, s, dt, W, H);
    this.dungeonView.draw(ctx, s, env, W, H);
    drawVignette(ctx, W, H);
  }

  /** Render-side happenings since the last call (lightning, fireworks), for the soundtrack. */
  drainEvents(): string[] {
    const ev = this.effects.events;
    this.effects.events = [];
    return ev;
  }

  /** The newest event as a caption in the bottom right corner, so you never miss what just happened. */
  private drawCaption(ctx: CanvasRenderingContext2D, s: GameState, dt: number, W: number, H: number): void {
    const last = s.log[s.log.length - 1] ?? null;
    if (last !== this.lastLog) { if (this.lastLog !== null) this.caption = { text: t(last!.key, last!.params), ttl: 7 }; this.lastLog = last; }
    const c = this.caption;
    if (!c) return;
    c.ttl -= dt;
    if (c.ttl <= 0) { this.caption = null; return; }
    ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'right';
    const w = ctx.measureText(c.text).width + 16;
    ctx.globalAlpha = Math.min(1, c.ttl / 1.2, (7 - c.ttl) * 3);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.roundRect(W - 10 - w, H - 28, w, 20, 4); ctx.fill();
    ctx.fillStyle = '#f0e6d0'; ctx.fillText(c.text, W - 18, H - 14);
    ctx.globalAlpha = 1;
  }

  /** Torches and magic carried by people, visible at night. */
  private unitLights(s: GameState, env: Env): LightSource[] {
    const out: LightSource[] = [];
    for (const a of s.adventurers) {
      if (a.status !== 'resting' && a.status !== 'arriving') continue;
      if (a.cls === 'mage') out.push({ x: a.x * TILE + TILE / 2 + 5, y: a.y * TILE + TILE / 2 - 8, r: 14, color: '#80c0ff', flicker: 0.1 });
    }
    for (const p of s.parties) if (p.phase === 'travel' || p.phase === 'return') out.push({ x: p.x * TILE + TILE / 2, y: p.y * TILE + TILE / 2, r: 26, color: '#ffb060', flicker: 0.15 });
    if (s.raid) out.push({ x: s.raid.x * TILE + TILE / 2, y: s.raid.y * TILE + TILE / 2, r: 22, color: '#ff8040', flicker: 0.2 });
    void env;
    return out;
  }
}
