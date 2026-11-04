import type { GameState, LogEntry, LogKind } from './types';
import { MAX_LOG } from './constants';
import { currentDay } from './time';

export function log(s: GameState, kind: LogKind, key: string, params?: Record<string, string | number>): void {
  const e: LogEntry = { day: currentDay(s), kind, key, params };
  s.log.push(e);
  if (s.log.length > MAX_LOG) s.log.splice(0, s.log.length - MAX_LOG);
}

/** Important events, kept forever. */
export function chronicle(s: GameState, kind: LogKind, key: string, params?: Record<string, string | number>): void {
  log(s, kind, key, params);
  s.chronicle.push({ day: currentDay(s), kind, key, params });
}
