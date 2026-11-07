import type { Child, GameState, Worker } from './types';
import { ADVENTURER_NAMES, WORKER_NAMES } from '../data/names';
import { chance, pick, randInt, random, uniqueName } from './rng';
import { edgeSpawnPoint, findBuildSpot, findPath } from './world';
import { housingCapacity, countBuildings, hasBuilding, placeBuilding } from './buildings';
import { chronicle, log } from './log';
import { tierForPop, tierIndex } from '../data/tiers';
import { ADULT_AGE, ARRIVAL_AGE, BIRTH_INTERVAL, DAY_LENGTH, LIFE_YEAR_DAYS, ELDER_AGE, FOOD_PER_PERSON_PER_DAY, LAZY_SHARE, LIFESPAN, WEDDING_INTERVAL } from './constants';
import { hash } from './rng';
import { awakenProtagonist, enlistFather } from './adventurers';

export function spawnWorker(s: GameState, atCenter = false): Worker {
  const from = atCenter ? { x: s.center.x + 1, y: s.center.y + 1 } : edgeSpawnPoint(s);
  const w: Worker = {
    id: s.nextId++,
    name: uniqueName(s, WORKER_NAMES, s.workers.map((w) => w.name)),
    x: from.x, y: from.y,
    job: 'lumberjack',
    task: null,
    path: [],
    carrying: null,
    carryAmount: 0,
    timer: 0,
    lazy: !atCenter && chance(s, LAZY_SHARE),
    age: ARRIVAL_AGE[0] + random(s) * (ARRIVAL_AGE[1] - ARRIVAL_AGE[0]),
  };
  if (!atCenter) {
    w.task = { kind: 'arrive' };
    w.path = findPath(s, from, s.center);
  }
  s.workers.push(w);
  return w;
}

export function updatePopulation(s: GameState, dt: number): void {
  const pop = s.workers.length;
  // Everyone eats.
  s.resources.food -= (pop * FOOD_PER_PERSON_PER_DAY / DAY_LENGTH) * dt;
  if (s.resources.food < 0) s.resources.food = 0;

  s.timers.immigrant -= dt;
  if (s.timers.immigrant <= 0) {
    s.timers.immigrant = 40 + pop * 5;
    const cap = housingCapacity(s);
    if (pop < cap && s.resources.food >= pop * 2 + 4) {
      const w = spawnWorker(s);
      s.stats.immigrants++;
      log(s, 'people', 'log.immigrant', { name: w.name });
    } else if (s.resources.food < 2 && pop > 1) {
      log(s, 'danger', 'log.foodShort');
    }
  }

  // Market produces a trickle of gold once the town trades.
  s.resources.gold += countBuildings(s, 'market') * 0.04 * (1 + pop / 20) * dt;

  const t = tierForPop(pop);
  if (tierIndex(t) > tierIndex(s.tier)) {
    s.tier = t;
    chronicle(s, 'info', 'log.tierUp', { tier: `tier.${t}` });
  }

  updateLives(s, dt);
}

/** Age in years; workers from before ages existed get one from their id. */
export function ageOf(w: Worker): number {
  return w.age ?? 18 + hash(w.id, 5) * 20;
}

export function isElder(w: Worker): boolean { return ageOf(w) >= ELDER_AGE; }

function lifespanOf(w: Worker): number { return LIFESPAN[0] + hash(w.id, 6) * (LIFESPAN[1] - LIFESPAN[0]); }

/** Everyone grows older; couples marry and have children; the old pass away. */
function updateLives(s: GameState, dt: number): void {
  const years = dt / (DAY_LENGTH * LIFE_YEAR_DAYS);
  s.children ??= [];
  for (const w of s.workers) w.age = ageOf(w) + years;
  for (const c of s.children) c.age += years * (c.hero ? 1.8 : 1);

  // Backfill the Father on older saves that started before fatherId existed.
  if (!s.fatherId && s.workers.length) {
    const founder = s.workers[0];
    founder.father = true;
    s.fatherId = founder.id;
    s.fatherName = founder.name;
  }

  // Act I: Once the hamlet forms, the founding Father weds his life partner in the growing village.
  const fatherWorker = s.workers.find((w) => w.father && !w.mentor);
  if (fatherWorker && fatherWorker.spouse === undefined && s.workers.length >= 3 && s.tier !== 'camp') {
    const partner = s.workers.find((w) => w !== fatherWorker && w.spouse === undefined);
    if (partner) {
      fatherWorker.spouse = partner.id;
      partner.spouse = fatherWorker.id;
      chronicle(s, 'people', 'log.fatherWedding', { a: fatherWorker.name, b: partner.name });
    }
  }

  // Act II: Once the Tavern stands, the Father hands his tools to a fellow villager and takes up the sword as First Warrior!
  if (fatherWorker && hasBuilding(s, 'tavern') && !s.adventurers.some((a) => a.father || a.hero) && !s.protagonistId) {
    const fname = s.fatherName ?? fatherWorker.name;
    s.fatherName = fname;
    enlistFather(s, fname);
    const usedNames = new Set([...s.workers.map((w) => w.name), ...s.children.map((x) => x.name), ...s.adventurers.map((a) => a.name)]);
    fatherWorker.father = false;
    fatherWorker.name = WORKER_NAMES.find((n) => !usedNames.has(n)) ?? fatherWorker.name;
  }

  // Act III: Mid-game Protagonist birth in the village once the Adventurers' Guild stands.
  if (!s.protagonistId && hasBuilding(s, 'guildHall') && s.workers.length >= 4) {
    const parent = s.workers.find((w) => w.spouse !== undefined) ?? s.workers[0];
    const fatherName = s.fatherName ?? parent.name;
    const used = new Set([...s.workers.map((w) => w.name), ...s.children.map((x) => x.name), ...s.adventurers.map((a) => a.name)]);
    const heroName = ADVENTURER_NAMES.find((n) => !used.has(n)) ?? 'Arin';
    const c: Child = {
      id: s.nextId++,
      name: heroName,
      age: 4,
      parentId: s.fatherId ?? parent.id,
      hero: true,
      parentName: fatherName,
    };
    s.protagonistId = c.id;
    s.children.push(c);
    s.stats.births = (s.stats.births ?? 0) + 1;
    chronicle(s, 'victory', 'log.heroBorn', { name: c.name, parent: fatherName });
  }

  // Children come of age and pick up a job (or inherit their Father's sword as the Village Hero!).
  for (const c of [...s.children]) {
    if (c.age < ADULT_AGE) continue;
    if (c.hero) {
      // Wait if the Father is currently away inside a dungeon so he can pass the sword in town.
      if (s.adventurers.some((a) => a.father && a.status === 'questing')) continue;
      s.children.splice(s.children.indexOf(c), 1);
      awakenProtagonist(s, c);
      continue;
    }
    s.children.splice(s.children.indexOf(c), 1);
    const w = spawnWorker(s, true);
    w.name = c.name; w.age = c.age; w.id = c.id;
    log(s, 'people', 'log.grownUp', { name: c.name });
  }

  // Weddings in the chapel between two single adults.
  s.timers.wedding = (s.timers.wedding ?? randInt(s, WEDDING_INTERVAL[0], WEDDING_INTERVAL[1])) - dt;
  if (s.timers.wedding <= 0) {
    s.timers.wedding = randInt(s, WEDDING_INTERVAL[0], WEDDING_INTERVAL[1]);
    if (hasBuilding(s, 'chapel')) {
      const single = s.workers.filter((w) => w.spouse === undefined && ageOf(w) < 45 && ageOf(w) >= 18);
      if (single.length >= 2) {
        const a = pick(s, single); const b = pick(s, single.filter((w) => w !== a));
        a.spouse = b.id; b.spouse = a.id;
        log(s, 'people', 'log.wedding', { a: a.name, b: b.name });
      }
    }
  }

  // Births to married couples, as long as there is room under a roof.
  s.timers.birth = (s.timers.birth ?? randInt(s, BIRTH_INTERVAL[0], BIRTH_INTERVAL[1])) - dt;
  if (s.timers.birth <= 0) {
    s.timers.birth = randInt(s, BIRTH_INTERVAL[0], BIRTH_INTERVAL[1]);
    const parents = s.workers.filter((w) => w.spouse !== undefined && ageOf(w) < 45 && s.workers.some((o) => o.id === w.spouse));
    if (parents.length && s.children.length < Math.max(2, housingCapacity(s) / 4) && s.resources.food > s.workers.length * 2) {
      const pa = pick(s, parents);
      const c: Child = { id: s.nextId++, name: uniqueName(s, WORKER_NAMES, [...s.workers.map((w) => w.name), ...s.children.map((x) => x.name)]), age: 0, parentId: pa.id };
      s.children.push(c);
      s.stats.births = (s.stats.births ?? 0) + 1;
      log(s, 'people', 'log.birth', { name: c.name, parent: pa.name });
    }
  }

  // Old age. Checked once a game second per worker; a quiet death at home (the Father lives on to see Victory).
  if (s.tick % 10 === 0) for (const w of [...s.workers]) {
    if (w.father || ageOf(w) < lifespanOf(w) || s.workers.length <= 2) continue;
    s.workers.splice(s.workers.indexOf(w), 1);
    const sp = s.workers.find((o) => o.id === w.spouse); if (sp) sp.spouse = undefined;
    s.stats.passed = (s.stats.passed ?? 0) + 1;
    log(s, 'people', 'log.passedAway', { name: w.name, age: Math.floor(ageOf(w)) });
    if (countBuildings(s, 'grave') < 12) { const spot = findBuildSpot(s, s.center, 4); if (spot) placeBuilding(s, 'grave', spot, true); }
    break; // at most one a second
  }
}
