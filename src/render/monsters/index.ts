// Monster art, one file per monster, drawn around (0,0) = feet centre facing +x,
// roughly 18px tall at scale 1. Used by the dungeon view and by raids on the map.
import { circle, type Env } from '../palette';
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

const ART: Record<string, (a: MonsterArt) => void> = {
  rat: drawRat,
  goblin: drawGoblin,
  goblinChief: drawGoblinChief,
  wolf: drawWolf,
  skeleton: drawSkeleton,
  ghoul: drawGhoul,
  bandit: drawBandit,
  lich: drawLich,
  imp: drawImp,
  demon: drawDemon,
  orc: drawOrc,
  dragon: drawDragon,
  demonLord: drawDemonLord,
};

export function drawMonster(ctx: CanvasRenderingContext2D, id: string, env: Env, scale = 1, hurt = 0, attacking = 0): void {
  const c = env.clock;
  const breathe = Math.sin(c * 3) * 0.4;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-attacking * 6, 0);
  if (hurt > 0) { ctx.filter = 'brightness(1.6) saturate(0.4)'; ctx.translate(Math.sin(c * 60) * 1.5, 0); }
  const draw = ART[id];
  if (draw) draw({ ctx, c, breathe, env, scale, hurt, attacking }); else circle(ctx, 0, -8, 5, '#8a4a8a');
  ctx.restore();
}

export function monsterHeight(id: string): number {
  switch (id) {
    case 'rat': return 8; case 'wolf': return 12; case 'imp': return 16; case 'dragon': return 24;
    case 'demon': return 28; case 'lich': return 26; case 'demonLord': return 40; case 'goblinChief': return 22;
    default: return 18;
  }
}
