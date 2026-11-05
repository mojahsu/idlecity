// Tunable numbers in one place.
export const TICK = 0.1;              // seconds of game time per tick
export const DAY_LENGTH = 60;         // game seconds per day (= real seconds at 1x)
export const DAYS_PER_SEASON = 10;

// Lives run faster than the calendar: a year of a person's life is one season
// (10 days, 10 minutes at 1x), so a newcomer of 20 grows old over an evening.
export const LIFE_YEAR_DAYS = 10;
export const ARRIVAL_AGE: [number, number] = [16, 26];
export const ADULT_AGE = 14;           // children join the workforce (about 2.3 hours after birth)
export const ELDER_AGE = 60;           // grey hair and a slower step
export const LIFESPAN: [number, number] = [58, 76];
export const WEDDING_INTERVAL: [number, number] = [240, 480];
export const BIRTH_INTERVAL: [number, number] = [300, 600];
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;

export const WORKER_SPEED = 2.2;      // tiles per second
export const PARTY_SPEED = 2.8;
export const RAID_SPEED = 1.6;

export const GATHER_TIME = 4;         // seconds per gathering action
export const GATHER_AMOUNT = 5;
export const FARM_TIME = 8;
export const FARM_AMOUNT = 8;
/**
 * Workers sleep through the night, stop for lunch and take breaks, so the
 * work they do do yields this much more to keep the overall pacing where it was.
 */
export const DAY_WORK_BONUS = 3.4;

export const REST_CHANCE = 0.25;        // chance to take a break after a delivery
export const LAZY_REST_CHANCE = 0.45;
export const LAZY_SHARE = 0.12;         // share of newcomers who are born idle
export const REST_TIME: [number, number] = [15, 30];
export const FISH_CATCH_CHANCE = 0.35;

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
