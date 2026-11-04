// The mayor decides what to build and which jobs people do. Zero player input needed.
import type { BuildingTypeId, GameState, JobId, ResourceId } from './types';
import { BUILDINGS, BUILD_ORDER } from '../data/buildings';
import { tierIndex } from '../data/tiers';
import { GATHER_JOB } from '../data/jobs';
import { canAfford, constructionSite, countBuildings, hasBuilding, housingCapacity, pay, placeBuilding } from './buildings';
import { findBuildSpot } from './world';
import { log } from './log';

export function updateMayor(s: GameState, dt: number): void {
  s.mayor.buildTimer -= dt;
  if (s.mayor.buildTimer <= 0) { s.mayor.buildTimer = 3; decideBuild(s); }
  s.mayor.jobTimer -= dt;
  if (s.mayor.jobTimer <= 0) { s.mayor.jobTimer = 4; assignJobs(s); }
}

function unlocked(s: GameState, type: BuildingTypeId): boolean {
  return tierIndex(BUILDINGS[type].tier) <= tierIndex(s.tier);
}

function allowedCount(s: GameState, type: BuildingTypeId): number {
  const def = BUILDINGS[type];
  if (def.perPop) return Math.min(def.max, Math.max(1, Math.floor(s.workers.length / def.perPop)));
  return def.max;
}

function wantsMore(s: GameState, type: BuildingTypeId): boolean {
  return unlocked(s, type) && countBuildings(s, type, false) < allowedCount(s, type);
}

export function chooseWanted(s: GameState): BuildingTypeId | null {
  const pop = s.workers.length;
  const cap = housingCapacity(s);
  // 1. Shelter first: keep one free bed so immigrants keep coming.
  if (pop >= cap) {
    if (wantsMore(s, 'house')) return 'house';
    if (wantsMore(s, 'hut')) return 'hut';
  }
  // 2. Food security.
  if (s.resources.food < pop * 3 && wantsMore(s, 'farm')) return 'farm';
  // 3. Otherwise follow the growth plan.
  for (const type of BUILD_ORDER) if (wantsMore(s, type)) return type;
  return null;
}

function decideBuild(s: GameState): void {
  if (constructionSite(s)) return; // one site at a time keeps the scene readable
  const want = chooseWanted(s);
  s.mayor.want = want;
  if (!want) return;
  const def = BUILDINGS[want];
  if (!canAfford(s, def.cost)) return;
  const spot = findBuildSpot(s, s.center, want === 'walls' ? 5 : 1);
  if (!spot) return;
  pay(s, def.cost);
  placeBuilding(s, want, spot);
  log(s, 'build', 'log.startBuild', { building: `building.${want}` });
}

/** Resource targets: what we would like in stock, including the next building's cost. */
function targets(s: GameState): Record<ResourceId, number> {
  const pop = s.workers.length;
  const t: Record<ResourceId, number> = { wood: 40, stone: 20, food: pop * 4 + 8, iron: hasBuilding(s, 'mine') ? 40 : 0, gold: 0 };
  if (s.mayor.want) {
    const cost = BUILDINGS[s.mayor.want].cost;
    for (const k in cost) t[k as ResourceId] += (cost[k as ResourceId] ?? 0) * 1.1;
  }
  return t;
}

function assignJobs(s: GameState): void {
  const workers = s.workers.filter((w) => w.task?.kind !== 'arrive');
  const n = workers.length;
  if (!n) return;
  const desired: Partial<Record<JobId, number>> = {};

  const site = constructionSite(s);
  desired.builder = site ? Math.min(3, Math.max(1, Math.floor(n / 3))) : 0;
  desired.farmer = Math.min(countBuildings(s, 'farm'), Math.max(0, n - desired.builder));

  let remaining = n - desired.builder - desired.farmer;
  const t = targets(s);
  const score: Partial<Record<ResourceId, number>> = {};
  let total = 0;
  for (const r of ['wood', 'stone', 'food', 'iron'] as ResourceId[]) {
    if (r === 'iron' && !hasBuilding(s, 'mine')) continue;
    const deficit = Math.max(0, t[r] - s.resources[r]);
    score[r] = deficit + 2; // small floor so every resource keeps trickling in
    total += score[r]!;
  }
  // Always keep food coming when we have no farms yet.
  const foodFloor = countBuildings(s, 'farm') === 0 && n >= 2 && remaining >= 1 ? 1 : 0;
  desired.forager = foodFloor;
  remaining -= foodFloor;
  const shares: [JobId, number][] = [];
  for (const r in score) {
    const job = GATHER_JOB[r as ResourceId]!;
    shares.push([job, (score[r as ResourceId]! / total) * remaining]);
  }
  // Largest-remainder rounding so counts sum to `remaining`.
  let assigned = 0;
  for (const sh of shares) { const f = Math.floor(sh[1]); desired[sh[0]] = (desired[sh[0]] ?? 0) + f; assigned += f; sh[1] -= f; }
  shares.sort((a, b) => b[1] - a[1]);
  for (let i = 0; i < shares.length && assigned < remaining; i++, assigned++) desired[shares[i][0]] = (desired[shares[i][0]] ?? 0) + 1;

  // Keep workers whose job is still wanted, reassign the rest. Current trips finish first.
  const left: Partial<Record<JobId, number>> = { ...desired };
  const toReassign = [];
  for (const w of workers) {
    if ((left[w.job] ?? 0) > 0) left[w.job]!--;
    else toReassign.push(w);
  }
  for (const w of toReassign) {
    const job = (Object.keys(left) as JobId[]).find((j) => (left[j] ?? 0) > 0);
    if (!job) break;
    left[job]!--;
    w.job = job;
    // Builders switch immediately so sites don't stall.
    if (job === 'builder' && w.task?.kind === 'gather' && w.task.phase === 'go') w.task = null;
  }
}
