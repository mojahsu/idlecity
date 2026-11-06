// Browser entry point: wires simulation, renderer, HUD and storage together.
import { advance, step } from './sim/tick';
import { TICK } from './sim/constants';
import type { GameState } from './sim/types';
import { newGame } from './sim/state';
import { Renderer } from './render/renderer';
import { Hud } from './ui/hud';
import { LocalStorageSave } from './platform/storage';
import { BrowserFullscreen } from './platform/fullscreen';
import { AudioEngine } from './platform/audio';
import { Soundtrack } from './platform/soundtrack';
import { clearSave, loadGame, loadSettings, saveGame, saveSettings } from './platform/save';
import { detectLocale, setLocale, t, type Locale } from './i18n';

const storage = new LocalStorageSave();
const settings = loadSettings(storage);
setLocale((settings.locale as Locale) ?? detectLocale());

let speed = settings.speed ?? 1;
let state: GameState;

const canvas = document.getElementById('game') as HTMLCanvasElement;
const app = document.getElementById('app')!;
const renderer = new Renderer(canvas);
const fullscreen = new BrowserFullscreen(app);
const audio = new AudioEngine(settings.muted ?? false);
const soundtrack = new Soundtrack(audio);
const hud = new Hud({
  onSpeed(sp) { speed = sp; hud.setSpeed(sp); settings.speed = sp; saveSettings(storage, settings); },
  onLocale(l) { setLocale(l); settings.locale = l; saveSettings(storage, settings); },
  onReset() { clearSave(storage); state = newGame(); catchUp = 0; fitStage(); },
  onFullscreen() { void fullscreen.toggle(); },
  onMute() { toggleMute(); },
});
function toggleMute(): void {
  audio.ensure();
  const m = !audio.isMuted();
  audio.setMuted(m); hud.setMuted(m); settings.muted = m; saveSettings(storage, settings);
}
hud.setMuted(audio.isMuted());
fullscreen.onChange(() => { hud.setFullscreen(fullscreen.isFullscreen()); showCursor(); });
canvas.addEventListener('dblclick', () => { void fullscreen.toggle(); });
canvas.addEventListener('click', (e) => { guarded('click', () => renderer.handleClick(state, e.clientX, e.clientY)); });

// Hide the mouse cursor after a few idle seconds while fullscreen (watch mode).
let cursorTimer = 0;
function showCursor(): void {
  app.classList.remove('idle');
  clearTimeout(cursorTimer);
  if (fullscreen.isFullscreen()) cursorTimer = window.setTimeout(() => app.classList.add('idle'), 3000);
}
window.addEventListener('mousemove', showCursor);
hud.setSpeed(speed);

// Offline progress is replayed a little each frame so the town appears at once
// and visibly races through the hours it missed.
let catchUp = 0, catchUpTotal = 0;
let before = { wood: 0, stone: 0, food: 0, gold: 0 };
{
  const loaded = loadGame(storage, Date.now(), false);
  state = loaded.state;
  if (loaded.offlineSeconds > 0) {
    catchUp = catchUpTotal = loaded.offlineSeconds;
    const r = state.resources;
    before = { wood: r.wood, stone: r.stone, food: r.food, gold: r.gold };
  }
}
const CATCH_UP_PER_FRAME = 20; // game seconds per sim call inside the time slice

// Driven by a timer rather than the frame loop, so a tab opened in the
// background (where frames are throttled) still catches up.
// One bad frame must not stop the town: errors are logged (once per message) and the loop goes on.
const reported = new Set<string>();
function guarded(where: string, fn: () => void): void {
  try { fn(); } catch (err) {
    const msg = `${where}: ${err instanceof Error ? err.message : String(err)}`;
    if (!reported.has(msg)) { reported.add(msg); console.error('[idle town]', msg, err); }
  }
}

function runCatchUp(): void {
  // Replay as much as fits in a slice of wall time, so throttled timers still finish quickly.
  const until = performance.now() + 12;
  while (catchUp > 0 && performance.now() < until) {
    const chunk = Math.min(catchUp, CATCH_UP_PER_FRAME);
    guarded('catch-up', () => advance(state, chunk));
    catchUp -= chunk; // a throw must not leave the town waiting on a catch-up that never ends
  }
  if (catchUp > 0) { hud.showToast(t('ui.catchingUp', { minutes: Math.ceil(catchUp / 60) }), 2); setTimeout(runCatchUp, 16); return; }
  const r = state.resources;
  hud.showToast(t('ui.whileAway', {
    minutes: Math.round(catchUpTotal / 60),
    wood: Math.floor(r.wood - before.wood), stone: Math.floor(r.stone - before.stone), food: Math.floor(r.food - before.food), gold: Math.floor(r.gold - before.gold),
  }), 12);
}

/** The canvas keeps the map's aspect ratio; the map size lives in the save, so older towns keep their shape. */
function fitStage(): void { document.documentElement.style.setProperty('--aspect', String(state.width / state.height)); }
fitStage();

let last = performance.now();
let acc = 0;
let hudTimer = 0;
let saveTimer = 0;
const MAX_TICKS_PER_FRAME = 60;

function frame(now: number): void {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (catchUp > 0) acc = 0; // the catch-up timer is stepping the sim; just keep drawing
  else {
    acc += dt * speed;
    let ticks = 0;
    while (acc >= TICK && ticks < MAX_TICKS_PER_FRAME) { guarded('sim', () => step(state)); acc -= TICK; ticks++; }
    if (ticks === MAX_TICKS_PER_FRAME) acc = 0;
  }
  guarded('render', () => renderer.render(state, dt));
  soundtrack.update(state, dt, speed, renderer.drainEvents());
  hudTimer += dt;
  if (hudTimer > 0.25) { hudTimer = 0; hud.update(state); }
  saveTimer += dt;
  if (saveTimer > 30) { saveTimer = 0; saveGame(storage, state); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (catchUp > 0) setTimeout(runCatchUp, 0);

// Dev-only console hook for tuning and visual checks: idleTown.advance(3600).
if (import.meta.env.DEV) {
  (window as unknown as { idleTown: unknown }).idleTown = {
    get state() { return state; },
    renderer,
    advance(seconds: number) { advance(state, seconds); },
    set time(t: number) { state.time = t; },
    get catchUp() { return catchUp; },
    audio, soundtrack,
  };
}

/** A compact picture of the moving parts, for bug reports (press D). */
function diagnostics(s: GameState): string {
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return JSON.stringify({
    time: r1(s.time), day: Math.floor(s.time / 60) + 1, width: s.width, height: s.height, victory: s.victory, catchUp: r1(catchUp), speed,
    parties: s.parties.map((p) => ({ id: p.id, dungeon: p.dungeon, phase: p.phase, floor: p.floor, x: r1(p.x), y: r1(p.y), path: p.path.length, next: p.path[0], timer: r1(p.timer), actIdx: p.actIdx, stuck: r1(p.stuck ?? 0), members: p.memberIds, enc: p.encounter && { m: p.encounter.monster, boss: p.encounter.boss, hp: p.encounter.hp, enemies: p.encounter.enemies?.map((e) => [e.monster, Math.round(e.hp)]) } })),
    adventurers: s.adventurers.map((a) => ({ id: a.id, name: a.name, cls: a.cls, lv: a.level, status: a.status, hp: Math.round(a.hp), max: Math.round(a.maxHp), x: r1(a.x), y: r1(a.y), path: a.path.length, pastime: a.pastime, party: a.partyId })),
    dungeons: s.dungeons.map((d) => ({ id: d.id, x: d.x, y: d.y, unlocked: d.unlocked, boss: d.bossDefeated, bossHp: d.bossHp, runs: d.runs })),
    raid: s.raid && { m: s.raid.monster, phase: s.raid.phase, x: r1(s.raid.x), y: r1(s.raid.y), hp: Math.round(s.raid.hp) },
    buildings: s.buildings.filter((b) => b.type === 'tavern' || b.type === 'guildHall').map((b) => [b.type, b.x, b.y, b.built]),
    log: s.log.slice(-8).map((l) => l.key),
  });
}

document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(storage, state); });
window.addEventListener('beforeunload', () => saveGame(storage, state));
window.addEventListener('keydown', (e) => {
  if (e.key === ' ') { e.preventDefault(); const sp = speed === 0 ? (settings.speed || 1) : 0; speed = sp; hud.setSpeed(sp); }
  if (e.key === 'f' || e.key === 'F') { void fullscreen.toggle(); }
  if (e.key === 'm' || e.key === 'M') toggleMute();
  if (e.key === 'd' || e.key === 'D') {
    // Copy a state summary for bug reports; where the clipboard is off limits, show it to copy by hand.
    const text = diagnostics(state);
    const fallback = () => window.prompt('Idle Town diagnostics', text);
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => hud.showToast(t('ui.diagCopied'), 4), fallback); else fallback();
  }
  if (e.key === '1' || e.key === '2' || e.key === '3') { speed = [1, 2, 4][Number(e.key) - 1]; hud.setSpeed(speed); settings.speed = speed; saveSettings(storage, settings); }
});
