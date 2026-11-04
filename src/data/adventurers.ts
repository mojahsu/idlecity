import type { AdventurerClass } from '../sim/types';

export interface ClassDef {
  id: AdventurerClass;
  hp: number;
  atk: number;
  def: number;
  /** Per level gains. */
  hpUp: number;
  atkUp: number;
  color: string;
  /** Extra healing to the party per fight tick (priest). */
  heal?: number;
}

export const CLASSES: Record<AdventurerClass, ClassDef> = {
  warrior: { id: 'warrior', hp: 40, atk: 6, def: 3, hpUp: 8, atkUp: 1.5, color: '#d04a3a' },
  archer:  { id: 'archer',  hp: 28, atk: 7, def: 1, hpUp: 5, atkUp: 1.8, color: '#4a9a3a' },
  mage:    { id: 'mage',    hp: 22, atk: 9, def: 0, hpUp: 4, atkUp: 2.2, color: '#4a5ad0' },
  priest:  { id: 'priest',  hp: 26, atk: 3, def: 1, hpUp: 5, atkUp: 0.8, color: '#e0d060', heal: 2 },
};

export function xpForLevel(level: number): number {
  return Math.floor(20 * Math.pow(1.3, level - 1));
}
