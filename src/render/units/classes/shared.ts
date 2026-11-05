import type { Env } from '../../palette';
import type { Pose } from '../shared';

/** What a class drawing gets. */
export interface ClassArt {
  ctx: CanvasRenderingContext2D;
  p: Pose;
  moving: boolean;
  env: Env;
  level: number;
  gear: number;
  /** Cape flutter offset. */
  flutter: number;
}
