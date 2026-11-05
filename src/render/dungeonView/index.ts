// Inset "camera" into a dungeon: shows the party fighting floor by floor.
// Animations are derived from HP changes between frames (step.ts), so the sim
// stays untouched. One panel per party underground, stacked bottom-left.
import type { GameState } from '../../sim/types';
import type { Env } from '../palette';
import { PANEL_H, PANEL_SCALE, PANEL_W } from './layout';
import { newViewState, type ViewState } from './state';
import { step } from './step';
import { drawPanel } from './panel';
export { PANEL_H, PANEL_SCALE, PANEL_W } from './layout';

export class DungeonView {
  private views = new Map<number, ViewState>();

  update(s: GameState, env: Env, dt: number): void {
    const seen = new Set<number>();
    for (const p of s.parties) {
      if (p.phase !== 'explore' && p.phase !== 'fight') continue;
      seen.add(p.id);
      let v = this.views.get(p.id);
      if (!v) { v = newViewState(p.floor); this.views.set(p.id, v); }
      step(s, p, v, env, dt);
    }
    for (const k of [...this.views.keys()]) if (!seen.has(k)) this.views.delete(k);
  }

  draw(ctx: CanvasRenderingContext2D, s: GameState, env: Env, W: number, H: number): void {
    // Panels sit along the bottom edge, side by side, scaled so two of them span under half the map.
    const scale = Math.min(PANEL_SCALE, (W * 0.44) / PANEL_W);
    let k = 0;
    for (const p of s.parties) {
      const v = this.views.get(p.id);
      if (!v) continue;
      const x = 8 + k * (PANEL_W * scale + 8), y = H - 8 - PANEL_H * scale;
      ctx.save(); ctx.translate(x + (v.shake > 0 ? Math.sin(env.clock * 70) * v.shake * 10 : 0), y + (v.shake > 0 ? Math.cos(env.clock * 90) * v.shake * 6 : 0));
      ctx.scale(scale, scale);
      drawPanel(ctx, s, p, v, env);
      ctx.restore();
      k++;
    }
  }

}
