// What every figure is built from: scale, palette, the walking pose, the body
// and the unit transform. Figures are drawn around (0,0) = feet centre, facing +x.
import { TILE } from '../constants';
import { circle, poly, rect, groundShadow, shade, hash } from '../palette';

/** People are drawn small relative to buildings; adventurers a touch larger than townsfolk. */
export const WORKER_SCALE = 0.6;

export const HERO_SCALE = 0.7;

export const OUTLINE = 'rgba(20,15,10,0.45)';

export const SKIN = ['#f2c9a0', '#e8b88a', '#c98f62', '#8d5a3b'];

export const HAIR = ['#2b1d12', '#5a3a1e', '#a8702a', '#d9b65a', '#8a8a8a', '#b03a2a'];

/** Which way a unit faces: +1 right, -1 left. */
export function facing(x: number, path: { x: number; y: number }[], id: number): number {
  if (path.length) { const dx = path[0].x - x; if (Math.abs(dx) > 0.01) return dx > 0 ? 1 : -1; }
  return hash(id, 3) > 0.5 ? 1 : -1;
}

export interface Pose { walk: number; bob: number; swing: number }

export function pose(moving: boolean, working: boolean, clock: number, id: number): Pose {
  const t = clock * 11 + id;
  return {
    walk: moving ? Math.sin(t) : 0,
    bob: moving ? Math.abs(Math.sin(t)) * -1.2 : working ? Math.abs(Math.sin(clock * 8 + id)) * -1 : Math.sin(clock * 2 + id) * 0.3,
    swing: working ? Math.sin(clock * 8 + id) : 0,
  };
}

/** Body shared by everyone: legs, tunic, head. Drawn around (0,0) = feet centre, facing +x. */
export function body(ctx: CanvasRenderingContext2D, tunic: string, skin: string, hair: string, p: Pose, robe = false): void {
  // Legs.
  const legA = p.walk * 2, legB = -p.walk * 2;
  if (!robe) {
    rect(ctx, -2.6 + legA * 0.3, -4, 2.2, 4, '#4a3a2a'); rect(ctx, 0.4 + legB * 0.3, -4, 2.2, 4, '#3f3222');
  }
  // Tunic / robe, with a thin outline so small figures still read against grass.
  ctx.lineWidth = 1; ctx.strokeStyle = OUTLINE;
  if (robe) { poly(ctx, [-4.5, 0, -3, -10, 3, -10, 4.5, 0], tunic); ctx.stroke(); }
  else { rect(ctx, -3.2, -10.5, 6.4, 7, tunic); ctx.strokeRect(-3.2, -10.5, 6.4, 7); rect(ctx, -3.2, -5, 6.4, 1.2, shade(tunic, -0.35)); }
  rect(ctx, -3.2, -10.5, 6.4, 1.2, shade(tunic, 0.2));
  // Arms.
  rect(ctx, -4.4, -9.5, 1.6, 4.5, tunic); rect(ctx, 2.8, -9.5, 1.6, 4.5, tunic);
  // Head.
  circle(ctx, 0, -13, 3.4, skin); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(0, -13.6, 3.4, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  rect(ctx, 1.2, -13.4, 0.9, 0.9, '#2a1a1a');
}

export function withUnit(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, bob: number, draw: () => void, scale = WORKER_SCALE): void {
  const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2 + 5;
  groundShadow(ctx, px, py + 0.5, 4.5 * scale + 1, 2 * scale + 0.5, 0.3);
  ctx.save(); ctx.translate(px, py + bob * scale); ctx.scale(dir * scale, scale);
  draw();
  ctx.restore();
}

/** A little speech bubble above a head: "…" for chatter, "!" for excitement, "~" for a tipsy hum. */
export function bubble(ctx: CanvasRenderingContext2D, px: number, py: number, text: string, alpha: number): void {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.roundRect(px - 5, py - 7, 10, 7, 2); ctx.fill();
  poly(ctx, [px - 2, py, px + 1, py, px - 1, py + 2], '#fffaf0');
  ctx.font = 'bold 6px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#3a2a1a'; ctx.fillText(text, px, py - 1.5);
  ctx.globalAlpha = 1;
}

// ---- townsfolk (ambient, not in the simulation) ---------------------------------
export const TUNICS = ['#b85a4a', '#6a8ab8', '#8a9a5a', '#b8a060', '#9a6a9a', '#7a8a8a', '#c08a5a', '#5a8a7a'];
