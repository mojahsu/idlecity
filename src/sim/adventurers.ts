// Adventurers arrive at the tavern, rest, form parties and go on dungeon runs.
import type { Adventurer, AdventurerClass, GameState } from './types';
import { ADVENTURER_NAMES } from '../data/names';
import { CLASSES, xpForLevel } from '../data/adventurers';
import { DUNGEONS } from '../data/dungeons';
import { tierIndex } from '../data/tiers';
import { chance, pick, uniqueName } from './rng';
import { edgeSpawnPoint, findPath, moveAlong } from './world';
import { countBuildings, hasBuilding } from './buildings';
import { chronicle, log } from './log';
import { PARTY_SPEED } from './constants';
import { emptyResources } from './state';

export function tavernPos(s: GameState) {
  const t = s.buildings.find((b) => b.built && b.type === 'tavern');
  return t ? { x: t.x, y: t.y } : s.center;
}

export function alive(s: GameState): Adventurer[] {
  return s.adventurers.filter((a) => a.status !== 'dead');
}

function maxAdventurers(s: GameState): number {
  return 4 * countBuildings(s, 'tavern') + 4 * countBuildings(s, 'guildHall') + 2 * countBuildings(s, 'keep');
}

export function spawnAdventurer(s: GameState): Adventurer {
  const cls = pick(s, Object.keys(CLASSES) as AdventurerClass[]);
  const def = CLASSES[cls];
  const from = edgeSpawnPoint(s);
  const a: Adventurer = {
    id: s.nextId++,
    name: uniqueName(s, ADVENTURER_NAMES, alive(s).map((a) => a.name)),
    cls, level: 1, xp: 0,
    hp: def.hp, maxHp: def.hp, atk: def.atk, def: def.def,
    status: 'arriving',
    x: from.x, y: from.y,
    path: findPath(s, from, tavernPos(s)),
    partyId: -1, kills: 0, bossKills: 0,
  };
  // Veterans are drawn by a famous guild: newcomers start partway up the roster's level.
  const roster = alive(s);
  const avg = roster.length ? roster.reduce((n, x) => n + x.level, 0) / roster.length : 1;
  const startLevel = Math.min(14, 1 + Math.floor(avg * 0.5));
  while (a.level < startLevel) { a.level++; a.maxHp += def.hpUp; a.atk += def.atkUp; }
  a.hp = a.maxHp;
  s.adventurers.push(a);
  log(s, 'adventure', 'log.adventurerArrives', { name: a.name, cls: `class.${cls}` });
  return a;
}

export function gainXp(s: GameState, a: Adventurer, xp: number): void {
  a.xp += xp;
  while (a.xp >= xpForLevel(a.level)) {
    a.xp -= xpForLevel(a.level);
    a.level++;
    const def = CLASSES[a.cls];
    a.maxHp += def.hpUp;
    a.atk += def.atkUp;
    a.hp = a.maxHp;
    if (a.level % 2 === 0) log(s, 'adventure', 'log.levelUp', { name: a.name, level: a.level });
  }
}

export function updateAdventurers(s: GameState, dt: number): void {
  // Unlock dungeons as the town matures.
  if (hasBuilding(s, 'guildHall')) {
    for (const def of DUNGEONS) {
      const d = s.dungeons.find((x) => x.id === def.id)!;
      if (d.unlocked) continue;
      if (tierIndex(s.tier) < tierIndex(def.tier)) continue;
      if (def.id === 'darkTower' && !hasBuilding(s, 'keep')) continue;
      d.unlocked = true;
      chronicle(s, 'adventure', 'log.dungeonFound', { dungeon: `dungeon.${def.id}` });
    }
  }

  // New arrivals.
  s.timers.adventurer -= dt;
  if (s.timers.adventurer <= 0) {
    s.timers.adventurer = 75;
    if (hasBuilding(s, 'tavern') && alive(s).length < maxAdventurers(s)) spawnAdventurer(s);
  }

  const healRate = 0.8 + (hasBuilding(s, 'chapel') ? 1.2 : 0);
  for (const a of s.adventurers) {
    if (a.status === 'arriving') {
      if (moveAlong(a, PARTY_SPEED, dt)) a.status = 'resting';
    } else if (a.status === 'resting') {
      a.hp = Math.min(a.maxHp, a.hp + healRate * dt);
    }
  }

  // Party formation.
  s.timers.chapel -= dt; // reused as a generic "think" timer for parties
  if (s.timers.chapel <= 0) {
    s.timers.chapel = 6;
    tryFormParty(s);
  }
}

function tryFormParty(s: GameState): void {
  const unlockedDungeons = s.dungeons.filter((d) => d.unlocked);
  if (!unlockedDungeons.length) return;
  const maxParties = 1 + (hasBuilding(s, 'keep') ? 1 : 0);
  if (s.parties.length >= maxParties) return;
  const ready = s.adventurers.filter((a) => a.status === 'resting' && a.hp >= a.maxHp * 0.85);
  if (ready.length < 3) return;
  ready.sort((a, b) => b.level - a.level);
  const members = ready.slice(0, 4);
  const avgLevel = members.reduce((n, a) => n + a.level, 0) / members.length;

  // Go to the hardest dungeon the party can plausibly handle.
  let target = unlockedDungeons[0];
  for (const d of unlockedDungeons) {
    const def = DUNGEONS.find((x) => x.id === d.id)!;
    if (avgLevel >= def.level) target = d;
  }
  // Sometimes revisit an easier dungeon for variety.
  if (unlockedDungeons.length > 1 && chance(s, 0.25)) target = pick(s, unlockedDungeons);

  const from = tavernPos(s);
  const party = {
    id: s.nextId++,
    memberIds: members.map((a) => a.id),
    dungeon: target.id,
    floor: 0,
    phase: 'travel' as const,
    encounter: null,
    loot: emptyResources(),
    timer: 0,
    x: from.x, y: from.y,
    path: findPath(s, from, target),
  };
  for (const a of members) { a.status = 'questing'; a.partyId = party.id; }
  s.parties.push(party);
  log(s, 'adventure', 'log.partyLeaves', { leader: members[0].name, count: members.length, dungeon: `dungeon.${target.id}` });
}
