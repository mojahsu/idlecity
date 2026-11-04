import type { BuildingTypeId, Resources, TierId } from '../sim/types';

export interface BuildingDef {
  id: BuildingTypeId;
  cost: Partial<Resources>;
  /** Seconds of work for one builder. */
  buildTime: number;
  housing?: number;
  /** Minimum tier before the mayor considers it. */
  tier: TierId;
  /** Max copies the mayor will build (scales with population via `perPop`). */
  max: number;
  perPop?: number;
  /** Colour used by the simple renderer. */
  color: string;
  roof: string;
  /** Emits light at night. */
  light?: boolean;
}

export const BUILDINGS: Record<BuildingTypeId, BuildingDef> = {
  campfire:   { id: 'campfire',   cost: {}, buildTime: 0, tier: 'camp', max: 1, color: '#6b4a2b', roof: '#e8842a', light: true },
  hut:        { id: 'hut',        cost: { wood: 20 }, buildTime: 30, housing: 2, tier: 'camp', max: 6, color: '#8a6a44', roof: '#b89b5a', light: true },
  lumberCamp: { id: 'lumberCamp', cost: { wood: 30 }, buildTime: 25, tier: 'camp', max: 2, color: '#7a5a34', roof: '#5a3d22' },
  quarry:     { id: 'quarry',     cost: { wood: 30, stone: 10 }, buildTime: 25, tier: 'hamlet', max: 2, color: '#8d8d8d', roof: '#6f6f6f' },
  farm:       { id: 'farm',       cost: { wood: 25, stone: 5 }, buildTime: 20, tier: 'hamlet', max: 3, perPop: 6, color: '#b8a040', roof: '#8a7a2a' },
  well:       { id: 'well',       cost: { stone: 30 }, buildTime: 20, tier: 'hamlet', max: 1, color: '#7f8ba0', roof: '#4f5b70' },
  house:      { id: 'house',      cost: { wood: 60, stone: 30 }, buildTime: 60, housing: 4, tier: 'village', max: 20, color: '#a0785a', roof: '#8c3b2e', light: true },
  granary:    { id: 'granary',    cost: { wood: 60, stone: 20 }, buildTime: 35, tier: 'village', max: 1, color: '#c4a054', roof: '#7a5a2a' },
  tavern:     { id: 'tavern',     cost: { wood: 100, stone: 50 }, buildTime: 90, tier: 'village', max: 1, color: '#9a5a3a', roof: '#4a2a1a', light: true },
  blacksmith: { id: 'blacksmith', cost: { wood: 80, stone: 80 }, buildTime: 90, tier: 'village', max: 1, color: '#555', roof: '#333', light: true },
  market:     { id: 'market',     cost: { wood: 90, stone: 40 }, buildTime: 80, tier: 'village', max: 1, color: '#c08040', roof: '#d04040', light: true },
  mine:       { id: 'mine',       cost: { wood: 100, stone: 80 }, buildTime: 100, tier: 'town', max: 1, color: '#4a4a4a', roof: '#2a2a2a' },
  chapel:     { id: 'chapel',     cost: { wood: 80, stone: 160 }, buildTime: 120, tier: 'town', max: 1, color: '#d8d0c0', roof: '#6a5a8a', light: true },
  guildHall:  { id: 'guildHall',  cost: { wood: 160, stone: 140, gold: 150 }, buildTime: 150, tier: 'town', max: 1, color: '#7a4a7a', roof: '#3a2a4a', light: true },
  walls:      { id: 'walls',      cost: { stone: 240 }, buildTime: 120, tier: 'town', max: 4, color: '#9a9a9a', roof: '#7a7a7a' },
  keep:       { id: 'keep',       cost: { wood: 300, stone: 600, iron: 250, gold: 3000 }, buildTime: 300, tier: 'city', max: 1, color: '#8a8a9a', roof: '#4a4a6a', light: true },
  grave:      { id: 'grave',      cost: {}, buildTime: 0, tier: 'camp', max: 0, color: '#777', roof: '#777' },
};

/**
 * The mayor walks this list in order and builds the first entry that is
 * unlocked, under its max, and not yet satisfied. Housing and food needs are
 * checked before this list (see mayor.ts).
 */
export const BUILD_ORDER: BuildingTypeId[] = [
  'hut', 'lumberCamp', 'farm', 'quarry', 'well', 'granary', 'tavern', 'market',
  'blacksmith', 'mine', 'chapel', 'guildHall', 'walls', 'keep',
];
