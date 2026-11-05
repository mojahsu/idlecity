// Buildings assembled from Tiny Town tiles: rows of roof and wall pieces
// stacked on the ground line, windows that glow when the house is lit, snow
// on the roofs in winter, and a prop or two beside the door.
import type { Building, GameState } from '../../sim/types';
import { TILE } from '../constants';
import { rect, type Env } from '../palette';
import { drawSprite, drawTileRect, townSprites } from '../sprites';
import { BUILDING_SPRITES, ROOF_TILES, WINDOW_TILES } from '../spriteMap';
import { isLit } from './index';

/** Whether this type is drawn from the sheets (and they are loaded). */
export function hasSpriteBuilding(type: Building['type']): boolean { return townSprites() && !!BUILDING_SPRITES[type]; }

/** Height above the ground line, for sun shadows. */
export function spriteBuildingHeight(type: Building['type']): number {
  const def = BUILDING_SPRITES[type];
  return def ? def.rows.length * TILE * def.k * 0.9 : 0;
}

export function drawSpriteBuilding(ctx: CanvasRenderingContext2D, s: GameState, b: Building, env: Env, px: number, py: number): boolean {
  const def = BUILDING_SPRITES[b.type];
  if (!def || !townSprites()) return false;
  const ts = TILE * def.k, cx = px + TILE / 2, ground = py + TILE;
  const lit = isLit(b, env), snow = env.season === 'winter';
  const glow = 0.8 + 0.2 * Math.sin(env.clock * 3 + b.x);
  def.rows.forEach((row, r) => {
    const y = ground - (def.rows.length - r) * ts, x0 = cx - row.length * ts / 2;
    row.forEach((i, c) => {
      const x = x0 + c * ts;
      drawTileRect(ctx, { s: 'tiny-town', i }, x, y, ts, ts, snow && ROOF_TILES.has(i) ? '#eef3f8' : null, 0.55);
      if (lit && WINDOW_TILES.has(i)) rect(ctx, x + ts * 0.36, y + ts * 0.32, ts * 0.28, ts * 0.3, `rgba(255,214,110,${0.85 * glow})`);
    });
  });
  for (const p of def.props ?? []) drawSprite(ctx, p.ref, cx + p.dx * TILE, ground + p.dy * TILE, p.size * TILE);
  void s;
  return true;
}
