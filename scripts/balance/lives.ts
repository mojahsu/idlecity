// Lives over 24 hours: population, children, marriages, births, deaths of old
// age, elders, the age span and graves, every four hours.
//   bun scripts/balance/lives.ts [seed]
import { newGame } from '../../src/sim/state';
import { advance } from '../../src/sim/tick';

const s = newGame(Number(process.argv[2] ?? 3));
let v = -1;
for (let h = 1; h <= 24; h++) {
  advance(s, 3600);
  if (s.victory && v < 0) v = h;
  const ages = s.workers.map((w) => w.age ?? 0);
  if (h % 4 === 0) console.log(`h${h} pop ${s.workers.length} kids ${s.children?.length} married ${s.workers.filter((w) => w.spouse !== undefined).length} births ${s.stats.births ?? 0} passed ${s.stats.passed ?? 0} elders ${ages.filter((a) => a >= 60).length} age ${Math.min(...ages).toFixed(1)}-${Math.max(...ages).toFixed(1)} graves ${s.buildings.filter((b) => b.type === 'grave').length} deaths ${s.stats.deaths} victory ${v}`);
}
