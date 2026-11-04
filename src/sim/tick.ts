// One place that advances the whole simulation by one tick.
import type { GameState } from './types';
import { TICK } from './constants';
import { updatePopulation } from './population';
import { updateMayor } from './mayor';
import { regenerateTiles, updateWorkers } from './workers';
import { updateAdventurers } from './adventurers';
import { updateParties } from './parties';
import { updateRaids } from './raids';
import { hasBuilding } from './buildings';
import { log } from './log';

export function step(s: GameState, dt = TICK): void {
  s.fx = [];
  s.tick++;
  s.time += dt;
  updatePopulation(s, dt);
  updateMayor(s, dt);
  updateWorkers(s, dt);
  updateAdventurers(s, dt);
  updateParties(s, dt);
  updateRaids(s, dt);
  if (s.tick % 10 === 0) { regenerateTiles(s); forge(s); }
}

/** Advance by whole game seconds (used for offline catch-up and tests). */
export function advance(s: GameState, seconds: number): void {
  const ticks = Math.floor(seconds / TICK);
  for (let i = 0; i < ticks; i++) step(s);
}

/** The blacksmith turns iron into better equipment for the adventurers. */
function forge(s: GameState): void {
  if (!hasBuilding(s, 'blacksmith') || s.equipment >= 10) return;
  const cost = 30 + s.equipment * 25;
  if (s.resources.iron >= cost) {
    s.resources.iron -= cost;
    s.equipment++;
    s.ironForged += cost;
    log(s, 'build', 'log.forged', { level: s.equipment });
  }
}
