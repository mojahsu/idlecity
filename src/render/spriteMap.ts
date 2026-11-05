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
  rat: D(123), goblin: D(112), goblinChief: C(96), wolf: C(93), skeleton: C(1), ghoul: C(0), bandit: D(109),
  lich: C(65), imp: C(39), demon: C(38), orc: C(11), dragon: C(33), demonLord: C(123),
};
/** In the panel: a 0x72 animation prefix where one fits, else the map tile. */
export const MONSTER_ANIM: Partial<Record<string, string>> = {
  goblin: 'goblin', goblinChief: 'masked_orc', skeleton: 'skelet', ghoul: 'zombie', lich: 'necromancer', imp: 'imp',
  demon: 'chort', orc: 'orc_warrior', demonLord: 'big_demon',
};

// ---- animals (Tiny Creatures) -------------------------------------------------
export const ANIMAL = {
  chicken: C(150), dog: C(101), cat: C(94), wolf: C(93), deer: C(161), fox: C(169), owl: C(117), horse: C(50), sheep: C(153),
  fish: [C(60), C(61), C(62), C(63)], bat: C(132),
} as const;

// ---- props and tools (Tiny Town / Tiny Dungeon) -------------------------------
export const TOOL: Record<string, SpriteRef | undefined> = {
  lumberjack: T(129), quarryman: T(115), miner: T(115), builder: T(128), farmer: T(116),
};
export const PROP = {
  bow: T(118), arrow: T(119), bucket: T(131), crate: T(130), goldBag: T(93), coins: T(106), pot: T(107), hammer: T(128), axe: T(129),
  pickaxe: T(115), signpost: T(83), beehive: T(94), target: T(95), key: T(117), ladder: T(103), mushroom: T(29), mushrooms: T(30),
  sword: D(104), redSword: D(107), shield: D(102), anvil: D(74), potion: D(114), chest: D(89), chestOpen: D(91), skullMarker: D(60),
  rock: C(86), rockSmall: C(87), pebble: C(88), gem: C(89), gold: C(83), goldSmall: C(84), fire: C(55),
} as const;

// ---- ground (Tiny Town) -------------------------------------------------------
export const GROUND = {
  grass: T(0), grassTuft: T(1), grassFlowers: T(2), tufts: T(17),
  /** 3x3 dirt patch: corners and edges blend into grass. */
  dirt: { tl: T(12), t: T(13), tr: T(14), l: T(24), c: T(25), r: T(26), bl: T(36), b: T(37), br: T(38) },
  path: [T(39), T(40), T(41), T(42)], cobble: T(43),
} as const;

/** Trees: [top, bottom] pairs for two-tile trees, single tiles for small ones. */
export const TREES = {
  oak: { green: [T(4), T(16)], orange: [T(3), T(15)] },
  pine: { green: [T(19), T(31)], orange: [T(22), T(34)] },
  pine2: { green: [T(20), T(32)], orange: [T(23), T(35)] },
  small: { green: T(28), orange: T(27) },
  round: { green: T(5), orange: T(11) },
} as const;

// ---- buildings (Tiny Town) ----------------------------------------------------
/**
 * A building as rows of tiles, top to bottom, drawn `k` tiles wide per map
 * tile and anchored with the bottom row on the ground line. Extra props are
 * drawn at (dx, dy) tile offsets from the bottom-centre, `size` map tiles big.
 */
export interface BuildingSprite { k: number; rows: number[][]; props?: { ref: SpriteRef; dx: number; dy: number; size: number }[] }

export const BUILDING_SPRITES: Partial<Record<string, BuildingSprite>> = {
  hut: { k: 1, rows: [[67], [86]] },
  house: { k: 0.75, rows: [[52, 54], [64, 66], [72, 74]] },
  lumberCamp: { k: 1, rows: [[63], [86]], props: [{ ref: T(130), dx: 0.55, dy: 0, size: 0.5 }, { ref: T(129), dx: -0.5, dy: 0, size: 0.45 }] },
  quarry: { k: 1, rows: [[25]], props: [{ ref: C(86), dx: -0.2, dy: -0.1, size: 0.7 }, { ref: C(87), dx: 0.3, dy: 0.05, size: 0.5 }, { ref: T(115), dx: 0.45, dy: -0.25, size: 0.4 }] },
  well: { k: 1, rows: [[104]] },
  granary: { k: 0.85, rows: [[55], [67], [84]] },
  tavern: { k: 0.75, rows: [[52, 54], [64, 66], [84, 74]], props: [{ ref: T(83), dx: 0.7, dy: 0, size: 0.55 }] },
  blacksmith: { k: 0.75, rows: [[48, 50], [60, 62], [76, 78]], props: [{ ref: D(74), dx: -0.62, dy: 0.02, size: 0.5 }] },
  mine: { k: 0.75, rows: [[108, 110], [111, 112]], props: [{ ref: T(115), dx: 0.62, dy: 0, size: 0.45 }] },
  chapel: { k: 0.75, rows: [[48, 50], [60, 62], [88, 89]] },
  guildHall: { k: 0.75, rows: [[52, 54], [64, 66], [76, 78]] },
  walls: { k: 1, rows: [[97], [109]] },
  keep: { k: 0.75, rows: [[96, 98], [108, 110], [111, 112]] },
};

/** Tiles that carry a window (lit at night) and roof tiles (snow in winter). */
export const WINDOW_TILES = new Set([51, 55, 73, 84, 88, 125]);
export const ROOF_TILES = new Set([48, 49, 50, 51, 52, 53, 54, 55, 60, 61, 62, 63, 64, 65, 66, 67, 96, 97, 98]);
