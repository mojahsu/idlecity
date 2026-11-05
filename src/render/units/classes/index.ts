// Adventurer classes, one file each, sharing the body from ../shared.
import type { AdventurerClass } from '../../../sim/types';
import { circle, rect, type Env } from '../../palette';
import { FIG_SIZE, pose, spriteFigures, type Pose } from '../shared';
import { drawNamed, drawSprite, dungeonSprites } from '../../sprites';
import { CLASS_FIG, CLASS_TINT, HERO_ANIM, HERO_ANIM_TINT, PROP } from '../../spriteMap';
import type { ClassArt } from './shared';
import { drawWarrior } from './warrior';
import { drawArcher } from './archer';
import { drawMage } from './mage';
import { drawPriest } from './priest';

const ART: Record<AdventurerClass, (a: ClassArt) => void> = { warrior: drawWarrior, archer: drawArcher, mage: drawMage, priest: drawPriest };

export function classArt(ctx: CanvasRenderingContext2D, cls: AdventurerClass, p: Pose, moving: boolean, env: Env, level: number, gear = 0): void {
  const flutter = moving ? Math.sin(env.clock * 9) * 1.5 : Math.sin(env.clock * 2) * 0.4;
  if (spriteFigures()) {
    // Sheet figures: the class tile with its colour wash, and the weapon held out to the right.
    drawSprite(ctx, CLASS_FIG[cls], 0, 0, FIG_SIZE, { rot: p.walk * 0.12 + p.swing * 0.18, tint: CLASS_TINT[cls], tintA: 0.35 });
    if (cls === 'warrior') drawSprite(ctx, gear >= 6 ? PROP.redSword : PROP.sword, 5, -3, 12, { rot: 0.5 + p.swing * 0.8 });
    else if (cls === 'archer') drawSprite(ctx, PROP.bow, 5.5, -2, 12, { rot: 0.1 });
  } else ART[cls]({ ctx, p, moving, env, level, gear, flutter });
  // Forged gear shows: a gold trim line on the tunic from quality 4, a bright pauldron from 8.
  if (gear >= 4) rect(ctx, -3.2, -4.6, 6.4, 0.9, '#e0c060');
  if (gear >= 8) { circle(ctx, -3.4, -9.6, 1.6, '#d8dde3'); circle(ctx, 3.4, -9.6, 1.6, '#d8dde3'); }
  if (level >= 10) circle(ctx, -4.5, -17.5, 1.3, '#f0d050');
}

/** Draw a class figure at absolute logical pixels (used by the dungeon view). */
export function drawClassFigure(ctx: CanvasRenderingContext2D, cls: AdventurerClass, level: number, env: Env, moving: boolean, px: number, py: number, dir: number, scale: number, hurt = false, gear = 0): void {
  const p = pose(moving, false, env.clock, level * 7);
  if (dungeonSprites()) {
    // The 0x72 heroes: idle, running, or the hit frame, with the priest washed gold.
    const name = HERO_ANIM[cls] + (hurt ? '_hit_anim' : moving ? '_run_anim' : '_idle_anim');
    const o = { flip: dir < 0, tint: HERO_ANIM_TINT[cls], tintA: 0.4 };
    if (drawNamed(ctx, name, px + (hurt ? Math.sin(env.clock * 60) * 1.5 : 0), py, scale * 0.85, env.clock + level * 0.37, o, moving ? 10 : 6)) {
      if (level >= 10) { ctx.fillStyle = '#f0d050'; ctx.beginPath(); ctx.arc(px - 7 * scale, py - 26 * scale, 1.6, 0, Math.PI * 2); ctx.fill(); }
      return;
    }
  }
  ctx.save(); ctx.translate(px, py + p.bob * scale); ctx.scale(dir * scale, scale);
  if (hurt) { ctx.filter = 'brightness(1.8) saturate(0.3)'; ctx.translate(Math.sin(env.clock * 60) * 1.5, 0); }
  classArt(ctx, cls, p, moving, env, level, gear);
  ctx.restore();
}
