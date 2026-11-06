// Trees: three species, their footprint for shadows, and the shadow pass.
import type { GameState, Tile } from '../../../sim/types';
import { TILE } from '../../constants';
import { PALETTE, castShadow, groundShadow, type Env } from '../../palette';
import type { TreeArt, TreeKind } from './shared';
import { drawPine } from './pine';
import { drawBirch } from './birch';
import { drawOak } from './oak';
import { drawSprite, drawSpriteTall, townSprites } from '../../sprites';
import { TREES } from '../../spriteMap';

const ART: Record<TreeKind, (a: TreeArt) => void> = { pine: drawPine, birch: drawBirch, oak: drawOak };

/** Where a tree stands and how tall it is, for the shadow pass. */
export function treeFoot(x: number, y: number, t: Tile): { cx: number; cy: number; r: number; h: number; kind: TreeKind } {
  const size = 0.5 + 0.5 * Math.min(1, t.amount / 40);
  const kind = t.v < 0.28 ? 'pine' : t.v < 0.5 ? 'birch' : 'oak';
  return { cx: x * TILE + TILE / 2 + (t.v - 0.5) * 5, cy: y * TILE + TILE / 2 + 2 + 9 * size, r: 8.5 * size, h: (kind === 'pine' ? 26 : 20) * size, kind };
}

export function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, t: Tile, env: Env): void {
  const pal = PALETTE[env.season];
  const size = 0.5 + 0.5 * Math.min(1, t.amount / 40);
  const r = 8.5 * size;
  const sway = Math.sin(env.clock * 1.3 + t.v * 9 + x * 0.5) * (env.rainy ? 1.4 : 0.7);
  const cx = x * TILE + TILE / 2 + (t.v - 0.5) * 5, cy = y * TILE + TILE / 2 + 2;
  const ci = Math.floor(t.v * pal.canopy.length);
  const base = pal.canopy[ci % pal.canopy.length];
  const kind = treeFoot(x, y, t).kind;
  groundShadow(ctx, cx + 1, cy + 8 * size, r * 0.9, r * 0.35, 0.22);
  if (townSprites()) { drawSpriteTree(ctx, kind, t, env, cx, cy + 9 * size + 1, size, sway); return; }
  ART[kind]({ ctx, x, y, t, env, pal, size, r, sway, cx, cy, base, kind });
}

/** Sun shadows of every tree, drawn on the ground before the scene. */
export function drawTreeShadows(ctx: CanvasRenderingContext2D, s: GameState, env: Env): void {
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
    const t = s.tiles[y * s.width + x];
    if (t.terrain !== 'forest' || t.amount < 1) continue;
    const f = treeFoot(x, y, t);
    castShadow(ctx, env, f.cx, f.cy, f.r * 1.6, f.h, true);
  }
}

/** Tiny Town standalone trees: two-tile tall trees and single-tile small trees; orange in autumn, dusted white in winter. */
function drawSpriteTree(ctx: CanvasRenderingContext2D, kind: TreeKind, t: Tile, env: Env, cx: number, foot: number, size: number, sway: number): void {
  const orange = env.season === 'autumn' ? t.v < 0.78 : env.season === 'spring' ? t.v < 0.12 : false;
  const winter = env.season === 'winter';
  const tint = winter ? '#e8eef5' : kind === 'pine' && !orange ? '#265838' : null;
  const tintA = winter ? 0.5 : kind === 'pine' && !orange ? 0.22 : 0;
  const o = { flip: (Math.floor(t.v * 100) % 2) === 1, rot: sway * 0.012, tint, tintA };
  const ts = Math.round(TILE * (0.58 + 0.34 * size));
  if (kind === 'birch' || size < 0.68) {
    drawSprite(ctx, orange ? TREES.small.orange : TREES.small.green, cx, foot, Math.round(ts * 1.12), o);
    return;
  }
  const [top] = orange ? TREES.oak.orange : TREES.oak.green;
  drawSpriteTall(ctx, top, cx, foot, kind === 'pine' ? Math.round(ts * 0.92) : ts, o);
}
