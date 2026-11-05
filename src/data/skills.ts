import type { AdventurerClass } from '../sim/types';

export type SkillId = 'taunt' | 'volley' | 'fireball' | 'holyLight' | 'ironWall' | 'eagleEye' | 'frost' | 'revive';

export interface SkillDef {
  id: SkillId;
  cls: AdventurerClass;
  /** Level at which the skill is available. */
  level: number;
}

/** Every class has a basic skill from level 1 and an advanced one from level 10. */
export const SKILLS: Record<SkillId, SkillDef> = {
  taunt:     { id: 'taunt', cls: 'warrior', level: 1 },
  ironWall:  { id: 'ironWall', cls: 'warrior', level: 10 },
  volley:    { id: 'volley', cls: 'archer', level: 1 },
  eagleEye:  { id: 'eagleEye', cls: 'archer', level: 10 },
  fireball:  { id: 'fireball', cls: 'mage', level: 1 },
  frost:     { id: 'frost', cls: 'mage', level: 10 },
  holyLight: { id: 'holyLight', cls: 'priest', level: 1 },
  revive:    { id: 'revive', cls: 'priest', level: 10 },
};

export const SKILL_LIST: SkillDef[] = Object.values(SKILLS);

/** Skills an adventurer of this class and level has. */
export function skillsFor(cls: AdventurerClass, level: number): SkillDef[] {
  return SKILL_LIST.filter((sk) => sk.cls === cls && level >= sk.level);
}

export function hasSkill(cls: AdventurerClass, level: number, id: SkillId): boolean {
  const sk = SKILLS[id];
  return sk.cls === cls && level >= sk.level;
}

// Tuning knobs, all in one place.
export const SKILL_TUNING = {
  /** Chance the monster attacks the warrior instead of a random member. */
  tauntChance: 0.6,
  /** Iron Wall: chance to block, damage multiplier when blocking. */
  blockChance: 0.25,
  blockMultiplier: 0.5,
  /** Volley fires every Nth round for double damage. */
  volleyEvery: 3,
  volleyMultiplier: 2,
  critChance: 0.15,
  eagleEyeCritChance: 0.3,
  critMultiplier: 1.5,
  /** Fireball every Nth round. */
  fireballEvery: 3,
  fireballMultiplier: 2.5,
  frostChance: 0.3,
  /** Holy Light triggers below this HP fraction, with this multiple of the group heal. */
  holyLightBelow: 0.3,
  holyLightMultiplier: 4,
};
