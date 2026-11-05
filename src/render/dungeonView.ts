// Inset "camera" into a dungeon: shows the party fighting floor by floor.
// Animations are derived from HP changes between frames, so the sim stays
// untouched. One panel per party underground, stacked bottom-left.
import type { Adventurer, GameState, Party } from '../sim/types';
import { DUNGEONS } from '../data/dungeons';
import { CLASSES } from '../data/adventurers';
import { t } from '../i18n';
import { drawClassFigure } from './units';
import { drawMonster, monsterHeight } from './monsters';
import { circle, ellipse, rect, line, poly, rgba, hash, type Env } from './palette';

export const PANEL_W = 270;
export const PANEL_H = 104;

interface Num { x: number; y: number; text: string; color: string; ttl: number }
interface Spark { x: number; y: number; vx: number; vy: number; ttl: number; color: string }

interface ViewState {
  lastHp: Map<number, number>;
  lastEncHp: number;
  hadEncounter: boolean;
  monster: string;
  boss: boolean;
  floor: number;
  attacker: number;
  heroLunge: number;
  heroIdx: number;
  monsterLunge: number;
  monsterHurt: number;
  heroHurt: Map<number, number>;
  heal: Map<number, number>;
  death: number;
  deathMonster: string;
  deathBoss: boolean;
  floorFlash: number;
  shake: number;
  nums: Num[];
  sparks: Spark[];
  scroll: number;
}

export class DungeonView {
  private views = new Map<number, ViewState>();

  update(s: GameState, env: Env, dt: number): void {
    const seen = new Set<number>();
    for (const p of s.parties) {
      if (p.phase !== 'explore' && p.phase !== 'fight') continue;
      seen.add(p.id);
      let v = this.views.get(p.id);
      if (!v) { v = { lastHp: new Map(), lastEncHp: 0, hadEncounter: false, monster: '', boss: false, floor: p.floor, attacker: 0, heroLunge: 0, heroIdx: 0, monsterLunge: 0, monsterHurt: 0, heroHurt: new Map(), heal: new Map(), death: 0, deathMonster: '', deathBoss: false, floorFlash: 0.8, shake: 0, nums: [], sparks: [], scroll: 0 }; this.views.set(p.id, v); }
      this.step(s, p, v, env, dt);
    }
    for (const k of [...this.views.keys()]) if (!seen.has(k)) this.views.delete(k);
  }

  private step(s: GameState, p: Party, v: ViewState, env: Env, dt: number): void {
    const team = members(s, p);
    const e = p.encounter;
    // Floor change.
    if (p.floor !== v.floor) { v.floor = p.floor; v.floorFlash = 0.8; }
    if (p.phase === 'explore') v.scroll += dt * 24;
    // Monster appears / is slain.
    if (e && !v.hadEncounter) { v.monster = e.monster; v.boss = e.boss; v.lastEncHp = e.hp; v.shake = e.boss ? 0.5 : 0; }
    if (!e && v.hadEncounter) { v.death = 0.9; v.deathMonster = v.monster; v.deathBoss = v.boss; this.burst(v, PANEL_W * 0.74, PANEL_H - 30, v.boss ? '#ffd040' : '#c0c0c0', v.boss ? 40 : 16); }
    v.hadEncounter = !!e;
    // Monster took damage → a hero strikes.
    if (e && e.hp < v.lastEncHp - 0.01) {
      const dmg = Math.round(v.lastEncHp - e.hp);
      v.heroIdx = team.length ? v.attacker % team.length : 0; v.attacker++;
      v.heroLunge = 0.35; v.monsterHurt = 0.25;
      v.nums.push({ x: PANEL_W * 0.74 + (Math.random() - 0.5) * 12, y: PANEL_H - 34 - monsterHeight(e.monster) * (e.boss ? 1.5 : 1), text: `-${dmg}`, color: '#ffe080', ttl: 1 });
      this.burst(v, PANEL_W * 0.72, PANEL_H - 30 - monsterHeight(e.monster) * 0.5, '#ffe080', 6);
      if (e.boss) v.shake = 0.15;
    }
    if (e) v.lastEncHp = e.hp;
    // Heroes took damage or were healed.
    team.forEach((a, i) => {
      const last = v.lastHp.get(a.id);
      if (last !== undefined) {
        if (a.hp < last - 0.01) { v.monsterLunge = 0.35; v.heroHurt.set(a.id, 0.3); v.nums.push({ x: heroX(i), y: PANEL_H - 44, text: `-${Math.round(last - a.hp)}`, color: '#ff7070', ttl: 1 }); if (a.hp <= 1) v.shake = Math.max(v.shake, 0.2); }
        else if (a.hp > last + 0.01 && a.hp < a.maxHp) { v.heal.set(a.id, 0.5); if (a.hp - last > 1.5) v.nums.push({ x: heroX(i), y: PANEL_H - 46, text: `+${Math.round(a.hp - last)}`, color: '#90f090', ttl: 0.9 }); }
      }
      v.lastHp.set(a.id, a.hp);
    });
    v.heroLunge = Math.max(0, v.heroLunge - dt); v.monsterLunge = Math.max(0, v.monsterLunge - dt); v.monsterHurt = Math.max(0, v.monsterHurt - dt);
    v.death = Math.max(0, v.death - dt); v.floorFlash = Math.max(0, v.floorFlash - dt); v.shake = Math.max(0, v.shake - dt);
    for (const [k, val] of v.heroHurt) { if (val - dt <= 0) v.heroHurt.delete(k); else v.heroHurt.set(k, val - dt); }
    for (const [k, val] of v.heal) { if (val - dt <= 0) v.heal.delete(k); else v.heal.set(k, val - dt); }
    v.nums = v.nums.filter((n) => (n.ttl -= dt) > 0); for (const n of v.nums) n.y -= 18 * dt;
    v.sparks = v.sparks.filter((sp) => (sp.ttl -= dt) > 0); for (const sp of v.sparks) { sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += 60 * dt; }
    void env;
  }

  private burst(v: ViewState, x: number, y: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, sp = 20 + Math.random() * 50; v.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, ttl: 0.5 + Math.random() * 0.4, color }); }
  }

  draw(ctx: CanvasRenderingContext2D, s: GameState, env: Env, W: number, H: number): void {
    let k = 0;
    for (const p of s.parties) {
      const v = this.views.get(p.id);
      if (!v) continue;
      const x = 8, y = H - 8 - PANEL_H - k * (PANEL_H + 6);
      ctx.save(); ctx.translate(x + (v.shake > 0 ? Math.sin(env.clock * 70) * v.shake * 10 : 0), y + (v.shake > 0 ? Math.cos(env.clock * 90) * v.shake * 6 : 0));
      this.drawPanel(ctx, s, p, v, env);
      ctx.restore();
      k++;
    }
    void W;
  }

  private drawPanel(ctx: CanvasRenderingContext2D, s: GameState, p: Party, v: ViewState, env: Env): void {
    const def = DUNGEONS.find((d) => d.id === p.dungeon)!;
    const team = members(s, p);
    const e = p.encounter;
    const floorY = PANEL_H - 22;
    // Frame.
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.roundRect(-3, -3, PANEL_W + 6, PANEL_H + 6, 6); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.roundRect(0, 0, PANEL_W, PANEL_H, 4); ctx.clip();
    this.drawBackdrop(ctx, p.dungeon, v, env, floorY);
    // Heroes.
    team.forEach((a, i) => {
      const hx = heroX(i), lunge = v.heroIdx === i && v.heroLunge > 0 ? Math.sin((v.heroLunge / 0.35) * Math.PI) * 22 : 0;
      const hurt = v.heroHurt.get(a.id) ?? 0, heal = v.heal.get(a.id) ?? 0;
      ellipse(ctx, hx, floorY + 1, 6, 2.5, 'rgba(0,0,0,0.4)');
      if (heal > 0) circle(ctx, hx, floorY - 10, 9 * (1 - heal), rgba('#90f090', heal * 0.5));
      drawClassFigure(ctx, a.cls, a.level, env, p.phase === 'explore', hx + lunge, floorY, 1, 1.35, hurt > 0);
      if (lunge > 8) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx + lunge + 10, floorY - 14, 8, -1.2, 0.6); ctx.stroke(); }
      // HP bar + name.
      const w = 24, hp = Math.max(0, a.hp / a.maxHp);
      rect(ctx, hx - w / 2, floorY + 6, w, 3, 'rgba(0,0,0,0.6)'); rect(ctx, hx - w / 2, floorY + 6, w * hp, 3, hp > 0.5 ? '#7ad07a' : hp > 0.25 ? '#e0b040' : '#e05050');
      ctx.font = '8px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = CLASSES[a.cls].color; ctx.fillText(a.name.length > 8 ? a.name.slice(0, 7) + '…' : a.name, hx, floorY + 17);
    });
    // Monster.
    const mx = PANEL_W * 0.74;
    if (e) {
      const sc = e.boss ? (e.monster === 'demonLord' ? 1.8 : 1.5) : 1.15;
      const lunge = v.monsterLunge > 0 ? Math.sin((v.monsterLunge / 0.35) * Math.PI) : 0;
      ellipse(ctx, mx, floorY + 1, 9 * sc, 3 * sc, 'rgba(0,0,0,0.45)');
      ctx.save(); ctx.translate(mx, floorY); ctx.scale(-1, 1);
      drawMonster(ctx, e.monster, env, sc, v.monsterHurt, lunge);
      ctx.restore();
      // HP bar with name.
      const w = e.boss ? 120 : 60, hp = Math.max(0, e.hp / e.maxHp);
      const bx = PANEL_W - 8 - w, by = 8;
      rect(ctx, bx, by, w, e.boss ? 6 : 4, 'rgba(0,0,0,0.65)');
      rect(ctx, bx, by, w * hp, e.boss ? 6 : 4, e.boss ? '#e040c0' : '#e04040');
      ctx.font = `${e.boss ? 'bold 10px' : '9px'} system-ui, sans-serif`; ctx.textAlign = 'right'; ctx.fillStyle = e.boss ? '#ffb0f0' : '#f0e0e0';
      ctx.fillText(t(`monster.${e.monster}`), PANEL_W - 8, by + (e.boss ? 18 : 15));
    } else if (v.death > 0) {
      // Slain monster fading away.
      ctx.save(); ctx.translate(mx, floorY); ctx.scale(-1, 1); ctx.globalAlpha = v.death; ctx.translate(0, (0.9 - v.death) * 10);
      drawMonster(ctx, v.deathMonster, env, v.deathBoss ? 1.5 : 1.15, 1);
      ctx.restore();
      ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = `rgba(255,224,128,${Math.min(1, v.death * 2)})`; ctx.fillText(t('ui.slain'), mx, floorY - 30 - (0.9 - v.death) * 10);
    } else if (p.phase === 'explore') {
      ctx.font = '9px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const dots = '.'.repeat(1 + Math.floor(env.clock * 2) % 3);
      ctx.fillText(t('ui.exploring') + dots, PANEL_W - 8, 16);
    }
    // Sparks and numbers.
    for (const sp of v.sparks) { ctx.globalAlpha = Math.min(1, sp.ttl * 2); circle(ctx, sp.x, sp.y, 1.4, sp.color); }
    ctx.globalAlpha = 1;
    ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'center';
    for (const n of v.nums) { ctx.globalAlpha = Math.min(1, n.ttl * 2); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(n.text, n.x, n.y); ctx.fillStyle = n.color; ctx.fillText(n.text, n.x, n.y); }
    ctx.globalAlpha = 1;
    // Header.
    ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#f0e0c0';
    ctx.fillText(t(`dungeon.${p.dungeon}`), 8, 14);
    ctx.font = '9px system-ui, sans-serif'; ctx.fillStyle = p.floor === def.floors ? '#ffb0f0' : '#d0c8b8';
    ctx.fillText(t('ui.floor', { floor: p.floor, floors: def.floors }), 8, 25);
    if (v.floorFlash > 0) { ctx.fillStyle = `rgba(255,255,255,${v.floorFlash * 0.25})`; ctx.fillRect(0, 0, PANEL_W, PANEL_H); }
    ctx.restore();
  }

  private drawBackdrop(ctx: CanvasRenderingContext2D, id: string, v: ViewState, env: Env, floorY: number): void {
    const off = v.scroll % 60;
    if (id === 'goblinCave') {
      ctx.fillStyle = '#3a2c22'; ctx.fillRect(0, 0, PANEL_W, PANEL_H);
      ctx.fillStyle = '#4a3a2e'; for (let i = -1; i < 6; i++) { const x = i * 60 - off; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 14, 22 + hash(i, 1) * 10); ctx.lineTo(x + 28, 0); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + 30, 0); ctx.lineTo(x + 40, 14 + hash(i, 2) * 8); ctx.lineTo(x + 52, 0); ctx.fill(); }
      rect(ctx, 0, floorY, PANEL_W, PANEL_H - floorY, '#2a1e16'); rect(ctx, 0, floorY, PANEL_W, 2, '#5a4a3a');
      for (let i = -1; i < 6; i++) { const x = i * 60 - off + 20; ellipse(ctx, x, floorY + 10, 6, 2, '#3a2e26'); circle(ctx, x + 25, floorY + 14, 2, '#4a3e36'); }
    } else if (id === 'ancientRuins') {
      ctx.fillStyle = '#2a2e3e'; ctx.fillRect(0, 0, PANEL_W, PANEL_H);
      for (let i = -1; i < 6; i++) { const x = i * 60 - off; rect(ctx, x + 8, 6, 10, floorY - 6, '#4a5068'); rect(ctx, x + 8, 6, 2, floorY - 6, '#6a7088'); rect(ctx, x + 6, 4, 14, 4, '#5a6078'); circle(ctx, x + 12, 30 + hash(i, 3) * 20, 4, rgba('#4f9a3f', 0.6)); }
      rect(ctx, 0, floorY, PANEL_W, PANEL_H - floorY, '#3a3e50'); for (let i = 0; i < 10; i++) rect(ctx, i * 30 - off / 2, floorY, 28, 1.2, '#5a5e70');
      rect(ctx, 0, floorY, PANEL_W, 2, '#6a6e80');
    } else {
      ctx.fillStyle = '#1a1026'; ctx.fillRect(0, 0, PANEL_W, PANEL_H);
      const g = ctx.createLinearGradient(0, 0, 0, PANEL_H); g.addColorStop(0, 'rgba(120,40,200,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, PANEL_W, PANEL_H);
      for (let i = -1; i < 6; i++) { const x = i * 60 - off; ctx.fillStyle = '#2a1a3a'; ctx.beginPath(); ctx.roundRect(x + 14, 10, 14, floorY - 20, [7, 7, 0, 0]); ctx.fill(); ctx.fillStyle = `rgba(200,80,255,${0.35 + 0.2 * Math.sin(env.clock * 3 + i)})`; ctx.beginPath(); ctx.roundRect(x + 17, 14, 8, floorY - 30, [4, 4, 0, 0]); ctx.fill(); }
      rect(ctx, 0, floorY, PANEL_W, PANEL_H - floorY, '#140c1e'); rect(ctx, 0, floorY, PANEL_W, 2, '#4a2a6a');
      for (let i = 0; i < 6; i++) { const rx = (i * 47 + env.clock * 8) % PANEL_W, ry = floorY - 4 - ((env.clock * 10 + i * 30) % 60); circle(ctx, rx, ry, 1, rgba('#d080ff', 0.5)); }
    }
    // Torches.
    for (const tx of [40, PANEL_W - 40]) {
      rect(ctx, tx - 1, 18, 2, 8, '#5a3a1e');
      const f = 1 + 0.3 * Math.sin(env.clock * 12 + tx);
      const g = ctx.createRadialGradient(tx, 16, 0, tx, 16, 40); g.addColorStop(0, 'rgba(255,170,60,0.35)'); g.addColorStop(1, 'rgba(255,170,60,0)'); ctx.fillStyle = g; ctx.fillRect(tx - 40, -24, 80, 80);
      ellipse(ctx, tx, 15 - 2 * f, 2.2, 4 * f, '#ff9a30'); ellipse(ctx, tx, 16 - f, 1.1, 2 * f, '#ffe080');
    }
    void poly; void line;
  }
}

function members(s: GameState, p: Party): Adventurer[] {
  return p.memberIds.map((id) => s.adventurers.find((a) => a.id === id)!).filter((a) => a && a.status === 'questing');
}

function heroX(i: number): number { return 30 + i * 30; }
