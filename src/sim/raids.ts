// Monsters occasionally raid the town. Walls and resting adventurers defend it.
import type { GameState } from './types';
import { MONSTERS, RAIDERS } from '../data/dungeons';
import { tierIndex } from '../data/tiers';
import { chance, pick, randInt, random } from './rng';
import { edgeSpawnPoint, findPath, moveAlong } from './world';
import { countBuildings, hasBuilding } from './buildings';
import { log, chronicle } from './log';
import { RAID_ROUND, RAID_SPEED, RAID_TIME_LIMIT } from './constants';
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
  // Blows are exchanged in rounds. Only adventurers who have reached the raiders fight;
  // the walls and the townsfolk with pitchforks count for a little on their own.
  r.roundTimer = (r.roundTimer ?? RAID_ROUND) - dt;
  if (r.roundTimer <= 0) {
    r.roundTimer += RAID_ROUND;
    const defenders = s.adventurers.filter((a) => a.status === 'resting' && a.pastime === 'sally' && Math.hypot(a.x - r.x, a.y - r.y) < 2.2);
    const walls = countBuildings(s, 'walls');
    let dmg = walls * 6 + s.workers.length * 0.3;
    for (const a of defenders) { dmg += a.atk * (1 + 0.1 * s.equipment) * (0.7 + random(s) * 0.6); s.fx.push({ kind: 'hit', x: a.x, y: a.y }); }
    r.hp -= dmg;
    s.fx.push({ kind: 'hit', x: r.x, y: r.y });
    if (defenders.length) {
      const t = pick(s, defenders);
      t.hp = Math.max(1, t.hp - Math.max(0, r.atk * 0.5 * (0.6 + random(s) * 0.8) - walls * 2 - t.def));
    }
  }
  if (r.hp <= 0) {
    const gold = r.count * 3;
    s.resources.gold += gold;
    log(s, 'adventure', 'log.raidRepelled', { monster: `monster.${r.monster}`, count: r.count, gold });
    s.raid = null;
    return;
  }
  if (r.timer > RAID_TIME_LIMIT) {
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
  // Raiders grow with the years and with the heroes who will meet them, so a
  // fight stays a fight (twenty to forty seconds) instead of a formality.
  const heroes = s.adventurers.filter((a) => a.status !== 'dead');
  const avgLevel = heroes.length ? heroes.reduce((n, a) => n + a.level, 0) / heroes.length : 1;
  const scale = (1 + 0.15 * (year(s) - 1)) * (1 + avgLevel / 9);
  const from = edgeSpawnPoint(s);
  s.raid = {
    monster: m.id, count,
    hp: m.hp * count * scale * 1.5, maxHp: m.hp * count * scale * 1.5,
    atk: m.atk * count * 0.5 * (1 + 0.15 * (year(s) - 1)) * (1 + avgLevel / 12),
    x: from.x, y: from.y,
    path: findPath(s, from, s.center),
    phase: 'march', timer: 0,
  };
  log(s, 'danger', 'log.raidIncoming', { monster: `monster.${m.id}`, count });
}
