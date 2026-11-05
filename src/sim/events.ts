// Town events: merchant caravans visiting the market and house fires fought
// by a bucket brigade. Both are small, visible and self-contained.
import type { Building, GameState } from './types';
import { CARAVAN_INTERVAL, CARAVAN_TRADE_TIME, FIRE_CHANCE, FIRE_COLLAPSE, FIRE_GROWTH, FIRE_INTERVAL, FIRE_MIN_BUILDINGS } from './constants';
import { chance, pick, randInt, random } from './rng';
import { edgeSpawnPoint, findPath, moveAlong } from './world';
import { hasBuilding } from './buildings';
import { chronicle, log } from './log';
import { isRaining, year } from './time';
import { brigadeSize, draftToFire } from './workers';

const CARAVAN_SPEED = 1.0;
const FLAMMABLE: Building['type'][] = ['hut', 'house', 'lumberCamp', 'granary', 'tavern', 'market', 'blacksmith', 'guildHall'];

export function updateEvents(s: GameState, dt: number): void {
  updateCaravan(s, dt);
  updateFire(s, dt);
}

// ---- caravan ------------------------------------------------------------------

function updateCaravan(s: GameState, dt: number): void {
  const c = s.caravan;
  if (!c) {
    if (!hasBuilding(s, 'market')) return;
    s.timers.caravan = (s.timers.caravan ?? randInt(s, CARAVAN_INTERVAL[0], CARAVAN_INTERVAL[1])) - dt;
    if (s.timers.caravan <= 0) {
      s.timers.caravan = randInt(s, CARAVAN_INTERVAL[0], CARAVAN_INTERVAL[1]);
      startCaravan(s);
    }
    return;
  }
  if (c.phase === 'arrive') {
    if (moveAlong(c, CARAVAN_SPEED, dt)) { c.phase = 'trade'; c.timer = 0; }
    return;
  }
  if (c.phase === 'trade') {
    c.timer += dt;
    // Pay out in a handful of visible instalments.
    const part = Math.ceil(c.gold / 5);
    if (c.gold > 0 && c.timer >= 4) {
      c.timer -= 4;
      const g = Math.min(part, c.gold);
      c.gold -= g;
      s.resources.gold += g;
      s.fx.push({ kind: 'float', x: c.x, y: c.y, text: `+${g}g`, color: '#f0d050' });
      if (c.gold <= 0) c.timer = -(CARAVAN_TRADE_TIME - 20); // linger a little after the last payment
    }
    if (c.gold <= 0 && c.timer >= 0) {
      c.phase = 'leave';
      c.path = findPath(s, c, edgeSpawnPoint(s));
      if (!c.path.length) s.caravan = null;
    }
    return;
  }
  if (moveAlong(c, CARAVAN_SPEED, dt)) s.caravan = null;
}

function startCaravan(s: GameState): void {
  const market = s.buildings.find((b) => b.built && b.type === 'market');
  if (!market) return;
  const from = edgeSpawnPoint(s);
  const path = findPath(s, from, market);
  if (!path.length) return;
  const gold = 15 + s.workers.length * 2 + year(s) * 10;
  s.caravan = { x: from.x, y: from.y, path, phase: 'arrive', timer: 0, gold };
  log(s, 'info', 'log.caravanArrives', { gold });
}

// ---- fire -------------------------------------------------------------------------

function updateFire(s: GameState, dt: number): void {
  const f = s.fire;
  if (!f) {
    s.timers.fire = (s.timers.fire ?? randInt(s, FIRE_INTERVAL[0], FIRE_INTERVAL[1])) - dt;
    if (s.timers.fire <= 0) {
      s.timers.fire = randInt(s, FIRE_INTERVAL[0], FIRE_INTERVAL[1]);
      if (chance(s, FIRE_CHANCE) && !isRaining(s) && !s.raid) startFire(s);
    }
    return;
  }
  const b = s.buildings.find((x) => x.id === f.buildingId);
  if (!b || !b.built) { endFire(s); return; }
  f.age += dt;
  // The last bucket (thrown in workers.ts) puts it out; check before it can flare up again.
  if (f.intensity <= 0 && f.age > 3) {
    log(s, 'info', 'log.fireOut', { building: `building.${b.type}` });
    endFire(s);
    return;
  }
  // Otherwise it keeps spreading; rain helps on its own.
  f.intensity = Math.max(0, Math.min(1, f.intensity + (f.growth - (isRaining(s) ? 0.1 : 0)) * dt));
  if (f.intensity >= 0.85) {
    f.fullFor += dt; // a blaze that stays near full strength eats through the timbers
    if (f.fullFor >= FIRE_COLLAPSE) {
      b.built = false;
      b.progress = 0.35;
      chronicle(s, 'danger', 'log.fireBurned', { building: `building.${b.type}` });
      endFire(s);
    }
  }
}

function startFire(s: GameState): void {
  const targets = s.buildings.filter((b) => b.built && FLAMMABLE.includes(b.type));
  if (targets.length < FIRE_MIN_BUILDINGS) return;
  const b = pick(s, targets);
  s.fire = { buildingId: b.id, intensity: 0.3, age: 0, fullFor: 0, growth: FIRE_GROWTH * (0.7 + 0.6 * random(s)) };
  log(s, 'danger', 'log.fireStart', { building: `building.${b.type}` });
  // The nearest few drop what they are doing (sleepers in that house wake up first).
  const near = [...s.workers].sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y));
  for (const w of near.slice(0, brigadeSize(s))) draftToFire(s, w);
}

function endFire(s: GameState): void {
  s.fire = null;
  for (const w of s.workers) if (w.task?.kind === 'douse') w.task = null;
}
