// Monster art, one file per monster, drawn around (0,0) = feet centre facing +x,
// roughly 18px tall at scale 1. Used by the dungeon view and by raids on the map.
import { circle, hash, type Env } from '../palette';
import { drawNamed, drawSprite, dungeonSprites, namedSize, townSprites } from '../sprites';
import { MONSTER_ANIM, MONSTER_TILE } from '../spriteMap';
import type { MonsterArt } from './shared';
import { drawRat } from './rat';
import { drawGoblin } from './goblin';
import { drawGoblinChief } from './goblinChief';
import { drawWolf } from './wolf';
import { drawSkeleton } from './skeleton';
import { drawGhoul } from './ghoul';
import { drawBandit } from './bandit';
import { drawLich } from './lich';
import { drawImp } from './imp';
import { drawDemon } from './demon';
import { drawOrc } from './orc';
import { drawDragon } from './dragon';
import { drawDemonLord } from './demonLord';
import { drawSpider } from './spider';
import { drawTroll } from './troll';
import { drawWraith } from './wraith';
import { drawBroodMother } from './broodMother';
import { drawHellhound } from './hellhound';
import { drawGolem } from './golem';
import { drawWyvern } from './wyvern';
import { drawElderDragon } from './elderDragon';

const ART: Record<string, (a: MonsterArt) => void> = {
  rat: drawRat,
  goblin: drawGoblin,
  goblinChief: drawGoblinChief,
  wolf: drawWolf,
  skeleton: drawSkeleton,
  ghoul: drawGhoul,
  bandit: drawBandit,
  lich: drawLich,
  spider: drawSpider,
  troll: drawTroll,
  wraith: drawWraith,
  broodMother: drawBroodMother,
  hellhound: drawHellhound,
  golem: drawGolem,
  wyvern: drawWyvern,
  elderDragon: drawElderDragon,
  imp: drawImp,
  demon: drawDemon,
  orc: drawOrc,
  dragon: drawDragon,
  demonLord: drawDemonLord,
};

/** How tall each monster stands at scale 1 when drawn from the sheets (pixels). */
const SPRITE_HEIGHT: Record<string, number> = {
  rat: 13, goblin: 20, goblinChief: 26, wolf: 20, skeleton: 22, ghoul: 22, bandit: 22, lich: 26,
  spider: 18, troll: 26, wraith: 22, broodMother: 30, hellhound: 20, golem: 26, wyvern: 24, elderDragon: 36,
  imp: 16, demon: 28, orc: 26, dragon: 34, demonLord: 38,
};

/**
 * Draw a monster around (0,0) = feet centre, facing +x. On the map (`mode`
 * 'map') it is the Tiny Creatures / Tiny Dungeon tile; in the dungeon panel
 * the 0x72 animation where one fits. Without the sheets, the procedural art.
 */
export function drawMonster(ctx: CanvasRenderingContext2D, id: string, env: Env, scale = 1, hurt = 0, attacking = 0, mode: 'map' | 'panel' = 'map', moving = false): void {
  const c = env.clock;
  const breathe = Math.sin(c * 3) * 0.4;
  const h = SPRITE_HEIGHT[id] ?? 20;
  const flash = hurt > 0 ? { tint: '#ffffff', tintA: 0.75 } : {};
  const shake = hurt > 0 ? Math.sin(c * 60) * 1.5 : 0;
  const anim = mode === 'panel' ? MONSTER_ANIM[id] : undefined;
  if (anim && dungeonSprites()) {
    const fh = namedSize(anim + '_idle_anim').h;
    const k = h / fh;
    const name = anim + (moving || attacking > 0.3 ? '_run_anim' : '_idle_anim');
    if (drawNamed(ctx, name, (-attacking * 6 + shake) * scale, 0, k * scale, c + hash(id.length, 3) * 5, flash, moving ? 10 : 6)) return;
  }
  const tile = MONSTER_TILE[id];
  if (tile && townSprites()) {
    // Static tiles breathe by squashing a touch and lean into their attacks.
    drawSprite(ctx, tile, (-attacking * 6 + shake) * scale, 0, h * 1.15 * scale, { ...flash, sy: 1 + breathe * 0.04 + attacking * 0.06, rot: -attacking * 0.25 });
    return;
  }
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-attacking * 6, 0);
  if (hurt > 0) { ctx.filter = 'brightness(1.6) saturate(0.4)'; ctx.translate(Math.sin(c * 60) * 1.5, 0); }
  const draw = ART[id];
  if (draw) draw({ ctx, c, breathe, env, scale, hurt, attacking }); else circle(ctx, 0, -8, 5, '#8a4a8a');
  ctx.restore();
}

export function monsterHeight(id: string): number {
  if (townSprites() || dungeonSprites()) return (SPRITE_HEIGHT[id] ?? 20) * 0.95;
  switch (id) {
    case 'rat': return 8; case 'wolf': return 12; case 'imp': return 16; case 'dragon': return 24;
    case 'demon': return 28; case 'lich': return 26; case 'demonLord': return 40; case 'goblinChief': return 22;
    default: return 18;
  }
}
