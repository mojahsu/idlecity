import type { GameState, Resources } from './types';
import { generateTiles, dungeonCorner, MAP_W, MAP_H } from './world';
import { DUNGEONS } from '../data/dungeons';
import { placeBuilding } from './buildings';
import { spawnWorker } from './population';
import { log } from './log';

export const SAVE_VERSION = 1;

export function emptyResources(): Resources {
  return { wood: 0, stone: 0, food: 0, iron: 0, gold: 0 };
}

export function newGame(seed = Date.now() % 2147483647): GameState {
  const s: GameState = {
    version: SAVE_VERSION,
    seed,
    tick: 0,
    time: 0,
    width: MAP_W,
    height: MAP_H,
    tiles: [],
    center: { x: Math.floor(MAP_W / 2), y: Math.floor(MAP_H / 2) },
    resources: { wood: 0, stone: 0, food: 10, iron: 0, gold: 0 },
    buildings: [],
    workers: [],
    adventurers: [],
    parties: [],
    dungeons: [],
    raid: null,
    caravan: null,
    fire: null,
    children: [],
    nextId: 1,
    log: [],
    chronicle: [],
    tier: 'camp',
    equipment: 0,
    ironForged: 0,
    victory: false,
    mayor: { want: null, jobTimer: 1, buildTimer: 2 },
    timers: { immigrant: 30, adventurer: 20, raid: 240, chapel: 0 },
    stats: { built: 0, monstersSlain: 0, dungeonRuns: 0, deaths: 0, immigrants: 0 },
    fx: [],
  };
  s.tiles = generateTiles(s, MAP_W, MAP_H);
  for (const d of DUNGEONS) {
    const p = dungeonCorner(d.corner, MAP_W, MAP_H);
    s.dungeons.push({ id: d.id, x: p.x, y: p.y, unlocked: false, deepestFloor: 0, bossDefeated: false, runs: 0 });
    // Clear the entrance tile so paths can reach it.
    const t = s.tiles[p.y * MAP_W + p.x];
    t.terrain = 'grass'; t.amount = 0;
  }
  placeBuilding(s, 'campfire', s.center, true);
  const founder = spawnWorker(s, true);
  founder.father = true;
  s.fatherId = founder.id;
  s.fatherName = founder.name;
  log(s, 'info', 'log.founded');
  return s;
}
