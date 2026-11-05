import { describe, expect, test } from 'bun:test';
import en from '../src/i18n/locales/en.json';
import zh from '../src/i18n/locales/zh-TW.json';
import { BUILDINGS } from '../src/data/buildings';
import { MONSTERS, DUNGEONS } from '../src/data/dungeons';
import { CLASSES } from '../src/data/adventurers';
import { JOBS } from '../src/data/jobs';
import { TIERS } from '../src/data/tiers';
import { SKILLS } from '../src/data/skills';

describe('locales', () => {
  test('every English key exists in zh-TW and vice versa', () => {
    const a = Object.keys(en).sort(), b = Object.keys(zh).sort();
    expect(b).toEqual(a);
  });

  test('every data id has a translation', () => {
    const keys = new Set(Object.keys(en));
    for (const id in BUILDINGS) expect(keys.has(`building.${id}`)).toBe(true);
    for (const id in MONSTERS) expect(keys.has(`monster.${id}`)).toBe(true);
    for (const d of DUNGEONS) expect(keys.has(`dungeon.${d.id}`)).toBe(true);
    for (const id in CLASSES) expect(keys.has(`class.${id}`)).toBe(true);
    for (const id in JOBS) expect(keys.has(`job.${id}`)).toBe(true);
    for (const tier of TIERS) expect(keys.has(`tier.${tier.id}`)).toBe(true);
    for (const id in SKILLS) expect(keys.has(`skill.${id}`)).toBe(true);
  });

  test('placeholders match between languages', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const k in en) expect(ph((zh as Record<string, string>)[k])).toEqual(ph((en as Record<string, string>)[k]));
  });
});
