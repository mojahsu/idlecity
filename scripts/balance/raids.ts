// Raid pacing over 10 hours: count, win rate, average fight length (expected
// 20–40 s, most repelled) and the most defenders seen at once.
//   bun scripts/balance/raids.ts [seed]
import { newGame } from '../../src/sim/state';
import { step } from '../../src/sim/tick';

const s = newGame(Number(process.argv[2] ?? 3));
let raids = 0, won = 0, lost = 0, dur = 0, cur = -1, maxDef = 0;
for (let t = 0; t < 36000 * 10; t++) {
  step(s);
  const r = s.raid;
  if (r && r.phase === 'fight') {
    if (cur < 0) cur = s.time;
    const d = s.adventurers.filter((a) => a.status === 'resting' && a.pastime === 'sally' && Math.hypot(a.x - r.x, a.y - r.y) < 3.4).length;
    maxDef = Math.max(maxDef, d);
  }
  if (!r && cur >= 0) { raids++; dur += s.time - cur; const last = s.log[s.log.length - 1]; if (last.key === 'log.raidRepelled') won++; else lost++; cur = -1; }
}
console.log({ raids, won, lost, avgFight: (dur / raids).toFixed(1), maxDef });
