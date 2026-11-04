import type { Building, BuildingTypeId, GameState, Point, Resources } from './types';
import { BUILDINGS } from '../data/buildings';
import { tileAt, paveRoad } from './world';
import { chronicle, log } from './log';

export function countBuildings(s: GameState, type: BuildingTypeId, builtOnly = true): number {
  let n = 0;
  for (const b of s.buildings) if (b.type === type && (!builtOnly || b.built)) n++;
  return n;
}

export function hasBuilding(s: GameState, type: BuildingTypeId): boolean {
  return countBuildings(s, type) > 0;
}

export function housingCapacity(s: GameState): number {
  let cap = 0;
  for (const b of s.buildings) if (b.built) cap += BUILDINGS[b.type].housing ?? 0;
  return cap;
}

export function constructionSite(s: GameState): Building | null {
  for (const b of s.buildings) if (!b.built) return b;
  return null;
}

export function canAfford(s: GameState, cost: Partial<Resources>): boolean {
  for (const k in cost) if (s.resources[k as keyof Resources] < (cost[k as keyof Resources] ?? 0)) return false;
  return true;
}

export function pay(s: GameState, cost: Partial<Resources>): void {
  for (const k in cost) s.resources[k as keyof Resources] -= cost[k as keyof Resources] ?? 0;
}

export function placeBuilding(s: GameState, type: BuildingTypeId, at: Point, built = false): Building {
  const b: Building = { id: s.nextId++, type, x: at.x, y: at.y, progress: built ? 1 : 0, built };
  s.buildings.push(b);
  const t = tileAt(s, at.x, at.y);
  if (t) t.building = s.buildings.length - 1;
  return b;
}

export function completeBuilding(s: GameState, b: Building): void {
  b.built = true;
  b.progress = 1;
  s.stats.built++;
  if (b.type !== 'grave') paveRoad(s, { x: b.x, y: b.y }, s.center);
  const important: BuildingTypeId[] = ['tavern', 'guildHall', 'keep', 'chapel', 'blacksmith', 'market'];
  if (important.includes(b.type)) chronicle(s, 'build', 'log.built', { building: `building.${b.type}` });
  else log(s, 'build', 'log.built', { building: `building.${b.type}` });
}

/** Gathering bonus from workplaces, e.g. two lumber camps = +100% wood per trip. */
export function gatherBonus(s: GameState, resource: keyof Resources): number {
  switch (resource) {
    case 'wood': return 1 + 0.5 * countBuildings(s, 'lumberCamp');
    case 'stone': return 1 + 0.5 * countBuildings(s, 'quarry');
    case 'food': return 1 + 0.25 * countBuildings(s, 'granary') + 0.25 * countBuildings(s, 'well');
    case 'iron': return 1;
    default: return 1;
  }
}
