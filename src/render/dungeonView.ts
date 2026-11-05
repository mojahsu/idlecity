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
interface Banner { text: string; color: string; ttl: number; life: number; big: boolean }

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
  banner: Banner | null;
  /** Red pulse and name card when a boss steps out. */
  bossIntro: number;
  /** A chest popping open. */
  chest: number;
  /** Dust hanging in the air. */
  motes: { x: number; y: number; vx: number; vy: number; ttl: number; life: number }[];
  /** Puffs of dust kicked up at the feet. */
  puffs: { x: number; y: number; ttl: number }[];
}

export class DungeonView {
  private views = new Map<number, ViewState>();

  update(s: GameState, env: Env, dt: number): void {
    const seen = new Set<number>();
    for (const p of s.parties) {
      if (p.phase !== 'explore' && p.phase !== 'fight') continue;
      seen.add(p.id);
      let v = this.views.get(p.id);
      if (!v) { v = { lastHp: new Map(), lastEncHp: 0, hadEncounter: false, monster: '', boss: false, floor: p.floor, attacker: 0, heroLunge: 0, heroIdx: 0, monsterLunge: 0, monsterHurt: 0, heroHurt: new Map(), heal: new Map(), death: 0, deathMonster: '', deathBoss: false, floorFlash: 0.8, shake: 0, nums: [], sparks: [], scroll: 0, shots: [], taunt: 0, tauntIdx: 0, frozen: 0, beam: 0, beamIdx: 0, block: 0, blockIdx: 0, revive: 0, reviveIdx: 0, casting: 0, castIdx: 0, banner: null, bossIntro: 0, chest: 0, motes: [], puffs: [] }; this.views.set(p.id, v); }
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
    if (p.floor !== v.floor) { v.floor = p.floor; v.floorFlash = 0.8; const def = DUNGEONS.find((d) => d.id === p.dungeon)!; v.banner = { text: t('ui.floor', { floor: p.floor, floors: def.floors }), color: p.floor === def.floors ? '#ffb0f0' : '#f0e0c0', ttl: 1.3, life: 1.3, big: false }; }
    for (const f of s.fx) if (f.kind === 'treasure' && f.partyId === p.id) { v.chest = 1.4; this.burst(v, mx - 30, floorY - 6, '#ffd040', 22); v.nums.push({ x: mx - 30, y: floorY - 20, text: `+${f.gold}g`, color: '#ffd040', ttl: 1.3 }); }
    if (p.phase === 'explore') v.scroll += dt * 24;
    // Monster appears / is slain.
    if (e && !v.hadEncounter) {
      v.monster = e.monster; v.boss = e.boss; v.lastEncHp = e.hp; v.shake = e.boss ? 0.5 : 0;
      if (e.boss) { v.bossIntro = 1.8; v.banner = { text: t(`monster.${e.monster}`), color: e.monster === 'demonLord' ? '#ff60c0' : '#ff8080', ttl: 1.8, life: 1.8, big: true }; }
    }
    if (!e && v.hadEncounter) { v.death = 0.9; v.deathMonster = v.monster; v.deathBoss = v.boss; this.burst(v, PANEL_W * 0.74, PANEL_H - 30, v.boss ? '#ffd040' : '#c0c0c0', v.boss ? 40 : 16); }
    v.hadEncounter = !!e;
    // Monster took damage → a hero strikes.
    if (e && e.hp < v.lastEncHp - 0.01) {
      const dmg = Math.round(v.lastEncHp - e.hp);
      v.heroIdx = team.length ? v.attacker % team.length : 0; v.attacker++;
      v.heroLunge = 0.35; v.monsterHurt = 0.25;
      v.puffs.push({ x: heroX(v.heroIdx) - 4, y: floorY + 1, ttl: 0.45 });
      v.nums.push({ x: PANEL_W * 0.74 + (Math.random() - 0.5) * 12, y: PANEL_H - 34 - monsterHeight(e.monster) * (e.boss ? 1.5 : 1), text: `-${dmg}`, color: '#ffe080', ttl: 1 });
      this.burst(v, PANEL_W * 0.72, PANEL_H - 30 - monsterHeight(e.monster) * 0.5, '#ffe080', 6);
      if (e.boss) v.shake = 0.15;
    }
    if (e) v.lastEncHp = e.hp;
    // Heroes took damage or were healed.
    team.forEach((a, i) => {
      const last = v.lastHp.get(a.id);
      if (last !== undefined) {
        if (a.hp < last - 0.01) { v.monsterLunge = 0.35; v.heroHurt.set(a.id, 0.3); v.puffs.push({ x: mx + 6, y: floorY + 1, ttl: 0.45 }); v.nums.push({ x: heroX(i), y: PANEL_H - 44, text: `-${Math.round(last - a.hp)}`, color: '#ff7070', ttl: 1 }); if (a.hp <= 1) v.shake = Math.max(v.shake, 0.2); }
        else if (a.hp > last + 0.01 && a.hp < a.maxHp) { v.heal.set(a.id, 0.5); if (a.hp - last > 1.5) v.nums.push({ x: heroX(i), y: PANEL_H - 46, text: `+${Math.round(a.hp - last)}`, color: '#90f090', ttl: 0.9 }); }
      }
      v.lastHp.set(a.id, a.hp);
    });
    v.heroLunge = Math.max(0, v.heroLunge - dt); v.monsterLunge = Math.max(0, v.monsterLunge - dt); v.monsterHurt = Math.max(0, v.monsterHurt - dt);
    v.death = Math.max(0, v.death - dt); v.floorFlash = Math.max(0, v.floorFlash - dt); v.shake = Math.max(0, v.shake - dt);
    v.bossIntro = Math.max(0, v.bossIntro - dt); v.chest = Math.max(0, v.chest - dt);
    if (v.banner && (v.banner.ttl -= dt) <= 0) v.banner = null;
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
    v.puffs = v.puffs.filter((q) => (q.ttl -= dt) > 0);
    if (v.motes.length < 14 && Math.random() < dt * 3) v.motes.push({ x: Math.random() * PANEL_W, y: 6 + Math.random() * (floorY - 10), vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 2, ttl: 4 + Math.random() * 4, life: 8 });
    v.motes = v.motes.filter((m) => (m.ttl -= dt) > 0); for (const m of v.motes) { m.x += (m.vx - (p.phase === 'explore' ? 10 : 0)) * dt; m.y += m.vy * dt + Math.sin(env.clock + m.x) * 0.3 * dt; }
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
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(-4, -4, PANEL_W + 8, PANEL_H + 8, 7); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.roundRect(0, 0, PANEL_W, PANEL_H, 4); ctx.clip();
    this.drawBackdrop(ctx, p.dungeon, v, env, floorY);
    // Dust in the air.
    for (const m of v.motes) { const a = Math.min(1, m.ttl, m.life - m.ttl) * 0.5; circle(ctx, m.x, m.y, 0.9, `rgba(255,240,200,${a})`); }
    {
      const mx0 = PANEL_W * 0.74;
      // Mirror image on the polished floor (strongest in the tower, faint in the cave).
      const mirrorA = p.dungeon === 'darkTower' ? 0.22 : p.dungeon === 'ancientRuins' ? 0.12 : 0.07;
      ctx.save(); ctx.beginPath(); ctx.rect(0, floorY + 1, PANEL_W, PANEL_H - floorY); ctx.clip();
      ctx.translate(0, 2 * floorY + 3); ctx.scale(1, -0.55); ctx.globalAlpha = mirrorA;
      this.drawFigures(ctx, s, p, v, env, floorY, team, mx0);
      ctx.restore();
      // Dust puffs at the feet.
      for (const q of v.puffs) { const k = 1 - q.ttl / 0.45; ctx.globalAlpha = (1 - k) * 0.5; circle(ctx, q.x - k * 6, q.y - k * 3, 2 + k * 5, '#c8b8a0'); circle(ctx, q.x + k * 5, q.y - k * 2, 1.5 + k * 4, '#c8b8a0'); }
      ctx.globalAlpha = 1;
      if (e && e.boss) {
        // Boss aura: a pulsing pool of light on the floor and embers drifting up.
        const col = e.monster === 'demonLord' ? '#ff3060' : e.monster === 'dragon' ? '#ff8030' : '#c060ff';
        const pulse = 0.6 + 0.4 * Math.sin(env.clock * 4);
        const g = ctx.createRadialGradient(mx0, floorY, 0, mx0, floorY, 34); g.addColorStop(0, rgba(col, 0.35 * pulse)); g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(mx0, floorY + 1, 34, 10, 0, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 7; i++) { const tt = (env.clock * 0.6 + i * 0.37) % 1; circle(ctx, mx0 - 16 + ((i * 53) % 32) + Math.sin(env.clock * 2 + i) * 3, floorY - tt * 46, 1.2 * (1 - tt) + 0.3, rgba(col, 0.8 * (1 - tt))); }
      }
      this.drawFigures(ctx, s, p, v, env, floorY, team, mx0);
    }
    // Hero HP bars and names (figures are drawn by drawFigures).
    team.forEach((a, i) => {
      const hx = heroX(i);
      const w = 26, hp = Math.max(0, a.hp / a.maxHp);
      hpBar(ctx, hx - w / 2, floorY + 6, w, 3.5, hp, hp > 0.5 ? '#7ad07a' : hp > 0.25 ? '#e0b040' : '#e05050');
      ctx.textAlign = 'center'; ctx.fillStyle = CLASSES[a.cls].color;
      fitText(ctx, a.name, hx, floorY + 18, HERO_GAP - 4);
    });
    // Monster.
    const mx = PANEL_W * 0.74;
    if (v.chest > 0) this.drawChest(ctx, mx - 30, floorY, v.chest, env);
    if (e) {
      // HP bar with name; bosses get a wide segmented bar.
      const w = e.boss ? 120 : 60, hp = Math.max(0, e.hp / e.maxHp);
      const bx = PANEL_W - 8 - w, by = 8;
      hpBar(ctx, bx, by, w, e.boss ? 6 : 4, hp, e.boss ? '#e040c0' : '#e04040');
      if (e.boss) for (let k = 1; k < 4; k++) rect(ctx, bx + w * k / 4, by, 1, 6, 'rgba(0,0,0,0.5)');
      ctx.font = `${e.boss ? 'bold 10px' : '9px'} system-ui, sans-serif`; ctx.textAlign = 'right';
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(t(`monster.${e.monster}`), PANEL_W - 8, by + (e.boss ? 18 : 15));
      ctx.fillStyle = e.boss ? '#ffb0f0' : '#f0e0e0'; ctx.fillText(t(`monster.${e.monster}`), PANEL_W - 8, by + (e.boss ? 18 : 15));
    } else if (v.death > 0) {
      ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(t('ui.slain'), mx, floorY - 30 - (0.9 - v.death) * 10);
      ctx.fillStyle = `rgba(255,224,128,${Math.min(1, v.death * 2)})`; ctx.fillText(t('ui.slain'), mx, floorY - 30 - (0.9 - v.death) * 10);
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
    // Floor progress dots, bottom right.
    for (let i = 0; i < def.floors; i++) {
      const dx = PANEL_W - 8 - (def.floors - 1 - i) * 6, dy = PANEL_H - 6;
      circle(ctx, dx, dy, i + 1 === p.floor ? 2.2 : 1.4, i + 1 < p.floor ? '#d0c8b8' : i + 1 === p.floor ? '#ffe080' : 'rgba(255,255,255,0.25)');
    }
    if (v.floorFlash > 0) { ctx.fillStyle = `rgba(255,255,255,${v.floorFlash * 0.25})`; ctx.fillRect(0, 0, PANEL_W, PANEL_H); }
    if (v.revive > 0.8) { ctx.fillStyle = `rgba(255,255,255,${(v.revive - 0.8) * 1.5})`; ctx.fillRect(0, 0, PANEL_W, PANEL_H); }
    if (v.bossIntro > 0) {
      // Red pulse around the edges while the boss steps out.
      const a = Math.min(1, v.bossIntro) * (0.5 + 0.5 * Math.sin(env.clock * 10));
      const g = ctx.createRadialGradient(PANEL_W / 2, PANEL_H / 2, PANEL_H * 0.4, PANEL_W / 2, PANEL_H / 2, PANEL_W * 0.6);
      g.addColorStop(0, 'rgba(255,0,40,0)'); g.addColorStop(1, `rgba(255,0,40,${0.45 * a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, PANEL_W, PANEL_H);
    }
    if (v.banner) {
      const b = v.banner, k = 1 - b.ttl / b.life;
      const a = k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1;
      const slide = (k < 0.15 ? (1 - k / 0.15) * -30 : 0) + (k > 0.75 ? (k - 0.75) / 0.25 * 30 : 0);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, PANEL_H / 2 - (b.big ? 13 : 9), PANEL_W, b.big ? 26 : 18);
      ctx.font = `bold ${b.big ? 15 : 11}px system-ui, sans-serif`; ctx.textAlign = 'center';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(b.text, PANEL_W / 2 + slide, PANEL_H / 2 + (b.big ? 5 : 4));
      ctx.fillStyle = b.color; ctx.fillText(b.text, PANEL_W / 2 + slide, PANEL_H / 2 + (b.big ? 5 : 4));
      ctx.globalAlpha = 1;
    }
    // Inner vignette so the edges fall into darkness.
    const vg = ctx.createRadialGradient(PANEL_W / 2, PANEL_H / 2, PANEL_H * 0.5, PANEL_W / 2, PANEL_H / 2, PANEL_W * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, PANEL_W, PANEL_H);
    ctx.restore();
    // Ornate frame: double line with gold corner studs.
    ctx.strokeStyle = '#6a5030'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-1, -1, PANEL_W + 2, PANEL_H + 2, 4); ctx.stroke();
    ctx.strokeStyle = '#c8a050'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.roundRect(-2.5, -2.5, PANEL_W + 5, PANEL_H + 5, 5); ctx.stroke();
    for (const [cx, cy] of [[0, 0], [PANEL_W, 0], [0, PANEL_H], [PANEL_W, PANEL_H]]) { circle(ctx, cx, cy, 2.6, '#8a6a30'); circle(ctx, cx - 0.6, cy - 0.6, 1.3, '#f0d080'); }
  }

  /** Heroes and the monster (figures only). Called twice: once mirrored for the floor reflection. */
  private drawFigures(ctx: CanvasRenderingContext2D, s: GameState, p: Party, v: ViewState, env: Env, floorY: number, team: Adventurer[], mx: number): void {
    const e = p.encounter;
    team.forEach((a, i) => {
      const hx = heroX(i), lunge = v.heroIdx === i && v.heroLunge > 0 ? Math.sin((v.heroLunge / 0.35) * Math.PI) * 22 : 0;
      const hurt = v.heroHurt.get(a.id) ?? 0, heal = v.heal.get(a.id) ?? 0;
      ellipse(ctx, hx + lunge * 0.5, floorY + 1, 6, 2.5, 'rgba(0,0,0,0.4)');
      if (heal > 0) circle(ctx, hx, floorY - 10, 9 * (1 - heal), rgba('#90f090', heal * 0.5));
      if (lunge > 4) { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * 0.3; drawClassFigure(ctx, a.cls, a.level, env, false, hx + lunge * 0.45, floorY, 1, 1.35, false, s.equipment); ctx.globalAlpha = ga; }
      drawClassFigure(ctx, a.cls, a.level, env, p.phase === 'explore', hx + lunge, floorY, 1, 1.35, hurt > 0, s.equipment);
      if (lunge > 8) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx + lunge + 10, floorY - 14, 8, -1.2, 0.6); ctx.stroke(); }
      if (v.taunt > 0 && v.tauntIdx === i) { ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff6060'; ctx.fillText('!', hx, floorY - 34 - Math.sin(v.taunt * 12) * 2); }
      if (v.beam > 0 && v.beamIdx === i) { const g = ctx.createLinearGradient(0, 0, 0, floorY); g.addColorStop(0, `rgba(255,240,160,${0.7 * v.beam})`); g.addColorStop(1, `rgba(255,240,160,${0.15 * v.beam})`); ctx.fillStyle = g; ctx.fillRect(hx - 7, 0, 14, floorY); for (let k = 0; k < 4; k++) circle(ctx, hx - 8 + k * 5.5, floorY - 8 - ((env.clock * 40 + k * 9) % 30), 1.2, rgba('#fff8c0', v.beam)); }
      if (v.block > 0 && v.blockIdx === i) { ctx.strokeStyle = `rgba(200,220,255,${v.block * 2})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(hx + 9, floorY - 12, 9, -1.4, 1.4); ctx.stroke(); }
      if (v.revive > 0 && v.reviveIdx === i) { circle(ctx, hx, floorY - 12, 16 * (1.2 - v.revive) + 4, rgba('#ffffff', v.revive * 0.5)); }
      if (v.casting > 0 && v.castIdx === i) circle(ctx, hx + 8, floorY - 18, 5, rgba('#ffa040', v.casting * 2));
      // The mage's staff and the priest's halo throw a little light.
      if (a.cls === 'mage') circle(ctx, hx + 6, floorY - 22, 9, rgba('#80c0ff', 0.12 + 0.05 * Math.sin(env.clock * 4)));
      if (a.cls === 'priest') circle(ctx, hx, floorY - 24, 8, rgba('#ffe890', 0.1 + 0.04 * Math.sin(env.clock * 3)));
    });
    if (e) {
      const sc = e.boss ? (e.monster === 'demonLord' ? 1.8 : 1.5) : 1.15;
      const lunge = v.monsterLunge > 0 ? Math.sin((v.monsterLunge / 0.35) * Math.PI) : 0;
      ellipse(ctx, mx - lunge * 4, floorY + 1, 9 * sc, 3 * sc, 'rgba(0,0,0,0.45)');
      ctx.save(); ctx.translate(mx, floorY); ctx.scale(-1, 1);
      drawMonster(ctx, e.monster, env, sc, v.monsterHurt, v.frozen > 0 ? 0 : lunge);
      ctx.restore();
      if (v.frozen > 0) {
        const h = monsterHeight(e.monster) * sc, a = Math.min(1, v.frozen * 2);
        ctx.fillStyle = `rgba(140,210,255,${0.35 * a})`; ctx.beginPath(); ctx.ellipse(mx, floorY - h / 2, 12 * sc, h / 2 + 4, 0, 0, Math.PI * 2); ctx.fill();
        for (let k = 0; k < 5; k++) { const cx = mx - 10 * sc + k * 5 * sc, cy = floorY - h * 0.2 - (k % 2) * h * 0.5; poly(ctx, [cx, cy - 5, cx + 2.5, cy, cx, cy + 3, cx - 2.5, cy], rgba('#dff4ff', 0.9 * a)); }
      }
    } else if (v.death > 0) {
      ctx.save(); ctx.translate(mx, floorY); ctx.scale(-1, 1); ctx.globalAlpha *= v.death; ctx.translate(0, (0.9 - v.death) * 10);
      drawMonster(ctx, v.deathMonster, env, v.deathBoss ? 1.5 : 1.15, 1);
      ctx.restore();
    }
  }

  /** A chest flipping open with a glow, next to the party. */
  private drawChest(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, env: Env): void {
    const open = Math.min(1, (1.4 - k) * 3);
    circle(ctx, x, y - 4, 14, rgba('#ffe080', 0.25 * open * (0.7 + 0.3 * Math.sin(env.clock * 8))));
    rect(ctx, x - 7, y - 6, 14, 7, '#8a5a2a'); rect(ctx, x - 7, y - 6, 14, 1.2, '#b08a52'); rect(ctx, x - 1, y - 5, 2, 3, '#e0c060');
    ctx.save(); ctx.translate(x - 7, y - 6); ctx.rotate(-open * 1.9); rect(ctx, 0, -4, 14, 4, '#a06a3a'); rect(ctx, 0, -4, 14, 1, '#c89060'); ctx.restore();
    if (open > 0.5) for (let i = 0; i < 3; i++) circle(ctx, x - 3 + i * 3, y - 5 - (i % 2), 1.3, '#ffd040');
  }

  private drawBackdrop(ctx: CanvasRenderingContext2D, id: string, v: ViewState, env: Env, floorY: number): void {
    // Three parallax layers: far walls crawl, the middle ground walks, the floor runs.
    const far = (v.scroll * 0.35) % 90, mid = (v.scroll * 0.7) % 60, near = v.scroll % 45;
    const c = env.clock;
    if (id === 'goblinCave') {
      const g = ctx.createLinearGradient(0, 0, 0, PANEL_H); g.addColorStop(0, '#241a14'); g.addColorStop(1, '#3e2e24'); ctx.fillStyle = g; ctx.fillRect(0, 0, PANEL_W, PANEL_H);
      // Far rock masses.
      for (let i = -1; i < 5; i++) { const x = i * 90 - far; ctx.fillStyle = '#2e2219'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 10, 30 + hash(i, 7) * 14); ctx.lineTo(x + 26, 8); ctx.lineTo(x + 40, 36 + hash(i, 8) * 12); ctx.lineTo(x + 58, 4); ctx.lineTo(x + 72, 26 + hash(i, 9) * 10); ctx.lineTo(x + 90, 0); ctx.closePath(); ctx.fill(); }
      // Mid stalactites with a lit edge, hanging roots, glowing mushrooms, bones.
      for (let i = -1; i < 6; i++) {
        const x = i * 60 - mid, h = 18 + hash(i, 1) * 12;
        poly(ctx, [x, 0, x + 7, h, x + 14, 0], '#4a3a2e'); poly(ctx, [x, 0, x + 7, h, x + 4, 0], '#5a4a3c');
        poly(ctx, [x + 30, 0, x + 38, h * 0.7, x + 46, 0], '#4a3a2e'); poly(ctx, [x + 30, 0, x + 38, h * 0.7, x + 34, 0], '#5a4a3c');
        ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 22, 0); ctx.quadraticCurveTo(x + 18 + Math.sin(c + i) * 2, 14, x + 24, 24 + hash(i, 4) * 10); ctx.stroke();
        const mxs = x + 12 + hash(i, 5) * 30;
        for (let k = 0; k < 3; k++) { const gm = 0.6 + 0.4 * Math.sin(c * 2 + i + k); circle(ctx, mxs + k * 4, floorY - 2 - (k % 2) * 2, 4, rgba('#60c0ff', 0.12 * gm)); rect(ctx, mxs + k * 4 - 0.5, floorY - 4 + (k % 2), 1, 3, '#c8d8e8'); circle(ctx, mxs + k * 4, floorY - 4 + (k % 2), 1.6, rgba('#8ae0ff', 0.7 + 0.3 * gm)); }
        if (hash(i, 6) > 0.5) { rect(ctx, x + 44, floorY - 1.5, 7, 1.2, '#e8e4d8'); circle(ctx, x + 44, floorY - 1.2, 1.2, '#e8e4d8'); circle(ctx, x + 51, floorY - 1.2, 1.2, '#e8e4d8'); }
        if (hash(i, 10) > 0.7) { circle(ctx, x + 6, floorY - 2.5, 2.6, '#e8e4d8'); rect(ctx, x + 4.5, floorY - 3.5, 1, 1, '#1a1410'); rect(ctx, x + 6.5, floorY - 3.5, 1, 1, '#1a1410'); }
      }
      // Floor: packed earth, pebbles, puddles.
      rect(ctx, 0, floorY, PANEL_W, PANEL_H - floorY, '#2a1e16'); rect(ctx, 0, floorY, PANEL_W, 2, '#5a4a3a');
      for (let i = -1; i < 8; i++) { const x = i * 45 - near; ellipse(ctx, x + 20, floorY + 12, 9, 2.5, rgba('#4a6a8a', 0.5)); ellipse(ctx, x + 18, floorY + 11.5, 3, 0.8, rgba('#ffffff', 0.25)); circle(ctx, x + 36, floorY + 8 + hash(i, 11) * 8, 1.6, '#4a3e36'); circle(ctx, x + 6, floorY + 16, 1.2, '#4a3e36'); }
    } else if (id === 'ancientRuins') {
      const g = ctx.createLinearGradient(0, 0, 0, PANEL_H); g.addColorStop(0, '#1a1e30'); g.addColorStop(1, '#2e3246'); ctx.fillStyle = g; ctx.fillRect(0, 0, PANEL_W, PANEL_H);
      // Far broken walls with arches.
      for (let i = -1; i < 5; i++) { const x = i * 90 - far; rect(ctx, x, 20 + hash(i, 12) * 10, 90, floorY, '#262a3c'); ctx.fillStyle = '#1a1e30'; ctx.beginPath(); ctx.roundRect(x + 28, 36, 24, floorY, [12, 12, 0, 0]); ctx.fill(); rect(ctx, x + 60, 12 + hash(i, 13) * 14, 14, 20, '#262a3c'); }
      // A shaft of moonlight through the broken roof.
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const ml = ctx.createLinearGradient(0, 0, 0, floorY); ml.addColorStop(0, 'rgba(180,200,255,0.16)'); ml.addColorStop(1, 'rgba(180,200,255,0.03)');
      ctx.fillStyle = ml; ctx.beginPath(); ctx.moveTo(120 - mid * 0.3, 0); ctx.lineTo(160 - mid * 0.3, 0); ctx.lineTo(200 - mid * 0.3, floorY); ctx.lineTo(110 - mid * 0.3, floorY); ctx.closePath(); ctx.fill();
      ctx.restore();
      // Mid columns, vines, glowing runes, a fallen statue head.
      for (let i = -1; i < 6; i++) {
        const x = i * 60 - mid, broken = hash(i, 14) > 0.6, top = broken ? 30 + hash(i, 15) * 20 : 6;
        rect(ctx, x + 8, top, 11, floorY - top, '#4a5068'); rect(ctx, x + 8, top, 2.5, floorY - top, '#6a7088'); rect(ctx, x + 16.5, top, 2.5, floorY - top, '#3a4058');
        if (!broken) rect(ctx, x + 5, 3, 17, 4, '#5a6078'); else poly(ctx, [x + 8, top, x + 12, top - 5, x + 19, top], '#4a5068');
        rect(ctx, x + 5, floorY - 4, 17, 4, '#5a6078');
        ctx.strokeStyle = '#3f7f33'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 10, top + 4); ctx.quadraticCurveTo(x + 4 + Math.sin(c * 0.7 + i) * 2, top + 24, x + 12, top + 44); ctx.stroke();
        for (let k = 0; k < 4; k++) circle(ctx, x + 7 + (k % 2) * 4, top + 10 + k * 9, 1.8, k % 2 ? '#4f9a3f' : '#5fb04a');
        if (hash(i, 16) > 0.5) { const ra = 0.5 + 0.5 * Math.sin(c * 1.5 + i); for (let k = 0; k < 3; k++) rect(ctx, x + 32 + k * 6, 40 + (k % 2) * 6, 3, 3, rgba('#60e0e0', 0.3 + 0.5 * ra)); circle(ctx, x + 38, 44, 10, rgba('#60e0e0', 0.08 * ra)); }
        if (hash(i, 17) > 0.75) { ctx.save(); ctx.translate(x + 42, floorY - 4); ctx.rotate(0.6); rect(ctx, -4, -4, 8, 8, '#6a7088'); rect(ctx, -2.5, -1.5, 1.5, 1.5, '#262a3c'); rect(ctx, 1, -1.5, 1.5, 1.5, '#262a3c'); ctx.restore(); }
      }
      // Floor: flagstones with moss and rubble.
      rect(ctx, 0, floorY, PANEL_W, PANEL_H - floorY, '#3a3e50'); rect(ctx, 0, floorY, PANEL_W, 2, '#6a6e80');
      for (let r = 0; r < 3; r++) for (let i = -1; i < 10; i++) { const x = i * 30 - near + (r % 2) * 15, y = floorY + 3 + r * 7; rect(ctx, x, y, 28, 6, hash(i, 20 + r) > 0.5 ? '#40445a' : '#363a4e'); if (hash(i, 25 + r) > 0.7) ellipse(ctx, x + 8 + hash(i, r) * 12, y + 3, 4, 1.6, rgba('#4f9a3f', 0.5)); }
      for (let i = -1; i < 7; i++) { const x = i * 45 - near; circle(ctx, x + 10, floorY + 5, 2, '#5a5e70'); circle(ctx, x + 14, floorY + 6, 1.4, '#6a6e80'); }
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, PANEL_H); g.addColorStop(0, '#14081e'); g.addColorStop(1, '#241236'); ctx.fillStyle = g; ctx.fillRect(0, 0, PANEL_W, PANEL_H);
      // Far: tall stained-glass windows glowing, chandeliers.
      for (let i = -1; i < 5; i++) {
        const x = i * 90 - far + 20, gl = 0.5 + 0.3 * Math.sin(c * 1.2 + i);
        ctx.fillStyle = '#2a1a3a'; ctx.beginPath(); ctx.roundRect(x, 6, 26, floorY - 14, [13, 13, 0, 0]); ctx.fill();
        const panes: [string, number, number, number, number][] = [['#8030c0', 3, 10, 9, 18], ['#c03060', 14, 10, 9, 18], ['#3050c0', 3, 30, 9, 14], ['#c0a030', 14, 30, 9, 14], ['#8030c0', 3, 46, 20, 14]];
        for (const [col, px, py, w, h] of panes) rect(ctx, x + px, py, w, Math.min(h, floorY - 16 - py), rgba(col, 0.35 + 0.35 * gl));
        rect(ctx, x + 12.5, 10, 1.2, floorY - 24, '#1a0c26'); rect(ctx, x + 3, 28, 20, 1.2, '#1a0c26'); rect(ctx, x + 3, 44, 20, 1.2, '#1a0c26');
        circle(ctx, x + 13, 40, 22, rgba('#a060e0', 0.06 * gl));
        const cx = x + 58, sw = Math.sin(c * 0.8 + i) * 1.5;
        line(ctx, cx, 0, cx + sw, 14, '#5a4a3a', 0.8); rect(ctx, cx - 9 + sw, 14, 18, 2, '#6a5030');
        for (let k = 0; k < 3; k++) { const kx = cx - 7 + k * 7 + sw, f = 1 + 0.3 * Math.sin(c * 9 + k + i); rect(ctx, kx - 0.6, 10, 1.2, 4, '#e8dcc0'); ellipse(ctx, kx, 9 - f, 1, 2 * f, '#c070ff'); circle(ctx, kx, 9, 6, rgba('#c070ff', 0.1)); }
      }
      // Mid: tapestries with gold trim, candelabras, floating runes.
      for (let i = -1; i < 6; i++) {
        const x = i * 60 - mid;
        if (hash(i, 30) > 0.45) {
          poly(ctx, [x + 10, 8, x + 30, 8, x + 30, 40, x + 20, 48, x + 10, 40], '#4a1a3a'); poly(ctx, [x + 12, 10, x + 28, 10, x + 28, 39, x + 20, 45, x + 12, 39], '#5a2448');
          rect(ctx, x + 10, 8, 20, 1.5, '#c8a050'); circle(ctx, x + 20, 24, 4, rgba('#c8a050', 0.8)); circle(ctx, x + 20, 24, 2, '#5a2448');
        } else {
          rect(ctx, x + 19, floorY - 22, 2, 22, '#5a4a3a'); rect(ctx, x + 12, floorY - 22, 16, 1.5, '#6a5030');
          for (let k = 0; k < 3; k++) { const kx = x + 13 + k * 7, f = 1 + 0.35 * Math.sin(c * 10 + k * 2 + i); rect(ctx, kx - 0.6, floorY - 27, 1.2, 5, '#e8dcc0'); ellipse(ctx, kx, floorY - 28 - f, 1.1, 2.4 * f, '#d080ff'); ellipse(ctx, kx, floorY - 27.5 - f * 0.5, 0.5, 1.2 * f, '#ffffff'); circle(ctx, kx, floorY - 28, 7, rgba('#d080ff', 0.12)); }
        }
        const ra = c * 0.8 + i;
        for (let k = 0; k < 3; k++) { const rx = x + 42 + Math.cos(ra + k * 2.1) * 7, ry = 34 + Math.sin(ra + k * 2.1) * 5; ctx.strokeStyle = rgba('#d080ff', 0.5 + 0.3 * Math.sin(c * 3 + k)); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(rx, ry, 2, 0, Math.PI * 1.5); ctx.stroke(); }
      }
      // The throne behind a boss.
      if (v.boss && v.hadEncounter) { const tx = PANEL_W * 0.74 + 18; rect(ctx, tx - 10, floorY - 34, 20, 34, '#2a1230'); poly(ctx, [tx - 12, floorY - 34, tx, floorY - 44, tx + 12, floorY - 34], '#3a1a40'); rect(ctx, tx - 8, floorY - 30, 16, 26, '#4a1a3a'); for (let k = -1; k <= 1; k++) circle(ctx, tx + k * 6, floorY - 36, 1.5, '#c8a050'); }
      // Floor: checkered polished stone with a red carpet.
      rect(ctx, 0, floorY, PANEL_W, PANEL_H - floorY, '#140c1e'); rect(ctx, 0, floorY, PANEL_W, 2, '#4a2a6a');
      for (let r = 0; r < 3; r++) for (let i = -1; i < 12; i++) { const x = i * 24 - (near % 48) + (r % 2) * 12, y = floorY + 2 + r * 7; rect(ctx, x, y, 12, 7, ((i + r) % 2) ? '#1c1228' : '#241a30'); }
      rect(ctx, 0, floorY + 9, PANEL_W, 6, 'rgba(140,20,40,0.55)'); rect(ctx, 0, floorY + 9, PANEL_W, 1, 'rgba(200,160,80,0.5)'); rect(ctx, 0, floorY + 14, PANEL_W, 1, 'rgba(200,160,80,0.5)');
      for (let i = 0; i < 6; i++) { const rx = (i * 47 + c * 8) % PANEL_W, ry = floorY - 4 - ((c * 10 + i * 30) % 60); circle(ctx, rx, ry, 1, rgba('#d080ff', 0.5)); }
    }
    // Torches on the walls of the cave and the ruins.
    if (id !== 'darkTower') for (const tx of [40, PANEL_W - 40]) {
      rect(ctx, tx - 4, 22, 8, 2, '#4a3a2a'); rect(ctx, tx - 1, 18, 2, 8, '#5a3a1e');
      const f = 1 + 0.3 * Math.sin(c * 12 + tx);
      const g = ctx.createRadialGradient(tx, 16, 0, tx, 16, 44); g.addColorStop(0, 'rgba(255,170,60,0.38)'); g.addColorStop(1, 'rgba(255,170,60,0)'); ctx.fillStyle = g; ctx.fillRect(tx - 44, -28, 88, 88);
      ellipse(ctx, tx, 15 - 2 * f, 2.4, 4.5 * f, '#ff9a30'); ellipse(ctx, tx, 16 - f, 1.1, 2 * f, '#ffe080');
      for (let k = 0; k < 2; k++) { const tt = (c * 0.8 + k * 0.5 + tx) % 1; circle(ctx, tx + Math.sin(c * 5 + k) * 2, 12 - tt * 14, 0.8, rgba('#ffb040', 1 - tt)); }
    }
    // Low fog drifting along the floor.
    for (let i = 0; i < 4; i++) { const fx = ((c * 6 + i * 80) % (PANEL_W + 60)) - 30; const fg = ctx.createRadialGradient(fx, floorY + 2, 0, fx, floorY + 2, 28); fg.addColorStop(0, 'rgba(200,200,230,0.12)'); fg.addColorStop(1, 'rgba(200,200,230,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(fx, floorY + 2, 28, 7, 0, 0, Math.PI * 2); ctx.fill(); }
  }
}

/** A health bar with a dark rim, a gradient fill and a highlight line. */
function hpBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, k: number, color: string): void {
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.beginPath(); ctx.roundRect(x - 1, y - 1, w + 2, h + 2, 2); ctx.fill();
  if (k > 0) {
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, color); g.addColorStop(1, rgba(color, 0.6));
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w * k, h, 1.5); ctx.fill();
    rect(ctx, x, y, w * k, h * 0.35, 'rgba(255,255,255,0.3)');
  }
}

function members(s: GameState, p: Party): Adventurer[] {
  return p.memberIds.map((id) => s.adventurers.find((a) => a.id === id)!).filter((a) => a && a.status === 'questing');
}

/** Horizontal room per hero; names are shrunk and then clipped to fit inside it. */
const HERO_GAP = 40;
function heroX(i: number): number { return 24 + i * HERO_GAP; }

/** Draw a label centred at (x, y), stepping the font down and finally clipping so it never spills past `maxW`. */
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number): void {
  for (const size of [8, 7.5, 7, 6.5]) {
    ctx.font = `${size}px system-ui, sans-serif`;
    if (ctx.measureText(text).width <= maxW) { ctx.fillText(text, x, y); return; }
  }
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  ctx.fillText(t + '…', x, y);
}
