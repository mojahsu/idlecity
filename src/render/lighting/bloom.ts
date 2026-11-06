// HD-2D screen-space bloom and subsurface glow for emissive sources (campfire,
// forge, dungeon portals, lanterns, magic and windows).
import type { GameState } from '../../sim/types';
import type { LightSource } from '../buildings';
import { TILE } from '../constants';
import { rgba, type Env } from '../palette';

/** Always-on emissive bloom sources (campfires, forges, magical dungeons) visible even in daylight. */
export function emissiveSources(s: GameState, env: Env): LightSource[] {
  const out: LightSource[] = [];
  for (const b of s.buildings) {
    if (!b.built) continue;
    const cx = b.x * TILE + TILE / 2, cy = b.y * TILE + TILE / 2;
    if (b.type === 'campfire') out.push({ x: cx, y: cy, r: 28, color: '#ff9838', flicker: 0.16 });
    else if (b.type === 'blacksmith') out.push({ x: cx - 3, y: b.y * TILE + TILE - 4, r: 20, color: '#ff7828', flicker: 0.22 });
  }
  for (const d of s.dungeons) {
    if (!d.unlocked) continue;
    const cx = d.x * TILE + TILE / 2, cy = d.y * TILE + TILE / 2 - 4;
    if (d.id === 'emeraldCavern') out.push({ x: cx, y: cy, r: 22, color: '#40f098', flicker: 0.12 });
    else if (d.id === 'emberPeak') out.push({ x: cx, y: cy, r: 24, color: '#ff6820', flicker: 0.18 });
    else if (d.id === 'darkTower') out.push({ x: cx, y: cy, r: 28, color: s.victory ? '#ffe070' : '#b850ff', flicker: 0.2 });
  }
  void env;
  return out;
}

export function drawBloom(ctx: CanvasRenderingContext2D, s: GameState, env: Env, lights: LightSource[]): void {
  const all = env.dark > 0.15 ? lights : emissiveSources(s, env);
  if (!all.length) return;
  const strength = env.dark > 0.15 ? 0.32 + env.dark * 0.28 : 0.22;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of all) {
    const fl = 1 + l.flicker * Math.sin(env.clock * 8.5 + l.x * 0.27 + l.y * 0.19);
    const outerR = Math.max(4, l.r * 1.45 * fl);
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, outerR);
    g.addColorStop(0, rgba(l.color, strength * 0.65));
    g.addColorStop(0.35, rgba(l.color, strength * 0.28));
    g.addColorStop(0.7, rgba(l.color, strength * 0.08));
    g.addColorStop(1, rgba(l.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(l.x, l.y, outerR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
