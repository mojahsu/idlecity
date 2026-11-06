// Interactive click easter eggs ("God-Hand" touches): clicking sleeping villagers
// startles them, clicking awake villagers/heroes makes them wave back with a
// speech bubble, clicking trees shakes loose leaves and apples, and clicking
// water makes fish jump with splash ripples. Purely visual; never mutates GameState.
import type { GameState } from '../../sim/types';
import { isIndoors } from '../../sim/workers';
import { t } from '../../i18n';
import { TILE } from '../constants';
import { circle, ellipse, poly, rgba, type Env } from '../palette';
import { bubble } from '../units/shared';
import type { Bits } from './bits';
import type { River } from './river';

interface ClickBubble { x: number; y: number; text: string; color: string; ttl: number; life: number }
interface ClickRipple { x: number; y: number; color: string; ttl: number; life: number }
interface FallingApple { x: number; y: number; vy: number; groundY: number; ttl: number }

export class ClickEasterEggs {
  private bubbles: ClickBubble[] = [];
  private ripples: ClickRipple[] = [];
  private apples: FallingApple[] = [];

  handleClick(s: GameState, tx: number, ty: number, bits: Bits, river: River): void {
    const px = tx * TILE, py = ty * TILE;
    // 1. Check workers near the click.
    for (const w of s.workers) {
      if (isIndoors(s, w)) continue;
      if (Math.hypot(w.x + 0.5 - tx, w.y + 0.5 - ty) < 0.9) {
        const wx = w.x * TILE + TILE / 2, wy = w.y * TILE + TILE / 2;
        const sleeping = w.task?.kind === 'sleep' || (w.task?.kind === 'rest' && w.task.activity === 'nap');
        if (sleeping) {
          this.bubbles.push({ x: wx, y: wy - 20, text: t('talk.v.startled'), color: '#d84030', ttl: 1.8, life: 1.8 });
          this.ripples.push({ x: wx, y: wy + 3, color: '#ffe070', ttl: 0.55, life: 0.55 });
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            bits.push({ x: wx, y: wy - 10, vx: Math.cos(a) * 22, vy: Math.sin(a) * 18 - 14, color: '#90d8ff', ttl: 0.5 });
          }
        } else {
          const idx = Math.floor(Math.random() * 3);
          this.bubbles.push({ x: wx, y: wy - 20, text: t(`talk.v.poke.${idx}`), color: '#4a7a38', ttl: 1.8, life: 1.8 });
          this.ripples.push({ x: wx, y: wy + 3, color: '#a8f080', ttl: 0.55, life: 0.55 });
          for (let i = 0; i < 5; i++) {
            bits.push({ x: wx + (Math.random() - 0.5) * 8, y: wy - 12, vx: (Math.random() - 0.5) * 14, vy: -18 - Math.random() * 12, color: '#ffd860', ttl: 0.65 });
          }
        }
        return;
      }
    }

    // 2. Check resting/arriving adventurers near the click.
    for (const a of s.adventurers) {
      if (a.status !== 'resting' && a.status !== 'arriving') continue;
      if (Math.hypot(a.x + 0.5 - tx, a.y + 0.5 - ty) < 0.9) {
        const ax = a.x * TILE + TILE / 2, ay = a.y * TILE + TILE / 2;
        this.bubbles.push({ x: ax, y: ay - 22, text: t('talk.h.poke'), color: '#c87820', ttl: 1.8, life: 1.8 });
        this.ripples.push({ x: ax, y: ay + 4, color: '#ffd060', ttl: 0.6, life: 0.6 });
        for (let i = 0; i < 6; i++) {
          bits.push({ x: ax + (Math.random() - 0.5) * 8, y: ay - 12, vx: (Math.random() - 0.5) * 18, vy: -20 - Math.random() * 14, color: '#ffe880', ttl: 0.7 });
        }
        return;
      }
    }

    // 3. Check tile terrain (water splash & fish, or forest leaf burst & falling apple).
    const gx = Math.floor(tx), gy = Math.floor(ty);
    const tile = s.tiles[gy * s.width + gx];
    if (tile?.terrain === 'water') {
      river.spawnSplash(tx, ty);
      this.ripples.push({ x: px, y: py, color: '#bce8ff', ttl: 0.75, life: 0.75 });
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        bits.push({ x: px, y: py, vx: Math.cos(ang) * 20, vy: Math.sin(ang) * 12 - 22, color: '#d8f4ff', ttl: 0.55 });
      }
      return;
    }
    if (tile?.terrain === 'forest' && tile.amount >= 1) {
      const cx = gx * TILE + TILE / 2, cy = gy * TILE + TILE / 2;
      for (let i = 0; i < 9; i++) {
        bits.push({
          x: cx + (Math.random() - 0.5) * 14,
          y: cy - 10 + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 24,
          vy: -10 + Math.random() * 16,
          color: i % 3 === 0 ? '#d8a838' : '#58a844',
          ttl: 0.85,
        });
      }
      this.apples.push({ x: cx + (Math.random() - 0.5) * 8, y: cy - 8, vy: -18, groundY: cy + 5, ttl: 2.2 });
      return;
    }

    // 4. Default ground touch sparkle.
    this.ripples.push({ x: px, y: py, color: '#ffe890', ttl: 0.5, life: 0.5 });
    for (let i = 0; i < 4; i++) {
      bits.push({ x: px, y: py, vx: (Math.random() - 0.5) * 16, vy: -14 - Math.random() * 12, color: '#ffe890', ttl: 0.5 });
    }
  }

  update(dt: number): void {
    for (const b of this.bubbles) b.ttl -= dt;
    this.bubbles = this.bubbles.filter((b) => b.ttl > 0);
    for (const r of this.ripples) r.ttl -= dt;
    this.ripples = this.ripples.filter((r) => r.ttl > 0);
    for (const ap of this.apples) {
      ap.ttl -= dt;
      ap.y += ap.vy * dt;
      ap.vy += 95 * dt;
      if (ap.y > ap.groundY) { ap.y = ap.groundY; ap.vy = -Math.abs(ap.vy) * 0.42; }
    }
    this.apples = this.apples.filter((ap) => ap.ttl > 0);
  }

  overlay(ctx: CanvasRenderingContext2D, env: Env): void {
    void env;
    for (const r of this.ripples) {
      const k = 1 - r.ttl / r.life;
      ctx.strokeStyle = rgba(r.color, 0.8 * (1 - k));
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, 3 + k * 11, 1.5 + k * 5, 0, 0, Math.PI * 2); ctx.stroke();
    }
    for (const ap of this.apples) {
      ctx.save(); ctx.globalAlpha = Math.min(1, ap.ttl);
      ellipse(ctx, ap.x, ap.groundY + 1, 2.2, 0.8, 'rgba(0,0,0,0.25)');
      circle(ctx, ap.x, ap.y, 2.1, '#e03838');
      circle(ctx, ap.x - 0.6, ap.y - 0.6, 0.7, '#ff9090');
      poly(ctx, [ap.x, ap.y - 2, ap.x + 1.8, ap.y - 3.2, ap.x + 0.8, ap.y - 1.5], '#4ca838');
      ctx.restore();
    }
    for (const b of this.bubbles) {
      const a = Math.min(1, b.ttl / 0.3, (b.life - b.ttl) / 0.15 + 0.2);
      bubble(ctx, b.x, b.y - (1 - b.ttl / b.life) * 4, b.text, a, b.color);
    }
  }
}
