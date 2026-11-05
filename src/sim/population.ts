import type { GameState, Worker } from './types';
import { WORKER_NAMES } from '../data/names';
import { chance, pick, uniqueName } from './rng';
import { edgeSpawnPoint, findPath } from './world';
import { housingCapacity, countBuildings } from './buildings';
import { chronicle, log } from './log';
import { tierForPop, tierIndex } from '../data/tiers';
import { DAY_LENGTH, FOOD_PER_PERSON_PER_DAY, LAZY_SHARE } from './constants';

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
}
