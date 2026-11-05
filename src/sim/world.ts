// Map generation, tile access, pathfinding and movement helpers.
import type { GameState, Point, Terrain, Tile } from './types';
import { random, randInt, chance } from './rng';

export const MAP_W = 30;
export const MAP_H = 20;

export function tileAt(s: GameState, x: number, y: number): Tile | null {
  if (x < 0 || y < 0 || x >= s.width || y >= s.height) return null;
  return s.tiles[y * s.width + x];
}

export function inBounds(s: GameState, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < s.width && y < s.height;
}

export function isPassable(s: GameState, x: number, y: number): boolean {
  const t = tileAt(s, x, y);
  if (!t) return false;
  if (t.terrain === 'water') return false;
  if (t.building >= 0) {
    const b = s.buildings[t.building];
    // Workers may walk through unfinished sites and the campfire.
    return !b.built || b.type === 'campfire' || b.type === 'grave';
  }
  return true;
}

export function generateTiles(s: Pick<GameState, 'seed'>, w: number, h: number): Tile[] {
  const tiles: Tile[] = [];
  for (let i = 0; i < w * h; i++) tiles.push({ terrain: 'grass', amount: 0, building: -1, v: random(s) });
  const set = (x: number, y: number, terrain: Terrain, amount: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const t = tiles[y * w + x];
    t.terrain = terrain;
    t.amount = amount;
  };
  const cx = Math.floor(w / 2), cy = Math.floor(h / 2);
  const farFromCenter = (x: number, y: number, d: number) => Math.hypot(x - cx, y - cy) > d;

  // River along the left edge with a gentle wobble.
  for (let y = 0; y < h; y++) {
    const width = 2 + Math.round(Math.sin(y * 0.5) + 1);
    for (let x = 0; x < width; x++) set(x, y, 'water', 0);
  }
  const blob = (terrain: Terrain, count: number, size: number, minDist: number, amount: number) => {
    for (let i = 0; i < count; i++) {
      let bx = randInt(s, 3, w - 2), by = randInt(s, 1, h - 2);
      let tries = 0;
      while (!farFromCenter(bx, by, minDist) && tries++ < 20) { bx = randInt(s, 3, w - 2); by = randInt(s, 1, h - 2); }
      for (let j = 0; j < size; j++) {
        const x = bx + randInt(s, -2, 2), y = by + randInt(s, -2, 2);
        if (!farFromCenter(x, y, 3)) continue;
        const t = x >= 0 && y >= 0 && x < w && y < h ? tiles[y * w + x] : null;
        if (t && t.terrain === 'grass') set(x, y, terrain, amount);
      }
    }
  };
  // Counts are for a 30x20 map; scale with the area so bigger maps stay as dense.
  const k = (w * h) / 600;
  blob('forest', Math.round(9 * k), 12, 5, 40);
  blob('rock', Math.round(4 * k), 8, 7, 40);
  blob('bush', Math.round(5 * k), 6, 4, 25);
  blob('ore', 3, 5, 10, 60);
  // Keep the corners free for dungeon entrances and a clear ring for the town.
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!farFromCenter(x, y, 2.5) && tiles[y * w + x].terrain !== 'water') set(x, y, 'grass', 0);
  }
  // A few scattered trees for flavour.
  for (let i = 0; i < Math.round(18 * k); i++) {
    const x = randInt(s, 3, w - 1), y = randInt(s, 0, h - 1);
    if (tiles[y * w + x].terrain === 'grass' && farFromCenter(x, y, 4) && chance(s, 0.7)) set(x, y, 'forest', 20);
  }
  return tiles;
}

export function dungeonCorner(corner: 'ne' | 'se' | 'nw' | 'sw', w: number, h: number): Point {
  switch (corner) {
    case 'ne': return { x: w - 3, y: 2 };
    case 'se': return { x: w - 3, y: h - 3 };
    case 'nw': return { x: 4, y: 2 };
    case 'sw': return { x: 4, y: h - 3 };
  }
}

/** Nearest tile of a terrain with remaining amount, by straight-line distance. */
/**
 * Nearest reachable tile of a terrain with resources left. Tiles in `busy`
 * (index → number of other workers already claiming it) are skipped so
 * gatherers spread out; if every tile is claimed, the least crowded one wins.
 */
export function findNearestTile(s: GameState, from: Point, terrain: Terrain, busy?: Map<number, number>): Point | null {
  const mask = reachableMask(s);
  let best: Point | null = null, bestD = Infinity;
  let fallback: Point | null = null, fallbackN = Infinity, fallbackD = Infinity;
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
    const i = y * s.width + x;
    const t = s.tiles[i];
    if (t.terrain !== terrain || t.amount < 1 || t.building >= 0) continue;
    if (!mask[i]) continue;
    const d = Math.hypot(x - from.x, y - from.y);
    const n = busy?.get(i) ?? 0;
    if (n > 0) { if (n < fallbackN || (n === fallbackN && d < fallbackD)) { fallbackN = n; fallbackD = d; fallback = { x, y }; } continue; }
    if (d < bestD) { bestD = d; best = { x, y }; }
  }
  return best ?? fallback;
}

/** How many reachable tiles of a terrain still have resources (one gatherer each is plenty). */
export function availableTiles(s: GameState, terrain: Terrain): number {
  const mask = reachableMask(s);
  let n = 0;
  for (let i = 0; i < s.tiles.length; i++) { const t = s.tiles[i]; if (t.terrain === terrain && t.amount >= 1 && t.building < 0 && mask[i]) n++; }
  return n;
}

/**
 * Nearest free grass tile for a new building, in expanding rings. Buildings fill
 * 2x2 blocks separated by streets every third tile, so nothing ever gets walled in.
 */
export function findBuildSpot(s: GameState, around: Point, minRing = 1): Point | null {
  for (let r = minRing; r < Math.max(s.width, s.height); r++) {
    const ring: Point[] = [];
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (dx % 3 === 0 || dy % 3 === 0) continue; // street
      const x = around.x + dx, y = around.y + dy;
      const t = tileAt(s, x, y);
      if (!t || t.terrain !== 'grass' || t.building >= 0) continue;
      ring.push({ x, y });
    }
    if (ring.length) return ring[Math.floor(random(s) * ring.length)];
  }
  return null;
}

/** Tiles reachable on foot from the town centre. Cached until the buildings change. */
const reachCache = new WeakMap<GameState, { stamp: number; mask: Uint8Array }>();
export function reachableMask(s: GameState): Uint8Array {
  let stamp = s.buildings.length * 2;
  for (const b of s.buildings) if (b.built) stamp++;
  const c = reachCache.get(s);
  if (c && c.stamp === stamp) return c.mask;
  const w = s.width, h = s.height;
  const mask = new Uint8Array(w * h);
  const start = s.center.y * w + s.center.x;
  const queue = [start];
  mask[start] = 1;
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    const cx = cur % w, cy = (cur - cx) / w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (!inBounds(s, nx, ny) || mask[ny * w + nx] || !isPassable(s, nx, ny)) continue;
      mask[ny * w + nx] = 1;
      queue.push(ny * w + nx);
    }
  }
  reachCache.set(s, { stamp, mask });
  return mask;
}

export function isReachable(s: GameState, x: number, y: number): boolean {
  return inBounds(s, x, y) && reachableMask(s)[y * s.width + x] === 1;
}

/** Breadth-first path on the tile grid. The goal may be impassable (we stop next to it). */
export function findPath(s: GameState, from: Point, to: Point): Point[] {
  const sx = Math.round(from.x), sy = Math.round(from.y);
  const gx = Math.round(to.x), gy = Math.round(to.y);
  if (sx === gx && sy === gy) return [];
  const w = s.width, h = s.height;
  const prev = new Int32Array(w * h).fill(-1);
  const seen = new Uint8Array(w * h);
  const queue: number[] = [sy * w + sx];
  seen[sy * w + sx] = 1;
  const goalPassable = isPassable(s, gx, gy);
  let found = -1;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  for (let qi = 0; qi < queue.length && found < 0; qi++) {
    const cur = queue[qi];
    const cx = cur % w, cy = (cur - cx) / w;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx, ny = cy + dy;
      if (!inBounds(s, nx, ny)) continue;
      const ni = ny * w + nx;
      if (seen[ni]) continue;
      if (nx === gx && ny === gy) { prev[ni] = cur; found = ni; break; }
      if (!isPassable(s, nx, ny)) continue;
      // No cutting corners through blocked tiles.
      if (dx && dy && (!isPassable(s, cx + dx, cy) || !isPassable(s, cx, cy + dy))) continue;
      seen[ni] = 1;
      prev[ni] = cur;
      queue.push(ni);
    }
  }
  if (found < 0) return [];
  const path: Point[] = [];
  let i = found;
  while (i !== sy * w + sx) { path.push({ x: i % w, y: Math.floor(i / w) }); i = prev[i]; }
  path.reverse();
  if (!goalPassable) path.pop();
  return path;
}

/** Move an entity along its path. Returns true when the path is exhausted. */
export function moveAlong(e: { x: number; y: number; path: Point[] }, speed: number, dt: number): boolean {
  let budget = speed * dt;
  while (budget > 0 && e.path.length) {
    const target = e.path[0];
    const dx = target.x - e.x, dy = target.y - e.y;
    const d = Math.hypot(dx, dy);
    if (d <= budget) { e.x = target.x; e.y = target.y; e.path.shift(); budget -= d; }
    else { e.x += (dx / d) * budget; e.y += (dy / d) * budget; budget = 0; }
  }
  return e.path.length === 0;
}

export function edgeSpawnPoint(s: GameState): Point {
  // Arrive from the right or bottom edge (the river is on the left).
  if (chance(s, 0.5)) return { x: s.width - 1, y: randInt(s, 2, s.height - 3) };
  return { x: randInt(s, 6, s.width - 3), y: s.height - 1 };
}

/** Turn the grass tiles along a path into road, so streets appear as the town grows. */
export function paveRoad(s: GameState, from: Point, to: Point): void {
  for (const p of findPath(s, from, to)) {
    const t = tileAt(s, p.x, p.y);
    if (t && t.terrain === 'grass' && t.building < 0) t.terrain = 'road';
  }
}
