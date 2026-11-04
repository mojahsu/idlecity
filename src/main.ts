// Browser entry point: wires simulation, renderer, HUD and storage together.
import { step } from './sim/tick';
import { TICK } from './sim/constants';
import type { GameState } from './sim/types';
import { newGame } from './sim/state';
import { Renderer } from './render/renderer';
import { Hud } from './ui/hud';
import { LocalStorageSave } from './platform/storage';
import { clearSave, loadGame, loadSettings, saveGame, saveSettings } from './platform/save';
import { detectLocale, setLocale, t, type Locale } from './i18n';

const storage = new LocalStorageSave();
const settings = loadSettings(storage);
setLocale((settings.locale as Locale) ?? detectLocale());

let speed = settings.speed ?? 1;
let state: GameState;

const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const hud = new Hud({
  onSpeed(sp) { speed = sp; hud.setSpeed(sp); settings.speed = sp; saveSettings(storage, settings); },
  onLocale(l) { setLocale(l); settings.locale = l; saveSettings(storage, settings); },
  onReset() { clearSave(storage); state = newGame(); },
});
hud.setSpeed(speed);

{
  const before = { ...newGame(1).resources };
  const loaded = loadGame(storage);
  state = loaded.state;
  if (loaded.offlineSeconds > 0) {
    const r = state.resources;
    hud.showToast(t('ui.whileAway', {
      minutes: Math.round(loaded.offlineSeconds / 60),
      wood: Math.floor(r.wood - before.wood), stone: Math.floor(r.stone), food: Math.floor(r.food), gold: Math.floor(r.gold),
    }), 12);
  }
}

let last = performance.now();
let acc = 0;
let hudTimer = 0;
let saveTimer = 0;
const MAX_TICKS_PER_FRAME = 60;

function frame(now: number): void {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  acc += dt * speed;
  let ticks = 0;
  while (acc >= TICK && ticks < MAX_TICKS_PER_FRAME) { step(state); acc -= TICK; ticks++; }
  if (ticks === MAX_TICKS_PER_FRAME) acc = 0;
  renderer.render(state, dt);
  hudTimer += dt;
  if (hudTimer > 0.25) { hudTimer = 0; hud.update(state); }
  saveTimer += dt;
  if (saveTimer > 30) { saveTimer = 0; saveGame(storage, state); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(storage, state); });
window.addEventListener('beforeunload', () => saveGame(storage, state));
window.addEventListener('keydown', (e) => {
  if (e.key === ' ') { e.preventDefault(); const sp = speed === 0 ? (settings.speed || 1) : 0; speed = sp; hud.setSpeed(sp); }
  if (e.key === '1' || e.key === '2' || e.key === '3') { speed = [1, 2, 4][Number(e.key) - 1]; hud.setSpeed(speed); settings.speed = speed; saveSettings(storage, settings); }
});
