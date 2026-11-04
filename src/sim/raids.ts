// Monsters occasionally raid the town. Walls and resting adventurers defend it.
import type { GameState } from './types';
import { MONSTERS, RAIDERS } from '../data/dungeons';
import { tierIndex } from '../data/tiers';
import { chance, pick, randInt } from './rng';
import { edgeSpawnPoint, findPath, moveAlong } from './world';
import { countBuildings, hasBuilding } from './buildings';
import { log, chronicle } from './log';
import { RAID_SPEED } from './constants';
import { year } from './time';

export function updateRaids(s: GameState, dt: number): void {
  if (!s.raid) {
    if (!hasBuilding(s, 'tavern')) return;
    s.timers.raid -= dt;
    if (s.timers.raid <= 0) {
      s.timers.raid = randInt(s, 200, 360);
      if (chance(s, 0.7)) startRaid(s);
    }
    return;
  }
  const r = s.raid;
  if (r.phase === 'march') {
    if (moveAlong(r, RAID_SPEED, dt) || Math.hypot(r.x - s.center.x, r.y - s.center.y) < 3.5) { r.phase = 'fight'; r.timer = 0; }
    return;
  }
  r.timer += dt;
  const defenders = s.adventurers.filter((a) => a.status === 'resting');
  const defense = countBuildings(s, 'walls') * 5 + s.workers.length * 0.3 + defenders.reduce((n, a) => n + a.atk * (1 + 0.1 * s.equipment), 0);
  r.hp -= defense * dt;
  s.fx.push({ kind: 'hit', x: r.x, y: r.y });
  if (defenders.length) {
    const t = pick(s, defenders);
    t.hp = Math.max(1, t.hp - Math.max(0, r.atk * 0.4 - countBuildings(s, 'walls') * 2) * dt);
  }
  if (r.hp <= 0) {
    const gold = r.count * 3;
    s.resources.gold += gold;
    log(s, 'adventure', 'log.raidRepelled', { monster: `monster.${r.monster}`, count: r.count, gold });
    s.raid = null;
    return;
  }
  if (r.timer > 25) {
    // Raiders win: they steal and damage something.
    for (const k of ['wood', 'stone', 'food', 'gold'] as const) s.resources[k] = Math.floor(s.resources[k] * 0.7);
    const targets = s.buildings.filter((b) => b.built && b.type !== 'campfire' && b.type !== 'grave' && b.type !== 'walls');
    if (targets.length) {
      const b = pick(s, targets);
      b.built = false;
      b.progress = 0.4;
      chronicle(s, 'danger', 'log.raidWon', { monster: `monster.${r.monster}`, building: `building.${b.type}` });
    } else {
      log(s, 'danger', 'log.raidWonNoDamage', { monster: `monster.${r.monster}` });
    }
    s.raid = null;
  }
}

function startRaid(s: GameState): void {
  const pool = RAIDERS.slice(0, 2 + tierIndex(s.tier));
  const m = MONSTERS[pick(s, pool)];
  const count = randInt(s, 3, 4 + tierIndex(s.tier) * 2);
  const scale = 1 + 0.15 * (year(s) - 1);
  const from = edgeSpawnPoint(s);
  s.raid = {
    monster: m.id, count,
    hp: m.hp * count * scale, maxHp: m.hp * count * scale,
    atk: m.atk * count * 0.5 * scale,
    x: from.x, y: from.y,
    path: findPath(s, from, s.center),
    phase: 'march', timer: 0,
  };
  log(s, 'danger', 'log.raidIncoming', { monster: `monster.${m.id}`, count });
}
