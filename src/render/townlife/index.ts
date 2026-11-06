// Ambient town life that lives only in the renderer: villagers strolling the
// streets, children, a dog, cats, guards, music, crowds, funerals, weddings,
// the festival, wildlife and the river. One file per subsystem; nothing here
// touches the simulation.
import type { GameState } from '../../sim/types';
import type { LightSource } from '../buildings';
import type { Env } from '../palette';
import { Roads, type Actor } from './shared';
import { Bits } from './bits';
import { Walkers } from './walkers';
import { Kids } from './kids';
import { TownDog } from './dog';
import { Cats } from './cats';
import { Guards } from './guards';
import { Music } from './music';
import { Cheers } from './cheers';
import { Processions } from './processions';
import { Sparkles } from './sparkles';
import { Wedding } from './wedding';
import { Wolves } from './wolves';
import { DeerVisits } from './deer';
import { River } from './river';
import { Festival } from './festival';
import { Statue } from './statue';
import { Pastimes } from './pastimes';
import { NightLife } from './night';
import { Seasonal } from './seasonal';
import { Skits, type ActiveSkitView } from './skits';
import { Chapters } from './chapters';

export class TownLife {
  private roads = new Roads();
  private bits = new Bits();
  private walkers = new Walkers();
  private kids = new Kids();
  private dog = new TownDog();
  private cats = new Cats();
  private guards = new Guards();
  private music = new Music();
  private cheers = new Cheers();
  private processions = new Processions();
  private sparkles = new Sparkles();
  private wedding = new Wedding();
  private wolves = new Wolves();
  private deer = new DeerVisits();
  private river = new River();
  private festival = new Festival();
  private statue = new Statue();
  private pastimes = new Pastimes();
  private night = new NightLife();
  private seasonal = new Seasonal();
  private skits = new Skits();
  private chapters = new Chapters();

  update(s: GameState, env: Env, dt: number): void {
    this.roads.refresh(s);
    this.walkers.update(s, env, dt, this.roads);
    this.kids.update(s, env, dt, this.roads);
    this.dog.update(s, env, dt);
    this.cats.update(s, dt);
    this.guards.update(s);
    this.music.update(s, env, dt);
    this.cheers.update(s, env, dt, this.roads, this.bits);
    this.processions.update(s, dt);
    this.sparkles.update(s, dt, this.bits);
    this.wedding.update(s, env, dt, this.roads, this.bits, this.music);
    this.wolves.update(s, env, dt);
    this.deer.update(s, env, dt);
    this.river.update(s, env, dt);
    this.pastimes.update(s, env, dt, this.music);
    this.night.update(s, env, dt, this.roads);
    this.seasonal.update(s, env, dt, this.roads);
    this.skits.update(s, env, dt, this.wedding.couple(), this.kids.namedSpots(s));
    this.chapters.update(s, dt);
    this.bits.update(dt);
  }

  /** Currently playing multi-turn dialogue skit, if any. */
  activeSkit(): ActiveSkitView | null { return this.skits.current(); }

  /** Things standing on the ground, sorted with units by the renderer. */
  groundActors(s: GameState, env: Env): Actor[] {
    return [
      ...this.walkers.actors(), ...this.kids.actors(env), ...this.dog.actors(), ...this.cats.actors(s), ...this.guards.actors(s),
      ...this.cheers.actors(), ...this.wedding.actors(), ...this.processions.actors(), ...this.festival.actors(s, env),
      ...this.wolves.actors(), ...this.deer.actors(), ...this.river.actors(), ...this.statue.actors(s, this.roads), ...this.pastimes.actors(s, env), ...this.night.actors(s, env), ...this.seasonal.actors(s, env),
    ];
  }

  /** Where the children are this frame. */
  kidSpots(): { x: number; y: number }[] { return [...this.kids.spots(), ...this.night.scare()]; }

  /** Confetti, stars, lanterns, notes, bell rings and skit bubbles, drawn above the lighting so they read at night. */
  drawOverlay(ctx: CanvasRenderingContext2D, env: Env, s: GameState): void {
    this.bits.draw(ctx);
    this.sparkles.overlay(ctx, s);
    this.festival.overlay(ctx, env, s);
    this.seasonal.overlay(ctx, env, s);
    this.music.overlay(ctx);
    this.skits.drawOverlay(ctx, s);
    this.chapters.overlay(ctx, env, s);
  }

  /** Guard torches and festival lanterns at night. */
  lights(s: GameState, env: Env): LightSource[] {
    if (env.dark <= 0.25) return [];
    return [...this.festival.lights(s, env), ...this.guards.lights(s, env), ...this.night.lights(), ...this.seasonal.lights(s, env)];
  }
}
