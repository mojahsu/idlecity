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
/** The panel is laid out at PANEL_W x PANEL_H and drawn this many times larger. */
export const PANEL_SCALE = 1.6;

interface Num { x: number; y: number; text: string; color: string; ttl: number }
interface Spark { x: number; y: number; vx: number; vy: number; ttl: number; color: string }
interface Shot { kind: 'arrow' | 'fire'; x: number; y: number; tx: number; ty: number; t: number; life: number }

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
  shots: Shot[];
  taunt: number;
  tauntIdx: number;
  frozen: number;
  beam: number;
  beamIdx: number;
  block: number;
  blockIdx: number;
  revive: number;
  reviveIdx: number;
  casting: number;
  castIdx: number;
}

export class DungeonView {
  private views = new Map<number, ViewState>();

  update(s: GameState, env: Env, dt: number): void {
    const seen = new Set<number>();
    for (const p of s.parties) {
      if (p.phase !== 'explore' && p.phase !== 'fight') continue;
      seen.add(p.id);
      let v = this.views.get(p.id);
      if (!v) { v = { lastHp: new Map(), lastEncHp: 0, hadEncounter: false, monster: '', boss: false, floor: p.floor, attacker: 0, heroLunge: 0, heroIdx: 0, monsterLunge: 0, monsterHurt: 0, heroHurt: new Map(), heal: new Map(), death: 0, deathMonster: '', deathBoss: false, floorFlash: 0.8, shake: 0, nums: [], sparks: [], scroll: 0, shots: [], taunt: 0, tauntIdx: 0, frozen: 0, beam: 0, beamIdx: 0, block: 0, blockIdx: 0, revive: 0, reviveIdx: 0, casting: 0, castIdx: 0 }; this.views.set(p.id, v); }
      this.step(s, p, v, env, dt);
    }
    for (const k of [...this.views.keys()]) if (!seen.has(k)) this.views.delete(k);
  }

  private step(s: GameState, p: Party, v: ViewState, env: Env, dt: number): void {
    const team = members(s, p);
    const e = p.encounter;
    const mx = PANEL_W * 0.74, floorY = PANEL_H - 22;
    for (const f of s.fx) {
      if (f.kind !== 'skill' || f.partyId !== p.id) continue;
      const ai = Math.max(0, team.findIndex((a) => a.id === f.actorId));
      const ti = f.targetId !== undefined ? Math.max(0, team.findIndex((a) => a.id === f.targetId)) : ai;
      const label = (text: string, x: number, y: number, color: string, ttl = 1.1) => v.nums.push({ x, y, text, color, ttl });
      switch (f.skill) {
        case 'taunt': v.taunt = 0.7; v.tauntIdx = ai; break;
        case 'volley': for (let k = 0; k < 2; k++) v.shots.push({ kind: 'arrow', x: heroX(ai) + 6, y: floorY - 14 - k * 3, tx: mx - 6, ty: floorY - 12 - k * 4, t: -k * 0.08, life: 0.25 }); label(t('skill.volley'), heroX(ai), floorY - 36, '#c8f0a0'); break;
        case 'crit': label(t('skill.crit'), heroX(ai), floorY - 44, '#ffd040', 1.3); break;
        case 'fireball': v.casting = 0.3; v.castIdx = ai; v.shots.push({ kind: 'fire', x: heroX(ai) + 8, y: floorY - 18, tx: mx, ty: floorY - 14, t: 0, life: 0.35 }); label(t('skill.fireball'), heroX(ai), floorY - 36, '#ffa060'); break;
        case 'frost': v.frozen = 1.2; label(t('skill.frost'), mx, floorY - 48, '#a0e0ff', 1.3); break;
        case 'holyLight': v.beam = 0.6; v.beamIdx = ti; label(t('skill.holyLight'), heroX(ti), floorY - 40, '#fff0a0'); break;
        case 'block': v.block = 0.45; v.blockIdx = ti; label(t('skill.block'), heroX(ti), floorY - 36, '#c0d0e0'); break;
        case 'revive': v.revive = 1.2; v.reviveIdx = ti; label(t('skill.revive'), heroX(ti), floorY - 44, '#ffffff', 1.6); break;
      }
    }
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
    v.taunt = Math.max(0, v.taunt - dt); v.frozen = Math.max(0, v.frozen - dt); v.beam = Math.max(0, v.beam - dt); v.block = Math.max(0, v.block - dt); v.revive = Math.max(0, v.revive - dt); v.casting = Math.max(0, v.casting - dt);
    for (const sh of v.shots) {
      sh.t += dt;
      if (sh.kind === 'fire' && sh.t >= sh.life && sh.t - dt < sh.life) { this.burst(v, sh.tx, sh.ty, '#ff9040', 18); this.burst(v, sh.tx, sh.ty, '#ffe080', 8); if (e?.boss) v.shake = Math.max(v.shake, 0.12); }
    }
    v.shots = v.shots.filter((sh) => sh.t < sh.life);
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
      const x = 8, y = H - 8 - PANEL_H * PANEL_SCALE - k * (PANEL_H * PANEL_SCALE + 6);
      ctx.save(); ctx.translate(x + (v.shake > 0 ? Math.sin(env.clock * 70) * v.shake * 10 : 0), y + (v.shake > 0 ? Math.cos(env.clock * 90) * v.shake * 6 : 0));
      ctx.scale(PANEL_SCALE, PANEL_SCALE);
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
      if (v.taunt > 0 && v.tauntIdx === i) { ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff6060'; ctx.fillText('!', hx, floorY - 34 - Math.sin(v.taunt * 12) * 2); }
      if (v.beam > 0 && v.beamIdx === i) { const g = ctx.createLinearGradient(0, 0, 0, floorY); g.addColorStop(0, `rgba(255,240,160,${0.7 * v.beam})`); g.addColorStop(1, `rgba(255,240,160,${0.15 * v.beam})`); ctx.fillStyle = g; ctx.fillRect(hx - 7, 0, 14, floorY); for (let k = 0; k < 4; k++) circle(ctx, hx - 8 + k * 5.5, floorY - 8 - ((env.clock * 40 + k * 9) % 30), 1.2, rgba('#fff8c0', v.beam)); }
      if (v.block > 0 && v.blockIdx === i) { ctx.strokeStyle = `rgba(200,220,255,${v.block * 2})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(hx + 9, floorY - 12, 9, -1.4, 1.4); ctx.stroke(); }
      if (v.revive > 0 && v.reviveIdx === i) { circle(ctx, hx, floorY - 12, 16 * (1.2 - v.revive) + 4, rgba('#ffffff', v.revive * 0.5)); }
      if (v.casting > 0 && v.castIdx === i) circle(ctx, hx + 8, floorY - 18, 5, rgba('#ffa040', v.casting * 2));
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
      drawMonster(ctx, e.monster, env, sc, v.monsterHurt, v.frozen > 0 ? 0 : lunge);
      ctx.restore();
      if (v.frozen > 0) {
        const h = monsterHeight(e.monster) * sc, a = Math.min(1, v.frozen * 2);
        ctx.fillStyle = `rgba(140,210,255,${0.35 * a})`; ctx.beginPath(); ctx.ellipse(mx, floorY - h / 2, 12 * sc, h / 2 + 4, 0, 0, Math.PI * 2); ctx.fill();
        for (let k = 0; k < 5; k++) { const cx = mx - 10 * sc + k * 5 * sc, cy = floorY - h * 0.2 - (k % 2) * h * 0.5; poly(ctx, [cx, cy - 5, cx + 2.5, cy, cx, cy + 3, cx - 2.5, cy], rgba('#dff4ff', 0.9 * a)); }
      }
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
    // Projectiles.
    for (const sh of v.shots) {
      if (sh.t < 0) continue;
      const k = Math.min(1, sh.t / sh.life), x = sh.x + (sh.tx - sh.x) * k, y = sh.y + (sh.ty - sh.y) * k - Math.sin(k * Math.PI) * 10;
      if (sh.kind === 'arrow') { line(ctx, x - 6, y + 1.5, x, y, '#e8dcc0', 1.5); poly(ctx, [x, y, x - 2.5, y - 1.5, x - 2.5, y + 1.5], '#d0d0d8'); }
      else { circle(ctx, x, y, 5, rgba('#ff6020', 0.5)); circle(ctx, x, y, 3.2, '#ff9040'); circle(ctx, x - 1, y - 1, 1.5, '#ffe080'); for (let q = 1; q <= 3; q++) circle(ctx, x - q * 4 * (sh.tx > sh.x ? 1 : -1), y + q * 1.5, 3 - q * 0.7, rgba('#ff8030', 0.35 - q * 0.1)); }
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
    if (v.revive > 0.8) { ctx.fillStyle = `rgba(255,255,255,${(v.revive - 0.8) * 1.5})`; ctx.fillRect(0, 0, PANEL_W, PANEL_H); }
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
  }
}

function members(s: GameState, p: Party): Adventurer[] {
  return p.memberIds.map((id) => s.adventurers.find((a) => a.id === id)!).filter((a) => a && a.status === 'questing');
}

function heroX(i: number): number { return 30 + i * 30; }
