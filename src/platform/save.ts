// Serialise / restore GameState and apply offline progress.
import type { GameState } from '../sim/types';
import { SAVE_VERSION, newGame } from '../sim/state';
import { advance } from '../sim/tick';
import { MAX_OFFLINE_SECONDS } from '../sim/constants';
import type { SaveStorage } from './storage';

const KEY = 'idlecity.save';
const SETTINGS_KEY = 'idlecity.settings';

export interface SaveFile {
  savedAt: number;
  state: GameState;
}

export interface Settings {
  locale?: string;
  speed?: number;
  muted?: boolean;
}

export function saveGame(storage: SaveStorage, s: GameState): void {
  const { fx: _fx, ...rest } = s;
  const file: SaveFile = { savedAt: Date.now(), state: { ...rest, fx: [] } };
  storage.save(KEY, JSON.stringify(file));
}

export interface LoadResult {
  state: GameState;
  /** Seconds of offline progress applied, or still to apply when `catchUp` is false (0 for a new game). */
  offlineSeconds: number;
  isNew: boolean;
}

export function loadGame(storage: SaveStorage, now = Date.now(), catchUp = true): LoadResult {
  const raw = storage.load(KEY);
  if (raw) {
    try {
      const file = JSON.parse(raw) as SaveFile;
      if (file.state && file.state.version === SAVE_VERSION) {
        const s = file.state;
        s.fx = [];
        const away = Math.min(MAX_OFFLINE_SECONDS, Math.max(0, (now - file.savedAt) / 1000));
        if (away > 5 && catchUp) advance(s, away);
        return { state: s, offlineSeconds: away > 5 ? away : 0, isNew: false };
      }
    } catch { /* corrupt save: start over */ }
  }
  return { state: newGame(), offlineSeconds: 0, isNew: true };
}

export function clearSave(storage: SaveStorage): void {
  storage.remove(KEY);
}

export function loadSettings(storage: SaveStorage): Settings {
  try { return JSON.parse(storage.load(SETTINGS_KEY) ?? '{}'); } catch { return {}; }
}

export function saveSettings(storage: SaveStorage, s: Settings): void {
  storage.save(SETTINGS_KEY, JSON.stringify(s));
}
