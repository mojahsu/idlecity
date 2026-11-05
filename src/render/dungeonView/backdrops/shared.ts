import type { Env } from '../../palette';
import type { ViewState } from '../state';

/** What a backdrop drawing gets, including the three parallax offsets. */
export interface BackdropArt {
  ctx: CanvasRenderingContext2D;
  v: ViewState;
  env: Env;
  floorY: number;
  /** Parallax scroll offsets: far walls, middle ground, floor. */
  far: number; mid: number; near: number;
  /** Animation clock. */
  c: number;
}
