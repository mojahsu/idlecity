// Generic villagers for the ambient town-life layer: strollers, children, brides, mourners, cheering crowds.
import { circle, ellipse, poly, rect, shade, rgba, hash, type Env } from '../palette';
import { WORKER_SCALE, SKIN, HAIR, TUNICS, pose, body, withUnit, villagerFig, type Fig } from './shared';

/**
 * A generic villager at absolute tile coordinates. `seed` picks the colours;
 * `child` draws a half-height figure. Used by the ambient town life layer.
 */
export interface TownsfolkOpts {
  child?: boolean;
  basket?: boolean;
  /** Override the tunic colour (mourners, the bride). */
  tunic?: string;
  /** Veil and bouquet. */
  bride?: boolean;
  /** Arms in the air, bouncing. */
  cheer?: boolean;
  /** Red cheeks and a weaving walk. */
  tipsy?: boolean;
}

export function drawTownsfolk(ctx: CanvasRenderingContext2D, x: number, y: number, dir0: number, moving: boolean, env: Env, seed: number, opts: TownsfolkOpts = {}): void {
  let dir = dir0;
  const p = pose(moving, false, env.clock, seed);
  if (opts.cheer) p.bob = Math.abs(Math.sin(env.clock * 7 + seed)) * -3;
  const skin = SKIN[Math.floor(hash(seed, 1) * SKIN.length)], hair = HAIR[Math.floor(hash(seed, 2) * HAIR.length)];
  const COARSE_CLOTH = ['#b8ab92', '#a89b82', '#c2b59c', '#9e9078'];
  const baseTunic = TUNICS[Math.floor(hash(seed, 4) * TUNICS.length)];
  const tunic = opts.tunic ?? (
    env.clothTier === 0
      ? COARSE_CLOTH[seed % COARSE_CLOTH.length]
      : env.clothTier === 1
        ? shade(baseTunic, -0.18)
        : baseTunic
  );
  const child = !!opts.child;
  const wob = opts.tipsy ? Math.sin(env.clock * 5 + seed) : 0;
  if (opts.tipsy) dir = Math.sin(env.clock * 2.5 + seed) > -0.6 ? dir : -dir;
  const baseFig = villagerFig(seed);
  const fig: Fig = opts.bride
    ? { ref: baseFig.ref, tint: '#ffffff', tintA: 0.6 }
    : { ref: baseFig.ref, tintA: env.clothTier === 0 ? 0.62 : env.clothTier === 1 ? 0.46 : 0.38 };
  withUnit(ctx, x + wob * 0.08, y, dir, p.bob + wob, () => {
    const spr = body(ctx, tunic, skin, hair, p, (hash(seed, 5) > 0.5 && !child) || !!opts.bride, fig);
    if (env.clothTier >= 3 && !child && !opts.bride) {
      rect(ctx, -2.6, -10.4, 5.2, 0.7, '#ebd078');
    }
    if (opts.tipsy && !spr) { circle(ctx, 1.2, -12, 1.1, 'rgba(240,80,80,0.55)'); circle(ctx, -1.6, -12, 1.1, 'rgba(240,80,80,0.55)'); }
    if (opts.cheer && !spr) { rect(ctx, -5.2, -15, 1.6, 6, tunic); rect(ctx, 3.6, -15, 1.6, 6, tunic); circle(ctx, -4.4, -15.5, 1.1, skin); circle(ctx, 4.4, -15.5, 1.1, skin); }
    if (opts.bride) { poly(ctx, [-4, -14, 0, -17.5, 4, -14, 4.5, -4, -4.5, -4], 'rgba(255,255,255,0.55)'); circle(ctx, 4.5, -6, 1.6, '#f29ac6'); circle(ctx, 5.5, -7, 1.2, '#ffffff'); }
    else if (!spr && !child && !opts.tunic && hash(seed, 6) > 0.6) { ctx.fillStyle = shade(tunic, -0.3); ctx.beginPath(); ctx.arc(0, -13.4, 3.9, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); }
    if (opts.basket) { ellipse(ctx, 4.5, -5, 2.6, 1.8, '#b08a52'); circle(ctx, 3.8, -6, 0.9, '#d83a4a'); circle(ctx, 5.4, -6.2, 0.9, '#8fcf7a'); }
  }, child ? WORKER_SCALE * 0.68 : WORKER_SCALE);
}
