import type { Tile } from '../../../sim/types';
import type { Env, SeasonPalette } from '../../palette';

export type TreeKind = 'pine' | 'birch' | 'oak';

/** What a tree drawing gets. */
export interface TreeArt {
  ctx: CanvasRenderingContext2D;
  x: number; y: number;
  t: Tile;
  env: Env;
  pal: SeasonPalette;
  /** 0.5..1 from the tile's remaining wood. */
  size: number;
  /** Canopy radius. */
  r: number;
  sway: number;
  /** Trunk foot in logical pixels. */
  cx: number; cy: number;
  base: string;
  kind: TreeKind;
}
