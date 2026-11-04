// Tunable numbers in one place.
export const TICK = 0.1;              // seconds of game time per tick
export const DAY_LENGTH = 60;         // game seconds per day (= real seconds at 1x)
export const DAYS_PER_SEASON = 10;
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;

export const WORKER_SPEED = 2.2;      // tiles per second
export const PARTY_SPEED = 2.8;
export const RAID_SPEED = 1.6;

export const GATHER_TIME = 4;         // seconds per gathering action
export const GATHER_AMOUNT = 5;
export const FARM_TIME = 8;
export const FARM_AMOUNT = 8;
export const BUILD_RATE = 0.08;       // progress per second per builder, divided by build time

export const FOOD_PER_PERSON_PER_DAY = 1;
export const TILE_REGEN_PER_SEC = 0.02;

export const MAX_LOG = 80;
export const MAX_OFFLINE_SECONDS = 2 * 3600;
