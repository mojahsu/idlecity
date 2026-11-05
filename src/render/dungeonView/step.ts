// Turns the sim's per-action fx into animation: lunges, shots, spells, specials,
// numbers, sparks and deaths, each in its turn.
import type { GameState, Party } from '../../sim/types';
import { DUNGEONS } from '../../data/dungeons';
import { t } from '../../i18n';
import type { Env } from '../palette';
import { monsterHeight } from '../monsters';
import { PANEL_H, PANEL_W } from './layout';
import { enemyScale, enemyX, heroX, members } from './hud';
import type { ViewState } from './state';

export function step(s: GameState, p: Party, v: ViewState, env: Env, dt: number): void {
  const team = members(s, p);
  const e = p.encounter;
  const enemies = e?.enemies ?? [];
  const floorY = PANEL_H - 22;
  const n = enemies.length;
  const ex = (i: number) => enemyX(i, n, !!e?.boss, PANEL_W);
  const eh = (i: number) => (enemies[i] ? monsterHeight(enemies[i].monster) * enemyScale(enemies[i].monster, !!e?.boss, n) : 18);
  const hi = (id: number) => Math.max(0, team.findIndex((a) => a.id === id));
  const label = (text: string, x: number, y: number, color: string, ttl = 1.1, big = false) => v.nums.push({ x, y, text, color, ttl, big });
  const num = (text: string, x: number, y: number, color: string) => v.nums.push({ x: x + (Math.random() - 0.5) * 10, y, text, color, ttl: 1 });
  while (v.enemies.length < n) v.enemies.push({ lunge: 0, hurt: 0, shownHp: 1 });

  for (const f of s.fx) {
    if (!('partyId' in f) || f.partyId !== p.id) continue;
    if (f.kind === 'strike') {
      const ai = hi(f.actorId), hx = heroX(ai);
      const ti = f.targetIdx ?? 0, tx = ex(ti), ty = floorY - eh(ti) * 0.5;
      const hitEnemy = (i: number, amount: number, color: string) => { const ev = v.enemies[i]; if (ev) ev.hurt = 0.3; num(`-${amount}`, ex(i), floorY - eh(i) - 6, color); burst(v, ex(i) - 4, floorY - eh(i) * 0.5, color, 6); if (e?.boss) v.shake = Math.max(v.shake, 0.12); };
      switch (f.style) {
        case 'melee': v.heroLunge.set(f.actorId, { t: 0.45, tx: tx - 14 }); v.puffs.push({ x: hx - 4, y: floorY + 1, ttl: 0.45 }); setTimeoutLike(v, 0.2, () => hitEnemy(ti, f.amount, '#ffe080')); break;
        case 'smite': v.casting = 0.3; v.castIdx = ai; v.shots.push({ kind: 'light', x: hx + 4, y: floorY - 20, tx, ty, t: 0, life: 0.3, onLand: () => hitEnemy(ti, f.amount, '#fff0a0') }); break;
        case 'arrow': v.shots.push({ kind: 'arrow', x: hx + 6, y: floorY - 14, tx: tx - 4, ty, t: 0, life: 0.25, onLand: () => hitEnemy(ti, f.amount, '#ffe080') }); break;
        case 'volley': for (let k = 0; k < 3; k++) v.shots.push({ kind: 'arrow', x: hx + 6, y: floorY - 14 - k * 3, tx: tx - 4 + k * 2, ty: ty - k * 3, t: -k * 0.07, life: 0.25, onLand: k === 2 ? () => hitEnemy(ti, f.amount, '#c8f0a0') : undefined }); label(t('skill.volley'), hx, floorY - 36, '#c8f0a0'); break;
        case 'crit': v.shots.push({ kind: 'arrow', x: hx + 6, y: floorY - 14, tx: tx - 4, ty, t: 0, life: 0.2, onLand: () => { hitEnemy(ti, f.amount, '#ffd040'); v.shake = Math.max(v.shake, 0.15); } }); label(t('skill.crit'), hx, floorY - 44, '#ffd040', 1.3, true); break;
        case 'bolt': v.casting = 0.3; v.castIdx = ai; v.shots.push({ kind: 'bolt', x: hx + 8, y: floorY - 18, tx, ty, t: 0, life: 0.3, onLand: () => hitEnemy(ti, f.amount, '#a0e0ff') }); break;
        case 'fireball': v.casting = 0.4; v.castIdx = ai; v.shots.push({ kind: 'fire', x: hx + 8, y: floorY - 18, tx, ty, t: 0, life: 0.4, onLand: () => { hitEnemy(ti, f.amount, '#ffa060'); burst(v, tx, ty, '#ff9040', 18); burst(v, tx, ty, '#ffe080', 8); for (const i of f.splash ?? []) hitEnemy(i, Math.round(f.amount / 2), '#ffa060'); v.shake = Math.max(v.shake, 0.15); } }); label(t('skill.fireball'), hx, floorY - 36, '#ffa060'); break;
        case 'heal': { const ti2 = hi(f.targetId ?? f.actorId); v.heal.set(f.targetId ?? f.actorId, 0.6); num(`+${f.amount}`, heroX(ti2), floorY - 46, '#90f090'); v.casting = 0.3; v.castIdx = ai; break; }
        case 'holyLight': { const ti2 = hi(f.targetId ?? f.actorId); v.beam = 0.7; v.beamIdx = ti2; v.heal.set(f.targetId ?? f.actorId, 0.7); num(`+${f.amount}`, heroX(ti2), floorY - 46, '#fff0a0'); label(t('skill.holyLight'), heroX(ti2), floorY - 40, '#fff0a0'); break; }
      }
    } else if (f.kind === 'enemyStrike') {
      const ti = hi(f.targetId), hx = heroX(ti);
      const ev = v.enemies[f.enemyIdx];
      const hurtHero = () => { v.heroHurt.set(f.targetId, 0.3); num(`-${f.amount}`, hx, PANEL_H - 44, '#ff7070'); };
      switch (f.style) {
        case 'breath': if (!f.all || ti === 0) { v.breath = 0.8; v.breathFrom = f.enemyIdx; v.shake = Math.max(v.shake, 0.25); label(t('skill.breath'), ex(f.enemyIdx), floorY - eh(f.enemyIdx) - 14, '#ff8040', 1.2, true); } setTimeoutLike(v, 0.25, hurtHero); break;
        case 'bolt': v.shots.push({ kind: 'dark', x: ex(f.enemyIdx) - 6, y: floorY - eh(f.enemyIdx) * 0.6, tx: hx, ty: floorY - 12, t: 0, life: 0.3, onLand: hurtHero }); break;
        case 'curse': v.curse = 1.0; v.curseIdx = ti; v.shots.push({ kind: 'dark', x: ex(f.enemyIdx) - 6, y: floorY - eh(f.enemyIdx) * 0.6, tx: hx, ty: floorY - 24, t: 0, life: 0.35, onLand: hurtHero }); label(t('skill.curse'), ex(f.enemyIdx), floorY - eh(f.enemyIdx) - 14, '#d080ff', 1.2, true); break;
        default: if (ev) ev.lunge = 0.45; v.puffs.push({ x: ex(f.enemyIdx) + 6, y: floorY + 1, ttl: 0.45 }); setTimeoutLike(v, 0.2, () => { hurtHero(); if (f.style === 'smash') v.shake = Math.max(v.shake, 0.2); }); break;
      }
    } else if (f.kind === 'slain') {
      v.dying.push({ monster: f.monster, x: ex(f.enemyIdx), boss: f.boss, t: 0, scale: enemyScale(f.monster, f.boss, n) });
      burst(v, ex(f.enemyIdx), floorY - eh(f.enemyIdx) * 0.5, f.boss ? '#ffd040' : '#c0c0c0', f.boss ? 40 : 14);
      label(t('ui.slain'), ex(f.enemyIdx), floorY - eh(f.enemyIdx) - 10, '#ffe080', 1.2, f.boss);
      if (f.boss) v.shake = Math.max(v.shake, 0.5);
    } else if (f.kind === 'skill') {
      const ai = hi(f.actorId), ti = f.targetId !== undefined ? hi(f.targetId) : ai;
      switch (f.skill) {
        case 'taunt': v.taunt = 0.7; v.tauntIdx = ai; break;
        case 'frost': v.frozen = 1.4; label(t('skill.frost'), PANEL_W * 0.74, floorY - 48, '#a0e0ff', 1.3); break;
        case 'block': v.block = 0.45; v.blockIdx = ti; label(t('skill.block'), heroX(ti), floorY - 36, '#c0d0e0'); break;
        case 'revive': v.revive = 1.2; v.reviveIdx = ti; label(t('skill.revive'), heroX(ti), floorY - 44, '#ffffff', 1.6, true); break;
      }
    } else if (f.kind === 'treasure') {
      v.chest = 1.4; burst(v, PANEL_W * 0.74 - 30, floorY - 6, '#ffd040', 22); label(`+${f.gold}g`, PANEL_W * 0.74 - 30, floorY - 20, '#ffd040', 1.3);
    }
  }
  // Floor change.
  if (p.floor !== v.floor) { v.floor = p.floor; v.floorFlash = 0.8; const def = DUNGEONS.find((d) => d.id === p.dungeon)!; v.banner = { text: t('ui.floor', { floor: p.floor, floors: def.floors }), color: p.floor === def.floors ? '#ffb0f0' : '#f0e0c0', ttl: 1.3, life: 1.3, big: false }; }
  if (p.phase === 'explore') v.scroll += dt * 24;
  // The pack appears.
  if (e && !v.hadEncounter) {
    v.boss = e.boss; v.enemies = enemies.map(() => ({ lunge: 0, hurt: 0, shownHp: 1 })); v.shake = e.boss ? 0.5 : 0;
    if (e.boss) { v.bossIntro = 1.8; v.banner = { text: t(`monster.${e.monster}`), color: e.monster === 'demonLord' ? '#ff60c0' : '#ff8080', ttl: 1.8, life: 1.8, big: true }; }
  }
  if (!e) v.enemies = [];
  v.hadEncounter = !!e;
  // Shown bars chase the real values so a blow reads as a drop.
  enemies.forEach((en, i) => { const ev = v.enemies[i]; if (ev) ev.shownHp += (Math.max(0, en.hp) / en.maxHp - ev.shownHp) * Math.min(1, dt * 6); });
  for (const a of team) { const sh = v.shownHp.get(a.id) ?? a.hp / a.maxHp; v.shownHp.set(a.id, sh + (a.hp / a.maxHp - sh) * Math.min(1, dt * 6)); }
  // Timers.
  for (const [k, l] of v.heroLunge) { l.t -= dt; if (l.t <= 0) v.heroLunge.delete(k); }
  for (const ev of v.enemies) { ev.lunge = Math.max(0, ev.lunge - dt); ev.hurt = Math.max(0, ev.hurt - dt); }
  for (const d of v.dying) d.t += dt;
  v.dying = v.dying.filter((d) => d.t < 1.1);
  v.floorFlash = Math.max(0, v.floorFlash - dt); v.shake = Math.max(0, v.shake - dt);
  v.bossIntro = Math.max(0, v.bossIntro - dt); v.chest = Math.max(0, v.chest - dt);
  v.breath = Math.max(0, v.breath - dt); v.curse = Math.max(0, v.curse - dt);
  if (v.banner && (v.banner.ttl -= dt) <= 0) v.banner = null;
  v.taunt = Math.max(0, v.taunt - dt); v.frozen = Math.max(0, v.frozen - dt); v.beam = Math.max(0, v.beam - dt); v.block = Math.max(0, v.block - dt); v.revive = Math.max(0, v.revive - dt); v.casting = Math.max(0, v.casting - dt);
  for (const sh of v.shots) { const was = sh.t; sh.t += dt; if (sh.onLand && was < sh.life && sh.t >= sh.life) sh.onLand(); }
  v.shots = v.shots.filter((sh) => sh.t < sh.life);
  runDelayed(v, dt);
  for (const [k, val] of v.heroHurt) { if (val - dt <= 0) v.heroHurt.delete(k); else v.heroHurt.set(k, val - dt); }
  for (const [k, val] of v.heal) { if (val - dt <= 0) v.heal.delete(k); else v.heal.set(k, val - dt); }
  v.nums = v.nums.filter((x) => (x.ttl -= dt) > 0); for (const x of v.nums) x.y -= 18 * dt;
  v.sparks = v.sparks.filter((sp) => (sp.ttl -= dt) > 0); for (const sp of v.sparks) { sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += 60 * dt; }
  v.puffs = v.puffs.filter((q) => (q.ttl -= dt) > 0);
  if (v.motes.length < 14 && Math.random() < dt * 3) v.motes.push({ x: Math.random() * PANEL_W, y: 6 + Math.random() * (floorY - 10), vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 2, ttl: 4 + Math.random() * 4, life: 8 });
  v.motes = v.motes.filter((m) => (m.ttl -= dt) > 0); for (const m of v.motes) { m.x += (m.vx - (p.phase === 'explore' ? 10 : 0)) * dt; m.y += m.vy * dt + Math.sin(env.clock + m.x) * 0.3 * dt; }
}

/** Small delayed callbacks (a blow lands at the end of the lunge, not its start). */
const delayed = new WeakMap<ViewState, { t: number; fn: () => void }[]>();
function setTimeoutLike(v: ViewState, t: number, fn: () => void): void {
  const list = delayed.get(v) ?? []; list.push({ t, fn }); delayed.set(v, list);
}
function runDelayed(v: ViewState, dt: number): void {
  const list = delayed.get(v); if (!list) return;
  for (const d of list) d.t -= dt;
  for (const d of list.filter((x) => x.t <= 0)) d.fn();
  delayed.set(v, list.filter((x) => x.t > 0));
}

export function burst(v: ViewState, x: number, y: number, color: string, n: number): void {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, sp = 20 + Math.random() * 50; v.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, ttl: 0.5 + Math.random() * 0.4, color }); }
}
