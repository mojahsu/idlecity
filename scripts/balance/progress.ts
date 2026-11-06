// Hour-by-hour progression of one seed: population, equipment, key buildings,
// adventurer count and level, deaths, runs, iron and gold.
//   bun scripts/balance/progress.ts [seed] [hours]
import { newGame } from '../../src/sim/state';
import { advance } from '../../src/sim/tick';

const s = newGame(Number(process.argv[2] ?? 3));
const hours = Number(process.argv[3] ?? 7);
for (let h = 1; h <= hours; h++) {
  advance(s, 3600);
  const alive = s.adventurers.filter((a) => a.status !== 'dead');
  const avg = alive.length ? (alive.reduce((n, a) => n + a.level, 0) / alive.length).toFixed(1) : '-';
  const has = (t: string) => s.buildings.some((b) => b.type === t && b.built) ? 'Y' : '.';
  console.log(`h${h}: pop ${s.workers.length} eq ${s.equipment} tavern ${has('tavern')} guild ${has('guildHall')} keep ${has('keep')} adv ${alive.length}/L${avg} deaths ${s.stats.deaths} runs ${s.stats.dungeonRuns} iron ${Math.floor(s.resources.iron)} gold ${Math.floor(s.resources.gold)}`);
}
