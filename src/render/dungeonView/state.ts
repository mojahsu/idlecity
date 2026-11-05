// Per-party animation state, derived from HP changes so the sim stays untouched.

export interface Num { x: number; y: number; text: string; color: string; ttl: number }

export interface Spark { x: number; y: number; vx: number; vy: number; ttl: number; color: string }

export interface Shot { kind: 'arrow' | 'fire'; x: number; y: number; tx: number; ty: number; t: number; life: number }

export interface Banner { text: string; color: string; ttl: number; life: number; big: boolean }

export interface ViewState {
  lastHp: Map<number, number>;
  lastEncHp: number;
  hadEncounter: boolean;
  monster: string;
  boss: boolean;
  floor: number;
  attacker: number;
  heroLunge: number;
  heroIdx: number;
  monsterLunge: number;
  monsterHurt: number;
  heroHurt: Map<number, number>;
  heal: Map<number, number>;
  death: number;
  deathMonster: string;
  deathBoss: boolean;
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
  banner: Banner | null;
  /** Red pulse and name card when a boss steps out. */
  bossIntro: number;
  /** A chest popping open. */
  chest: number;
  /** Dust hanging in the air. */
  motes: { x: number; y: number; vx: number; vy: number; ttl: number; life: number }[];
  /** Puffs of dust kicked up at the feet. */
  puffs: { x: number; y: number; ttl: number }[];
}

export function newViewState(floor: number): ViewState {
  return { lastHp: new Map(), lastEncHp: 0, hadEncounter: false, monster: '', boss: false, floor, attacker: 0, heroLunge: 0, heroIdx: 0, monsterLunge: 0, monsterHurt: 0, heroHurt: new Map(), heal: new Map(), death: 0, deathMonster: '', deathBoss: false, floorFlash: 0.8, shake: 0, nums: [], sparks: [], scroll: 0, shots: [], taunt: 0, tauntIdx: 0, frozen: 0, beam: 0, beamIdx: 0, block: 0, blockIdx: 0, revive: 0, reviveIdx: 0, casting: 0, castIdx: 0, banner: null, bossIntro: 0, chest: 0, motes: [], puffs: [] };
}
