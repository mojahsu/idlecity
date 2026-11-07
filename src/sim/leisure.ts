// Time off. Workers take breaks between deliveries, everyone eats at noon
// and the whole town takes the festival day off. Each activity is a spot
// to walk to and a way to face; the renderer draws the rest.
import type { GameState, Point, RestActivity, Worker, WorkerTask } from './types';
import { FISH_CATCH_CHANCE, LAZY_REST_CHANCE, REST_CHANCE, REST_TIME } from './constants';
import { chance, pick, randInt } from './rng';
import { findPath, isPassable, isReachable } from './world';
import { LUNCH_TO, dayFraction, isEvening, isHoliday, isLunch, isRaining, season } from './time';

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

/** The oldest built building of a type: a fixed landmark, unlike the random pick in building(). */
function firstBuilding(s: GameState, type: string) {
  return s.buildings.find((b) => b.built && b.type === type) ?? null;
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

/** The chess table: a free tile beside the tavern (or the well), with the second seat to its right. */
export function chessSeats(s: GameState): [Point, Point] | null {
  const b = firstBuilding(s, 'tavern') ?? firstBuilding(s, 'well');
  if (!b) return null;
  for (const p of around(s, b, 1)) {
    const q = { x: p.x + 1, y: p.y };
    if (isPassable(s, q.x, q.y) && isReachable(s, q.x, q.y) && s.tiles[q.y * s.width + q.x].terrain !== 'water') return [p, q];
  }
  return null;
}

function chessSpot(s: GameState, w: Worker): RestTask | null {
  if (s.workers.length < 2) return null;
  const seats = chessSeats(s);
  if (!seats) return null;
  const taken = (p: Point) => s.workers.some((o) => o !== w && o.task?.kind === 'rest' && o.task.activity === 'chess' && o.task.x === p.x && o.task.y === p.y);
  if (!taken(seats[0])) return { kind: 'rest', activity: 'chess', x: seats[0].x, y: seats[0].y, dir: 1, phase: 'go' };
  if (!taken(seats[1])) return { kind: 'rest', activity: 'chess', x: seats[1].x, y: seats[1].y, dir: -1, phase: 'go' };
  return null;
}

/** Built huts/houses occupied by at least one villager in a different home than `w`. */
function neighbourHomes(s: GameState, w: Worker) {
  if (s.workers.length < 2) return [];
  const homeByWorker = new Map<number, number>();
  let workerIdx = 0;
  for (const b of s.buildings) {
    if (!b.built) continue;
    const cap = b.type === 'house' ? 5 : b.type === 'hut' ? 2 : 0;
    for (let i = 0; i < cap && workerIdx < s.workers.length; i++, workerIdx++) {
      homeByWorker.set(s.workers[workerIdx].id, b.id);
    }
  }
  const myHomeId = homeByWorker.get(w.id);
  const otherHomeIds = new Set<number>();
  for (const [wid, bid] of homeByWorker) {
    if (wid !== w.id && bid !== myHomeId) otherHomeIds.add(bid);
  }
  return s.buildings.filter(
    (b) => otherHomeIds.has(b.id) && isPassable(s, b.x, b.y + 1) && isReachable(s, b.x, b.y + 1),
  );
}

/** Where the bard plays: just north of the campfire. Listeners gather in a ring around it. */
export function bardSpot(s: GameState): Point { return { x: s.center.x, y: s.center.y - 1 }; }

/** The straw target stands two tiles below the first wall (or the guild hall); shooters line up to its left. */
export function archeryTarget(s: GameState): Point | null {
  const b = firstBuilding(s, 'walls') ?? firstBuilding(s, 'guildHall');
  if (!b) return null;
  for (const dy of [2, 3]) for (const dx of [0, 1, -1]) {
    const t = { x: b.x + dx, y: b.y + dy };
    if (!isPassable(s, t.x, t.y) || !isReachable(s, t.x, t.y) || s.tiles[t.y * s.width + t.x].terrain !== 'grass') continue;
    if (isPassable(s, t.x - 2, t.y) && isReachable(s, t.x - 2, t.y)) return t;
  }
  return null;
}

/** A spot on the river bank (land tile right of water) within reach, facing the water. */
export function bankSpotFor(s: GameState, w: Worker, activity: RestActivity, maxDist = 16): RestTask | null {
  const banks: Point[] = [];
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width - 1; x++) {
    const t = s.tiles[y * s.width + x];
    if (t.terrain !== 'water' || s.tiles[y * s.width + x + 1].terrain === 'water') continue;
    if (Math.hypot(x - w.x, y - w.y) > maxDist) continue;
    if (isPassable(s, x + 1, y) && isReachable(s, x + 1, y)) banks.push({ x: x + 1, y });
  }
  if (!banks.length) return null;
  const b = pick(s, banks);
  return { kind: 'rest', activity, x: b.x, y: b.y, dir: -1, phase: 'go' };
}

/** A free grass tile a few rings out from the square. */
function meadowSpot(s: GameState, activity: RestActivity, dir: number, minR = 2, maxR = 5): RestTask | null {
  const ring = around(s, s.center, randInt(s, minR, maxR)).filter((p) => s.tiles[p.y * s.width + p.x].terrain === 'grass');
  if (!ring.length) return null;
  const p = pick(s, ring);
  return { kind: 'rest', activity, x: p.x, y: p.y, dir, phase: 'go' };
}

/** Pick something to do with a break. Returns null when there is nothing to do nearby. */
export function chooseRest(s: GameState, w: Worker): RestTask | null {
  const sea = season(s), evening = isEvening(s), wet = isRaining(s);
  const options: RestActivity[] = ['chat', 'nap', 'fish', 'chess', 'visit'];
  if (s.buildings.some((b) => b.built && b.type === 'tavern')) options.push('drink', 'drink', 'listen', 'listen');
  if (s.buildings.some((b) => b.built && b.type === 'farm')) options.push('feed');
  if (s.buildings.some((b) => b.built && b.type === 'chapel')) options.push('pray');
  if (archeryTarget(s)) options.push('archery', 'archery');
  if (s.caravan && s.caravan.phase === 'trade') options.push('watch', 'watch');
  if (isHoliday(s)) options.push('stroll', 'stroll', 'chat', 'listen');
  if (evening) options.push('sunset', 'sunset', 'drink', 'listen');
  if (sea === 'summer' && !evening && !wet) options.push('swim', 'swim');
  if (sea === 'winter') options.push('snowman', 'snowball', 'snowball');
  if (sea !== 'winter' && !wet && !evening && w.spouse !== undefined) options.push('picnic');
  switch (pick(s, options)) {
    case 'chess': return chessSpot(s, w);
    case 'listen': { const ring = around(s, bardSpot(s), 2).filter((p) => p.y >= s.center.y - 1); if (!ring.length) return null; const p = pick(s, ring); return { kind: 'rest', activity: 'listen', x: p.x, y: p.y, dir: facing(p, bardSpot(s)), phase: 'go' }; }
    case 'archery': { const t = archeryTarget(s); if (!t) return null; const lane = pick(s, [2, 3].filter((d) => isPassable(s, t.x - d, t.y) && isReachable(s, t.x - d, t.y))); return lane ? { kind: 'rest', activity: 'archery', x: t.x - lane, y: t.y, dir: 1, phase: 'go' } : null; }
    case 'visit': { const homes = neighbourHomes(s, w); if (!homes.length) return null; const h = pick(s, homes); return { kind: 'rest', activity: 'visit', x: h.x, y: h.y + 1, dir: (w.id % 2) ? 1 : -1, phase: 'go', buildingId: h.id }; }
    case 'sunset': return bankSpotFor(s, w, 'sunset', 22);
    case 'picnic': return meadowSpot(s, 'picnic', 1, 3, 6);
    case 'swim': return bankSpotFor(s, w, 'swim', 14);
    case 'snowman': return meadowSpot(s, 'snowman', 1, 2, 5);
    case 'snowball': return s.workers.length < 2 ? meadowSpot(s, 'snowman', 1, 2, 5) : meadowSpot(s, 'snowball', chance(s, 0.5) ? 1 : -1, 1, 3);
    case 'chat': { const b = building(s, 'well') ?? building(s, 'campfire'); return b ? spotNear(s, b, s.workers.length < 2 ? 'stroll' : 'chat', b.id) : null; }
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
  } else if (isEvening(s)) {
    // The evening is one long activity that ends at bedtime.
    task = chooseRest(s, w);
    duration = Math.max(4, (0.8 - dayFraction(s)) * 60);
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
  // A picnic is for two: the spouse comes along if they are free.
  if (task.activity === 'picnic') {
    const sp = s.workers.find((o) => o.id === w.spouse && !o.task);
    if (sp) { const t2: RestTask = { ...task, x: task.x, y: task.y, dir: -1 }; sp.task = t2; sp.path = findPath(s, sp, t2); sp.timer = duration; }
  }
  return true;
}

/** Advance a resting worker. */
export function updateRest(s: GameState, w: Worker, t: RestTask, dt: number, moveAlong: (w: Worker, speed: number, dt: number) => boolean): void {
  if (t.phase === 'go') {
    if (moveAlong(w, 1.1, dt)) t.phase = 'do';
    return;
  }
  w.timer -= dt;
  if (t.activity === 'lunch' && !isLunch(s)) w.timer = 0;
  if (w.timer > 0) return;
  if (t.activity === 'fish' && chance(s, FISH_CATCH_CHANCE)) { s.resources.food += 1; s.fx.push({ kind: 'float', x: w.x, y: w.y, text: '+1', color: '#7ad07a' }); }
  if (t.activity === 'drink') w.tipsy = 12;
  if (t.activity === 'swim' && w.carrying) { w.carrying = null; w.carryAmount = 0; }
  w.task = null;
}
