// Decides what should be heard each frame by reading the game state: the
// ambience beds follow weather and time of day, the log and the fx stream
// trigger one-shots, and the tavern plays at night. No audio code lives in
// the sim or the renderer.
import type { GameState, LogEntry } from '../sim/types';
import { makeEnv, type Env } from '../render/palette';
import type { AudioEngine } from './audio';

const PENTATONIC = [262, 294, 330, 392, 440, 523, 587, 659];

export class Soundtrack {
  private clock = 0;
  private lastLog: LogEntry | null = null;
  private seenLog = false;
  private birdTimer = 2;
  private cricketTimer = 1;
  private owlTimer = 20;
  private howlTimer = 60;
  private crackleTimer = 0;
  private workTimer = 0;
  private hitTimer = 0;
  private slainTimer = 0;
  private bellTimer = 0;
  private wasBell = false;
  private bosses = new Set<number>();
  private encounters = new Map<number, boolean>();
  private tuneTimer = 0;
  private tuneIdx = 4;

  constructor(private audio: AudioEngine) {}

  update(s: GameState, dt: number, speed: number, events: string[]): void {
    this.clock += dt;
    const a = this.audio;
    if (!a.ready) { this.lastLog = s.log[s.log.length - 1] ?? null; return; }
    const env = makeEnv(s, this.clock);
    this.beds(s, env);
    this.nature(s, env, dt);
    for (const e of events) if (e === 'lightning') a.thunder(); else if (e === 'rocket') a.rocket(); else if (e === 'burst') a.burst();
    if (speed === 0) { this.lastLog = s.log[s.log.length - 1] ?? null; return; }
    this.work(s, env, dt);
    this.battle(s, dt);
    this.logs(s);
    this.bell(env, dt);
    this.tavern(s, env, dt);
  }

  private beds(s: GameState, env: Env): void {
    const a = this.audio;
    a.setBed('wind', 0.025 + (env.storm ? 0.06 : env.rainy ? 0.02 : 0) + (env.season === 'winter' ? 0.025 : 0) + (env.dark > 0.5 ? 0.01 : 0));
    a.setBed('rain', env.rainy ? (env.storm ? 0.12 : 0.08) : 0);
    a.setBed('river', 0.02);
    a.setBed('blaze', s.fire ? 0.05 + 0.08 * s.fire.intensity : 0);
  }

  private nature(s: GameState, env: Env, dt: number): void {
    const a = this.audio;
    const day = env.dark < 0.5;
    this.birdTimer -= dt;
    if (this.birdTimer <= 0) { this.birdTimer = env.season === 'winter' ? 12 + Math.random() * 14 : 3 + Math.random() * 6; if (day && !env.rainy) a.chirp(); }
    this.cricketTimer -= dt;
    if (this.cricketTimer <= 0) { this.cricketTimer = 0.9 + Math.random() * 0.6; if (!day && (env.season === 'summer' || env.season === 'spring') && !env.rainy) a.cricket(); }
    this.owlTimer -= dt;
    if (this.owlTimer <= 0) { this.owlTimer = 18 + Math.random() * 30; if (!day && !env.rainy) a.owl(); }
    this.howlTimer -= dt;
    if (this.howlTimer <= 0) { this.howlTimer = 70 + Math.random() * 90; if (env.night && env.clearNight && s.workers.length >= 8) a.howl(); }
    // The campfire (and any blaze) crackles.
    this.crackleTimer -= dt;
    if (this.crackleTimer <= 0) { this.crackleTimer = (s.fire ? 0.08 : 0.35) + Math.random() * 0.4; a.crackle(); }
  }

  private work(s: GameState, env: Env, dt: number): void {
    this.workTimer -= dt;
    if (this.workTimer > 0 || env.night) return;
    this.workTimer = 0.5 + Math.random() * 0.5;
    const a = this.audio;
    const working = s.workers.filter((w) => w.task && 'phase' in w.task && w.task.phase === 'work');
    const jobs = { chop: 0, pick: 0, hammer: 0 };
    for (const w of working) { if (w.task!.kind === 'build') jobs.hammer++; else if (w.job === 'lumberjack') jobs.chop++; else if (w.job === 'quarryman' || w.job === 'miner') jobs.pick++; }
    // One sound per tick at most, weighted by how many are at it; nothing when nobody is working.
    const total = jobs.chop + jobs.pick + jobs.hammer;
    if (!total || Math.random() > Math.min(0.8, total / 6)) return;
    const r = Math.random() * total;
    if (r < jobs.chop) a.chop(); else if (r < jobs.chop + jobs.pick) a.pick(); else a.hammer();
  }

  private battle(s: GameState, dt: number): void {
    const a = this.audio;
    this.hitTimer = Math.max(0, this.hitTimer - dt); this.slainTimer = Math.max(0, this.slainTimer - dt);
    for (const f of s.fx) {
      if (f.kind === 'hit' && this.hitTimer <= 0) { a.hit(); this.hitTimer = 0.12; }
      else if (f.kind === 'water') a.splash();
      else if (f.kind === 'float' && f.text.endsWith('g')) a.coins();
      else if (f.kind === 'treasure') a.chest();
      else if (f.kind === 'skill') {
        switch (f.skill) {
          case 'fireball': a.fireball(); break;
          case 'frost': a.frost(); break;
          case 'holyLight': a.holy(); break;
          case 'taunt': a.taunt(); break;
          case 'block': a.clank(); break;
          case 'volley': a.whoosh(); break;
          case 'crit': a.clank(); break;
          case 'revive': a.rise(); break;
        }
      }
    }
    // Bosses roar when they step out; monsters groan when they fall.
    const seen = new Set<number>();
    for (const p of s.parties) {
      seen.add(p.id);
      const had = this.encounters.get(p.id) ?? false;
      const has = !!p.encounter;
      if (has && !had && p.encounter!.boss && !this.bosses.has(p.id)) { a.roar(p.encounter!.monster === 'demonLord' || p.encounter!.monster === 'dragon'); this.bosses.add(p.id); }
      if (!has && had && this.slainTimer <= 0) { a.slain(); this.slainTimer = 1.2; }
      if (!has) this.bosses.delete(p.id);
      this.encounters.set(p.id, has);
    }
    for (const id of [...this.encounters.keys()]) if (!seen.has(id)) { this.encounters.delete(id); this.bosses.delete(id); }
  }

  private logs(s: GameState): void {
    const last = s.log[s.log.length - 1] ?? null;
    if (last === this.lastLog) return;
    // Catch up on everything new since last frame (a few entries at most).
    const idx = this.lastLog ? s.log.indexOf(this.lastLog) : s.log.length - 1;
    const fresh = idx < 0 ? [last!] : s.log.slice(idx + 1);
    this.lastLog = last;
    if (!this.seenLog) { this.seenLog = true; return; } // no burst of sound on load
    const a = this.audio;
    for (const e of fresh) {
      switch (e.key) {
        case 'log.raidIncoming': case 'log.fireStart': a.alarm(); break;
        case 'log.caravanArrives': a.jingle(); break;
        case 'log.bossSlain': case 'log.victory': a.fanfare(); break;
        case 'log.levelUp': a.levelUp(); break;
        case 'log.death': case 'log.passedAway': a.lament(); break;
        case 'log.wedding': a.weddingBells(); break;
        case 'log.birth': a.chime(); break;
        case 'log.built': a.hammer(); a.chime(); break;
        case 'log.raidRepelled': a.rise(); break;
      }
    }
  }

  private bell(env: Env, dt: number): void {
    if (env.bell > 0) {
      this.bellTimer -= dt;
      if (this.bellTimer <= 0) { this.bellTimer = 0.55; this.audio.bell(0.1); }
    } else this.bellTimer = 0;
    this.wasBell = env.bell > 0;
  }

  /** A slow pentatonic tune drifts out of the tavern after dark. */
  private tavern(s: GameState, env: Env, dt: number): void {
    const open = env.dark > 0.5 && env.dayFrac > 0.82 && s.buildings.some((b) => b.built && b.type === 'tavern');
    const party = env.festival;
    if (!open && !party) return;
    this.tuneTimer -= dt;
    if (this.tuneTimer > 0) return;
    const step = party ? 0.22 : 0.36;
    this.tuneTimer = step * (Math.random() < 0.25 ? 2 : 1);
    this.tuneIdx = Math.max(0, Math.min(PENTATONIC.length - 1, this.tuneIdx + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.2 ? 2 : 1)));
    this.audio.tuneNote(PENTATONIC[this.tuneIdx], step * 1.6);
  }
}
