import type { DungeonId, TierId } from '../sim/types';

export interface MonsterDef {
  id: string;
  hp: number;
  atk: number;
  xp: number;
  gold: number;
  iron?: number;
}

export const MONSTERS: Record<string, MonsterDef> = {
  rat:        { id: 'rat', hp: 12, atk: 2, xp: 4, gold: 1 },
  goblin:     { id: 'goblin', hp: 20, atk: 4, xp: 8, gold: 3 },
  goblinChief:{ id: 'goblinChief', hp: 80, atk: 8, xp: 40, gold: 25, iron: 3 },
  skeleton:   { id: 'skeleton', hp: 35, atk: 6, xp: 14, gold: 5, iron: 1 },
  ghoul:      { id: 'ghoul', hp: 50, atk: 8, xp: 20, gold: 7, iron: 1 },
  lich:       { id: 'lich', hp: 200, atk: 14, xp: 120, gold: 80, iron: 8 },
  spider:     { id: 'spider', hp: 62, atk: 9, xp: 24, gold: 9, iron: 1 },
  troll:      { id: 'troll', hp: 90, atk: 11, xp: 32, gold: 13, iron: 2 },
  wraith:     { id: 'wraith', hp: 74, atk: 12, xp: 28, gold: 11, iron: 2 },
  broodMother:{ id: 'broodMother', hp: 340, atk: 16, xp: 180, gold: 130, iron: 12 },
  hellhound:  { id: 'hellhound', hp: 105, atk: 14, xp: 40, gold: 15, iron: 2 },
  golem:      { id: 'golem', hp: 145, atk: 16, xp: 48, gold: 19, iron: 4 },
  wyvern:     { id: 'wyvern', hp: 130, atk: 17, xp: 45, gold: 18, iron: 3 },
  elderDragon:{ id: 'elderDragon', hp: 620, atk: 20, xp: 280, gold: 240, iron: 20 },
  imp:        { id: 'imp', hp: 60, atk: 12, xp: 26, gold: 9, iron: 2 },
  demon:      { id: 'demon', hp: 140, atk: 18, xp: 50, gold: 18, iron: 3 },
  dragon:     { id: 'dragon', hp: 350, atk: 22, xp: 160, gold: 120, iron: 10 },
  demonLord:  { id: 'demonLord', hp: 1800, atk: 24, xp: 800, gold: 1500, iron: 60 },
  wolf:       { id: 'wolf', hp: 25, atk: 5, xp: 10, gold: 0 },
  bandit:     { id: 'bandit', hp: 30, atk: 5, xp: 12, gold: 6 },
  orc:        { id: 'orc', hp: 55, atk: 9, xp: 25, gold: 10, iron: 1 },
};

export interface DungeonDef {
  id: DungeonId;
  floors: number;
  /** Recommended average party level. */
  level: number;
  tier: TierId;
  monsters: string[];
  boss: string;
  /** Map placement, relative corner of the map. */
  corner: 'ne' | 'se' | 'nw' | 'sw' | 'n';
  color: string;
}

export const DUNGEONS: DungeonDef[] = [
  { id: 'goblinCave', floors: 5, level: 1, tier: 'town', monsters: ['rat', 'goblin', 'wolf'], boss: 'goblinChief', corner: 'ne', color: '#4a3a2a' },
  { id: 'ancientRuins', floors: 8, level: 5, tier: 'town', monsters: ['skeleton', 'ghoul', 'bandit'], boss: 'lich', corner: 'sw', color: '#5a5a6a' },
  { id: 'emeraldCavern', floors: 7, level: 10, tier: 'town', monsters: ['spider', 'troll', 'wraith'], boss: 'broodMother', corner: 'nw', color: '#1e4a38' },
  { id: 'emberPeak', floors: 9, level: 15, tier: 'city', monsters: ['hellhound', 'golem', 'wyvern'], boss: 'elderDragon', corner: 'n', color: '#5a2218' },
  { id: 'darkTower', floors: 12, level: 20, tier: 'city', monsters: ['imp', 'demon', 'orc', 'dragon'], boss: 'demonLord', corner: 'se', color: '#2a1a3a' },
];

/** The dungeon whose boss ends the game. */
export const FINAL_DUNGEON: DungeonId = 'darkTower';

/** Monsters that raid the town. */
export const RAIDERS = ['wolf', 'goblin', 'bandit', 'orc'];
