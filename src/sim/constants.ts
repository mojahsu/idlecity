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
/**
 * Workers sleep through the night (about a third of each day), so daytime
 * work yields this much more to keep the overall pacing where it was.
 */
export const DAY_WORK_BONUS = 1.5;

export const CARAVAN_INTERVAL: [number, number] = [300, 600];
export const CARAVAN_TRADE_TIME = 24;
export const FIRE_INTERVAL: [number, number] = [480, 900];
export const FIRE_CHANCE = 0.5;
export const FIRE_COLLAPSE = 14;       // seconds at full blaze before the building is lost
export const FIRE_BRIGADE = 5;         // workers who drop everything to fetch water (+1 per 15 people)
export const FIRE_GROWTH = 0.1;        // intensity per second while it burns (varies per fire)
export const FIRE_BUCKET = 0.07;       // intensity removed by one thrown bucket
export const FIRE_MIN_BUILDINGS = 6;   // flammable buildings before fires can start

export const FOOD_PER_PERSON_PER_DAY = 1;
export const TILE_REGEN_PER_SEC = 0.02;

export const MAX_LOG = 80;
export const MAX_OFFLINE_SECONDS = 2 * 3600;
