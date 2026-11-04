import type { TierId } from '../sim/types';

export const TIERS: { id: TierId; pop: number }[] = [
  { id: 'camp', pop: 0 },
  { id: 'hamlet', pop: 4 },
  { id: 'village', pop: 12 },
  { id: 'town', pop: 24 },
  { id: 'city', pop: 48 },
];

export function tierIndex(t: TierId): number {
  return TIERS.findIndex((x) => x.id === t);
}

export function tierForPop(pop: number): TierId {
  let t: TierId = 'camp';
  for (const tier of TIERS) if (pop >= tier.pop) t = tier.id;
  return t;
}
