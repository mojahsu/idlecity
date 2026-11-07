// Dungeon runs: travel, explore floors, fight, loot, return. Also the final boss.
import type { Adventurer, Encounter, Enemy, EnemyStyle, GameState, Party } from './types';
import { DUNGEONS, FINAL_DUNGEON, MONSTERS } from '../data/dungeons';
import { CLASSES } from '../data/adventurers';
import { SKILL_TUNING as T, hasSkill } from '../data/skills';
import { chance, pick, random } from './rng';
import { findBuildSpot, findPath, moveAlong } from './world';
import { countBuildings, placeBuilding } from './buildings';
import { chronicle, log } from './log';
import { ACT_TIME, EXPLORE_TIME, FIGHT_REWARD, FIGHT_TUNE, PARTY_SPEED } from './constants';
import { gainXp, leader, tavernPos } from './adventurers';

function members(s: GameState, p: Party): Adventurer[] {
  return p.memberIds.map((id) => s.adventurers.find((a) => a.id === id)!).filter((a) => a && a.status === 'questing');
}

export function updateParties(s: GameState, dt: number): void {
  for (const p of [...s.parties]) updateParty(s, p, dt);
}

function updateParty(s: GameState, p: Party, dt: number): void {
  const team = members(s, p);
  if (!team.length) { dissolve(s, p); return; }
  for (const a of team) { a.x = p.x; a.y = p.y; }
  watchdog(s, p, dt);

  switch (p.phase) {
    case 'travel':
      if (moveAlong(p, PARTY_SPEED, dt)) { p.phase = 'explore'; p.floor = 1; p.timer = EXPLORE_TIME; }
      return;
    case 'explore':
      p.timer -= dt;
      if (p.timer <= 0) {
        if (!daresBossFloor(s, p)) { log(s, 'adventure', 'log.bossRetreat', { leader: leader(team)!.name, dungeon: `dungeon.${p.dungeon}` }); startReturn(s, p); return; }
        p.encounter = makeEncounter(s, p); p.phase = 'fight'; p.timer = -ACT_TIME; p.actIdx = 0; // a beat before the first blow
      }
      return;
    case 'fight':
      if (p.encounter && !p.encounter.enemies) p.encounter.enemies = [{ monster: p.encounter.monster, hp: p.encounter.hp, maxHp: p.encounter.maxHp, atk: p.encounter.atk, acts: 0 }];
      if (p.encounter && !p.encounter.enemies!.some((x) => x.hp > 0)) { onPackCleared(s, p); return; } // never wait on a pack that is already dead
      p.timer += dt;
      while (p.timer >= ACT_TIME) { p.timer -= ACT_TIME; act(s, p); if (p.phase !== 'fight') return; }
      return;
    case 'return':
      if (moveAlong(p, PARTY_SPEED, dt)) arriveHome(s, p);
      return;
  }
}

/**
 * A party on the road that has not moved for a while gets a fresh path, and
 * one that still cannot move finishes its leg, so a blocked road never leaves
 * adventurers standing at a dungeon mouth for good.
 */
function watchdog(s: GameState, p: Party, dt: number): void {
  if (p.phase !== 'travel' && p.phase !== 'return') { p.stuck = 0; return; }
  if (p.stuckX === p.x && p.stuckY === p.y) p.stuck = (p.stuck ?? 0) + dt;
  else { p.stuck = 0; p.stuckX = p.x; p.stuckY = p.y; }
  if (p.stuck > 20 && p.stuck - dt <= 20) {
    const d = s.dungeons.find((x) => x.id === p.dungeon);
    p.path = findPath(s, p, p.phase === 'travel' && d ? d : tavernPos(s));
  }
  if (p.stuck > 45) p.path = []; // give up: the next move completes the leg
}

/** Only a healthy, full-strength party faces a boss. Others turn back and live to try again. */
function daresBossFloor(s: GameState, p: Party): boolean {
  const def = DUNGEONS.find((d) => d.id === p.dungeon)!;
  if (p.floor !== def.floors) return true;
  const team = members(s, p);
  const avgHp = team.reduce((n, a) => n + a.hp / a.maxHp, 0) / team.length;
  // A party well under the dungeon's level turns back at the boss's door instead of feeding it.
  const avgLevel = team.reduce((n, a) => n + a.level, 0) / team.length;
  const margin = def.id === 'darkTower' ? 3 : 2; // the Demon Lord punishes a thin margin
  // No warrior to hold the line means no boss: a party of casters turns back at the door.
  return team.length >= 3 && avgHp >= 0.7 && avgLevel >= def.level + margin && team.some((a) => a.cls === 'warrior');
}

function makeEncounter(s: GameState, p: Party): Encounter {
  const def = DUNGEONS.find((d) => d.id === p.dungeon)!;
  const d = s.dungeons.find((x) => x.id === p.dungeon)!;
  const inAbyss = p.dungeon === FINAL_DUNGEON && s.victory && p.floor > def.floors;
  const boss = (p.floor === def.floors && !(p.dungeon === FINAL_DUNGEON && s.victory)) || (inAbyss && p.floor % 5 === 0);
  const scale = (1 + 0.3 * (p.floor - 1)) * hpMult(s, p, boss);
  const atkScale = (1 + 0.1 * (p.floor - 1)) * (boss ? FIGHT_TUNE.bossAtk : FIGHT_TUNE.atk);
  const enemies: Enemy[] = [];
  let hasNemesis = false;
  if (boss) {
    const abyssBosses = ['lich', 'broodMother', 'elderDragon', 'demonLord'];
    const bossId = inAbyss ? abyssBosses[Math.floor(p.floor / 5) % abyssBosses.length] : def.boss;
    const m = MONSTERS[bossId];
    const maxHp = Math.round(m.hp * scale);
    let hp = maxHp;
    // Bosses carry their wounds over from the last attempt, recovering a tenth in between,
    // so a town wears its Demon Lord down over several expeditions instead of feeding it.
    if (!inAbyss && d.bossHp !== undefined) hp = Math.round(Math.min(maxHp, d.bossHp + maxHp * 0.1));
    enemies.push({ monster: m.id, hp, maxHp, atk: Math.round(m.atk * atkScale), acts: 0 });
  } else {
    // A pack: one to three monsters, bigger packs deeper down.
    const n = 1 + (chance(s, 0.6) ? 1 : 0) + (p.floor >= 4 && chance(s, 0.5) ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const m = MONSTERS[pick(s, def.monsters)];
      const isNem = i === 0 && !!d.nemesis && d.nemesis.floor === p.floor;
      const nemM = isNem && MONSTERS[d.nemesis!.monster] ? MONSTERS[d.nemesis!.monster] : m;
      const hp = Math.round(nemM.hp * scale * (isNem ? 1.25 : 1));
      enemies.push({ monster: nemM.id, hp, maxHp: hp, atk: Math.round(nemM.atk * atkScale * (isNem ? 1.12 : 1)), acts: 0, nemesis: isNem });
      if (isNem) hasNemesis = true;
    }
  }
  const hp = enemies.reduce((n, e) => n + e.hp, 0), maxHp = enemies.reduce((n, e) => n + e.maxHp, 0);
  return { monster: enemies[0].monster, hp, maxHp, atk: enemies[0].atk, boss, nemesis: hasNemesis, enemies };
}

/** How many blows a monster should take: grows with the party's level. */
function hpMult(s: GameState, p: Party, boss = false): number {
  const team = members(s, p);
  const avg = team.length ? team.reduce((n, a) => n + a.level, 0) / team.length : 1;
  // Bosses already have deep pools; they grow at half the rate so a boss fight is minutes, not a quarter hour.
  return FIGHT_TUNE.hpBase + FIGHT_TUNE.hpPerLevel * avg * (boss ? 0.5 : 1);
}

/** Keep the pack summary (used by the HUD, the boss bar and the retreat rules) in step with its members. */
function summarise(e: Encounter): void {
  const alive = e.enemies!.filter((x) => x.hp > 0);
  e.hp = alive.reduce((n, x) => n + x.hp, 0);
  e.maxHp = e.enemies!.reduce((n, x) => n + x.maxHp, 0);
  if (alive.length) { e.monster = alive[0].monster; e.atk = alive[0].atk; }
}

/** The monster's way of hurting people, by kind; some have a special every third action. */
function enemyStyle(monster: string, acts: number): EnemyStyle {
  const third = acts % 3 === 2;
  switch (monster) {
    case 'rat': case 'wolf': case 'spider': return 'bite';
    case 'hellhound': return third ? 'breath' : 'bite';
    case 'ghoul': return 'claw';
    case 'wraith': return third ? 'curse' : 'claw';
    case 'broodMother': return third ? 'curse' : 'bite';
    case 'troll': case 'golem': return third ? 'smash' : 'slash';
    case 'imp': return 'bolt';
    case 'demon': case 'demonLord': return third ? 'breath' : 'smash';
    case 'dragon': case 'wyvern': case 'elderDragon': return third ? 'breath' : 'claw';
    case 'lich': return third ? 'curse' : 'bolt';
    default: return 'slash';
  }
}

/**
 * One action of the fight. Heroes act in order, then each living enemy;
 * every action is a single blow, shot, spell or heal with its own fx, so
 * the dungeon view can play it out one at a time.
 */
function act(s: GameState, p: Party): void {
  const team = members(s, p);
  const e = p.encounter!;
  const enemies = e.enemies!;
  const alive = () => enemies.map((x, i) => ({ x, i })).filter((q) => q.x.hp > 0);
  let idx = p.actIdx ?? 0;
  // Start of a round: bookkeeping and the retreat rule.
  if (idx === 0) {
    p.rounds = (p.rounds ?? 0) + 1;
    if (e.boss && team.length >= 3 && team.some((a) => a.hp < a.maxHp * 0.4) && e.hp > e.maxHp * 0.3) {
      log(s, 'adventure', 'log.bossRetreat', { leader: leader(team)!.name, dungeon: `dungeon.${p.dungeon}` });
      startReturn(s, p);
      return;
    }
  }
  if (idx < team.length) {
    heroAct(s, p, team[idx], idx, alive());
    p.actIdx = idx + 1;
    if (p.actIdx >= team.length && !alive().length) return; // handled in heroAct via onPackCleared
  } else {
    const ei = idx - team.length;
    const en = enemies[ei];
    if (en && en.hp > 0) enemyAct(s, p, en, ei, team);
    p.actIdx = idx + 1 >= team.length + enemies.length ? 0 : idx + 1;
  }
  // Skip straight to the next round when every enemy is dead between actions.
  if (p.phase === 'fight' && p.actIdx! >= team.length && !alive().length) p.actIdx = 0;
}

function heroAct(s: GameState, p: Party, a: Adventurer, slot: number, alive: { x: Enemy; i: number }[]): void {
  const e = p.encounter!;
  const team = members(s, p);
  const eq = 1 + 0.1 * s.equipment;
  const round = p.rounds ?? 1;
  const fx = (skill: string, targetId?: number, amount?: number) => s.fx.push({ kind: 'skill', partyId: p.id, actorId: a.id, skill, targetId, amount });
  if (!alive.length) return;
  // Priests heal when anyone is hurt, otherwise smite.
  if (a.cls === 'priest') {
    const heal = CLASSES[a.cls].heal ?? 2;
    const power = heal * (1 + a.level * 0.2);
    const hurt = team.filter((b) => b.hp / b.maxHp < T.holyLightBelow).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
    const worn = team.filter((b) => b.hp < b.maxHp * 0.85).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
    if (hurt) { const amt = Math.min(hurt.maxHp - hurt.hp, power * T.holyLightMultiplier); hurt.hp += amt; s.fx.push({ kind: 'strike', partyId: p.id, actorId: a.id, style: 'holyLight', targetId: hurt.id, amount: Math.round(amt) }); return; }
    if (worn) { const amt = Math.min(worn.maxHp - worn.hp, power * 1.5); worn.hp += amt; s.fx.push({ kind: 'strike', partyId: p.id, actorId: a.id, style: 'heal', targetId: worn.id, amount: Math.round(amt) }); return; }
  }
  // Pick a target: fighters take the front of the pack, archers and mages whoever they like.
  const tgt = a.cls === 'warrior' || a.cls === 'priest' ? alive[0] : pick(s, alive);
  let hit = a.atk * eq * (0.7 + random(s) * 0.6);
  let style: HeroStyle = a.cls === 'archer' ? 'arrow' : a.cls === 'mage' ? 'bolt' : a.cls === 'priest' ? 'smite' : 'melee';
  let splash: number[] | undefined;
  if (a.cls === 'archer') {
    const crit = chance(s, hasSkill(a.cls, a.level, 'eagleEye') ? T.eagleEyeCritChance : T.critChance);
    if (round % T.volleyEvery === 0) { hit *= T.volleyMultiplier; style = 'volley'; }
    if (crit) { hit *= T.critMultiplier; style = 'crit'; }
  } else if (a.cls === 'mage' && round % T.fireballEvery === 0) {
    hit *= T.fireballMultiplier; style = 'fireball';
    // The fireball splashes half its force over the rest of the pack.
    splash = alive.filter((q) => q !== tgt).map((q) => q.i);
    if (hasSkill(a.cls, a.level, 'frost') && chance(s, T.frostChance)) { p.frozen = true; fx('frost'); }
  } else if (a.hero && round % 3 === 0) {
    // The village Protagonist's signature Sunblade Cleave: golden slash over the pack + inspires companions.
    hit *= 1.55;
    style = 'crit';
    splash = alive.filter((q) => q !== tgt).map((q) => q.i);
    for (const b of team) b.hp = Math.min(b.maxHp, b.hp + Math.round(b.maxHp * 0.06));
    fx('sunblade');
  } else if (a.father && round % 3 === 0) {
    // The Father's Pioneer Resolve slash: sapphire cleave + guards the frontline.
    hit *= 1.42;
    style = 'crit';
    splash = alive.filter((q) => q !== tgt).map((q) => q.i);
    fx('pioneerSlash');
  }
  strike(s, p, a, tgt, Math.round(hit), style, splash);
  void e;
}

type HeroStyle = 'melee' | 'arrow' | 'volley' | 'crit' | 'bolt' | 'fireball' | 'smite';

function strike(s: GameState, p: Party, a: Adventurer, tgt: { x: Enemy; i: number }, amount: number, style: HeroStyle, splash?: number[]): void {
  const e = p.encounter!;
  s.fx.push({ kind: 'strike', partyId: p.id, actorId: a.id, style, targetIdx: tgt.i, amount, splash });
  tgt.x.hp -= amount;
  if (splash) for (const i of splash) e.enemies![i].hp -= Math.round(amount / 2);
  s.fx.push({ kind: 'hit', x: p.x, y: p.y });
  for (const [i, en] of e.enemies!.entries()) if (en.hp <= 0 && en.hp > -1e9) { en.hp = -1e9; onEnemySlain(s, p, en, i); if (p.phase !== 'fight') return; }
  summarise(e);
  if (!e.enemies!.some((x) => x.hp > 0)) onPackCleared(s, p);
}

function enemyAct(s: GameState, p: Party, en: Enemy, ei: number, team: Adventurer[]): void {
  const e = p.encounter!;
  const fx = (actor: Adventurer, skill: string) => s.fx.push({ kind: 'skill', partyId: p.id, actorId: actor.id, skill });
  if (p.frozen) { p.frozen = false; return; }
  const style = enemyStyle(en.monster, en.acts++);
  const warrior = team.find((a) => a.cls === 'warrior');
  if (style === 'breath') {
    // Hits everyone for a little less; warriors cannot shield the others from it.
    for (const t of team) {
      let taken = Math.max(1, en.atk * 0.5 * (0.7 + random(s) * 0.6) - t.def - s.equipment * 0.5);
      if (hasSkill(t.cls, t.level, 'ironWall') && chance(s, T.blockChance)) { taken *= T.blockMultiplier; fx(t, 'block'); }
      t.hp -= taken;
      s.fx.push({ kind: 'enemyStrike', partyId: p.id, enemyIdx: ei, style, targetId: t.id, amount: Math.round(taken), all: true });
    }
    for (const t of team) if (t.hp <= 0) { onMemberDown(s, p, t); return; }
    void e;
    return;
  }
  // Bolts and curses fly at anyone; blows land mostly on the front of the line (the team is in battle-line order, back first).
  let target = style === 'bolt' || style === 'curse' ? pick(s, team) : frontTarget(s, team);
  if (warrior && target !== warrior && chance(s, T.tauntChance)) { target = warrior; fx(warrior, 'taunt'); }
  let taken = Math.max(1, en.atk * (style === 'curse' ? 1.4 : 1) * (0.6 + random(s) * 0.8) - target.def - s.equipment * 0.5);
  if (hasSkill(target.cls, target.level, 'ironWall') && chance(s, T.blockChance)) { taken *= T.blockMultiplier; fx(target, 'block'); }
  target.hp -= taken;
  s.fx.push({ kind: 'enemyStrike', partyId: p.id, enemyIdx: ei, style, targetId: target.id, amount: Math.round(taken) });
  if (target.hp <= 0) onMemberDown(s, p, target);
}

/** Who a melee blow finds: the front of the line 55% of the time, the next rank 25%, the rest shared by those behind. */
function frontTarget(s: GameState, team: Adventurer[]): Adventurer {
  const n = team.length;
  if (n <= 1) return team[0];
  const weights = team.map((_, i) => (i === n - 1 ? 0.55 : i === n - 2 ? 0.25 : 0.2 / (n - 2)));
  let r = random(s) * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < n; i++) { r -= weights[i]; if (r <= 0) return team[i]; }
  return team[n - 1];
}

/** One monster of the pack goes down: rewards for it, and the boss bookkeeping. */
function onEnemySlain(s: GameState, p: Party, en: Enemy, ei: number): void {
  const e = p.encounter!;
  const m = MONSTERS[en.monster];
  const def = DUNGEONS.find((d) => d.id === p.dungeon)!;
  const dungeon = s.dungeons.find((d) => d.id === p.dungeon)!;
  const team = members(s, p);
  s.stats.monstersSlain++;
  s.fx.push({ kind: 'slain', partyId: p.id, enemyIdx: ei, monster: en.monster, boss: e.boss });
  const nemMult = en.nemesis ? 2.2 : 1;
  const reward = FIGHT_REWARD * Math.max(1, hpMult(s, p, e.boss) * FIGHT_TUNE.rewardPerHp) * nemMult;
  p.loot.gold += m.gold * 0.5 * reward * (0.8 + random(s) * 0.4);
  p.loot.iron += (m.iron ?? 0) * (en.nemesis ? 2 : 1);
  for (const a of team) { a.kills++; gainXp(s, a, (m.xp / team.length + p.floor) * reward); }
  if (en.nemesis) {
    dungeon.nemesis = undefined;
    chronicle(s, 'adventure', 'log.nemesisSlain', { leader: leader(team)!.name, monster: `monster.${m.id}`, dungeon: `dungeon.${def.id}` });
  }
  if (e.boss) {
    for (const a of team) a.bossKills++;
    dungeon.bossHp = undefined;
    if (!dungeon.bossDefeated) {
      dungeon.bossDefeated = true;
      chronicle(s, 'adventure', 'log.bossSlain', { leader: leader(team)!.name, monster: `monster.${m.id}`, dungeon: `dungeon.${def.id}` });
    } else {
      log(s, 'adventure', 'log.bossSlain', { leader: leader(team)!.name, monster: `monster.${m.id}`, dungeon: `dungeon.${def.id}` });
    }
    if (p.dungeon === FINAL_DUNGEON && !s.victory) {
      s.victory = true;
      chronicle(s, 'victory', 'log.victory', { leader: leader(team)!.name, names: team.map((a) => a.name).join(', ') });
    }
  } else if (chance(s, 0.2)) log(s, 'adventure', 'log.slain', { leader: leader(team)!.name, monster: `monster.${m.id}`, floor: p.floor });
}

/** The whole pack is down: a chance of a chest, then on to the next floor (or home). */
function onPackCleared(s: GameState, p: Party): void {
  const e = p.encounter!;
  const def = DUNGEONS.find((d) => d.id === p.dungeon)!;
  const dungeon = s.dungeons.find((d) => d.id === p.dungeon)!;
  const team = members(s, p);
  if (chance(s, 0.15)) { const g = 10 + p.floor * 4; p.loot.gold += g; s.fx.push({ kind: 'treasure', partyId: p.id, gold: g }); log(s, 'adventure', 'log.treasure', { leader: leader(team)!.name }); }
  else if (!e.boss && chance(s, 0.16)) {
    const ev = pick(s, ['spring', 'altar', 'rescue'] as const);
    const lead = leader(team)!.name;
    if (ev === 'spring') {
      for (const a of team) a.hp = Math.min(a.maxHp, a.hp + Math.round(a.maxHp * 0.22));
      s.fx.push({ kind: 'dungeonEvent', partyId: p.id, event: 'spring' });
      log(s, 'adventure', 'log.dungeonSpring', { leader: lead });
    } else if (ev === 'altar') {
      const xp = 10 * p.floor;
      for (const a of team) gainXp(s, a, xp);
      s.fx.push({ kind: 'dungeonEvent', partyId: p.id, event: 'altar', amount: xp });
      log(s, 'adventure', 'log.dungeonAltar', { leader: lead });
    } else {
      const g = 14 + p.floor * 5;
      p.loot.gold += g;
      s.fx.push({ kind: 'dungeonEvent', partyId: p.id, event: 'rescue', amount: g });
      log(s, 'adventure', 'log.dungeonRescue', { leader: lead, gold: g });
    }
  }
  if (p.floor > dungeon.deepestFloor) {
    dungeon.deepestFloor = p.floor;
    if (s.victory && p.dungeon === FINAL_DUNGEON && p.floor > def.floors && p.floor % 5 === 0) {
      chronicle(s, 'adventure', 'log.abyssMilestone', { leader: leader(team)!.name, floor: p.floor });
    }
  }
  const endlessAbyss = s.victory && p.dungeon === FINAL_DUNGEON;
  if (e.boss && !endlessAbyss) { startReturn(s, p); return; }
  const avgHp = team.reduce((n, a) => n + a.hp / a.maxHp, 0) / team.length;
  if (avgHp < 0.45) { startReturn(s, p); return; }
  if (p.floor >= def.floors && !endlessAbyss) { startReturn(s, p); return; } // cleared the top floor; post-victory Dark Tower continues into the Endless Abyss
  p.floor++;
  p.phase = 'explore';
  p.timer = EXPLORE_TIME;
  p.actIdx = 0;
  p.encounter = null;
}

function onMemberDown(s: GameState, p: Party, a: Adventurer): void {
  const e = p.encounter!;
  const dungeon = s.dungeons.find((d) => d.id === p.dungeon);
  if (dungeon && !e.boss) {
    dungeon.nemesis = { monster: e.monster, floor: p.floor, kills: (dungeon.nemesis?.kills ?? 0) + 1 };
    log(s, 'danger', 'log.nemesisBorn', { monster: `monster.${e.monster}`, dungeon: `dungeon.${p.dungeon}`, floor: p.floor });
  }
  // A seasoned priest can pull one fallen companion back, once per run.
  const priest = members(s, p).find((b) => b !== a && b.hp > 0 && hasSkill(b.cls, b.level, 'revive'));
  if (priest && !p.reviveUsed) {
    p.reviveUsed = true;
    a.hp = 1;
    s.fx.push({ kind: 'skill', partyId: p.id, actorId: priest.id, skill: 'revive', targetId: a.id });
    log(s, 'adventure', 'log.revive', { priest: priest.name, name: a.name });
    startReturn(s, p);
    return;
  }
  if (a.hero || a.father) {
    a.hp = 1;
    log(s, 'adventure', a.hero ? 'log.heroSurvived' : 'log.fatherSurvived', { name: a.name });
    startReturn(s, p);
    return;
  }
  if (chance(s, 0.3)) {
    a.hp = 0;
    a.status = 'dead';
    a.partyId = -1;
    s.stats.deaths++;
    chronicle(s, 'danger', 'log.death', { name: a.name, level: a.level, monster: `monster.${e.monster}`, dungeon: `dungeon.${p.dungeon}` });
    if (countBuildings(s, 'grave') < 12) {
      const spot = findBuildSpot(s, s.center, 4);
      if (spot) placeBuilding(s, 'grave', spot, true);
    }
    if (!members(s, p).length) { dissolve(s, p); return; }
  } else {
    a.hp = 1;
    log(s, 'danger', 'log.knockedOut', { name: a.name, leader: leader(members(s, p))!.name });
  }
  startReturn(s, p);
}

function startReturn(s: GameState, p: Party): void {
  if (p.encounter?.boss) { const d = s.dungeons.find((x) => x.id === p.dungeon); const b = p.encounter.enemies?.[0]; if (d && b && b.hp > 0) d.bossHp = b.hp; }
  p.actIdx = 0;
  p.phase = 'return';
  p.encounter = null;
  p.path = findPath(s, p, tavernPos(s));
}

function arriveHome(s: GameState, p: Party): void {
  const team = members(s, p);
  const dungeon = s.dungeons.find((d) => d.id === p.dungeon)!;
  dungeon.runs++;
  s.stats.dungeonRuns++;
  s.resources.gold += Math.round(p.loot.gold);
  s.resources.iron += Math.round(p.loot.iron);
  s.fx.push({ kind: 'float', x: p.x, y: p.y, text: `+${Math.round(p.loot.gold)}g`, color: '#f0d050' });
  log(s, 'adventure', 'log.partyReturns', { leader: leader(team)?.name ?? '?', gold: Math.round(p.loot.gold), floor: p.floor });
  dissolve(s, p);
}

function dissolve(s: GameState, p: Party): void {
  const home = tavernPos(s);
  for (const id of p.memberIds) {
    const a = s.adventurers.find((x) => x.id === id);
    if (a && a.status === 'questing') { a.status = 'resting'; a.partyId = -1; a.x = home.x; a.y = home.y; a.path = []; }
  }
  s.parties = s.parties.filter((x) => x.id !== p.id);
}
