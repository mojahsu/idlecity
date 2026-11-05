// Reads the party each frame and turns HP changes and skill fx into animation.
import type { GameState, Party } from '../../sim/types';
import { DUNGEONS } from '../../data/dungeons';
import { t } from '../../i18n';
import type { Env } from '../palette';
import { monsterHeight } from '../monsters';
import { PANEL_H, PANEL_W } from './layout';
import { heroX, members } from './hud';
import type { ViewState } from './state';

export function step(s: GameState, p: Party, v: ViewState, env: Env, dt: number): void {
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
  for (const f of s.fx) if (f.kind === 'treasure' && f.partyId === p.id) { v.chest = 1.4; burst(v, mx - 30, floorY - 6, '#ffd040', 22); v.nums.push({ x: mx - 30, y: floorY - 20, text: `+${f.gold}g`, color: '#ffd040', ttl: 1.3 }); }
  if (p.phase === 'explore') v.scroll += dt * 24;
  // Monster appears / is slain.
  if (e && !v.hadEncounter) {
    v.monster = e.monster; v.boss = e.boss; v.lastEncHp = e.hp; v.shake = e.boss ? 0.5 : 0;
    if (e.boss) { v.bossIntro = 1.8; v.banner = { text: t(`monster.${e.monster}`), color: e.monster === 'demonLord' ? '#ff60c0' : '#ff8080', ttl: 1.8, life: 1.8, big: true }; }
  }
  if (!e && v.hadEncounter) { v.death = 0.9; v.deathMonster = v.monster; v.deathBoss = v.boss; burst(v, PANEL_W * 0.74, PANEL_H - 30, v.boss ? '#ffd040' : '#c0c0c0', v.boss ? 40 : 16); }
  v.hadEncounter = !!e;
  // Monster took damage → a hero strikes.
  if (e && e.hp < v.lastEncHp - 0.01) {
    const dmg = Math.round(v.lastEncHp - e.hp);
    v.heroIdx = team.length ? v.attacker % team.length : 0; v.attacker++;
    v.heroLunge = 0.35; v.monsterHurt = 0.25;
    v.puffs.push({ x: heroX(v.heroIdx) - 4, y: floorY + 1, ttl: 0.45 });
    v.nums.push({ x: PANEL_W * 0.74 + (Math.random() - 0.5) * 12, y: PANEL_H - 34 - monsterHeight(e.monster) * (e.boss ? 1.5 : 1), text: `-${dmg}`, color: '#ffe080', ttl: 1 });
    burst(v, PANEL_W * 0.72, PANEL_H - 30 - monsterHeight(e.monster) * 0.5, '#ffe080', 6);
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
    if (sh.kind === 'fire' && sh.t >= sh.life && sh.t - dt < sh.life) { burst(v, sh.tx, sh.ty, '#ff9040', 18); burst(v, sh.tx, sh.ty, '#ffe080', 8); if (e?.boss) v.shake = Math.max(v.shake, 0.12); }
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

export function burst(v: ViewState, x: number, y: number, color: string, n: number): void {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, sp = 20 + Math.random() * 50; v.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, ttl: 0.5 + Math.random() * 0.4, color }); }
}
