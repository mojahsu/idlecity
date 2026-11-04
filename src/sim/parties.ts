// Dungeon runs: travel, explore floors, fight, loot, return. Also the final boss.
import type { Adventurer, Encounter, GameState, Party } from './types';
import { DUNGEONS, FINAL_DUNGEON, MONSTERS } from '../data/dungeons';
import { CLASSES } from '../data/adventurers';
import { chance, pick, random } from './rng';
import { findBuildSpot, findPath, moveAlong } from './world';
import { countBuildings, placeBuilding } from './buildings';
import { chronicle, log } from './log';
import { PARTY_SPEED } from './constants';
import { gainXp, tavernPos } from './adventurers';

const EXPLORE_TIME = 4;

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

  switch (p.phase) {
    case 'travel':
      if (moveAlong(p, PARTY_SPEED, dt)) { p.phase = 'explore'; p.floor = 1; p.timer = EXPLORE_TIME; }
      return;
    case 'explore':
      p.timer -= dt;
      if (p.timer <= 0) {
        if (!daresBossFloor(s, p)) { log(s, 'adventure', 'log.bossRetreat', { leader: team[0].name, dungeon: `dungeon.${p.dungeon}` }); startReturn(s, p); return; }
        p.encounter = makeEncounter(s, p); p.phase = 'fight'; p.timer = 0;
      }
      return;
    case 'fight':
      p.timer += dt;
      while (p.timer >= 1) { p.timer -= 1; fightRound(s, p); if (p.phase !== 'fight') return; }
      return;
    case 'return':
      if (moveAlong(p, PARTY_SPEED, dt)) arriveHome(s, p);
      return;
  }
}

/** Only a healthy, full-strength party faces a boss. Others turn back and live to try again. */
function daresBossFloor(s: GameState, p: Party): boolean {
  const def = DUNGEONS.find((d) => d.id === p.dungeon)!;
  if (p.floor !== def.floors) return true;
  const team = members(s, p);
  const avgHp = team.reduce((n, a) => n + a.hp / a.maxHp, 0) / team.length;
  return team.length >= 3 && avgHp >= 0.7;
}

function makeEncounter(s: GameState, p: Party): Encounter {
  const def = DUNGEONS.find((d) => d.id === p.dungeon)!;
  const boss = p.floor === def.floors && !(p.dungeon === FINAL_DUNGEON && s.victory);
  const m = MONSTERS[boss ? def.boss : pick(s, def.monsters)];
  const scale = 1 + 0.15 * (p.floor - 1);
  return { monster: m.id, hp: Math.round(m.hp * scale), maxHp: Math.round(m.hp * scale), atk: Math.round(m.atk * (1 + 0.08 * (p.floor - 1))), boss };
}

function fightRound(s: GameState, p: Party): void {
  const team = members(s, p);
  const e = p.encounter!;
  const eq = 1 + 0.1 * s.equipment;
  // Party attacks.
  let dmg = 0;
  for (const a of team) dmg += a.atk * eq * (0.7 + random(s) * 0.6);
  e.hp -= dmg;
  s.fx.push({ kind: 'hit', x: p.x, y: p.y });
  if (e.hp <= 0) { onMonsterSlain(s, p); return; }
  // Priests heal.
  for (const a of team) {
    const heal = CLASSES[a.cls].heal;
    if (heal) for (const b of team) b.hp = Math.min(b.maxHp, b.hp + heal * (1 + a.level * 0.2) / team.length);
  }
  // Monster strikes someone.
  const target = pick(s, team);
  const taken = Math.max(1, e.atk * (0.6 + random(s) * 0.8) - target.def - s.equipment * 0.5);
  target.hp -= taken;
  if (target.hp <= 0) onMemberDown(s, p, target);
}

function onMonsterSlain(s: GameState, p: Party): void {
  const e = p.encounter!;
  const m = MONSTERS[e.monster];
  const def = DUNGEONS.find((d) => d.id === p.dungeon)!;
  const dungeon = s.dungeons.find((d) => d.id === p.dungeon)!;
  const team = members(s, p);
  s.stats.monstersSlain++;
  p.loot.gold += m.gold * 0.5 * (0.8 + random(s) * 0.4);
  p.loot.iron += m.iron ?? 0;
  if (chance(s, 0.15)) { p.loot.gold += 10 + p.floor * 4; log(s, 'adventure', 'log.treasure', { leader: team[0].name }); }
  for (const a of team) { a.kills++; gainXp(s, a, m.xp / team.length + p.floor); }
  if (p.floor > dungeon.deepestFloor) dungeon.deepestFloor = p.floor;

  if (e.boss) {
    for (const a of team) a.bossKills++;
    if (!dungeon.bossDefeated) {
      dungeon.bossDefeated = true;
      chronicle(s, 'adventure', 'log.bossSlain', { leader: team[0].name, monster: `monster.${m.id}`, dungeon: `dungeon.${def.id}` });
    } else {
      log(s, 'adventure', 'log.bossSlain', { leader: team[0].name, monster: `monster.${m.id}`, dungeon: `dungeon.${def.id}` });
    }
    if (p.dungeon === FINAL_DUNGEON && !s.victory) {
      s.victory = true;
      chronicle(s, 'victory', 'log.victory', { leader: team[0].name, names: team.map((a) => a.name).join(', ') });
    }
    startReturn(s, p);
    return;
  }
  if (chance(s, 0.25)) log(s, 'adventure', 'log.slain', { leader: team[0].name, monster: `monster.${m.id}`, floor: p.floor });

  const avgHp = team.reduce((n, a) => n + a.hp / a.maxHp, 0) / team.length;
  if (avgHp < 0.45) { startReturn(s, p); return; }
  if (p.floor >= def.floors) { startReturn(s, p); return; } // cleared the top floor after victory
  p.floor++;
  p.phase = 'explore';
  p.timer = EXPLORE_TIME;
  p.encounter = null;
}

function onMemberDown(s: GameState, p: Party, a: Adventurer): void {
  const e = p.encounter!;
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
    log(s, 'danger', 'log.knockedOut', { name: a.name, leader: members(s, p)[0].name });
  }
  startReturn(s, p);
}

function startReturn(s: GameState, p: Party): void {
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
  log(s, 'adventure', 'log.partyReturns', { leader: team[0]?.name ?? '?', gold: Math.round(p.loot.gold), floor: p.floor });
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
