// Adventurer classes, one file each, sharing the body from ../shared.
import type { AdventurerClass } from '../../../sim/types';
import { circle, rect, type Env } from '../../palette';
import { pose, type Pose } from '../shared';
import type { ClassArt } from './shared';
import { drawWarrior } from './warrior';
import { drawArcher } from './archer';
import { drawMage } from './mage';
import { drawPriest } from './priest';

const ART: Record<AdventurerClass, (a: ClassArt) => void> = { warrior: drawWarrior, archer: drawArcher, mage: drawMage, priest: drawPriest };

export function classArt(ctx: CanvasRenderingContext2D, cls: AdventurerClass, p: Pose, moving: boolean, env: Env, level: number, gear = 0): void {
  const flutter = moving ? Math.sin(env.clock * 9) * 1.5 : Math.sin(env.clock * 2) * 0.4;
  ART[cls]({ ctx, p, moving, env, level, gear, flutter });
  // Forged gear shows: a gold trim line on the tunic from quality 4, a bright pauldron from 8.
  if (gear >= 4) rect(ctx, -3.2, -4.6, 6.4, 0.9, '#e0c060');
  if (gear >= 8) { circle(ctx, -3.4, -9.6, 1.6, '#d8dde3'); circle(ctx, 3.4, -9.6, 1.6, '#d8dde3'); }
  if (level >= 10) circle(ctx, -4.5, -17.5, 1.3, '#f0d050');
}

/** Draw a class figure at absolute logical pixels (used by the dungeon view). */
export function drawClassFigure(ctx: CanvasRenderingContext2D, cls: AdventurerClass, level: number, env: Env, moving: boolean, px: number, py: number, dir: number, scale: number, hurt = false, gear = 0): void {
  const p = pose(moving, false, env.clock, level * 7);
  ctx.save(); ctx.translate(px, py + p.bob * scale); ctx.scale(dir * scale, scale);
  if (hurt) { ctx.filter = 'brightness(1.8) saturate(0.3)'; ctx.translate(Math.sin(env.clock * 60) * 1.5, 0); }
  classArt(ctx, cls, p, moving, env, level, gear);
  ctx.restore();
}
