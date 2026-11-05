import type { GameState } from '../../sim/types';
import type { Env } from '../palette';

export type DungeonState = GameState['dungeons'][number];

/** What a dungeon entrance drawing gets. */
export interface DungeonArt {
  ctx: CanvasRenderingContext2D;
  s: GameState;
  d: DungeonState;
  env: Env;
  px: number; py: number;
  cx: number; cy: number;
}
