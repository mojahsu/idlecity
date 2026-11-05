import type { Env } from '../palette';

/** Something standing on the ground that the renderer depth-sorts with the units. */
export interface Actor { y: number; draw: (ctx: CanvasRenderingContext2D, env: Env) => void }
