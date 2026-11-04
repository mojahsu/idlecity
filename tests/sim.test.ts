import { describe, expect, test } from 'bun:test';
import { newGame } from '../src/sim/state';
import { advance } from '../src/sim/tick';
import { isReachable } from '../src/sim/world';
import { MemorySave } from '../src/platform/storage';
import { loadGame, saveGame } from '../src/platform/save';

describe('simulation', () => {
  test('a new game starts with one settler and a campfire', () => {
    const s = newGame(1);
    expect(s.workers.length).toBe(1);
    expect(s.buildings.map((b) => b.type)).toEqual(['campfire']);
  });

  test('the settler gathers wood and the first hut goes up within 10 minutes', () => {
    const s = newGame(7);
    advance(s, 600);
    expect(s.stats.built).toBeGreaterThanOrEqual(1);
    expect(s.buildings.some((b) => b.type === 'hut' && b.built)).toBe(true);
  });

  test('same seed gives the same world (deterministic)', () => {
    const a = newGame(99), b = newGame(99);
    advance(a, 300); advance(b, 300);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  test('after an hour everyone is on the map, nothing is NaN, and every building is reachable', () => {
    const s = newGame(3);
    advance(s, 3600);
    for (const w of s.workers) {
      expect(Number.isFinite(w.x) && Number.isFinite(w.y)).toBe(true);
      expect(w.x >= 0 && w.x < s.width && w.y >= 0 && w.y < s.height).toBe(true);
    }
    for (const b of s.buildings) {
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isReachable(s, b.x + dx, b.y + dy));
      expect(near).toBe(true);
    }
    expect(s.workers.length).toBeGreaterThan(5);
    expect(s.tier).not.toBe('camp');
  });

  test('growth keeps going: resources never all stall over 2 hours', () => {
    const s = newGame(11);
    advance(s, 3600);
    const built1 = s.stats.built;
    advance(s, 3600);
    expect(s.stats.built).toBeGreaterThan(built1);
  });
});

describe('save / load', () => {
  test('round-trips and applies offline progress', () => {
    const store = new MemorySave();
    const s = newGame(5);
    advance(s, 120);
    saveGame(store, s);
    const later = Date.now() + 10 * 60 * 1000;
    const r = loadGame(store, later);
    expect(r.isNew).toBe(false);
    expect(r.offlineSeconds).toBeGreaterThan(500);
    expect(r.state.time).toBeGreaterThan(s.time + 500);
  });

  test('a missing save starts a new game', () => {
    const r = loadGame(new MemorySave());
    expect(r.isNew).toBe(true);
  });
});
