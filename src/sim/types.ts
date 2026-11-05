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
  | { kind: 'arrive' }
  /** Night: walk home (or to the campfire) and sleep until dawn. `inside` = hidden indoors. */
  | { kind: 'sleep'; buildingId: number; phase: 'go' | 'sleep' }
  /** Bucket brigade: fetch water at the well (or river), carry it to the blaze, throw, repeat. */
  | { kind: 'douse'; buildingId: number; phase: 'fetch' | 'carry' | 'throw' }
  /** Time off: walk to a spot and do something that is not work. `dir` is which way to face there. */
  | { kind: 'rest'; activity: RestActivity; x: number; y: number; dir: number; phase: 'go' | 'do'; buildingId?: number };

export type RestActivity = 'chat' | 'drink' | 'fish' | 'nap' | 'feed' | 'pray' | 'lunch' | 'stroll' | 'watch'
  | 'chess' | 'listen' | 'archery' | 'visit' | 'sunset' | 'picnic' | 'swim' | 'snowman' | 'snowball';

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
  /** Takes breaks far more often than the others. Optional for old saves. */
  lazy?: boolean;
  /** Seconds of wobbly walking left after a drink. */
  tipsy?: number;
  /** Age in years (a year is DAYS_PER_YEAR days). Optional for old saves. */
  age?: number;
  /** Id of the spouse, if married. */
  spouse?: number;
}

/** A child growing up in town; becomes a worker at ADULT_AGE. Not a worker: no job, no food maths. */
export interface Child {
  id: number;
  name: string;
  age: number;
  parentId: number;
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
  /** What a resting adventurer is up to in town. Optional for old saves. */
  pastime?: 'wander' | 'train' | 'drink' | 'sit' | 'sally';
  /** Seconds left of the current pastime. */
  pastimeTimer?: number;
}

export type DungeonId = 'goblinCave' | 'ancientRuins' | 'darkTower';

/** One monster in a fight. */
export interface Enemy {
  monster: string;
  hp: number;
  maxHp: number;
  atk: number;
  /** Actions taken so far (drives the monster's special attack cadence). */
  acts: number;
}

/** A fight on a floor: a pack of monsters, or one boss. `monster`, `hp` and `maxHp` summarise the pack. */
export interface Encounter {
  monster: string;
  hp: number;
  maxHp: number;
  atk: number;
  boss: boolean;
  /** Optional for saves from before packs existed. */
  enemies?: Enemy[];
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
  /** Fight rounds so far this run (drives volley / fireball cadence). Optional for old saves. */
  rounds?: number;
  /** The priest's once-per-run revive has been spent. */
  reviveUsed?: boolean;
  /** Monster is frozen and skips its next attack. */
  frozen?: boolean;
  /** Whose turn is next in the fight: heroes in order, then each enemy. */
  actIdx?: number;
}

export interface Dungeon {
  id: DungeonId;
  x: number;
  y: number;
  unlocked: boolean;
  deepestFloor: number;
  bossDefeated: boolean;
  runs: number;
  /** The boss keeps its wounds between attempts (recovering a little each time). Optional for old saves. */
  bossHp?: number;
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
  /** Seconds until the next exchange of blows. Optional for old saves. */
  roundTimer?: number;
}

/** A merchant caravan visiting the market. */
export interface Caravan {
  x: number;
  y: number;
  path: Point[];
  phase: 'arrive' | 'trade' | 'leave';
  timer: number;
  /** Gold still to be paid out while trading. */
  gold: number;
}

/** A building on fire. Workers form a bucket brigade; rain helps. */
export interface Fire {
  buildingId: number;
  /** 0..1 how fierce the blaze is. */
  intensity: number;
  /** Seconds since it started. */
  age: number;
  /** Seconds spent at full intensity; the building is lost past FIRE_COLLAPSE. */
  fullFor: number;
  /** How fast this one spreads (intensity per second); dry timber burns faster. */
  growth: number;
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
  | { kind: 'hit'; x: number; y: number }
  /** A bucket of water thrown at a burning building. */
  | { kind: 'water'; x: number; y: number }
  /** A class skill fired inside a dungeon; the renderer animates it. */
  | { kind: 'skill'; partyId: number; actorId: number; skill: string; targetId?: number; amount?: number }
  /** A hidden chest found underground. */
  | { kind: 'treasure'; partyId: number; gold: number }
  /** A hero acts: a blow, a shot, a spell or a heal on `targetIdx` (enemy index) or `targetId` (hero). */
  | { kind: 'strike'; partyId: number; actorId: number; style: StrikeStyle; targetIdx?: number; targetId?: number; amount: number; splash?: number[] }
  /** An enemy acts on a hero (or on everyone, for a breath). */
  | { kind: 'enemyStrike'; partyId: number; enemyIdx: number; style: EnemyStyle; targetId: number; amount: number; all?: boolean }
  /** An enemy falls. */
  | { kind: 'slain'; partyId: number; enemyIdx: number; monster: string; boss: boolean };

export type StrikeStyle = 'melee' | 'arrow' | 'volley' | 'crit' | 'bolt' | 'fireball' | 'smite' | 'heal' | 'holyLight';
export type EnemyStyle = 'bite' | 'slash' | 'claw' | 'smash' | 'bolt' | 'breath' | 'curse';

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
  /** Optional for saves from before these events existed. */
  caravan?: Caravan | null;
  fire?: Fire | null;
  children?: Child[];
  nextId: number;
  log: LogEntry[];
  chronicle: LogEntry[];
  tier: TierId;
  /** Equipment quality forged by the blacksmith, boosts adventurers. */
  equipment: number;
  ironForged: number;
  victory: boolean;
  mayor: { want: BuildingTypeId | null; jobTimer: number; buildTimer: number };
  timers: { immigrant: number; adventurer: number; raid: number; chapel: number; caravan?: number; fire?: number; wedding?: number; birth?: number; eventDay?: number; contestDay?: number };
  stats: { built: number; monstersSlain: number; dungeonRuns: number; deaths: number; immigrants: number; births?: number; passed?: number };
  /** Transient, cleared each tick. Not saved. */
  fx: Fx[];
}
