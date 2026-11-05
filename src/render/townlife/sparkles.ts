// Stars when a resting adventurer levels up; sparks and a glow when the smith forges better gear.
import type { GameState } from '../../sim/types';
import { t } from '../../i18n';
import { TILE } from '../constants';
import { circle, rgba } from '../palette';
import type { Bits } from './bits';

export interface Sparkle { x: number; y: number; ttl: number; text: string }

export class Sparkles {
  private sparkles: Sparkle[] = [];
  private levels = new Map<number, number>();
  private equipment = -1;
  private forge = 0;

  /** Stars when a resting adventurer levels up; sparks when the smith forges better gear. */
  update(s: GameState, dt: number, bits: Bits): void {
    for (const a of s.adventurers) {
      const last = this.levels.get(a.id);
      if (last !== undefined && a.level > last && (a.status === 'resting' || a.status === 'arriving')) this.sparkles.push({ x: a.x, y: a.y, ttl: 1.6, text: t('ui.levelUpShort', { level: a.level }) });
      this.levels.set(a.id, a.level);
    }
    if (this.equipment >= 0 && s.equipment > this.equipment) {
      const sm = s.buildings.find((b) => b.built && b.type === 'blacksmith');
      if (sm) { this.forge = 1.2; for (let k = 0; k < 24; k++) bits.push({ x: sm.x * TILE + TILE / 2 - 3, y: sm.y * TILE + TILE - 6, vx: (Math.random() - 0.5) * 70, vy: -30 - Math.random() * 60, ttl: 0.5 + Math.random() * 0.5, color: k % 3 ? '#ffd040' : '#ffffff' }); }
    }
    this.equipment = s.equipment;
    this.forge = Math.max(0, this.forge - dt);
    this.sparkles = this.sparkles.filter((sp) => (sp.ttl -= dt) > 0);
  }

  overlay(ctx: CanvasRenderingContext2D, s: GameState): void {
    for (const sp of this.sparkles) {
      const k = 1 - sp.ttl / 1.6, px = sp.x * TILE + TILE / 2, py = sp.y * TILE + TILE / 2;
      ctx.globalAlpha = sp.ttl < 0.5 ? sp.ttl * 2 : 1;
      for (let i = 0; i < 6; i++) { const a = i * 1.05 + k * 2, r = 6 + k * 14; star(ctx, px + Math.cos(a) * r, py - 8 + Math.sin(a) * r * 0.6 - k * 10, 2.2, '#ffe060'); }
      ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(sp.text, px, py - 20 - k * 12); ctx.fillStyle = '#ffe060'; ctx.fillText(sp.text, px, py - 20 - k * 12);
    }
    ctx.globalAlpha = 1;
    if (this.forge > 0) { const sm = s.buildings.find((b) => b.built && b.type === 'blacksmith'); if (sm) circle(ctx, sm.x * TILE + TILE / 2 - 3, sm.y * TILE + TILE - 4, 14 * this.forge, rgba('#ffb040', 0.35 * this.forge)); }
  }
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}
