// The harvest festival evening: dancers round the fire, lantern strings over the square, a title.
import type { GameState } from '../../sim/types';
import { t } from '../../i18n';
import { TILE } from '../constants';
import type { LightSource } from '../buildings';
import { circle, line, rect, rgba, type Env } from '../palette';
import { drawTownsfolk } from '../units';
import type { Actor } from './shared';

export class Festival {
  actors(s: GameState, env: Env): Actor[] {
    if (!env.festival) return [];
    const out: Actor[] = [];
    const c = s.center;
    for (let i = 0; i < 8; i++) {
      const arm = i % 4, inner = i >= 4;
      const r = inner ? 0.5 : 1.15 + Math.sin(env.clock * 2.2 + i) * 0.3;
      const ang = inner ? Math.PI / 4 + arm * Math.PI / 2 + env.clock * 0.8 : arm * Math.PI / 2;
      const x = c.x + Math.cos(ang) * r, y = c.y + Math.sin(ang) * r * 0.8;
      out.push({ y: y + 0.8, draw: (ctx, e) => drawTownsfolk(ctx, x, y, Math.cos(ang) >= 0 ? -1 : 1, true, e, 900 + i, { child: i >= 6 }) });
    }
    return out;
  }

  overlay(ctx: CanvasRenderingContext2D, env: Env, s: GameState): void {
    if (!env.festival) return;
    const c = s.center, cx = c.x * TILE + TILE / 2, cy = c.y * TILE + TILE / 2 - 22;
    for (const [ax, ay] of [[1, 0], [0, 1]] as [number, number][]) {
      const x1 = cx - ax * 2.6 * TILE, y1 = cy - ay * 2.6 * TILE, x2 = cx + ax * 2.6 * TILE, y2 = cy + ay * 2.6 * TILE;
      line(ctx, x1, y1, x2, y2, 'rgba(60,40,20,0.7)', 1);
      for (let k = 0; k <= 8; k++) { const q = k / 8, lx = x1 + (x2 - x1) * q, ly = y1 + (y2 - y1) * q + Math.sin(q * Math.PI) * 4 + Math.sin(env.clock * 3 + k) * 1.5; const col = k % 2 ? '#ff8040' : '#ffd040'; rect(ctx, lx - 2, ly, 4, 5, col); rect(ctx, lx - 2.5, ly, 5, 1, '#5a3a1e'); if (env.dark > 0.3) circle(ctx, lx, ly + 2.5, 7, rgba(col, 0.25)); }
    }
    ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(t('ui.festival'), cx, cy - 34); ctx.fillStyle = '#ffd060'; ctx.fillText(t('ui.festival'), cx, cy - 34);
  }

  lights(s: GameState, env: Env): LightSource[] {
    if (!env.festival) return [];
    const out: LightSource[] = [];
    const c = s.center;
    for (const [ax, ay] of [[1, 0], [0, 1]] as [number, number][]) for (let k = 0; k <= 8; k++) { const q = k / 8 - 0.5; out.push({ x: c.x * TILE + TILE / 2 + ax * q * 5.2 * TILE, y: c.y * TILE + TILE / 2 - 20 + ay * q * 5.2 * TILE, r: 16, color: k % 2 ? '#ff9050' : '#ffd060', flicker: 0.1 }); }
    return out;
  }
}
