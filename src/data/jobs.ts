import type { JobId, ResourceId, Terrain } from '../sim/types';

export interface JobDef {
  id: JobId;
  gathers?: ResourceId;
  color: string;
}

export const JOBS: Record<JobId, JobDef> = {
  builder:    { id: 'builder', color: '#e0b040' },
  lumberjack: { id: 'lumberjack', gathers: 'wood', color: '#8a5a2a' },
  quarryman:  { id: 'quarryman', gathers: 'stone', color: '#9a9a9a' },
  forager:    { id: 'forager', gathers: 'food', color: '#5ab05a' },
  farmer:     { id: 'farmer', color: '#c8c040' },
  miner:      { id: 'miner', gathers: 'iron', color: '#5a6a8a' },
};

export const GATHER_JOB: Record<ResourceId, JobId | null> = {
  wood: 'lumberjack',
  stone: 'quarryman',
  food: 'forager',
  iron: 'miner',
  gold: null,
};

/** Which terrain each gathered resource comes from. */
export const GATHER_TERRAIN: Record<ResourceId, Terrain | null> = {
  wood: 'forest', stone: 'rock', food: 'bush', iron: 'ore', gold: null,
};
