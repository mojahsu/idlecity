// Worker behaviour: walk, gather, carry back, build, farm.
import type { GameState, ResourceId, Terrain, Worker } from './types';
import { BUILDINGS } from '../data/buildings';
import { GATHER_TERRAIN, JOBS } from '../data/jobs';
import { findNearestTile, findPath, isReachable, moveAlong, tileAt } from './world';
import { completeBuilding, constructionSite, gatherBonus } from './buildings';
import { pick } from './rng';
import { FARM_AMOUNT, FARM_TIME, GATHER_AMOUNT, GATHER_TIME, WORKER_SPEED, TILE_REGEN_PER_SEC } from './constants';


export function updateWorkers(s: GameState, dt: number): void {
  for (const w of s.workers) updateWorker(s, w, dt);
}

function updateWorker(s: GameState, w: Worker, dt: number): void {
  if (!w.task) assignTask(s, w);
  const t = w.task;
  if (!t) { w.timer -= dt; return; }

  switch (t.kind) {
    case 'arrive':
      if (moveAlong(w, WORKER_SPEED, dt)) w.task = null;
      return;

    case 'gather':
      if (t.phase === 'go') {
        if (moveAlong(w, WORKER_SPEED, dt)) { t.phase = 'work'; w.timer = GATHER_TIME; }
      } else if (t.phase === 'work') {
        w.timer -= dt;
        if (w.timer <= 0) {
          const tile = tileAt(s, t.tx, t.ty);
          const taken = tile ? Math.floor(Math.min(GATHER_AMOUNT, tile.amount)) : 0;
          if (tile) tile.amount -= taken;
          w.carrying = t.resource;
          w.carryAmount = Math.round(taken * gatherBonus(s, t.resource));
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
      if (t.phase === 'go') {
        if (moveAlong(w, WORKER_SPEED, dt)) t.phase = 'work';
      } else {
        const def = BUILDINGS[b.type];
        b.progress += dt / Math.max(1, def.buildTime);
        if (b.progress >= 1) completeBuilding(s, b);
      }
      return;
    }

    case 'farm': {
      const b = s.buildings.find((x) => x.id === t.buildingId);
      if (!b) { w.task = null; return; }
      if (t.phase === 'go') {
        if (moveAlong(w, WORKER_SPEED, dt)) { t.phase = 'work'; w.timer = FARM_TIME; }
      } else if (t.phase === 'work') {
        w.timer -= dt;
        if (w.timer <= 0) {
          w.carrying = 'food';
          w.carryAmount = Math.round(FARM_AMOUNT * gatherBonus(s, 'food'));
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
