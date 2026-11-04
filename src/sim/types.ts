// Pure data types for the simulation. No DOM, no canvas.
// Everything in GameState must be JSON-serialisable (it is the save file).

export type ResourceId = 'wood' | 'stone' | 'food' | 'iron' | 'gold';
export const RESOURCE_IDS: ResourceId[] = ['wood', 'stone', 'food', 'iron', 'gold'];
export type Resources = Record<ResourceId, number>;

export type Terrain = 'grass' | 'forest' | 'rock' | 'bush' | 'ore' | 'water' | 'road';

export interface Tile {
  terrain: Terrain;
  /** Remaining resource on gatherable tiles (forest/rock/bush/ore). */
  amount: number;
  /** Index into state.buildings, or -1. */
  building: number;
  /** Visual variation seed, 0..1. */
  v: number;
}

export type BuildingTypeId =
  | 'campfire' | 'hut' | 'house' | 'lumberCamp' | 'quarry' | 'farm' | 'well'
  | 'granary' | 'tavern' | 'blacksmith' | 'market' | 'mine' | 'chapel'
  | 'guildHall' | 'walls' | 'keep' | 'grave';

export interface Building {
  id: number;
  type: BuildingTypeId;
  x: number;
  y: number;
  /** 0..1 construction progress. */
  progress: number;
  built: boolean;
}

export type JobId = 'builder' | 'lumberjack' | 'quarryman' | 'forager' | 'farmer' | 'miner';

export type Point = { x: number; y: number };

export type WorkerTask =
  | { kind: 'gather'; resource: ResourceId; tx: number; ty: number; phase: 'go' | 'work' | 'return' }
  | { kind: 'build'; buildingId: number; phase: 'go' | 'work' }
  | { kind: 'farm'; buildingId: number; phase: 'go' | 'work' | 'return' }
  | { kind: 'arrive' };

export interface Worker {
  id: number;
  name: string;
  x: number;
  y: number;
  job: JobId;
  task: WorkerTask | null;
  path: Point[];
  carrying: ResourceId | null;
  carryAmount: number;
  timer: number;
}

export type AdventurerClass = 'warrior' | 'archer' | 'mage' | 'priest';
export type AdventurerStatus = 'arriving' | 'resting' | 'questing' | 'dead';

export interface Adventurer {
  id: number;
  name: string;
  cls: AdventurerClass;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  status: AdventurerStatus;
  x: number;
  y: number;
  path: Point[];
  partyId: number;
  kills: number;
  bossKills: number;
}

export type DungeonId = 'goblinCave' | 'ancientRuins' | 'darkTower';

export interface Encounter {
  monster: string;
  hp: number;
  maxHp: number;
  atk: number;
  boss: boolean;
}

export interface Party {
  id: number;
  memberIds: number[];
  dungeon: DungeonId;
  floor: number;
  phase: 'travel' | 'explore' | 'fight' | 'return';
  encounter: Encounter | null;
  loot: Resources;
  timer: number;
  x: number;
  y: number;
  path: Point[];
}

export interface Dungeon {
  id: DungeonId;
  x: number;
  y: number;
  unlocked: boolean;
  deepestFloor: number;
  bossDefeated: boolean;
  runs: number;
}

export interface Raid {
  monster: string;
  count: number;
  hp: number;
  maxHp: number;
  atk: number;
  x: number;
  y: number;
  path: Point[];
  phase: 'march' | 'fight';
  timer: number;
}

export type LogKind = 'info' | 'build' | 'people' | 'adventure' | 'danger' | 'victory';

export interface LogEntry {
  day: number;
  kind: LogKind;
  /** i18n key, resolved at render time so language can change later. */
  key: string;
  params?: Record<string, string | number>;
}

export type TierId = 'camp' | 'hamlet' | 'village' | 'town' | 'city';

/** Transient visual effects produced by one tick. Not saved. */
export type Fx =
  | { kind: 'float'; x: number; y: number; text: string; color?: string }
  | { kind: 'hit'; x: number; y: number };

export interface GameState {
  version: number;
  seed: number;
  tick: number;
  /** Game time in seconds. */
  time: number;
  width: number;
  height: number;
  tiles: Tile[];
  center: Point;
  resources: Resources;
  buildings: Building[];
  workers: Worker[];
  adventurers: Adventurer[];
  parties: Party[];
  dungeons: Dungeon[];
  raid: Raid | null;
  nextId: number;
  log: LogEntry[];
  chronicle: LogEntry[];
  tier: TierId;
  /** Equipment quality forged by the blacksmith, boosts adventurers. */
  equipment: number;
  ironForged: number;
  victory: boolean;
  mayor: { want: BuildingTypeId | null; jobTimer: number; buildTimer: number };
  timers: { immigrant: number; adventurer: number; raid: number; chapel: number };
  stats: { built: number; monstersSlain: number; dungeonRuns: number; deaths: number; immigrants: number };
  /** Transient, cleared each tick. Not saved. */
  fx: Fx[];
}
