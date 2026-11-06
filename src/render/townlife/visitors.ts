// Visiting spectacles in town: a Traveling Circus with a juggler and fire-breather,
// and a Mysterious Alchemist Cart brewing glowing elixirs near the guild.
import type { GameState, Point } from '../../sim/types';
import type { LightSource } from '../buildings';
import { TILE } from '../constants';
import { circle, ellipse, line, poly, rect, rgba, groundShadow, type Env } from '../palette';
import { drawTownsfolk } from '../units';
import { bubble } from '../units/shared';
import type { Actor, Roads } from './shared';

export class Visitors {
  private circusSpot: Point | null = null;
  private alchemistSpot: Point | null = null;

  update(s: GameState, env: Env, dt: number, roads: Roads): void {
    void env; void dt;
    if (!this.circusSpot && s.buildings.some((b) => b.built && (b.type === 'market' || b.type === 'tavern'))) {
      const free = roads.freeTilesAround(s, s.center, 2);
      this.circusSpot = free[free.length - 1] ?? null;
    }
    if (!this.alchemistSpot && s.buildings.some((b) => b.built && b.type === 'guildHall')) {
      const guild = s.buildings.find((b) => b.built && b.type === 'guildHall')!;
      const free = roads.freeTilesAround(s, guild, 1);
      this.alchemistSpot = free.find((p) => !this.circusSpot || p.x !== this.circusSpot.x || p.y !== this.circusSpot.y) ?? free[0] ?? null;
    }
  }

  private circusActive(s: GameState, env: Env): boolean {
    if (!this.circusSpot || env.storm || env.season === 'winter' || s.raid) return false;
    const dayIdx = Math.floor(s.time / 120);
    return dayIdx % 3 === 1 && env.dayFrac > 0.32 && env.dayFrac < 0.86;
  }

  private alchemistActive(s: GameState, env: Env): boolean {
    if (!this.alchemistSpot || env.storm || s.raid) return false;
    const dayIdx = Math.floor(s.time / 120);
    return dayIdx % 3 === 2 && env.dayFrac > 0.25 && env.dayFrac < 0.88;
  }

  actors(s: GameState, env: Env): Actor[] {
    const out: Actor[] = [];
    if (this.circusActive(s, env) && this.circusSpot) {
      const sp = this.circusSpot;
      out.push({ y: sp.y + 0.72, draw: (ctx, e) => drawCircus(ctx, sp.x, sp.y, e) });
    }
    if (this.alchemistActive(s, env) && this.alchemistSpot) {
      const sp = this.alchemistSpot;
      out.push({ y: sp.y + 0.75, draw: (ctx, e) => drawAlchemistCart(ctx, s, sp.x, sp.y, e) });
    }
    return out;
  }

  lights(s: GameState, env: Env): LightSource[] {
    const out: LightSource[] = [];
    if (this.circusActive(s, env) && this.circusSpot) {
      const sp = this.circusSpot;
      const fire = (env.clock * 0.45) % 1 < 0.42;
      out.push({ x: sp.x * TILE + TILE / 2, y: sp.y * TILE + TILE / 2, r: fire ? 34 : 22, color: fire ? '#ff8830' : '#ffd070', flicker: fire ? 0.25 : 0.1 });
    }
    if (this.alchemistActive(s, env) && this.alchemistSpot) {
      const sp = this.alchemistSpot;
      out.push({ x: sp.x * TILE + TILE / 2, y: sp.y * TILE + TILE / 2, r: 22, color: '#60f0b0', flicker: 0.14 });
    }
    return out;
  }
}

function drawCircus(ctx: CanvasRenderingContext2D, x: number, y: number, env: Env): void {
  const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2 + 4;
  // Red-and-gold striped circus tent pavilion at the back.
  groundShadow(ctx, px, py + 1, 13, 4, 0.26);
  rect(ctx, px - 10, py - 9, 20, 8, '#a82828');
  for (let k = -2; k <= 2; k++) {
    poly(ctx, [px + k * 4 - 2, py - 9, px + k * 4 + 2, py - 9, px, py - 20], k % 2 === 0 ? '#e03838' : '#f8e8b0');
  }
  rect(ctx, px - 11, py - 9.5, 22, 1.4, '#f0c040');
  // Pennant flag on top.
  line(ctx, px, py - 20, px, py - 25, '#5a3a1e', 1);
  const wv = Math.sin(env.clock * 6) * 1.2;
  poly(ctx, [px, py - 25, px + 6, py - 23.5 + wv, px, py - 22], '#40a0ff');

  // Juggler on the left tossing 3 colorful balls in an arc.
  const jx = x - 0.36, jy = y + 0.18;
  drawTownsfolk(ctx, jx, jy, 1, false, env, 701, { tunic: '#d84060', cheer: true });
  const jpx = jx * TILE + TILE / 2, jpy = jy * TILE + TILE / 2 - 8;
  const cols = ['#ff5060', '#ffd040', '#50c8ff'];
  for (let i = 0; i < 3; i++) {
    const ph = (env.clock * 2.4 + i / 3) % 1;
    const bx = jpx + (ph - 0.5) * 10;
    const by = jpy - Math.sin(ph * Math.PI) * 9;
    circle(ctx, bx, by, 1.5, cols[i]);
  }

  // Fire-breather on the right blowing a cone of flame!
  const fx = x + 0.36, fy = y + 0.18;
  drawTownsfolk(ctx, fx, fy, -1, false, env, 702, { tunic: '#7a3898' });
  const fpx = fx * TILE + TILE / 2 - 3, fpy = fy * TILE + TILE / 2 - 7;
  const fk = (env.clock * 0.45) % 1;
  if (fk < 0.42) {
    const q = fk / 0.42;
    const reach = 14 * Math.sin(q * Math.PI);
    poly(ctx, [fpx, fpy, fpx - reach, fpy - 6 - reach * 0.35, fpx - reach * 0.85, fpy - 1 - reach * 0.15], rgba('#ff6820', 0.78));
    poly(ctx, [fpx, fpy, fpx - reach * 0.7, fpy - 4 - reach * 0.25, fpx - reach * 0.55, fpy - 1], rgba('#ffe070', 0.85));
    for (let i = 0; i < 4; i++) {
      const et = (env.clock * 4 + i * 0.25) % 1;
      circle(ctx, fpx - reach * et, fpy - 3 - et * 8 + Math.sin(env.clock * 10 + i) * 1.5, 1.4 * (1 - et) + 0.4, rgba(i % 2 ? '#ffe060' : '#ff5020', 1 - et));
    }
  }

  // Spectator cheering in front.
  const sx = x + 0.02, sy = y + 0.48;
  drawTownsfolk(ctx, sx, sy, 1, false, env, 703, { cheer: fk < 0.45 });
  if (fk < 0.35) bubble(ctx, sx * TILE + TILE / 2, sy * TILE + TILE / 2 - 19, '✦', 0.9, '#e08020');
}

function drawAlchemistCart(ctx: CanvasRenderingContext2D, s: GameState, x: number, y: number, env: Env): void {
  const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2 + 4;
  groundShadow(ctx, px, py + 1, 11, 3.5, 0.26);
  // Wooden potion cart with violet canopy.
  rect(ctx, px - 9, py - 6, 18, 5, '#6e4e2e');
  rect(ctx, px - 9.5, py - 6.5, 19, 1.3, '#9a7448');
  circle(ctx, px - 5.5, py - 1, 2.6, '#3a2818');
  circle(ctx, px + 5.5, py - 1, 2.6, '#3a2818');
  line(ctx, px - 8, py - 6, px - 8, py - 15, '#5a3a1e', 1);
  line(ctx, px + 8, py - 6, px + 8, py - 15, '#5a3a1e', 1);
  poly(ctx, [px - 10, py - 14, px + 10, py - 14, px + 8, py - 18, px - 8, py - 18], '#583078');
  rect(ctx, px - 10, py - 14.5, 20, 1.1, '#d8b050');

  // Glowing potion flasks on the counter.
  circle(ctx, px - 5, py - 8, 1.7, '#ff4070');
  circle(ctx, px - 1.5, py - 8, 1.7, '#40e890');
  circle(ctx, px + 2, py - 8, 1.7, '#50b8ff');

  // Bubbling cauldron on the right side of the cart.
  ellipse(ctx, px + 6.5, py - 7.5, 3, 2.2, '#2e2e34');
  ellipse(ctx, px + 6.5, py - 9, 2.4, 1, '#50f0a0');
  for (let i = 0; i < 4; i++) {
    const bt = (env.clock * 0.75 + i * 0.25) % 1;
    const col = i % 2 === 0 ? '#60f0b0' : '#c080ff';
    circle(ctx, px + 6.5 + Math.sin(env.clock * 3 + i) * 2, py - 10 - bt * 13, 1.3 * (1 - bt) + 0.4, rgba(col, 0.8 * (1 - bt)));
  }

  // Alchemist tending the potions.
  const ax = x - 0.35, ay = y + 0.2;
  drawTownsfolk(ctx, ax, ay, 1, false, env, 709, { tunic: '#482868' });
  const k = (env.clock * 0.38) % 1;
  if (k < 0.35) bubble(ctx, ax * TILE + TILE / 2, ay * TILE + TILE / 2 - 19, '✦', 0.9, '#50c890');

  // Alchemical Blessing Aura on nearby resting adventurers!
  for (const a of s.adventurers) {
    if (a.status !== 'resting') continue;
    if (Math.hypot(a.x - x, a.y - y) > 4.2) continue;
    const hx = a.x * TILE + TILE / 2, hy = a.y * TILE + TILE / 2 + 5;
    ctx.strokeStyle = rgba('#50f0a0', 0.45 + 0.2 * Math.sin(env.clock * 4 + a.id));
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(hx, hy, 6.5, 2.4, 0, 0, Math.PI * 2); ctx.stroke();
  }
}
