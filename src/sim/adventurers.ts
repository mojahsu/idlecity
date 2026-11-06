// Adventurers arrive at the tavern, rest, form parties and go on dungeon runs.
import type { Adventurer, AdventurerClass, GameState } from './types';
import { ADVENTURER_NAMES } from '../data/names';
import { CLASSES, xpForLevel } from '../data/adventurers';
import { DUNGEONS } from '../data/dungeons';
import { tierIndex } from '../data/tiers';
import { chance, pick, random, uniqueName } from './rng';
import { edgeSpawnPoint, findPath, isPassable, isReachable, moveAlong } from './world';
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

/** Back-to-front order of the battle line: casters behind, the warrior in front. */
export const FORMATION: Record<AdventurerClass, number> = { mage: 0, priest: 1, archer: 2, warrior: 3 };

/** A team sorted into its battle line (back first), highest level first within a rank. */
export function formationOrder<T extends { cls: AdventurerClass; level: number }>(team: T[]): T[] {
  return [...team].sort((a, b) => FORMATION[a.cls] - FORMATION[b.cls] || b.level - a.level);
}

/** The party's leader is its highest-level member, whatever rank they stand in. */
export function leader<T extends { level: number }>(team: T[]): T | undefined {
  return team.reduce<T | undefined>((best, a) => (!best || a.level > best.level ? a : best), undefined);
}

/** Ranged classes stand back from a raid; the warrior closes in. */
export function isRanged(cls: AdventurerClass): boolean { return cls !== 'warrior'; }

/**
 * The guild recruits what the roster lacks: with no living warrior or priest
 * the next arrival is one; otherwise warriors and archers are a little more
 * common than mages and priests.
 */
function recruitClass(s: GameState): AdventurerClass {
  const roster = alive(s);
  const has = (c: AdventurerClass) => roster.some((a) => a.cls === c);
  if (!has('warrior')) return 'warrior';
  if (!has('priest')) return 'priest';
  const weights: [AdventurerClass, number][] = [['warrior', 3], ['archer', 3], ['mage', 2], ['priest', 2]];
  let r = random(s) * weights.reduce((n, [, w]) => n + w, 0);
  for (const [c, w] of weights) { r -= w; if (r <= 0) return c; }
  return 'warrior';
}

export function spawnAdventurer(s: GameState): Adventurer {
  const cls = recruitClass(s);
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
      if (moveAlong(a, PARTY_SPEED, dt)) { a.status = 'resting'; a.pastime = undefined; a.pastimeTimer = 0; }
    } else if (a.status === 'resting') {
      a.hp = Math.min(a.maxHp, a.hp + healRate * dt);
      updatePastime(s, a, dt);
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
  const members = pickParty(ready);
  const avgLevel = members.reduce((n, a) => n + a.level, 0) / members.length;

  // Go to the hardest dungeon the party can plausibly handle.
  let target = unlockedDungeons[0];
  for (const d of unlockedDungeons) {
    const def = DUNGEONS.find((x) => x.id === d.id)!;
    if (avgLevel >= def.level) target = d;
  }
  // Sometimes revisit an easier dungeon for variety, never one above the party's level.
  const easier = unlockedDungeons.filter((d) => DUNGEONS.find((x) => x.id === d.id)!.level <= avgLevel);
  if (easier.length > 1 && chance(s, 0.25)) target = pick(s, easier);

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
    rounds: 0, reviveUsed: false, frozen: false,
    x: from.x, y: from.y,
    path: findPath(s, from, target),
  };
  for (const a of members) { a.status = 'questing'; a.partyId = party.id; a.pastime = undefined; a.path = []; }
  s.parties.push(party);
  log(s, 'adventure', 'log.partyLeaves', { leader: leader(members)!.name, count: members.length, dungeon: `dungeon.${target.id}` });
}

/**
 * A sensible party: the best warrior to hold the line, the best priest to keep
 * it standing, then the strongest of the rest with at most two of a class.
 * Only when that cannot make three does level alone decide. Members are kept
 * in battle-line order so the fight and the panel agree on who stands where.
 */
function pickParty(ready: Adventurer[]): Adventurer[] {
  const byLevel = [...ready].sort((a, b) => b.level - a.level);
  const chosen: Adventurer[] = [];
  for (const role of ['warrior', 'priest'] as AdventurerClass[]) { const c = byLevel.find((a) => a.cls === role); if (c) chosen.push(c); }
  for (const a of byLevel) {
    if (chosen.length >= 4) break;
    if (chosen.includes(a) || chosen.filter((c) => c.cls === a.cls).length >= 2) continue;
    chosen.push(a);
  }
  for (const a of byLevel) { if (chosen.length >= 3) break; if (!chosen.includes(a)) chosen.push(a); }
  return formationOrder(chosen);
}

/** Free tiles in a ring around a spot. */
function ringAround(s: GameState, p: { x: number; y: number }, r: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = p.x + dx, y = p.y + dy;
    if (isPassable(s, x, y) && isReachable(s, x, y) && s.tiles[y * s.width + x].terrain !== 'water') out.push({ x, y });
  }
  return out;
}

/** The two training posts stand on the free tiles below the guild hall. */
export function trainingPosts(s: GameState): { x: number; y: number }[] {
  const g = s.buildings.find((b) => b.built && b.type === 'guildHall');
  if (!g) return [];
  return [{ x: g.x - 1, y: g.y + 1 }, { x: g.x + 1, y: g.y + 1 }].filter((p) => isPassable(s, p.x, p.y) && isReachable(s, p.x, p.y));
}

/**
 * Between expeditions adventurers are not statues: they spar at the guild's
 * posts, drink at the tavern, sit by the fire and wander the streets, and when
 * raiders reach the town they run out to meet them.
 */
function updatePastime(s: GameState, a: Adventurer, dt: number): void {
  const raid = s.raid;
  const fighting = raid && raid.phase === 'fight';
  if (fighting && a.hp > a.maxHp * 0.3) {
    if (a.pastime !== 'sally') {
      // Warriors close to a ring right round the raiders; archers, mages and priests hold a line two tiles back, on the town's side.
      const at = { x: Math.round(raid.x), y: Math.round(raid.y) };
      const townward = (p: { x: number; y: number }, slack: number) => Math.hypot(p.x - s.center.x, p.y - s.center.y) <= Math.hypot(raid.x - s.center.x, raid.y - s.center.y) + slack;
      const ring = isRanged(a.cls)
        ? ringAround(s, at, 2).filter((p) => townward(p, -0.5))
        : ringAround(s, at, 1).filter((p) => townward(p, 0.5));
      const fallback = isRanged(a.cls) ? ringAround(s, at, 2) : ringAround(s, at, 1);
      const pool = ring.length ? ring : fallback;
      const spot = pool.length ? pick(s, pool) : at;
      a.pastime = 'sally'; a.path = findPath(s, a, spot); a.pastimeTimer = 999;
    }
    moveAlong(a, PARTY_SPEED * 1.3, dt);
    return;
  }
  if (a.pastime === 'sally') { a.pastime = 'wander'; a.pastimeTimer = 0; }
  if (a.path.length) { moveAlong(a, PARTY_SPEED * 0.6, dt); return; }
  a.pastimeTimer = (a.pastimeTimer ?? 0) - dt;
  if (a.pastimeTimer > 0) return;
  // Pick the next thing to do.
  const options: NonNullable<Adventurer['pastime']>[] = ['wander', 'sit', 'drink'];
  const posts = trainingPosts(s);
  if (posts.length) options.push('train', 'train');
  const choice = pick(s, options);
  let spot: { x: number; y: number } | null = null;
  if (choice === 'train') { const free = posts.filter((p) => !s.adventurers.some((o) => o !== a && o.status === 'resting' && o.pastime === 'train' && Math.round(o.x) === p.x && Math.round(o.y) === p.y)); spot = free.length ? pick(s, free) : null; }
  else if (choice === 'drink') { const ring = ringAround(s, tavernPos(s), 1); spot = ring.length ? pick(s, ring) : null; }
  else if (choice === 'sit') { const ring = ringAround(s, s.center, 1); spot = ring.length ? pick(s, ring) : null; }
  else { const ring = ringAround(s, tavernPos(s), 2 + Math.floor(random(s) * 3)); spot = ring.length ? pick(s, ring) : null; }
  if (!spot) { a.pastime = 'wander'; a.pastimeTimer = 4; return; }
  a.pastime = choice;
  a.path = findPath(s, a, spot);
  a.pastimeTimer = choice === 'train' ? 18 + random(s) * 12 : 10 + random(s) * 12;
}
