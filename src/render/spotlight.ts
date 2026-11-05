// The spotlight: every so often one villager, adventurer or child is picked
// and followed for a while with a small card saying who they are and what
// they are doing, so a watcher gets to know the town's people one by one.
import type { GameState, Worker } from '../sim/types';
import { ageOf } from '../sim/population';
import { isLazy } from '../sim/leisure';
import { t } from '../i18n';
import { TILE } from './constants';
import { circle, roundRect, type Env } from './palette';

type Target = { kind: 'worker' | 'adventurer' | 'child'; id: number };

export class Spotlight {
  private target: Target | null = null;
  private timer = 6;
  private fade = 0;
  private last = { x: 0, y: 0 };

  update(s: GameState, env: Env, dt: number): void {
    this.timer -= dt;
    const alive = this.target && this.find(s, this.target);
    if (!alive && this.target) { this.target = null; this.timer = Math.min(this.timer, 2); }
    if (this.timer <= 0) {
      if (this.target) { this.target = null; this.timer = 4 + Math.random() * 6; }
      else { this.target = this.pick(s, env); this.timer = this.target ? 14 + Math.random() * 10 : 3; }
    }
    this.fade = Math.max(0, Math.min(1, this.fade + (this.target ? dt * 2 : -dt * 2)));
  }

  private find(s: GameState, tg: Target): { x: number; y: number } | null {
    if (tg.kind === 'worker') { const w = s.workers.find((x) => x.id === tg.id); return w ? w : null; }
    if (tg.kind === 'adventurer') { const a = s.adventurers.find((x) => x.id === tg.id); return a && (a.status === 'resting' || a.status === 'arriving') ? a : null; }
    const c = (s.children ?? []).find((x) => x.id === tg.id);
    return c ? this.last : null;
  }

  /** Prefer people doing something worth a look: a pastime, a load on the back, a drink too many. */
  private pick(s: GameState, env: Env): Target | null {
    const pool: { t: Target; w: number }[] = [];
    for (const w of s.workers) {
      if (w.task?.kind === 'sleep') continue;
      const rest = w.task?.kind === 'rest' && w.task.phase === 'do';
      pool.push({ t: { kind: 'worker', id: w.id }, w: rest ? 4 : w.carrying ? 2 : 1 });
    }
    for (const a of s.adventurers) if (a.status === 'resting' && env.dark < 0.6) pool.push({ t: { kind: 'adventurer', id: a.id }, w: 2 });
    const total = pool.reduce((n, p) => n + p.w, 0);
    if (!total) return null;
    let r = Math.random() * total;
    for (const p of pool) { r -= p.w; if (r <= 0) return p.t; }
    return pool[pool.length - 1].t;
  }

  private describe(s: GameState, w: Worker): [string, string] {
    const head = `${w.name} · ${t('ui.age', { age: Math.floor(ageOf(w)) })} · ${t(`job.${w.job}`)}${isLazy(w) ? ' · ' + t('ui.lazy') : ''}`;
    const tk = w.task;
    let line = t('act.idle');
    if (!tk) line = t('act.idle');
    else if (tk.kind === 'rest') line = tk.phase === 'do' ? t(`act.${tk.activity}`) : t('act.walk');
    else if (tk.kind === 'gather') line = tk.phase === 'return' ? t('act.carry', { res: `res.${tk.resource}` }) : tk.phase === 'work' ? t('act.gather') : t('act.walk');
    else if (tk.kind === 'farm') line = tk.phase === 'return' ? t('act.carry', { res: 'res.food' }) : tk.phase === 'work' ? t('act.farm') : t('act.walk');
    else if (tk.kind === 'build') line = tk.phase === 'work' ? t('act.build') : t('act.walk');
    else if (tk.kind === 'sleep') line = t('act.sleep');
    else if (tk.kind === 'douse') line = t('act.douse');
    else if (tk.kind === 'arrive') line = t('act.arrive');
    return [head, line];
  }

  draw(ctx: CanvasRenderingContext2D, s: GameState, env: Env, W: number): void {
    if (!this.target || this.fade <= 0) return;
    let pos: { x: number; y: number } | null = null, head = '', line = '';
    if (this.target.kind === 'worker') {
      const w = s.workers.find((x) => x.id === this.target!.id);
      if (!w) return;
      pos = w; [head, line] = this.describe(s, w);
    } else if (this.target.kind === 'adventurer') {
      const a = s.adventurers.find((x) => x.id === this.target!.id);
      if (!a) return;
      pos = a; head = `${a.name} · ${t(`class.${a.cls}`)} ${t('ui.level', { level: a.level })}`; line = t(`ui.${a.status}`);
    }
    if (!pos) return;
    this.last = { x: pos.x, y: pos.y };
    const px = pos.x * TILE + TILE / 2, py = pos.y * TILE + TILE / 2 + 6;
    ctx.save(); ctx.globalAlpha = this.fade;
    // A soft ring on the ground and a pointer above the head.
    ctx.strokeStyle = '#ffe080'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(px, py, 9 + Math.sin(env.clock * 4) * 1, 4, 0, 0, Math.PI * 2); ctx.stroke();
    const bob = Math.sin(env.clock * 5) * 1.5;
    ctx.fillStyle = '#ffe080'; ctx.beginPath(); ctx.moveTo(px, py - 24 + bob); ctx.lineTo(px - 3, py - 29 + bob); ctx.lineTo(px + 3, py - 29 + bob); ctx.closePath(); ctx.fill();
    // The card, kept inside the map.
    ctx.font = 'bold 9px system-ui, sans-serif';
    const w1 = ctx.measureText(head).width; ctx.font = '8px system-ui, sans-serif'; const w2 = ctx.measureText(line).width;
    const cw = Math.max(w1, w2) + 14, ch = 24;
    const cx = Math.max(4, Math.min(W - cw - 4, px - cw / 2)), cy = Math.max(4, py - 54);
    roundRect(ctx, cx, cy, cw, ch, 4, 'rgba(20,16,12,0.82)');
    ctx.strokeStyle = 'rgba(255,224,128,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1, 4); ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = '#ffe9b0'; ctx.font = 'bold 9px system-ui, sans-serif'; ctx.fillText(head, cx + 7, cy + 10);
    ctx.fillStyle = '#e8e0d0'; ctx.font = '8px system-ui, sans-serif'; ctx.fillText(line, cx + 7, cy + 19);
    circle(ctx, px, py - 31 + bob, 0, '#000');
    ctx.restore();
  }
}
