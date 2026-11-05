import type { Env } from '../palette';

/** What a monster drawing gets: the canvas, the clock and a slow breathing offset. */
export interface MonsterArt {
  ctx: CanvasRenderingContext2D;
  /** Seconds of animation time. */
  c: number;
  breathe: number;
  env: Env;
  scale: number;
  hurt: number;
  /** 0..1 lunge toward the enemy. */
  attacking: number;
}
