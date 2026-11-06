// Fight pacing: how many dungeon fights happen in 6 hours and how long they
// last (expected ~37 s on average, bosses several minutes).
//   bun scripts/balance/fights.ts [seed]
import { newGame } from '../../src/sim/state';
import { step } from '../../src/sim/tick';

const s = newGame(Number(process.argv[2] ?? 3));
let fights = 0, dur = 0, packs = 0, singles = 0, maxDur = 0;
const cur = new Map<number, number>();
for (let t = 0; t < 36000 * 6; t++) {
  step(s);
  for (const p of s.parties) {
    if (p.phase === 'fight' && !cur.has(p.id)) { cur.set(p.id, s.time); if ((p.encounter?.enemies?.length ?? 1) > 1) packs++; else singles++; }
    if (p.phase !== 'fight' && cur.has(p.id)) { fights++; const d = s.time - cur.get(p.id)!; dur += d; maxDur = Math.max(maxDur, d); cur.delete(p.id); }
  }
  for (const id of [...cur.keys()]) if (!s.parties.some((p) => p.id === id)) cur.delete(id);
}
console.log({ fights, avgFight: (dur / fights).toFixed(1), maxDur: maxDur.toFixed(0), packs, singles });
