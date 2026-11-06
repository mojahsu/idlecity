// Town life over 10 hours on four seeds: population, fires, caravans, gold,
// how many sleep at night and how few idle by day; then a night task
// breakdown and the equipment level for seed 7.
//   bun scripts/balance/events.ts
import { newGame } from '../../src/sim/state';
import { step, advance } from '../../src/sim/tick';
import { isNight, dayFraction } from '../../src/sim/time';
import { isIndoors } from '../../src/sim/workers';

for (const seed of [1, 3, 7, 11]) {
  const s = newGame(seed);
  let fires = 0, caravans = 0, victoryH = -1;
  let seenF = -1, seenC = false;
  let nightSamples = 0, indoorFrac = 0, daySamples = 0, dayIdle = 0;
  for (let sec = 0; sec < 10 * 3600; sec++) {
    for (let k = 0; k < 10; k++) step(s);
    if (s.fire && s.fire.buildingId !== seenF) { fires++; seenF = s.fire.buildingId; }
    if (!s.fire) seenF = -1;
    if (s.caravan && !seenC) { caravans++; seenC = true; }
    if (!s.caravan) seenC = false;
    if (s.victory && victoryH < 0) victoryH = sec / 3600;
    if (sec % 7 === 0) {
      if (isNight(s) && dayFraction(s) > 0.9) { nightSamples++; indoorFrac += s.workers.filter((w) => isIndoors(s, w) || (w.task?.kind === 'sleep' && w.task.phase === 'sleep')).length / s.workers.length; }
      else if (!isNight(s) && dayFraction(s) > 0.3 && dayFraction(s) < 0.7) { daySamples++; dayIdle += s.workers.filter((w) => w.task?.kind === 'sleep').length / s.workers.length; }
    }
  }
  const burned = s.chronicle.filter((e) => e.key === 'log.fireBurned').length;
  console.log(`seed ${seed}: pop ${s.workers.length} tier ${s.tier} built ${s.stats.built} victory@${victoryH < 0 ? '-' : victoryH.toFixed(1)}h deaths ${s.stats.deaths} fires ${fires} burned ${burned} caravans ${caravans} gold ${Math.floor(s.resources.gold)} asleep@night ${(indoorFrac / nightSamples * 100).toFixed(0)}% asleep@day ${(dayIdle / daySamples * 100).toFixed(1)}%`);
}
{
  const s = newGame(7);
  advance(s, 3600 * 4);
  while (dayFraction(s) < 0.93) step(s);
  const kinds: Record<string, number> = {};
  for (const w of s.workers) { const k = w.task ? `${w.task.kind}${'phase' in w.task ? '/' + w.task.phase : ''}` : 'idle'; kinds[k] = (kinds[k] ?? 0) + 1; }
  console.log('night tasks', JSON.stringify(kinds));
  advance(s, 3600 * 6);
  console.log('seed7 equipment', s.equipment, 'ironForged', s.ironForged, 'levels', s.adventurers.filter((a) => a.status !== 'dead').map((a) => a.level).join(','), 'deaths', s.stats.deaths);
}
