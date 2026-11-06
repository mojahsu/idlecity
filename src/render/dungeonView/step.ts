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
  const say = (side: 'hero' | 'enemy', x: number, y: number, text: string, life = 1.9) => {
    v.talks = v.talks.filter((tk) => tk.side !== side);
    v.talks.push({ side, x, y, text, ttl: life, life });
  };
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
        case 'volley': for (let k = 0; k < 3; k++) v.shots.push({ kind: 'arrow', x: hx + 6, y: floorY - 14 - k * 3, tx: tx - 4 + k * 2, ty: ty - k * 3, t: -k * 0.07, life: 0.25, onLand: k === 2 ? () => hitEnemy(ti, f.amount, '#c8f0a0') : undefined }); label(t('skill.volley'), hx, floorY - 36, '#c8f0a0'); if (Math.random() < 0.65) say('hero', hx, floorY - 30, t('talk.h.volley')); break;
        case 'crit': v.shots.push({ kind: 'arrow', x: hx + 6, y: floorY - 14, tx: tx - 4, ty, t: 0, life: 0.2, onLand: () => { hitEnemy(ti, f.amount, '#ffd040'); v.shake = Math.max(v.shake, 0.15); if (Math.random() < 0.7) say('enemy', tx, floorY - eh(ti) - 10, t(Math.random() < 0.5 ? 'talk.m.hurt.0' : 'talk.m.hurt.1'), 1.5); } }); label(t('skill.crit'), hx, floorY - 44, '#ffd040', 1.3, true); say('hero', hx, floorY - 30, t(Math.random() < 0.5 ? 'talk.h.crit.0' : 'talk.h.crit.1')); break;
        case 'bolt': v.casting = 0.3; v.castIdx = ai; v.shots.push({ kind: 'bolt', x: hx + 8, y: floorY - 18, tx, ty, t: 0, life: 0.3, onLand: () => hitEnemy(ti, f.amount, '#a0e0ff') }); break;
        case 'fireball': v.casting = 0.4; v.castIdx = ai; v.shots.push({ kind: 'fire', x: hx + 8, y: floorY - 18, tx, ty, t: 0, life: 0.4, onLand: () => { hitEnemy(ti, f.amount, '#ffa060'); burst(v, tx, ty, '#ff9040', 18); burst(v, tx, ty, '#ffe080', 8); v.scorch.push({ x: tx, ttl: 2.2 }); for (const i of f.splash ?? []) hitEnemy(i, Math.round(f.amount / 2), '#ffa060'); v.shake = Math.max(v.shake, 0.22); } }); label(t('skill.fireball'), hx, floorY - 36, '#ffa060'); say('hero', hx, floorY - 30, t('talk.h.fireball')); break;
        case 'heal': { const ti2 = hi(f.targetId ?? f.actorId); v.heal.set(f.targetId ?? f.actorId, 0.6); num(`+${f.amount}`, heroX(ti2), floorY - 46, '#90f090'); v.casting = 0.3; v.castIdx = ai; if (ti2 !== ai && Math.random() < 0.55) setTimeoutLike(v, 0.35, () => say('hero', heroX(ti2), floorY - 28, t('talk.h.thanks'), 1.5)); break; }
        case 'holyLight': { const ti2 = hi(f.targetId ?? f.actorId); v.beam = 0.7; v.beamIdx = ti2; v.heal.set(f.targetId ?? f.actorId, 0.7); num(`+${f.amount}`, heroX(ti2), floorY - 46, '#fff0a0'); label(t('skill.holyLight'), heroX(ti2), floorY - 40, '#fff0a0'); say('hero', hx, floorY - 30, t('talk.h.heal')); if (ti2 !== ai) setTimeoutLike(v, 0.45, () => say('hero', heroX(ti2), floorY - 28, t('talk.h.thanks'), 1.6)); break; }
      }
    } else if (f.kind === 'enemyStrike') {
      const ti = hi(f.targetId), hx = heroX(ti);
      const ev = v.enemies[f.enemyIdx];
      const hurtHero = () => { v.heroHurt.set(f.targetId, 0.3); num(`-${f.amount}`, hx, PANEL_H - 44, '#ff7070'); };
      switch (f.style) {
        case 'breath': if (!f.all || ti === 0) { v.breath = 0.8; v.breathFrom = f.enemyIdx; v.shake = Math.max(v.shake, 0.25); label(t('skill.breath'), ex(f.enemyIdx), floorY - eh(f.enemyIdx) - 14, '#ff8040', 1.2, true); say('enemy', ex(f.enemyIdx), floorY - eh(f.enemyIdx) - 12, t('talk.m.breath')); } setTimeoutLike(v, 0.25, hurtHero); break;
        case 'bolt': v.shots.push({ kind: 'dark', x: ex(f.enemyIdx) - 6, y: floorY - eh(f.enemyIdx) * 0.6, tx: hx, ty: floorY - 12, t: 0, life: 0.3, onLand: hurtHero }); break;
        case 'curse': v.curse = 1.0; v.curseIdx = ti; v.shots.push({ kind: 'dark', x: ex(f.enemyIdx) - 6, y: floorY - eh(f.enemyIdx) * 0.6, tx: hx, ty: floorY - 24, t: 0, life: 0.35, onLand: hurtHero }); label(t('skill.curse'), ex(f.enemyIdx), floorY - eh(f.enemyIdx) - 14, '#d080ff', 1.2, true); say('enemy', ex(f.enemyIdx), floorY - eh(f.enemyIdx) - 12, t('talk.m.curse')); break;
        default: if (ev) ev.lunge = 0.45; v.puffs.push({ x: ex(f.enemyIdx) + 6, y: floorY + 1, ttl: 0.45 }); if (f.style === 'smash' && Math.random() < 0.6) say('enemy', ex(f.enemyIdx), floorY - eh(f.enemyIdx) - 12, t('talk.m.smash'), 1.6); setTimeoutLike(v, 0.2, () => { hurtHero(); if (f.style === 'smash') v.shake = Math.max(v.shake, 0.2); }); break;
      }
    } else if (f.kind === 'slain') {
      v.dying.push({ monster: f.monster, x: ex(f.enemyIdx), boss: f.boss, t: 0, scale: enemyScale(f.monster, f.boss, n) });
      burst(v, ex(f.enemyIdx), floorY - eh(f.enemyIdx) * 0.5, f.boss ? '#ffd040' : '#c0c0c0', f.boss ? 40 : 14);
      label(t('ui.slain'), ex(f.enemyIdx), floorY - eh(f.enemyIdx) - 10, '#ffe080', 1.2, f.boss);
      v.cheer = 0.65;
      if (f.boss) { v.shake = Math.max(v.shake, 0.5); say('enemy', ex(f.enemyIdx), floorY - eh(f.enemyIdx) - 10, t('talk.m.slain'), 1.8); }
      else if (Math.random() < 0.55 && team.length) say('hero', heroX(team.length - 1), floorY - 30, t('talk.h.cheer'), 1.5);
    } else if (f.kind === 'skill') {
      const ai = hi(f.actorId), ti = f.targetId !== undefined ? hi(f.targetId) : ai;
      switch (f.skill) {
        case 'taunt': v.taunt = 0.8; v.tauntIdx = ai; v.guardCover = { actorIdx: ai, targetIdx: Math.max(0, ai - 1), t: 0.55 }; label(t('skill.taunt'), heroX(ai), floorY - 38, '#ffd060'); say('hero', heroX(ai), floorY - 30, t(Math.random() < 0.5 ? 'talk.h.taunt.0' : 'talk.h.taunt.1')); break;
        case 'frost': v.frozen = 1.4; label(t('skill.frost'), PANEL_W * 0.74, floorY - 48, '#a0e0ff', 1.3); say('hero', heroX(ai), floorY - 30, t('talk.h.frost')); break;
        case 'block': v.block = 0.45; v.blockIdx = ti; label(t('skill.block'), heroX(ti), floorY - 36, '#c0d0e0'); say('hero', heroX(ti), floorY - 30, t('talk.h.block'), 1.5); break;
        case 'revive': v.revive = 1.2; v.reviveIdx = ti; label(t('skill.revive'), heroX(ti), floorY - 44, '#ffffff', 1.6, true); say('hero', heroX(ai), floorY - 30, t('talk.h.revive')); setTimeoutLike(v, 0.5, () => say('hero', heroX(ti), floorY - 28, t('talk.h.thanks'), 1.6)); break;
      }
    } else if (f.kind === 'treasure') {
      v.chest = 1.4; v.cheer = 0.85; burst(v, PANEL_W * 0.74 - 30, floorY - 6, '#ffd040', 22); label(`+${f.gold}g`, PANEL_W * 0.74 - 30, floorY - 20, '#ffd040', 1.3);
      if (team.length) say('hero', heroX(team.length - 1), floorY - 30, t('talk.h.treasure'));
    } else if (f.kind === 'dungeonEvent') {
      v.eventProp = { kind: f.event, t: 1.7 };
      v.cheer = 0.85;
      const px = PANEL_W * 0.74 - 28;
      if (f.event === 'spring') {
        for (const a of team) v.heal.set(a.id, 0.7);
        burst(v, px, floorY - 6, '#60e8ff', 22);
        label(t('ui.eventSpring'), px, floorY - 22, '#80f4ff', 1.4);
        if (team.length) say('hero', heroX(team.length - 1), floorY - 30, t('talk.h.spring'));
      } else if (f.event === 'altar') {
        burst(v, px, floorY - 8, '#ffe070', 24);
        label(t('ui.eventAltar'), px, floorY - 22, '#ffe080', 1.4);
        if (team.length) say('hero', heroX(team.length - 1), floorY - 30, t('talk.h.altar'));
      } else {
        burst(v, px, floorY - 6, '#ffd040', 22);
        label(`+${f.amount ?? 20}g`, px, floorY - 22, '#ffd040', 1.4);
        if (team.length) say('hero', heroX(team.length - 1), floorY - 30, t('talk.h.rescue'));
      }
    }
  }
  // Floor change.
  if (p.floor !== v.floor) {
    v.floor = p.floor; v.floorFlash = 0.8;
    const def = DUNGEONS.find((d) => d.id === p.dungeon)!;
    const isAbyss = p.dungeon === 'darkTower' && p.floor > def.floors;
    v.banner = { text: isAbyss ? t('ui.abyssFloor', { floor: p.floor }) : t('ui.floor', { floor: p.floor, floors: def.floors }), color: isAbyss || p.floor === def.floors ? '#ffb0f0' : '#f0e0c0', ttl: 1.3, life: 1.3, big: isAbyss && p.floor % 5 === 0 };
  }
  if (p.phase === 'explore') {
    v.scroll += dt * 24;
    v.talkCooldown -= dt;
    if (v.talkCooldown <= 0 && team.length && !v.talks.length) {
      v.talkCooldown = 2.6 + Math.random() * 1.4;
      const speaker = Math.floor(Math.random() * team.length);
      say('hero', heroX(speaker), floorY - 28, t(`talk.h.explore.${Math.floor(Math.random() * 4)}`), 1.8);
    }
  }
  if (v.outro > 0 && v.retreating) {
    v.scroll -= dt * 36;
    if (!v.talks.some((tk) => tk.side === 'hero') && team.length) say('hero', heroX(team.length - 1), floorY - 28, t('talk.h.retreat'), 1.3);
    if (Math.random() < dt * 10 && team.length) v.puffs.push({ x: heroX(Math.floor(Math.random() * team.length)) + 4, y: floorY + 1, ttl: 0.4 });
  }
  // The pack appears: the lead monster taunts and the party leader answers back.
  if (e && !v.hadEncounter) {
    v.boss = e.boss; v.enemies = enemies.map(() => ({ lunge: 0, hurt: 0, shownHp: 1 })); v.shake = e.boss ? 0.5 : e.nemesis ? 0.25 : 0;
    if (e.boss) { v.bossIntro = 1.8; v.banner = { text: t(`monster.${e.monster}`), color: e.monster === 'demonLord' ? '#ff60c0' : '#ff8080', ttl: 1.8, life: 1.8, big: true }; }
    else if (e.nemesis) { v.banner = { text: '★ ' + t('ui.nemesisPrefix') + t(`monster.${e.monster}`), color: '#ffd040', ttl: 1.5, life: 1.5, big: false }; }
    say('enemy', ex(0), floorY - eh(0) - 10, t(e.nemesis ? 'talk.m.nemesis' : `talk.m.${e.monster}`), 2.1);
    if (team.length) {
      const leadIdx = team.length - 1;
      const replyKey = e.boss ? `talk.h.boss.${e.monster}` : e.nemesis ? 'talk.h.nemesis' : `talk.h.engage.${p.floor % 3}`;
      setTimeoutLike(v, 0.5, () => say('hero', heroX(leadIdx), floorY - 30, t(replyKey), 1.9));
    }
  }
  if (!e && v.outro <= 0) v.enemies = [];
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
  if (v.eventProp && (v.eventProp.t -= dt) <= 0) v.eventProp = null;
  v.breath = Math.max(0, v.breath - dt); v.curse = Math.max(0, v.curse - dt);
  if (v.banner && (v.banner.ttl -= dt) <= 0) v.banner = null;
  v.taunt = Math.max(0, v.taunt - dt); v.frozen = Math.max(0, v.frozen - dt); v.beam = Math.max(0, v.beam - dt); v.block = Math.max(0, v.block - dt); v.revive = Math.max(0, v.revive - dt); v.casting = Math.max(0, v.casting - dt);
  v.cheer = Math.max(0, v.cheer - dt);
  if (v.guardCover && (v.guardCover.t -= dt) <= 0) v.guardCover = null;
  v.talks = v.talks.filter((tk) => (tk.ttl -= dt) > 0);
  for (const sh of v.shots) { const was = sh.t; sh.t += dt; if (sh.onLand && was < sh.life && sh.t >= sh.life) sh.onLand(); }
  v.shots = v.shots.filter((sh) => sh.t < sh.life);
  runDelayed(v, dt);
  for (const [k, val] of v.heroHurt) { if (val - dt <= 0) v.heroHurt.delete(k); else v.heroHurt.set(k, val - dt); }
  for (const [k, val] of v.heal) { if (val - dt <= 0) v.heal.delete(k); else v.heal.set(k, val - dt); }
  v.nums = v.nums.filter((x) => (x.ttl -= dt) > 0); for (const x of v.nums) x.y -= 18 * dt;
  v.sparks = v.sparks.filter((sp) => (sp.ttl -= dt) > 0); for (const sp of v.sparks) { sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += 60 * dt; }
  v.puffs = v.puffs.filter((q) => (q.ttl -= dt) > 0);
  v.scorch = v.scorch.filter((sc) => (sc.ttl -= dt) > 0);
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
