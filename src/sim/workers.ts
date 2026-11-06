// Worker behaviour: walk, gather, carry back, build, farm, sleep at night,
// and run for water when something burns.
import type { Building, GameState, Point, ResourceId, Terrain, Worker } from './types';
import { BUILDINGS } from '../data/buildings';
import { GATHER_TERRAIN, JOBS } from '../data/jobs';
import { findNearestTile, findPath, isReachable, moveAlong, tileAt } from './world';
import { completeBuilding, constructionSite, gatherBonus } from './buildings';
import { pick } from './rng';
import { DAY_WORK_BONUS, FARM_AMOUNT, FARM_TIME, FIRE_BRIGADE, FIRE_BUCKET, GATHER_AMOUNT, GATHER_TIME, WORKER_SPEED as BASE_SPEED, TILE_REGEN_PER_SEC } from './constants';
import { dayFraction, isBlizzard, isEvening, isLunch, isNight } from './time';
import { fireSeat, maybeRest, updateRest } from './leisure';
import { isElder } from './population';


export function updateWorkers(s: GameState, dt: number): void {
  for (const w of s.workers) updateWorker(s, w, dt);
}

function updateWorker(s: GameState, w: Worker, dt: number): void {
  if (w.tipsy) w.tipsy = Math.max(0, w.tipsy - dt);
  const WORKER_SPEED = isElder(w) ? BASE_SPEED * 0.85 : BASE_SPEED;
  if (s.raid && w.task?.kind !== 'sleep' && w.task?.kind !== 'douse') {
    if (w.carrying) { s.resources[w.carrying] += w.carryAmount; w.carrying = null; w.carryAmount = 0; }
    goHome(s, w);
  }
  if (!w.task) assignTask(s, w);
  const t = w.task;
  if (!t) { w.timer -= dt; return; }

  switch (t.kind) {
    case 'arrive':
      if (moveAlong(w, WORKER_SPEED, dt)) w.task = null;
      return;

    case 'gather':
      if (t.phase === 'go') {
        if (isNight(s) || isLunch(s) || isEvening(s) || isBlizzard(s)) { w.task = null; return; } // sunset, lunch, evening or a blizzard: turn back before starting
        if (moveAlong(w, WORKER_SPEED, dt)) { t.phase = 'work'; w.timer = GATHER_TIME; }
      } else if (t.phase === 'work') {
        w.timer -= dt;
        if (w.timer <= 0) {
          const tile = tileAt(s, t.tx, t.ty);
          const taken = tile ? Math.floor(Math.min(GATHER_AMOUNT, tile.amount)) : 0;
          if (tile) tile.amount -= taken;
          w.carrying = t.resource;
          w.carryAmount = Math.round(taken * gatherBonus(s, t.resource) * DAY_WORK_BONUS);
          t.phase = 'return';
          w.path = findPath(s, w, s.center);
        }
      } else if (moveAlong(w, WORKER_SPEED, dt)) {
        deposit(s, w);
      }
      return;

    case 'build': {
      const b = s.buildings.find((x) => x.id === t.buildingId);
      if (!b || b.built) { w.task = null; return; }
      if (isNight(s) || isEvening(s) || isBlizzard(s)) { w.task = null; return; } // tools down for the evening
      if (t.phase === 'go') {
        if (moveAlong(w, WORKER_SPEED, dt)) t.phase = 'work';
      } else {
        const def = BUILDINGS[b.type];
        b.progress += dt * DAY_WORK_BONUS / Math.max(1, def.buildTime);
        if (b.progress >= 1) completeBuilding(s, b);
      }
      return;
    }

    case 'sleep': {
      // Everyone wakes a little after sunrise (once any raid is over), staggered so the street fills gradually.
      if (!isNight(s) && !isBlizzard(s) && !s.raid && dayFraction(s) > 0.17 + ((w.id * 37) % 10) * 0.006) { w.task = null; return; }
      const speed = s.raid ? WORKER_SPEED * 1.45 : WORKER_SPEED;
      if (t.phase === 'go' && moveAlong(w, speed, dt)) t.phase = 'sleep';
      return;
    }

    case 'rest':
      updateRest(s, w, t, dt, moveAlong);
      return;

    case 'douse': {
      const f = s.fire;
      const b = f && s.buildings.find((x) => x.id === f.buildingId);
      if (!f || !b || b.id !== t.buildingId) { w.task = null; return; }
      if (t.phase === 'fetch') {
        if (moveAlong(w, WORKER_SPEED * 1.5, dt)) { t.phase = 'carry'; w.path = findPath(s, w, b); }
      } else if (t.phase === 'carry') {
        if (moveAlong(w, WORKER_SPEED * 1.3, dt)) { t.phase = 'throw'; w.timer = 0.6; }
      } else {
        w.timer -= dt;
        if (w.timer <= 0) {
          f.intensity = Math.max(0, f.intensity - FIRE_BUCKET);
          s.fx.push({ kind: 'water', x: b.x, y: b.y });
          t.phase = 'fetch';
          w.path = findPath(s, w, waterSource(s, w));
        }
      }
      return;
    }

    case 'farm': {
      const b = s.buildings.find((x) => x.id === t.buildingId);
      if (!b) { w.task = null; return; }
      if (t.phase === 'go') {
        if (isNight(s) || isLunch(s) || isEvening(s) || isBlizzard(s)) { w.task = null; return; }
        if (moveAlong(w, WORKER_SPEED, dt)) { t.phase = 'work'; w.timer = FARM_TIME; }
      } else if (t.phase === 'work') {
        w.timer -= dt;
        if (w.timer <= 0) {
          w.carrying = 'food';
          w.carryAmount = Math.round(FARM_AMOUNT * gatherBonus(s, 'food') * DAY_WORK_BONUS);
          t.phase = 'return';
          w.path = findPath(s, w, s.center);
        }
      } else if (moveAlong(w, WORKER_SPEED, dt)) {
        deposit(s, w);
      }
      return;
    }
  }
}

function deposit(s: GameState, w: Worker): void {
  if (w.carrying) {
    s.resources[w.carrying] += w.carryAmount;
    s.fx.push({ kind: 'float', x: w.x, y: w.y, text: `+${w.carryAmount}`, color: resourceColor(w.carrying) });
  }
  w.carrying = null;
  w.carryAmount = 0;
  w.task = null;
}

function assignTask(s: GameState, w: Worker): void {
  if (s.fire && dousers(s) < brigadeSize(s)) { draftToFire(s, w); return; }
  if (isNight(s) || isBlizzard(s) || s.raid) { goHome(s, w); return; }
  if (maybeRest(s, w)) return;
  const job = JOBS[w.job];
  if (w.job === 'builder') {
    const site = constructionSite(s);
    if (!site) return;
    w.task = { kind: 'build', buildingId: site.id, phase: 'go' };
    w.path = findPath(s, w, site);
    return;
  }
  if (w.job === 'farmer') {
    const farms = s.buildings.filter((b) => b.built && b.type === 'farm');
    if (!farms.length) return;
    // Least-crowded farm, so farmers spread out instead of piling onto one field.
    const load = new Map<number, number>();
    for (const o of s.workers) if (o !== w && o.task?.kind === 'farm' && o.task.phase !== 'return') load.set(o.task.buildingId, (load.get(o.task.buildingId) ?? 0) + 1);
    const min = Math.min(...farms.map((f) => load.get(f.id) ?? 0));
    const farm = pick(s, farms.filter((f) => (load.get(f.id) ?? 0) === min));
    w.task = { kind: 'farm', buildingId: farm.id, phase: 'go' };
    w.path = findPath(s, w, farm);
    return;
  }
  if (job.gathers) {
    const terrain = GATHER_TERRAIN[job.gathers];
    // Tiles other gatherers are already heading to or working on.
    const busy = new Map<number, number>();
    for (const o of s.workers) if (o !== w && o.task?.kind === 'gather' && o.task.phase !== 'return') { const i = o.task.ty * s.width + o.task.tx; busy.set(i, (busy.get(i) ?? 0) + 1); }
    const target = terrain ? findNearestTile(s, w, terrain, busy) : null;
    if (!target) return;
    w.task = { kind: 'gather', resource: job.gathers, tx: target.x, ty: target.y, phase: 'go' };
    w.path = findPath(s, w, target);
    if (!w.path.length && (Math.round(w.x) !== target.x || Math.round(w.y) !== target.y)) unstick(s, w);
  }
}

/** Workers currently fetching water for the fire. */
export function dousers(s: GameState): number {
  let n = 0;
  for (const w of s.workers) if (w.task?.kind === 'douse') n++;
  return n;
}

/** Bigger towns muster a bigger bucket brigade. */
export function brigadeSize(s: GameState): number {
  return FIRE_BRIGADE + Math.floor(s.workers.length / 15);
}

/** Where buckets get filled: the well if there is one, otherwise the nearest stretch of river. */
export function waterSource(s: GameState, from: Point): Point {
  const well = s.buildings.find((b) => b.built && b.type === 'well');
  if (well) return well;
  let best: Point = s.center, bestD = Infinity;
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
    if (s.tiles[y * s.width + x].terrain !== 'water') continue;
    const d = Math.hypot(x - from.x, y - from.y);
    if (d < bestD) { bestD = d; best = { x, y }; }
  }
  return best;
}

/** Drop everything, grab a bucket and run for water. */
export function draftToFire(s: GameState, w: Worker): void {
  const f = s.fire;
  const b = f && s.buildings.find((x) => x.id === f.buildingId);
  if (!b) return;
  w.carrying = null; w.carryAmount = 0;
  w.task = { kind: 'douse', buildingId: b.id, phase: 'fetch' };
  w.path = findPath(s, w, waterSource(s, w));
}

/**
 * Each worker has a bed in a hut or house (in building order); the rest sleep
 * by the campfire. Only built homes count.
 */
export function homeOf(s: GameState, w: Worker): Building | null {
  const idx = s.workers.indexOf(w);
  let beds = 0;
  for (const b of s.buildings) {
    if (!b.built) continue;
    const h = BUILDINGS[b.type].housing ?? 0;
    if (!h) continue;
    beds += h;
    if (idx < beds) return b;
  }
  return s.buildings.find((b) => b.type === 'campfire') ?? null;
}

/** True while the worker is asleep inside a house (not drawn). */
export function isIndoors(s: GameState, w: Worker): boolean {
  const t = w.task;
  if (!t) return false;
  if (t.kind === 'rest') return t.phase === 'do' && (t.activity === 'drink' || t.activity === 'pray');
  if (t.kind !== 'sleep' || t.phase !== 'sleep') return false;
  const b = s.buildings.find((x) => x.id === t.buildingId);
  return !!b && b.type !== 'campfire';
}

function goHome(s: GameState, w: Worker): void {
  let home = homeOf(s, w);
  if (s.raid && (!home || home.type === 'campfire')) {
    const shelters = s.buildings.filter((b) => b.built && (b.type === 'hut' || b.type === 'house' || b.type === 'tavern' || b.type === 'keep' || b.type === 'guildHall' || b.type === 'chapel' || b.type === 'granary'));
    if (shelters.length) {
      home = shelters.reduce((best, b) => (Math.hypot(b.x - w.x, b.y - w.y) < Math.hypot(best.x - w.x, best.y - w.y) ? b : best), shelters[0]);
    }
  }
  if (!home) return;
  w.task = { kind: 'sleep', buildingId: home.id, phase: 'go' };
  // Sit at the fire's edge rather than on it.
  const target = home.type === 'campfire' ? fireSeat(s, w) : home;
  w.path = findPath(s, w, target);
  if (!w.path.length) w.task.phase = 'sleep';
}

/** A worker who cannot reach anything (e.g. boxed in by new walls) walks or hops back to the campfire. */
function unstick(s: GameState, w: Worker): void {
  w.task = null;
  if (isReachable(s, Math.round(w.x), Math.round(w.y))) {
    w.task = { kind: 'arrive' };
    w.path = findPath(s, w, s.center);
    if (w.path.length) return;
  }
  w.x = s.center.x; w.y = s.center.y; w.path = []; w.task = null;
}

/** Forests, bushes and rocks slowly grow back. Called once per game second. */
export function regenerateTiles(s: GameState): void {
  for (const t of s.tiles) {
    if (t.terrain === 'forest' && t.amount < 40) t.amount += TILE_REGEN_PER_SEC * 1.5;
    else if (t.terrain === 'bush' && t.amount < 25) t.amount += TILE_REGEN_PER_SEC * 2;
    else if (t.terrain === 'rock' && t.amount < 40) t.amount += TILE_REGEN_PER_SEC * 0.5;
    else if (t.terrain === 'ore' && t.amount < 60) t.amount += TILE_REGEN_PER_SEC * 0.5;
  }
}

export function resourceColor(r: ResourceId): string {
  return { wood: '#c8925a', stone: '#c0c0c0', food: '#7ad07a', iron: '#9ab0d0', gold: '#f0d050' }[r];
}
