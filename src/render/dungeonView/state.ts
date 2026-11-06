// Per-party animation state, driven by the sim's per-action fx so every blow,
// shot, spell and special plays out one at a time.

export interface Num { x: number; y: number; text: string; color: string; ttl: number; big?: boolean }

export interface Spark { x: number; y: number; vx: number; vy: number; ttl: number; color: string }

export interface Shot { kind: 'arrow' | 'fire' | 'bolt' | 'dark' | 'light'; x: number; y: number; tx: number; ty: number; t: number; life: number; onLand?: () => void }

export interface Banner { text: string; color: string; ttl: number; life: number; big: boolean }

export interface Talk { side: 'hero' | 'enemy'; x: number; y: number; text: string; ttl: number; life: number }

export interface Dying { monster: string; x: number; boss: boolean; t: number; scale: number }

export interface EnemyView {
  /** Lunge toward the heroes, 0..1 over its life. */
  lunge: number;
  hurt: number;
  /** Fading bars so damage reads even when a blow is quick. */
  shownHp: number;
}

export interface ViewState {
  floor: number;
  hadEncounter: boolean;
  boss: boolean;
  /** Per hero id: lunge timer and where the lunge goes. */
  heroLunge: Map<number, { t: number; tx: number }>;
  heroHurt: Map<number, number>;
  heal: Map<number, number>;
  shownHp: Map<number, number>;
  enemies: EnemyView[];
  dying: Dying[];
  floorFlash: number;
  shake: number;
  nums: Num[];
  sparks: Spark[];
  scroll: number;
  shots: Shot[];
  taunt: number;
  tauntIdx: number;
  frozen: number;
  beam: number;
  beamIdx: number;
  block: number;
  blockIdx: number;
  revive: number;
  reviveIdx: number;
  casting: number;
  castIdx: number;
  /** A dragon's (or demon's) breath sweeping the heroes: 0..1 timer. */
  breath: number;
  breathFrom: number;
  /** A curse mark over a hero. */
  curse: number;
  curseIdx: number;
  banner: Banner | null;
  bossIntro: number;
  chest: number;
  eventProp: { kind: 'spring' | 'altar' | 'rescue'; t: number } | null;
  motes: { x: number; y: number; vx: number; vy: number; ttl: number; life: number }[];
  puffs: { x: number; y: number; ttl: number }[];
  scorch: { x: number; ttl: number }[];
  outro: number;
  retreating: boolean;
  talks: Talk[];
  talkCooldown: number;
  cheer: number;
  guardCover: { actorIdx: number; targetIdx: number; t: number } | null;
}

export function newViewState(floor: number): ViewState {
  return { floor, hadEncounter: false, boss: false, heroLunge: new Map(), heroHurt: new Map(), heal: new Map(), shownHp: new Map(), enemies: [], dying: [], floorFlash: 0.8, shake: 0, nums: [], sparks: [], scroll: 0, shots: [], taunt: 0, tauntIdx: 0, frozen: 0, beam: 0, beamIdx: 0, block: 0, blockIdx: 0, revive: 0, reviveIdx: 0, casting: 0, castIdx: 0, breath: 0, breathFrom: 0, curse: 0, curseIdx: 0, banner: null, bossIntro: 0, chest: 0, eventProp: null, motes: [], puffs: [], scorch: [], outro: 0, retreating: false, talks: [], talkCooldown: 1.5, cheer: 0, guardCover: null };
}
