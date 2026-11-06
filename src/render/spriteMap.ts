// Which tile of which sheet stands for each thing in the game. Indices were
// read off the sheets with public/assets/viewer.html; a wrong index shows up
// as the wrong picture, never as a crash.
import type { SpriteRef } from './sprites';

const T = (i: number): SpriteRef => ({ s: 'tiny-town', i });
const D = (i: number): SpriteRef => ({ s: 'tiny-dungeon', i });
const C = (i: number): SpriteRef => ({ s: 'tiny-creatures', i });

// ---- people (Tiny Dungeon) ----------------------------------------------------
/** Plain townsfolk; the job or tunic colour is washed over them. */
export const VILLAGERS: SpriteRef[] = [D(85), D(86), D(87), D(88), D(98), D(99)];
export const ELDER = D(100);
export const CLASS_FIG = { warrior: D(96), archer: D(88), mage: D(84), priest: D(85) } as const;
/** Tints that tell the classes apart on the map (null = the sprite's own colours). */
export const CLASS_TINT: Record<string, string | null> = { warrior: null, archer: '#3f8a3a', mage: '#3a4ac0', priest: '#f0e0b0' };
export const GUARD = D(97);
export const MERCHANT = D(86);

/** 0x72 animation prefixes for the dungeon panel (`_idle_anim`, `_run_anim`, `_hit_anim`). */
export const HERO_ANIM: Record<string, string> = { warrior: 'knight_m', archer: 'elf_m', mage: 'wizzard_m', priest: 'wizzard_f' };
export const HERO_ANIM_TINT: Record<string, string | null> = { warrior: null, archer: null, mage: null, priest: '#f8e8a0' };

// ---- monsters -----------------------------------------------------------------
/** On the map (raids): a Tiny tile per monster. */
export const MONSTER_TILE: Record<string, SpriteRef> = {
  rat: D(123), goblin: C(10), goblinChief: C(11), wolf: C(23), skeleton: C(1), ghoul: C(0), bandit: D(111),
  lich: C(96), spider: D(122), troll: C(14), wraith: C(4), broodMother: D(122),
  hellhound: C(102), golem: C(47), wyvern: C(34), elderDragon: C(32),
  imp: C(39), demon: C(38), orc: C(20), dragon: C(33), demonLord: C(123),
};
/** In the panel: a 0x72 animation prefix where one fits, else the map tile. */
export const MONSTER_ANIM: Partial<Record<string, string>> = {
  goblin: 'goblin', goblinChief: 'masked_orc', skeleton: 'skelet', ghoul: 'zombie', lich: 'necromancer',
  spider: 'swampy', troll: 'ogre', wraith: 'ice_zombie', broodMother: 'big_zombie',
  hellhound: 'wogol', golem: 'muddy', wyvern: 'lizard_m',
  imp: 'imp', demon: 'chort', orc: 'orc_warrior', demonLord: 'big_demon',
};

// ---- animals (Tiny Creatures) -------------------------------------------------
export const ANIMAL = {
  chicken: C(150), dog: C(169), cat: C(94), wolf: C(23), deer: C(161), fox: C(169), owl: C(117), horse: C(50), sheep: C(153),
  fish: [C(60), C(61), C(62), C(63)], bat: C(132),
} as const;

// ---- props and tools (Tiny Town / Tiny Dungeon) -------------------------------
export const TOOL: Record<string, SpriteRef | undefined> = {
  lumberjack: T(127), quarryman: T(115), miner: T(115), builder: D(117), farmer: T(116),
};
export const PROP = {
  bow: T(118), arrow: T(119), bucket: T(131), crate: T(130), goldBag: T(93), coins: T(93), log: T(106), pot: T(107), hammer: D(117), axe: T(127),
  pickaxe: T(115), signpost: T(83), beehive: T(94), target: T(95), key: T(117), ladder: T(103), mushroom: T(29), mushrooms: T(29),
  sword: D(104), redSword: D(107), shield: D(102), anvil: D(74), potion: D(114), chest: D(89), chestOpen: D(91), skullMarker: D(60),
  rock: D(12), rockSmall: D(24), pebble: D(24), gem: C(89), gold: C(83), goldSmall: C(84), fire: C(55),
} as const;

// ---- ground (Tiny Town) -------------------------------------------------------
export const GROUND = {
  grass: T(0), grassTuft: T(1), grassFlowers: T(2), tufts: T(1),
  /** 3x3 dirt patch: corners and edges blend into grass. */
  dirt: { tl: T(12), t: T(13), tr: T(14), l: T(24), c: T(25), r: T(26), bl: T(36), b: T(37), br: T(38) },
  path: [T(39), T(40), T(41), T(42)], cobble: D(42),
} as const;

/** Standalone trees: [top, bottom] pairs for two-tile trees, single tiles for small trees and bushes. */
export const TREES = {
  oak: { green: [T(4), T(16)], orange: [T(3), T(15)] },
  pine: { green: [T(4), T(16)], orange: [T(3), T(15)] },
  pine2: { green: [T(4), T(16)], orange: [T(3), T(15)] },
  small: { green: T(28), orange: T(27) },
  round: { green: T(5), orange: T(5) },
} as const;

// ---- buildings (Tiny Town) ----------------------------------------------------
/**
 * A building as rows of tiles, top to bottom, drawn `k` tiles wide per map
 * tile and anchored with the bottom row on the ground line. Extra props are
 * drawn at (dx, dy) tile offsets from the bottom-centre, `size` map tiles big.
 */
export interface BuildingSprite { k: number; rows: number[][]; props?: { ref: SpriteRef; dx: number; dy: number; size: number }[] }

export const BUILDING_SPRITES: Partial<Record<string, BuildingSprite>> = {
  hut: { k: 0.42, rows: [[48, 50], [60, 62], [72, 87]] },
  house: { k: 0.46, rows: [[52, 54], [64, 66], [84, 87]] },
  lumberCamp: { k: 0.45, rows: [[48, 50], [60, 62], [72, 87]], props: [{ ref: T(106), dx: 0.36, dy: 0.02, size: 0.42 }, { ref: T(127), dx: -0.38, dy: 0.02, size: 0.38 }] },
  well: { k: 0.68, rows: [[92], [104]] },
  granary: { k: 0.46, rows: [[52, 54], [64, 66], [72, 87]], props: [{ ref: T(107), dx: -0.38, dy: 0.02, size: 0.38 }, { ref: T(94), dx: 0.38, dy: 0.02, size: 0.38 }] },
  tavern: { k: 0.48, rows: [[52, 54], [64, 66], [84, 87]], props: [{ ref: T(83), dx: 0.42, dy: 0.02, size: 0.44 }] },
  blacksmith: { k: 0.46, rows: [[48, 50], [60, 62], [88, 91]], props: [{ ref: D(74), dx: -0.38, dy: 0.02, size: 0.42 }] },
  chapel: { k: 0.47, rows: [[48, 50], [60, 62], [88, 91]] },
  guildHall: { k: 0.48, rows: [[48, 50], [60, 62], [88, 91]] },
  walls: { k: 0.72, rows: [[102], [125]] },
  keep: { k: 0.48, rows: [[99, 101], [111, 112], [123, 124]] },
};

/** Tiles that carry a window (lit at night) and roof tiles (snow in winter). */
export const WINDOW_TILES = new Set([51, 55, 73, 84, 88, 125]);
export const ROOF_TILES = new Set([48, 49, 50, 51, 52, 53, 54, 55, 60, 61, 62, 63, 64, 65, 66, 67, 92, 99, 100, 101, 102]);
