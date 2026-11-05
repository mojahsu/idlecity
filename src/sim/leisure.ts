// Time off. Workers take breaks between deliveries, everyone eats at noon
// and the whole town takes the festival day off. Each activity is a spot
// to walk to and a way to face; the renderer draws the rest.
import type { GameState, Point, RestActivity, Worker, WorkerTask } from './types';
import { FISH_CATCH_CHANCE, LAZY_REST_CHANCE, REST_CHANCE, REST_TIME } from './constants';
import { chance, pick, randInt } from './rng';
import { findPath, isPassable, isReachable } from './world';
import { LUNCH_TO, dayFraction, isHoliday, isLunch } from './time';

type RestTask = Extract<WorkerTask, { kind: 'rest' }>;

/** Passable, reachable land tiles in a ring around a spot. */
function around(s: GameState, p: Point, r: number): Point[] {
  const out: Point[] = [];
  for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = p.x + dx, y = p.y + dy;
    if (isPassable(s, x, y) && isReachable(s, x, y) && s.tiles[y * s.width + x].terrain !== 'water') out.push({ x, y });
  }
  return out;
}

function facing(from: Point, to: Point): number { return to.x < from.x ? -1 : 1; }

function spotNear(s: GameState, target: Point, activity: RestActivity, buildingId?: number): RestTask | null {
  const ring = around(s, target, 1);
  if (!ring.length) return null;
  const p = pick(s, ring);
  return { kind: 'rest', activity, x: p.x, y: p.y, dir: facing(p, target), phase: 'go', buildingId };
}

function building(s: GameState, type: string) {
  const all = s.buildings.filter((b) => b.built && b.type === type);
  return all.length ? pick(s, all) : null;
}

/** A spot on the bank next to the river, within walking distance. */
function fishingSpot(s: GameState, w: Worker): RestTask | null {
  const banks: { land: Point; water: Point }[] = [];
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width - 1; x++) {
    const t = s.tiles[y * s.width + x];
    if (t.terrain !== 'water' || s.tiles[y * s.width + x + 1].terrain === 'water') continue;
    if (Math.hypot(x - w.x, y - w.y) > 16) continue;
    if (isPassable(s, x + 1, y) && isReachable(s, x + 1, y)) banks.push({ land: { x: x + 1, y }, water: { x, y } });
  }
  if (!banks.length) return null;
  const b = pick(s, banks);
  return { kind: 'rest', activity: 'fish', x: b.land.x, y: b.land.y, dir: -1, phase: 'go' };
}

function napSpot(s: GameState, w: Worker): RestTask | null {
  let best: Point | null = null, bestD = Infinity;
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
    const t = s.tiles[y * s.width + x];
    if (t.terrain !== 'forest' || t.amount < 1) continue;
    const d = Math.hypot(x - w.x, y - w.y);
    if (d < bestD) { bestD = d; best = { x, y }; }
  }
  return best ? spotNear(s, best, 'nap') : null;
}

/** The ring of seats around the campfire, one per worker. */
export function fireSeat(s: GameState, w: Worker): Point {
  const seats: [number, number][] = [[-1, 1], [0, 1], [1, 1], [1, 0], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const open = seats.map(([dx, dy]) => ({ x: s.center.x + dx, y: s.center.y + dy })).filter((p) => isPassable(s, p.x, p.y));
  return open.length ? open[w.id % open.length] : s.center;
}

/** Pick something to do with a break. Returns null when there is nothing to do nearby. */
export function chooseRest(s: GameState, w: Worker): RestTask | null {
  const options: RestActivity[] = ['chat', 'nap', 'fish'];
  if (s.buildings.some((b) => b.built && b.type === 'tavern')) options.push('drink', 'drink');
  if (s.buildings.some((b) => b.built && b.type === 'farm')) options.push('feed');
  if (s.buildings.some((b) => b.built && b.type === 'chapel')) options.push('pray');
  if (s.caravan && s.caravan.phase === 'trade') options.push('watch', 'watch');
  if (isHoliday(s)) options.push('stroll', 'stroll', 'chat');
  switch (pick(s, options)) {
    case 'chat': { const b = building(s, 'well') ?? building(s, 'campfire'); return b ? spotNear(s, b, 'chat', b.id) : null; }
    case 'drink': { const b = building(s, 'tavern'); return b ? spotNear(s, b, 'drink', b.id) : null; }
    case 'fish': return fishingSpot(s, w);
    case 'nap': return napSpot(s, w);
    case 'feed': { const b = building(s, 'farm'); return b ? spotNear(s, b, 'feed', b.id) : null; }
    case 'pray': { const b = building(s, 'chapel'); return b ? spotNear(s, b, 'pray', b.id) : null; }
    case 'watch': { const c = s.caravan!; const ring = around(s, { x: Math.round(c.x), y: Math.round(c.y) }, 2); if (!ring.length) return null; const p = pick(s, ring); return { kind: 'rest', activity: 'watch', x: p.x, y: p.y, dir: facing(p, c), phase: 'go' }; }
    case 'stroll': { const ring = around(s, s.center, randInt(s, 2, 4)); if (!ring.length) return null; const p = pick(s, ring); return { kind: 'rest', activity: 'stroll', x: p.x, y: p.y, dir: chance(s, 0.5) ? 1 : -1, phase: 'go' }; }
    default: return null;
  }
}

/** Born idle. Workers from saves made before the flag existed get it by id so old towns have loafers too. */
export function isLazy(w: Worker): boolean {
  return w.lazy ?? (w.id * 7) % 8 === 0;
}

/** Whether this worker takes a break now, and which. Called when a worker has nothing to do. */
export function maybeRest(s: GameState, w: Worker): boolean {
  let task: RestTask | null = null;
  let duration = randInt(s, REST_TIME[0], REST_TIME[1]);
  if (isLunch(s)) {
    const seat = fireSeat(s, w);
    task = { kind: 'rest', activity: 'lunch', x: seat.x, y: seat.y, dir: seat.x <= s.center.x ? 1 : -1, phase: 'go' };
    duration = Math.max(3, (LUNCH_TO - dayFraction(s)) * 60);
  } else if (isHoliday(s)) {
    task = chooseRest(s, w);
    duration = randInt(s, 12, 28);
  } else if (chance(s, isLazy(w) ? LAZY_REST_CHANCE : REST_CHANCE)) {
    task = chooseRest(s, w);
    if (isLazy(w)) duration += 12;
  }
  if (!task) return false;
  const path = findPath(s, w, task);
  if (!path.length && (Math.round(w.x) !== task.x || Math.round(w.y) !== task.y)) return false;
  w.task = task;
  w.path = path;
  w.timer = duration;
  return true;
}

/** Advance a resting worker. */
export function updateRest(s: GameState, w: Worker, t: RestTask, dt: number, moveAlong: (w: Worker, speed: number, dt: number) => boolean): void {
  if (t.phase === 'go') {
    if (moveAlong(w, 1.6, dt)) t.phase = 'do';
    return;
  }
  w.timer -= dt;
  if (t.activity === 'lunch' && !isLunch(s)) w.timer = 0;
  if (w.timer > 0) return;
  if (t.activity === 'fish' && chance(s, FISH_CATCH_CHANCE)) { s.resources.food += 1; s.fx.push({ kind: 'float', x: w.x, y: w.y, text: '+1', color: '#7ad07a' }); }
  if (t.activity === 'drink') w.tipsy = 12;
  w.task = null;
}
