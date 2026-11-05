// Layout and text helpers for the panel: hero slots, fitted names, health bars.
import type { Adventurer, GameState, Party } from '../../sim/types';
import { rect, rgba } from '../palette';

/** A health bar with a dark rim, a gradient fill and a highlight line. */
export function hpBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, k: number, color: string): void {
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.beginPath(); ctx.roundRect(x - 1, y - 1, w + 2, h + 2, 2); ctx.fill();
  if (k > 0) {
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, color); g.addColorStop(1, rgba(color, 0.6));
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w * k, h, 1.5); ctx.fill();
    rect(ctx, x, y, w * k, h * 0.35, 'rgba(255,255,255,0.3)');
  }
}

export function members(s: GameState, p: Party): Adventurer[] {
  return p.memberIds.map((id) => s.adventurers.find((a) => a.id === id)!).filter((a) => a && a.status === 'questing');
}

/** Horizontal room per hero; names are shrunk and then clipped to fit inside it. */
export const HERO_GAP = 40;

export function heroX(i: number): number { return 24 + i * HERO_GAP; }

/** Draw a label centred at (x, y), stepping the font down and finally clipping so it never spills past `maxW`. */
export function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number): void {
  for (const size of [8, 7.5, 7, 6.5]) {
    ctx.font = `${size}px system-ui, sans-serif`;
    if (ctx.measureText(text).width <= maxW) { ctx.fillText(text, x, y); return; }
  }
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  ctx.fillText(t + '…', x, y);
}
