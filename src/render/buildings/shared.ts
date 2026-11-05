// Pieces every building is built from: walls, roofs, doors, windows, flags,
// torches, plus the stretch that makes buildings taller than their tile.
import type { Building, GameState } from '../../sim/types';
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, line, shade, rgba, type Env } from '../palette';

/** Everything a building's art needs, computed once per frame in drawBuilding. */
export interface BuildingArt {
  ctx: CanvasRenderingContext2D;
  s: GameState;
  b: Building;
  env: Env;
  /** Tile origin in logical pixels. */
  px: number; py: number;
  /** Tile centre and the ground line. */
  cx: number; cy: number; bottom: number;
  o: Opts;
  snow: boolean;
  /** Per-building variation, 0..1. */
  v: number;
}

export interface LightSource { x: number; y: number; r: number; color: string; flicker: number }

export interface SmokeSource { x: number; y: number; rate: number; color: string; size: number }

/**
 * Buildings are drawn at tile scale and then stretched upward from the ground
 * line so people (drawn at ~60%) look about a quarter of a house tall.
 * [horizontal, vertical] factors per type; flat things stay as they are.
 */
export const STRETCH: Partial<Record<Building['type'], [number, number]>> = {
  hut: [1.05, 1.35], house: [1.05, 1.5], lumberCamp: [1.05, 1.3], granary: [1.05, 1.5], tavern: [1.05, 1.55],
  blacksmith: [1.05, 1.45], market: [1.05, 1.3], chapel: [1.05, 1.5], guildHall: [1.05, 1.55], walls: [1, 1.5],
  keep: [1.08, 1.5], well: [1, 1.25], mine: [1, 1.2], quarry: [1, 1.15],
};

export function stretchOf(type: Building['type']): [number, number] { return STRETCH[type] ?? [1, 1]; }

/** Map a y drawn in tile space to where the stretch puts it on screen. */
export function stretchY(type: Building['type'], py: number, y: number): number {
  const ground = py + TILE;
  return ground - (ground - y) * stretchOf(type)[1];
}

// ---- shared pieces ----------------------------------------------------------
export interface Opts { lit: boolean; env: Env }

export function roofShingles(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, apexX: number, apexY: number, color: string): void {
  poly(ctx, [x1, y1, apexX, apexY, x2, y2], color);
  ctx.strokeStyle = rgba('#000000', 0.18); ctx.lineWidth = 1;
  const rows = 3;
  for (let i = 1; i < rows; i++) {
    const t = i / rows;
    ctx.beginPath(); ctx.moveTo(x1 + (apexX - x1) * t, y1 + (apexY - y1) * t); ctx.lineTo(x2 + (apexX - x2) * t, y2 + (apexY - y2) * t); ctx.stroke();
  }
  poly(ctx, [x1, y1, apexX, apexY, apexX, apexY + 1.5, x1 + 1, y1 + 1.5], shade(color, 0.18));
}

export function thatch(ctx: CanvasRenderingContext2D, cx: number, baseY: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(cx - w / 2 - 2, baseY); ctx.quadraticCurveTo(cx - w / 2, baseY - h, cx, baseY - h - 2); ctx.quadraticCurveTo(cx + w / 2, baseY - h, cx + w / 2 + 2, baseY); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba('#000000', 0.15); ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx + i * (w / 6), baseY - 1); ctx.lineTo(cx + i * (w / 9), baseY - h * 0.7); ctx.stroke(); }
  ctx.fillStyle = shade(color, 0.25); ctx.beginPath(); ctx.ellipse(cx - w * 0.15, baseY - h * 0.75, w * 0.2, h * 0.14, -0.3, 0, Math.PI * 2); ctx.fill();
}

export function wallBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, stone = false): void {
  rect(ctx, x, y, w, h, color);
  rect(ctx, x, y, w, 1.5, shade(color, 0.25));
  rect(ctx, x + w - 2, y, 2, h, shade(color, -0.2));
  if (stone) {
    ctx.strokeStyle = rgba('#000000', 0.16); ctx.lineWidth = 1;
    for (let r = 1; r * 4 < h; r++) { ctx.beginPath(); ctx.moveTo(x, y + r * 4); ctx.lineTo(x + w, y + r * 4); ctx.stroke(); }
    for (let r = 0; r * 4 < h; r++) for (let c = (r % 2) ? 3 : 7; c < w; c += 7) { ctx.beginPath(); ctx.moveTo(x + c, y + r * 4); ctx.lineTo(x + c, y + Math.min(h, (r + 1) * 4)); ctx.stroke(); }
  }
}

export function timberFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.strokeStyle = color; ctx.lineWidth = 1.2;
  ctx.strokeRect(x + 0.6, y + 0.6, w - 1.2, h - 1.2);
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w * 0.4, y); ctx.moveTo(x + w * 0.6, y); ctx.lineTo(x + w, y + h); ctx.stroke();
}

export function window_(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, o: Opts, tint = '#ffd870'): void {
  rect(ctx, x - 1, y - 1, w + 2, h + 2, '#4a3a2a');
  rect(ctx, x, y, w, h, o.lit ? tint : '#273041');
  if (!o.lit) rect(ctx, x, y, w * 0.4, h * 0.4, rgba('#ffffff', 0.25));
  line(ctx, x + w / 2, y, x + w / 2, y + h, '#4a3a2a', 0.8);
}

export function door(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color = '#4a2e18'): void {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, [w / 2, w / 2, 0, 0]); ctx.fill();
  circle(ctx, x + w - 1.5, y + h * 0.55, 0.7, '#e0c060');
}

export function chimney(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  rect(ctx, x, y, 4, 7, '#6a5a52'); rect(ctx, x - 0.5, y - 1, 5, 2, '#7f706a');
}

export function flag(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, color: string, env: Env, w = 7): void {
  rect(ctx, x, y - h, 1.2, h, '#5a3a1e');
  const wave = Math.sin(env.clock * 6 + x) * 1.2;
  poly(ctx, [x + 1.2, y - h, x + 1.2 + w, y - h + 1.5 + wave, x + 1.2, y - h + 4], color);
  poly(ctx, [x + 1.2, y - h + 1.5, x + 1.2 + w * 0.6, y - h + 2 + wave * 0.6, x + 1.2, y - h + 3.2], shade(color, 0.25));
}

export function torch(ctx: CanvasRenderingContext2D, x: number, y: number, env: Env): void {
  rect(ctx, x - 0.6, y, 1.2, 5, '#5a3a1e');
  if (env.dark > 0.2) {
    const f = 1 + 0.3 * Math.sin(env.clock * 11 + x);
    ellipse(ctx, x, y - 1.5 * f, 1.6, 2.4 * f, '#ff9a30'); ellipse(ctx, x, y - 1 * f, 0.8, 1.3 * f, '#ffe080');
  } else circle(ctx, x, y - 0.5, 1.2, '#3a2a1a');
}
