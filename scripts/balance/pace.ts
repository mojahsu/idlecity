// Victory hour and deaths over 10 game hours on eight seeds. Run before and
// after touching any tuning number (constants, FIGHT_TUNE, class stats):
//   bun scripts/balance/pace.ts
// Expected (Nov 2026): victory between hour 2 and 5 on every seed, 0–9 deaths.
import { newGame } from '../../src/sim/state';
import { advance } from '../../src/sim/tick';

const seeds = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [1, 3, 5, 7, 9, 11, 13, 17];
const rows: string[] = [];
for (const seed of seeds) {
  const s = newGame(seed);
  let v = -1;
  for (let h = 1; h <= 10; h++) {
    advance(s, 1800); if (s.victory && v < 0) v = h - 0.5;
    advance(s, 1800); if (s.victory && v < 0) v = h;
  }
  rows.push(`${seed}:${v < 0 ? 'no' : v + 'h'}/${s.stats.deaths}d`);
}
console.log(rows.join(' '));
