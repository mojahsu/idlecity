// Season colour sets for ground, trees, water and crops.

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonPalette {
  grass: string;
  grassAlt: string;
  grassDark: string;
  tuft: string;
  flowers: string[];
  canopy: string[];
  canopyShade: string;
  bush: string;
  dirt: string;
  dirtEdge: string;
  water: string;
  waterDeep: string;
  bank: string;
  crop: string;
  cropHeight: number;
}

export const PALETTE: Record<Season, SeasonPalette> = {
  spring: {
    grass: '#6aa84f', grassAlt: '#74b257', grassDark: '#4f8c3c', tuft: '#8ccb62',
    flowers: ['#ffffff', '#f7d94c', '#f29ac6'],
    canopy: ['#3f9a4c', '#4daa58', '#5db862', '#8fcf7a'], canopyShade: '#2d7338',
    bush: '#4f9a3f', dirt: '#b89a6a', dirtEdge: '#8f7347', water: '#3e86bd', waterDeep: '#2c6693', bank: '#c9b885',
    crop: '#8ccb62', cropHeight: 0.35,
  },
  summer: {
    grass: '#5f9c3e', grassAlt: '#68a646', grassDark: '#487f31', tuft: '#7fbd55',
    flowers: ['#f7d94c', '#f06a4f'],
    canopy: ['#2f7f3c', '#3a8f45', '#459c4e', '#6ab861'], canopyShade: '#245f2c',
    bush: '#45903a', dirt: '#b3935f', dirtEdge: '#866a3e', water: '#3b84bb', waterDeep: '#296190', bank: '#c7b27a',
    crop: '#6fb44a', cropHeight: 0.8,
  },
  autumn: {
    grass: '#86a048', grassAlt: '#92aa50', grassDark: '#687f36', tuft: '#b3b65a',
    flowers: ['#e0b040'],
    canopy: ['#c8692c', '#d98a30', '#e0a838', '#b84a2a'], canopyShade: '#8a3f1c',
    bush: '#8a8a3a', dirt: '#ad8f5e', dirtEdge: '#7f663b', water: '#3f7fae', waterDeep: '#2b5c84', bank: '#bda772',
    crop: '#e0b848', cropHeight: 1,
  },
  winter: {
    grass: '#dde3e6', grassAlt: '#d3dadd', grassDark: '#bfc8cd', tuft: '#c8d0d4',
    flowers: [],
    canopy: ['#6f8f6a', '#7a9a74', '#86a67f', '#a8bfa2'], canopyShade: '#4f6b4b',
    bush: '#6a7f5a', dirt: '#c9c2b4', dirtEdge: '#9f988a', water: '#5b8fbd', waterDeep: '#3f6d94', bank: '#d9d7cc',
    crop: '#b0a080', cropHeight: 0.1,
  },
};
