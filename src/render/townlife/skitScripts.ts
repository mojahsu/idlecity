// Contextual multi-turn dialogue scripts for townsfolk, families, children and
// heroes. Purely render-side: reads GameState and returns a two-speaker skit.
import type { Adventurer, GameState, Worker } from '../../sim/types';
import { ageOf, isElder } from '../../sim/population';
import { isLazy } from '../../sim/leisure';
import { isIndoors } from '../../sim/workers';
import { season } from '../../sim/time';
import { t } from '../../i18n';
import type { Walker } from './shared';

export interface SkitSpeaker {
  kind: 'worker' | 'adventurer' | 'child' | 'wedding';
  id: number;
  name: string;
  x: number;
  y: number;
}

export interface SkitTurn {
  speaker: 0 | 1;
  text: string;
  color: string;
}

export interface SkitPlan {
  key: string;
  topicKey: string;
  weight: number;
  a: SkitSpeaker;
  b: SkitSpeaker;
  turns: SkitTurn[];
}

function wSpeaker(w: Worker): SkitSpeaker {
  return { kind: 'worker', id: w.id, name: w.name, x: w.x, y: w.y };
}

function aSpeaker(a: Adventurer): SkitSpeaker {
  return { kind: 'adventurer', id: a.id, name: a.name, x: a.x, y: a.y };
}

/** Build candidate multi-turn skits from everyone currently outdoors. */
export function buildSkitPlans(
  s: GameState,
  couple: { a: Walker; b: Walker } | null,
  kids: { id: number; name: string; x: number; y: number }[],
  recentKeys: Set<string>,
): SkitPlan[] {
  const plans: SkitPlan[] = [];
  const push = (p: SkitPlan) => {
    if (recentKeys.has(p.key)) p.weight *= 0.2;
    plans.push(p);
  };

  // B1. Chapel wedding vows when a bride and groom stroll out.
  if (couple) {
    const wedLog = [...s.log].reverse().find((e) => e.key === 'log.wedding');
    const aName = String(wedLog?.params?.a ?? t('ui.wedding'));
    const bName = String(wedLog?.params?.b ?? t('ui.wedding'));
    push({
      key: 'wedding',
      topicKey: 'skit.topic.family',
      weight: 18,
      a: { kind: 'wedding', id: 0, name: aName, x: couple.a.x, y: couple.a.y },
      b: { kind: 'wedding', id: 1, name: bName, x: couple.b.x, y: couple.b.y },
      turns: [
        { speaker: 0, text: t('skit.wedding.a', { b: bName }), color: '#c84070' },
        { speaker: 1, text: t('skit.wedding.b'), color: '#3a5a9a' },
        { speaker: 0, text: t('skit.wedding.c'), color: '#c84070' },
      ],
    });
  }

  const awake = s.workers.filter((w) => !isIndoors(s, w) && w.task?.kind !== 'sleep' && w.task?.kind !== 'douse' && !(w.task?.kind === 'rest' && w.task.activity === 'nap'));
  const heroes = s.adventurers.filter((a) => a.status === 'resting');

  // C1. Child × Adventurer encounters.
  for (const k of kids) {
    const hero = heroes.find((h) => Math.hypot(h.x - k.x, h.y - k.y) <= 3.4);
    if (!hero) continue;
    const kName = k.name || t('ui.child');
    const ks: SkitSpeaker = { kind: 'child', id: k.id, name: kName, x: k.x, y: k.y };
    const hs = aSpeaker(hero);
    const childObj = (s.children ?? []).find((c) => c.id === k.id);
    if (hero.father && childObj?.hero) {
      push({
        key: `fatherTrain.${hero.id}.${k.id}`,
        topicKey: 'skit.topic.family',
        weight: 22,
        a: hs,
        b: ks,
        turns: [
          { speaker: 0, text: t('skit.fatherTrain.a', { child: kName }), color: '#245898' },
          { speaker: 1, text: t('skit.fatherTrain.b', { father: hero.name }), color: '#c87020' },
          { speaker: 0, text: t('skit.fatherTrain.c'), color: '#245898' },
        ],
      });
    }
    if (s.victory) {
      push({
        key: `era.victoryKid.${hero.id}`,
        topicKey: 'skit.topic.hero',
        weight: 14,
        a: ks,
        b: hs,
        turns: [
          { speaker: 0, text: t('skit.era.victoryKid.a'), color: '#b85a20' },
          { speaker: 1, text: t('skit.era.victoryKid.b'), color: '#2a6a4a' },
          { speaker: 0, text: t('skit.era.victoryKid.c', { b: hero.name }), color: '#b85a20' },
        ],
      });
    }
    if (hero.cls === 'mage') {
      push({
        key: `kidHero.mage.${hero.id}`,
        topicKey: 'skit.topic.hero',
        weight: 12,
        a: ks,
        b: hs,
        turns: [
          { speaker: 0, text: t('skit.kidHero.mage.a', { b: hero.name }), color: '#b85a20' },
          { speaker: 1, text: t('skit.kidHero.mage.b'), color: '#3a6ab8' },
          { speaker: 0, text: t('skit.kidHero.mage.c'), color: '#b85a20' },
        ],
      });
    } else {
      push({
        key: `kidHero.0.${hero.id}`,
        topicKey: 'skit.topic.hero',
        weight: 11,
        a: ks,
        b: hs,
        turns: [
          { speaker: 0, text: t('skit.kidHero.0.a'), color: '#b85a20' },
          { speaker: 1, text: t('skit.kidHero.0.b'), color: '#2a6a4a' },
          { speaker: 0, text: t('skit.kidHero.0.c', { b: hero.name }), color: '#b85a20' },
        ],
      });
    }
  }

  // C2. Villager × Adventurer encounters.
  for (const w of awake) {
    const hero = heroes.find((h) => Math.hypot(h.x - w.x, h.y - w.y) <= 3.2);
    if (!hero) continue;
    const ws = wSpeaker(w), hs = aSpeaker(hero);
    if (w.father && hero.hero) {
      push({
        key: `fatherHero.${w.id}.${hero.id}`,
        topicKey: 'skit.topic.family',
        weight: 22,
        a: ws,
        b: hs,
        turns: [
          { speaker: 0, text: t('skit.fatherHero.a', { child: hero.name }), color: '#245898' },
          { speaker: 1, text: t('skit.fatherHero.b', { father: w.name }), color: '#b87818' },
          { speaker: 0, text: t('skit.fatherHero.c'), color: '#245898' },
        ],
      });
    }
    if (s.victory) {
      push({
        key: `era.victoryHero.${w.id}.${hero.id}`,
        topicKey: 'skit.topic.hero',
        weight: 12,
        a: ws,
        b: hs,
        turns: [
          { speaker: 0, text: t('skit.era.victoryHero.a', { b: hero.name }), color: '#7a5a18' },
          { speaker: 1, text: t('skit.era.victoryHero.b', { a: w.name }), color: '#2a5a8a' },
          { speaker: 0, text: t('skit.era.victoryHero.c'), color: '#7a5a18' },
        ],
      });
    }
    if (s.equipment >= 2 && (w.id + hero.id) % 2 === 0) {
      push({
        key: `townHero.gear.${w.id}.${hero.id}`,
        topicKey: 'skit.topic.hero',
        weight: 8,
        a: ws,
        b: hs,
        turns: [
          { speaker: 0, text: t('skit.townHero.gear.a', { b: hero.name }), color: '#3a2a1a' },
          { speaker: 1, text: t('skit.townHero.gear.b'), color: '#2a5a8a' },
        ],
      });
    } else {
      push({
        key: `townHero.0.${w.id}.${hero.id}`,
        topicKey: 'skit.topic.hero',
        weight: 8,
        a: ws,
        b: hs,
        turns: [
          { speaker: 0, text: t('skit.townHero.0.a', { b: hero.name }), color: '#3a2a1a' },
          { speaker: 1, text: t('skit.townHero.0.b', { a: w.name }), color: '#2a5a8a' },
          { speaker: 0, text: t('skit.townHero.0.c'), color: '#8a4a20' },
        ],
      });
    }
  }

  // Pair up nearby awake villagers for Categories A, B, D.
  for (let i = 0; i < awake.length; i++) {
    for (let j = i + 1; j < awake.length; j++) {
      const a = awake[i], b = awake[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > 3.4) continue;
      const as = wSpeaker(a), bs = wSpeaker(b);
      const actA = a.task?.kind === 'rest' && a.task.phase === 'do' ? a.task.activity : null;
      const actB = b.task?.kind === 'rest' && b.task.phase === 'do' ? b.task.activity : null;
      const restingBonus = actA || actB ? 1.6 : 1;

      // A1. Chess match banter.
      if (actA === 'chess' || actB === 'chess') {
        const variant = (a.id + b.id) % 2;
        push({
          key: `chess.${variant}.${a.id}.${b.id}`,
          topicKey: 'skit.topic.leisure',
          weight: 14,
          a: as,
          b: bs,
          turns: variant === 0
            ? [
                { speaker: 0, text: t('skit.chess.0.a'), color: '#2a4a7a' },
                { speaker: 1, text: t('skit.chess.0.b'), color: '#8a3a2a' },
                { speaker: 0, text: t('skit.chess.0.c', { b: b.name }), color: '#2a4a7a' },
              ]
            : [
                { speaker: 0, text: t('skit.chess.1.a'), color: '#3a2a1a' },
                { speaker: 1, text: t('skit.chess.1.b', { a: a.name }), color: '#2a5a4a' },
              ],
        });
      }

      // B2. Married spouses (picnic or meeting in town).
      if (a.spouse === b.id) {
        if ((a.father || b.father) && !s.protagonistId) {
          const [fa, sp] = a.father ? [as, bs] : [bs, as];
          push({
            key: `fatherSpouse.${fa.id}.${sp.id}`,
            topicKey: 'skit.topic.family',
            weight: 18 * restingBonus,
            a: fa,
            b: sp,
            turns: [
              { speaker: 0, text: t('skit.fatherSpouse.a', { b: sp.name }), color: '#245898' },
              { speaker: 1, text: t('skit.fatherSpouse.b', { a: fa.name }), color: '#b83a5a' },
              { speaker: 0, text: t('skit.fatherSpouse.c'), color: '#245898' },
            ],
          });
        }
        const variant = actA === 'picnic' || actB === 'picnic' ? 1 : (a.id + b.id) % 2;
        push({
          key: `spouse.${variant}.${a.id}.${b.id}`,
          topicKey: 'skit.topic.family',
          weight: 13 * restingBonus,
          a: as,
          b: bs,
          turns: variant === 0
            ? [
                { speaker: 0, text: t('skit.spouse.0.a', { b: b.name }), color: '#b83a5a' },
                { speaker: 1, text: t('skit.spouse.0.b', { a: a.name }), color: '#3a5a8a' },
                { speaker: 0, text: t('skit.spouse.0.c'), color: '#b83a5a' },
              ]
            : [
                { speaker: 0, text: t('skit.spouse.1.a'), color: '#b83a5a' },
                { speaker: 1, text: t('skit.spouse.1.b', { a: a.name }), color: '#c84060' },
              ],
        });
      }

      // B3. Parents talking about their child.
      const child = (s.children ?? []).find((c) => c.parentId === a.id || c.parentId === b.id);
      if (child) {
        const parentFirst = child.parentId === a.id ? [as, bs] : [bs, as];
        push({
          key: `parent.${child.id}`,
          topicKey: 'skit.topic.family',
          weight: 10 * restingBonus,
          a: parentFirst[0],
          b: parentFirst[1],
          turns: [
            { speaker: 0, text: t('skit.parent.a', { child: child.name }), color: '#7a4a20' },
            { speaker: 1, text: t('skit.parent.b', { child: child.name }), color: '#3a5a3a' },
            { speaker: 0, text: t('skit.parent.c'), color: '#7a4a20' },
          ],
        });
      }

      // B4 & B5. Elder reminiscing or mentoring a young worker.
      if (isElder(a) !== isElder(b)) {
        const [el, yn] = isElder(a) ? [as, bs] : [bs, as];
        push({
          key: `elder.${el.id}.${yn.id}`,
          topicKey: 'skit.topic.family',
          weight: 9 * restingBonus,
          a: el,
          b: yn,
          turns: [
            { speaker: 0, text: t('skit.elder.a'), color: '#5a4a3a' },
            { speaker: 1, text: t('skit.elder.b', { a: el.name }), color: '#2a5a6a' },
            { speaker: 0, text: t('skit.elder.c'), color: '#5a4a3a' },
          ],
        });
      } else if ((ageOf(a) < 21) !== (ageOf(b) < 21)) {
        const [vet, youth] = ageOf(a) >= 21 ? [as, bs] : [bs, as];
        push({
          key: `youth.${vet.id}.${youth.id}`,
          topicKey: 'skit.topic.family',
          weight: 8 * restingBonus,
          a: vet,
          b: youth,
          turns: [
            { speaker: 0, text: t('skit.youth.a', { b: youth.name }), color: '#3a2a1a' },
            { speaker: 1, text: t('skit.youth.b'), color: '#2a6a4a' },
            { speaker: 0, text: t('skit.youth.c'), color: '#3a2a1a' },
          ],
        });
      }

      // A2. Teasing a lazy colleague.
      if (isLazy(a) !== isLazy(b)) {
        const [hard, lazy] = isLazy(b) ? [as, bs] : [bs, as];
        push({
          key: `lazy.${hard.id}.${lazy.id}`,
          topicKey: 'skit.topic.leisure',
          weight: 9 * restingBonus,
          a: hard,
          b: lazy,
          turns: [
            { speaker: 0, text: t('skit.lazy.a', { b: lazy.name }), color: '#3a2a1a' },
            { speaker: 1, text: t('skit.lazy.b'), color: '#6a5a2a' },
            { speaker: 0, text: t('skit.lazy.c'), color: '#8a4a20' },
          ],
        });
      }

      // A3. Lunch or tavern drink.
      if (actA === 'lunch' || actB === 'lunch') {
        push({
          key: `lunch.${a.id}.${b.id}`,
          topicKey: 'skit.topic.leisure',
          weight: 9,
          a: as,
          b: bs,
          turns: [
            { speaker: 0, text: t('skit.lunch.a'), color: '#7a4a20' },
            { speaker: 1, text: t('skit.lunch.b'), color: '#3a2a1a' },
          ],
        });
      } else if (actA === 'drink' || actB === 'drink' || (a.tipsy ?? 0) > 0 || (b.tipsy ?? 0) > 0) {
        push({
          key: `drink.${a.id}.${b.id}`,
          topicKey: 'skit.topic.leisure',
          weight: 9,
          a: as,
          b: bs,
          turns: [
            { speaker: 0, text: t('skit.drink.a', { b: b.name }), color: '#a84050' },
            { speaker: 1, text: t('skit.drink.b'), color: '#8a3a5a' },
          ],
        });
      }

      // A4. Workplace / job-specific banter.
      if (a.job === 'farmer' || b.job === 'farmer') {
        const [fa, ot] = a.job === 'farmer' ? [as, bs] : [bs, as];
        push({
          key: `job.farm.${fa.id}`,
          topicKey: 'skit.topic.leisure',
          weight: 5 * restingBonus,
          a: fa,
          b: ot,
          turns: [
            { speaker: 0, text: t('skit.job.farm.a'), color: '#4a6a2a' },
            { speaker: 1, text: t('skit.job.farm.b', { a: fa.name }), color: '#3a2a1a' },
          ],
        });
      } else if (a.job === 'miner' || a.job === 'quarryman') {
        push({
          key: `job.mine.${a.id}`,
          topicKey: 'skit.topic.leisure',
          weight: 5 * restingBonus,
          a: as,
          b: bs,
          turns: [
            { speaker: 0, text: t('skit.job.mine.a'), color: '#3a4a6a' },
            { speaker: 1, text: t('skit.job.mine.b', { a: a.name }), color: '#3a2a1a' },
          ],
        });
      } else if (a.job === 'lumberjack' || a.job === 'builder') {
        push({
          key: `job.wood.${a.id}`,
          topicKey: 'skit.topic.leisure',
          weight: 5 * restingBonus,
          a: as,
          b: bs,
          turns: [
            { speaker: 0, text: t('skit.job.wood.a'), color: '#6a4a2a' },
            { speaker: 1, text: t('skit.job.wood.b', { a: a.name }), color: '#3a2a1a' },
          ],
        });
      }

      // D. Era, recent events & seasonal town gossip.
      const recentLogs = s.log.slice(-6);
      if (recentLogs.some((e) => e.key === 'log.fireOut')) {
        push({
          key: `event.fire.${a.id}`,
          topicKey: 'skit.topic.chronicle',
          weight: 11 * restingBonus,
          a: as,
          b: bs,
          turns: [
            { speaker: 0, text: t('skit.event.fire.a'), color: '#b84020' },
            { speaker: 1, text: t('skit.event.fire.b'), color: '#3a2a1a' },
          ],
        });
      } else if (recentLogs.some((e) => e.key === 'log.raidRepelled')) {
        push({
          key: `event.raid.${a.id}`,
          topicKey: 'skit.topic.chronicle',
          weight: 11 * restingBonus,
          a: as,
          b: bs,
          turns: [
            { speaker: 0, text: t('skit.event.raid.a'), color: '#8a3020' },
            { speaker: 1, text: t('skit.event.raid.b'), color: '#2a5a4a' },
          ],
        });
      }

      if (s.mayor.want) {
        push({
          key: `event.build.${s.mayor.want}`,
          topicKey: 'skit.topic.chronicle',
          weight: 6 * restingBonus,
          a: as,
          b: bs,
          turns: [
            { speaker: 0, text: t('skit.event.build.a', { building: `building.${s.mayor.want}` }), color: '#3a2a1a' },
            { speaker: 1, text: t('skit.event.build.b'), color: '#5a4a2a' },
          ],
        });
      }

      const darkTower = s.dungeons.find((d) => d.id === 'darkTower' && d.unlocked);
      const towerFight = !s.victory && s.parties.some((p) => p.dungeon === 'darkTower' && (p.phase === 'explore' || p.phase === 'fight'));
      const anyDungeon = s.dungeons.filter((d) => d.unlocked);
      if (towerFight) {
        push({
          key: `era.towerFight.${a.id}`,
          topicKey: 'skit.topic.chronicle',
          weight: 15 * restingBonus,
          a: as,
          b: bs,
          turns: [
            { speaker: 0, text: t('skit.era.towerFight.a'), color: '#8a2050' },
            { speaker: 1, text: t('skit.era.towerFight.b'), color: '#3a2a1a' },
            { speaker: 0, text: t('skit.era.towerFight.c'), color: '#2a5a4a' },
          ],
        });
      }
      if (s.victory) {
        const dt = s.dungeons.find((d) => d.id === 'darkTower');
        if (dt && dt.deepestFloor > 12) {
          push({
            key: `era.abyss.${a.id}`,
            topicKey: 'skit.topic.chronicle',
            weight: 11 * restingBonus,
            a: as,
            b: bs,
            turns: [
              { speaker: 0, text: t('skit.era.abyss.a', { floor: dt.deepestFloor }), color: '#7a2868' },
              { speaker: 1, text: t('skit.era.abyss.b'), color: '#2a5a6a' },
            ],
          });
        }
        push({
          key: `era.victory.${a.id}`,
          topicKey: 'skit.topic.chronicle',
          weight: 8 * restingBonus,
          a: as,
          b: bs,
          turns: [
            { speaker: 0, text: t('skit.era.victory.a'), color: '#7a5a18' },
            { speaker: 1, text: t('skit.era.victory.b'), color: '#2a6a4a' },
            { speaker: 0, text: t('skit.era.victory.c'), color: '#7a5a18' },
          ],
        });
      } else if (darkTower) {
        push({
          key: `era.darkTower.${a.id}`,
          topicKey: 'skit.topic.chronicle',
          weight: 8 * restingBonus,
          a: as,
          b: bs,
          turns: [
            { speaker: 0, text: t('skit.era.darkTower.a'), color: '#5a2a6a' },
            { speaker: 1, text: t('skit.era.darkTower.b'), color: '#3a2a1a' },
            { speaker: 0, text: t('skit.era.darkTower.c'), color: '#2a5a4a' },
          ],
        });
      } else if (anyDungeon.length > 0) {
        const d = anyDungeon[anyDungeon.length - 1];
        if (d.id === 'emberPeak') {
          push({
            key: `era.ember.${a.id}`,
            topicKey: 'skit.topic.chronicle',
            weight: 8 * restingBonus,
            a: as,
            b: bs,
            turns: [
              { speaker: 0, text: t('skit.era.ember.a'), color: '#9a3018' },
              { speaker: 1, text: t('skit.era.ember.b'), color: '#3a2a1a' },
            ],
          });
        } else if (d.id === 'emeraldCavern') {
          push({
            key: `era.emerald.${a.id}`,
            topicKey: 'skit.topic.chronicle',
            weight: 8 * restingBonus,
            a: as,
            b: bs,
            turns: [
              { speaker: 0, text: t('skit.era.emerald.a'), color: '#1e6a4e' },
              { speaker: 1, text: t('skit.era.emerald.b'), color: '#3a2a1a' },
            ],
          });
        }
        push({
          key: `era.dungeon.${d.id}`,
          topicKey: 'skit.topic.chronicle',
          weight: 6 * restingBonus,
          a: as,
          b: bs,
          turns: [
            { speaker: 0, text: t('skit.era.dungeon.a', { dungeon: `dungeon.${d.id}` }), color: '#3a2a1a' },
            { speaker: 1, text: t('skit.era.dungeon.b'), color: '#2a4a7a' },
          ],
        });
      } else if (s.tier === 'camp' || s.tier === 'hamlet') {
        push({
          key: `era.camp.${a.id}`,
          topicKey: 'skit.topic.chronicle',
          weight: 7 * restingBonus,
          a: as,
          b: bs,
          turns: [
            { speaker: 0, text: t('skit.era.camp.a'), color: '#5a4a2a' },
            { speaker: 1, text: t('skit.era.camp.b'), color: '#8a4a20' },
          ],
        });
      }

      const curSeason = season(s);
      const dayIdx = Math.floor(s.time / 120);
      if (dayIdx % 3 === 1 && curSeason !== 'winter' && s.buildings.some((bl) => bl.built && (bl.type === 'market' || bl.type === 'tavern'))) {
        push({
          key: `visitor.circus.${a.id}`,
          topicKey: 'skit.topic.leisure',
          weight: 8 * restingBonus,
          a: as,
          b: bs,
          turns: [
            { speaker: 0, text: t('skit.visitor.circus.a'), color: '#b83030' },
            { speaker: 1, text: t('skit.visitor.circus.b'), color: '#3a2a1a' },
          ],
        });
      } else if (dayIdx % 3 === 2 && s.buildings.some((bl) => bl.built && bl.type === 'guildHall')) {
        push({
          key: `visitor.alchemist.${a.id}`,
          topicKey: 'skit.topic.leisure',
          weight: 8 * restingBonus,
          a: as,
          b: bs,
          turns: [
            { speaker: 0, text: t('skit.visitor.alchemist.a'), color: '#482868' },
            { speaker: 1, text: t('skit.visitor.alchemist.b'), color: '#286848' },
          ],
        });
      }
      if (s.dungeons.some((d) => d.bossDefeated)) {
        push({
          key: `monument.${a.id}`,
          topicKey: 'skit.topic.chronicle',
          weight: 6 * restingBonus,
          a: as,
          b: bs,
          turns: [
            { speaker: 0, text: t('skit.monument.a'), color: '#7a5a18' },
            { speaker: 1, text: t('skit.monument.b'), color: '#3a2a1a' },
          ],
        });
      }
      push({
        key: `season.${curSeason}.${a.id}`,
        topicKey: 'skit.topic.chronicle',
        weight: 5 * restingBonus,
        a: as,
        b: bs,
        turns: [
          { speaker: 0, text: t(`skit.season.${curSeason}.a`), color: '#3a2a1a' },
          { speaker: 1, text: t(`skit.season.${curSeason}.b`, { a: a.name }), color: '#2a5a4a' },
        ],
      });
    }
  }

  return plans;
}
