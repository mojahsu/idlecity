// Time-of-day colour grading, night darkness with light cut-outs and glows,
// sun rays, morning fog, rain gloom and a soft vignette.
import type { GameState } from '../../sim/types';
import type { LightSource } from '../buildings';
import { skyTint, type Env } from '../palette';
import { drawNight } from './night';
import { drawRays } from './rays';
import { drawFog } from './fog';
import type { GlowDot } from './shared';
export type { GlowDot } from './shared';
export { drawVignette } from './vignette';

export class Lighting {
  private night = document.createElement('canvas');

  draw(ctx: CanvasRenderingContext2D, s: GameState, env: Env, W: number, H: number, lights: LightSource[], dots: GlowDot[]): void {
    const tint = skyTint(env);
    if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H); }
    if (env.rainy) { ctx.fillStyle = 'rgba(40,50,80,0.2)'; ctx.fillRect(0, 0, W, H); }
    drawRays(ctx, env, W, H);
    if (env.dark > 0) drawNight(ctx, env, W, H, lights, dots, this.night);
    if (env.foggy) drawFog(ctx, env, W, H);
    void s;
  }
}
