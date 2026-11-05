// Music notes from the tavern at night and the chapel bell with its rings.
import type { GameState } from '../../sim/types';
import { TILE } from '../constants';
import type { Env } from '../palette';

export interface Note { x: number; y: number; ttl: number; glyph: string; color: string }
export interface Ring { x: number; y: number; ttl: number }

export class Music {
  notes: Note[] = [];
  private rings: Ring[] = [];
  private noteTimer = 0;
  private bellTimer = 0;

  update(s: GameState, env: Env, dt: number): void {
    this.notes = this.notes.filter((n) => (n.ttl -= dt) > 0);
    this.rings = this.rings.filter((r) => (r.ttl -= dt) > 0);
    const tavern = s.buildings.find((b) => b.built && b.type === 'tavern');
    if (tavern && env.dark > 0.5 && env.dayFrac > 0.82) {
      this.noteTimer -= dt;
      if (this.noteTimer <= 0) {
        this.noteTimer = 1 + Math.random() * 1.6;
        this.notes.push({ x: tavern.x * TILE + TILE / 2 + (Math.random() - 0.5) * 10, y: tavern.y * TILE + 4, ttl: 2.2, glyph: Math.random() < 0.5 ? '♪' : '♫', color: '#ffd070' });
      }
    }
    const chapel = s.buildings.find((b) => b.built && b.type === 'chapel');
    if (chapel && env.bell > 0) {
      this.bellTimer -= dt;
      if (this.bellTimer <= 0) {
        this.bellTimer = 0.55;
        const bx = chapel.x * TILE + TILE / 2, by = chapel.y * TILE + TILE - (TILE + 9) * 1.5;
        this.notes.push({ x: bx + (Math.random() - 0.5) * 8, y: by, ttl: 2, glyph: '♪', color: '#f8f0d0' });
        this.rings.push({ x: bx, y: by, ttl: 1.2 });
      }
    }
  }

  /** Drawn above the lighting so it reads at night. */
  overlay(ctx: CanvasRenderingContext2D): void {
    ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center';
    for (const n of this.notes) {
      const k = 1 - n.ttl / 2.2;
      ctx.globalAlpha = n.ttl < 0.6 ? n.ttl / 0.6 : 1;
      ctx.fillStyle = n.color; ctx.fillText(n.glyph, n.x + Math.sin(k * 9) * 3, n.y - k * 26);
    }
    for (const r of this.rings) {
      const k = 1 - r.ttl / 1.2;
      ctx.globalAlpha = (1 - k) * 0.5; ctx.strokeStyle = '#fff4d0'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(r.x, r.y, 4 + k * 26, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
