// The spotlight: every so often one villager, adventurer or child is picked
// and followed for a while with a small card saying who they are and what
// they are doing, so a watcher gets to know the town's people one by one.
// Clicking anything on the map locks the spotlight onto it for a while.
import type { Building, GameState, Worker } from '../sim/types';
import { DUNGEONS } from '../data/dungeons';
import { ageOf } from '../sim/population';
import { isLazy } from '../sim/leisure';
import { isIndoors } from '../sim/workers';
import { t } from '../i18n';
import { TILE } from './constants';
import { circle, roundRect, type Env } from './palette';
import type { ActiveSkitView } from './townlife/skits';

type Target =
  | { kind: 'worker' | 'adventurer' | 'child' | 'party' | 'building' | 'skit'; id: number }
  | { kind: 'dungeon'; id: string }
  | { kind: 'caravan'; id: number };

export class Spotlight {
  private target: Target | null = null;
  private timer = 6;
  private fade = 0;
  private last = { x: 0, y: 0 };
  private manual = false;

  /** Select the nearest person, party, caravan, dungeon or building at tile (tx, ty). */
  selectAt(s: GameState, tx: number, ty: number): void {
    let best: { tg: Target; d: number } | null = null;
    const consider = (tg: Target, x: number, y: number, maxD: number) => {
      const d = Math.hypot(x - tx, y - ty);
      if (d <= maxD && (!best || d < best.d)) best = { tg, d };
    };
    for (const p of s.parties) if (p.phase === 'travel' || p.phase === 'return') consider({ kind: 'party', id: p.id }, p.x + 0.5, p.y + 0.5, 1.3);
    for (const a of s.adventurers) if (a.status === 'resting' || a.status === 'arriving') consider({ kind: 'adventurer', id: a.id }, a.x + 0.5, a.y + 0.5, 1.2);
    for (const w of s.workers) if (!isIndoors(s, w)) consider({ kind: 'worker', id: w.id }, w.x + 0.5, w.y + 0.5, 1.2);
    if (s.caravan) consider({ kind: 'caravan', id: 0 }, s.caravan.x + 0.5, s.caravan.y + 0.5, 1.4);
    if (!best) {
      for (const d of s.dungeons) if (d.unlocked) consider({ kind: 'dungeon', id: d.id }, d.x + 0.5, d.y + 0.5, 1.2);
      for (const b of s.buildings) consider({ kind: 'building', id: b.id }, b.x + 0.5, b.y + 0.5, 0.9);
    }
    if (best) {
      this.target = (best as { tg: Target; d: number }).tg;
      this.timer = 18;
      this.fade = Math.max(this.fade, 0.4);
      this.manual = true;
    } else if (this.target) {
      this.target = null;
      this.timer = 4;
      this.manual = false;
    }
  }

  update(s: GameState, env: Env, dt: number, skit: ActiveSkitView | null = null): void {
    if (skit && !this.manual) {
      if (this.target?.kind !== 'skit' || this.target.id !== skit.id) {
        this.target = { kind: 'skit', id: skit.id };
        this.timer = 10;
      }
      this.fade = Math.min(1, this.fade + dt * 3);
      return;
    }
    if (this.target?.kind === 'skit' && !skit) {
      this.target = null;
      this.timer = 2.5;
    }
    this.timer -= dt;
    const alive = this.target && this.find(s, this.target, skit);
    if (!alive && this.target) { this.target = null; this.manual = false; this.timer = Math.min(this.timer, 2); }
    if (this.timer <= 0) {
      this.manual = false;
      if (this.target) { this.target = null; this.timer = 4 + Math.random() * 6; }
      else { this.target = this.pick(s, env); this.timer = this.target ? 14 + Math.random() * 10 : 3; }
    }
    this.fade = Math.max(0, Math.min(1, this.fade + (this.target ? dt * 2 : -dt * 2)));
  }

  private find(s: GameState, tg: Target, skit: ActiveSkitView | null): { x: number; y: number } | null {
    if (tg.kind === 'skit') return skit && skit.id === tg.id ? skit.a : null;
    if (tg.kind === 'worker') { const w = s.workers.find((x) => x.id === tg.id); return w && !isIndoors(s, w) ? w : null; }
    if (tg.kind === 'adventurer') { const a = s.adventurers.find((x) => x.id === tg.id); return a && (a.status === 'resting' || a.status === 'arriving') ? a : null; }
    if (tg.kind === 'party') { const p = s.parties.find((x) => x.id === tg.id); return p && (p.phase === 'travel' || p.phase === 'return') ? p : null; }
    if (tg.kind === 'caravan') return s.caravan ? s.caravan : null;
    if (tg.kind === 'dungeon') { const d = s.dungeons.find((x) => x.id === tg.id); return d ? d : null; }
    if (tg.kind === 'building') { const b = s.buildings.find((x) => x.id === tg.id); return b ? b : null; }
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
    else if (tk.kind === 'sleep') line = tk.phase === 'sleep' ? t('act.sleep') : t('act.walkHome');
    else if (tk.kind === 'douse') line = t('act.douse');
    else if (tk.kind === 'arrive') line = t('act.arrive');
    void s;
    return [head, line];
  }

  private describeBuilding(s: GameState, b: Building): [string, string] {
    const head = t(`building.${b.type}`);
    if (!b.built) return [head, t('ui.buildingProgress', { pct: Math.round(b.progress * 100) })];
    if (b.type === 'grave') {
      const graves = s.buildings.filter((x) => x.type === 'grave');
      const idx = graves.findIndex((x) => x.id === b.id);
      const fallen = s.adventurers.filter((a) => a.status === 'dead');
      const hero = idx >= 0 && idx < fallen.length ? fallen[idx] : null;
      return [head, hero ? t('ui.graveHero', { name: hero.name, cls: t(`class.${hero.cls}`), level: hero.level }) : t('ui.graveRest')];
    }
    if (b.type === 'blacksmith') return [head, `${t('ui.equipment')} ${t('ui.level', { level: s.equipment })}`];
    const inside = s.workers.filter((w) => Math.hypot(w.x - b.x, w.y - b.y) < 0.85).length
      + s.adventurers.filter((a) => a.status === 'resting' && Math.hypot(a.x - b.x, a.y - b.y) < 0.85).length;
    return [head, inside > 0 ? t('ui.indoorsCount', { count: inside }) : t(`tier.${s.tier}`)];
  }

  draw(ctx: CanvasRenderingContext2D, s: GameState, env: Env, W: number, skit: ActiveSkitView | null = null): void {
    if (!this.target || this.fade <= 0) return;
    if (this.target.kind === 'skit' && skit) {
      this.drawSkitCard(ctx, env, W, skit);
      return;
    }
    let pos: { x: number; y: number } | null = null, head = '', line = '';
    if (this.target.kind === 'worker') {
      const w = s.workers.find((x) => x.id === this.target!.id);
      if (!w) return;
      pos = w; [head, line] = this.describe(s, w);
    } else if (this.target.kind === 'adventurer') {
      const a = s.adventurers.find((x) => x.id === this.target!.id);
      if (!a) return;
      pos = a;
      head = `${a.name} · ${t(`class.${a.cls}`)} ${t('ui.level', { level: a.level })}`;
      line = a.status === 'resting' && a.pastime === 'train' ? t('ui.training')
        : a.status === 'resting' && a.pastime === 'sally' ? t('ui.defending')
        : a.status === 'resting' && a.pastime === 'drink' ? t('act.drink')
        : t(`ui.${a.status}`);
    } else if (this.target.kind === 'party') {
      const p = s.parties.find((x) => x.id === this.target!.id);
      if (!p) return;
      pos = p;
      const leader = s.adventurers.find((a) => a.id === p.memberIds[p.memberIds.length - 1]) ?? s.adventurers.find((a) => p.memberIds.includes(a.id));
      head = `${leader ? leader.name : t('ui.party')} · ×${p.memberIds.length}`;
      line = p.phase === 'return' ? t('ui.partyReturn', { gold: Math.round(p.loot.gold) }) : t('ui.partyTravel', { dungeon: t(`dungeon.${p.dungeon}`) });
    } else if (this.target.kind === 'caravan') {
      if (!s.caravan) return;
      pos = s.caravan;
      head = t('ui.caravanTitle');
      line = s.caravan.phase === 'trade' ? t('ui.caravanTrade') : t('ui.caravanRoad');
    } else if (this.target.kind === 'dungeon') {
      const d = s.dungeons.find((x) => x.id === this.target!.id);
      const def = DUNGEONS.find((x) => x.id === this.target!.id);
      if (!d || !def) return;
      pos = d;
      head = `${t(`dungeon.${d.id}`)} · ${t('ui.level', { level: def.level })}`;
      line = t('ui.dungeonRuns', { runs: d.runs, status: t(d.bossDefeated ? 'ui.bossDown' : 'ui.bossAlive') });
    } else if (this.target.kind === 'building') {
      const b = s.buildings.find((x) => x.id === this.target!.id);
      if (!b) return;
      pos = b; [head, line] = this.describeBuilding(s, b);
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

  private drawSkitCard(ctx: CanvasRenderingContext2D, env: Env, W: number, skit: ActiveSkitView): void {
    const sp = skit.activeIdx === 0 ? skit.a : skit.b;
    const ax = skit.a.x * TILE + TILE / 2, ay = skit.a.y * TILE + TILE / 2 + 6;
    const bx = skit.b.x * TILE + TILE / 2, by = skit.b.y * TILE + TILE / 2 + 6;
    const sx = sp.x * TILE + TILE / 2, sy = sp.y * TILE + TILE / 2 + 6;
    ctx.save();
    ctx.globalAlpha = this.fade;
    ctx.strokeStyle = '#ffe080';
    ctx.lineWidth = 1.4;
    const pulse = 9 + Math.sin(env.clock * 4) * 1;
    ctx.beginPath(); ctx.ellipse(ax, ay, pulse, 4, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(bx, by, pulse, 4, 0, 0, Math.PI * 2); ctx.stroke();
    const bob = Math.sin(env.clock * 5) * 1.5;
    ctx.fillStyle = '#ffe080';
    ctx.beginPath(); ctx.moveTo(sx, sy - 24 + bob); ctx.lineTo(sx - 3, sy - 29 + bob); ctx.lineTo(sx + 3, sy - 29 + bob); ctx.closePath(); ctx.fill();

    const head = `🎭 ${skit.a.name} ⇄ ${skit.b.name} · ${skit.topic}`;
    const prevText = skit.prevLine ? `${skit.prevSpeaker}: "${skit.prevLine}"` : null;
    const currText = `▸ ${sp.name}: "${skit.line}"`;

    ctx.font = 'bold 9px system-ui, sans-serif';
    const w1 = ctx.measureText(head).width;
    ctx.font = '8px system-ui, sans-serif';
    const w2 = prevText ? ctx.measureText(prevText).width : 0;
    const w3 = ctx.measureText(currText).width;
    const cw = Math.max(w1, w2, w3) + 16;
    const ch = prevText ? 34 : 24;
    const midX = (ax + bx) / 2, topY = Math.min(ay, by);
    const cx = Math.max(4, Math.min(W - cw - 4, midX - cw / 2));
    const cy = Math.max(4, topY - (prevText ? 82 : 72));

    roundRect(ctx, cx, cy, cw, ch, 4, 'rgba(20,16,12,0.86)');
    ctx.strokeStyle = 'rgba(255,224,128,0.78)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1, 4); ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffe9b0';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.fillText(head, cx + 7, cy + 10);
    if (prevText) {
      ctx.fillStyle = '#b8b0a0';
      ctx.font = '8px system-ui, sans-serif';
      ctx.fillText(prevText, cx + 7, cy + 20);
      ctx.fillStyle = '#fff4d0';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.fillText(currText, cx + 7, cy + 29);
    } else {
      ctx.fillStyle = '#fff4d0';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.fillText(currText, cx + 7, cy + 19);
    }
    ctx.restore();
  }
}
