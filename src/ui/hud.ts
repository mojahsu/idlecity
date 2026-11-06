// DOM-side HUD: top bar, adventurer list, event log, chronicle, controls.
import type { GameState } from '../sim/types';
import { RESOURCE_IDS } from '../sim/types';
import { BUILDINGS } from '../data/buildings';
import { CLASSES } from '../data/adventurers';
import { skillsFor } from '../data/skills';
import { currentDay, season, year } from '../sim/time';
import { resourceColor } from '../sim/workers';
import { alive } from '../sim/adventurers';
import { LOCALES, getLocale, setLocale, t, type Locale } from '../i18n';
import { VictoryModal } from './victoryModal';

export interface HudCallbacks {
  onSpeed(speed: number): void;
  onLocale(locale: Locale): void;
  onReset(): void;
  onFullscreen(): void;
  onMute(): void;
  onCamera?(): void;
  on3D?(): void;
}

const SPEEDS = [0, 1, 2, 4];

export class Hud {
  private top = document.getElementById('topbar')!;
  private advList = document.querySelector<HTMLUListElement>('#adventurers ul')!;
  private eventList = document.querySelector<HTMLUListElement>('#events ul')!;
  private chronList = document.querySelector<HTMLUListElement>('#chronicle ul')!;
  private controls = document.getElementById('controls')!;
  private banner = document.getElementById('banner')!;
  private speed = 1;
  private fullscreen = false;
  private muted = false;
  private cameraOn = false;
  private mode3dOn = true;
  private lastLogLen = -1;
  private lastChronLen = -1;
  private lastLocale = '';
  private toast: { text: string; until: number } | null = null;
  private victoryModal: VictoryModal;
  private currentState: GameState | null = null;

  constructor(private cb: HudCallbacks) {
    this.victoryModal = new VictoryModal(document.getElementById('stage')!, () => this.cb.onReset());
    this.buildControls();
  }

  /** Relabel the fullscreen button; called on toggle and on locale change. */
  setFullscreen(on: boolean): void {
    this.fullscreen = on;
    const b = document.getElementById('fullscreen');
    if (b) { b.textContent = t(on ? 'ui.exitFullscreen' : 'ui.fullscreen'); b.title = t('ui.fullscreenHint'); }
  }

  /** Relabel the sound button. */
  setMuted(on: boolean): void {
    this.muted = on;
    const b = document.getElementById('mute');
    if (b) { b.textContent = on ? '🔇' : '🔊'; b.title = t(on ? 'ui.unmute' : 'ui.mute'); }
  }

  /** Relabel and highlight the cinematic camera button. */
  setCamera(on: boolean): void {
    this.cameraOn = on;
    const b = document.getElementById('camera-btn');
    if (b) {
      b.classList.toggle('active', on);
      b.title = t(on ? 'ui.cameraOff' : 'ui.cameraOn');
    }
  }

  /** Relabel and highlight the Three.js 3D HD-2D mode button. */
  set3D(on: boolean): void {
    this.mode3dOn = on;
    const b = document.getElementById('mode3d-btn');
    if (b) {
      b.classList.toggle('active', on);
      b.title = t(on ? 'ui.mode3dOff' : 'ui.mode3dOn');
    }
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    this.controls.querySelectorAll<HTMLButtonElement>('button[data-speed]').forEach((b) => b.classList.toggle('active', Number(b.dataset.speed) === speed));
  }

  showToast(text: string, seconds = 8): void {
    this.toast = { text, until: performance.now() + seconds * 1000 };
  }

  private buildControls(): void {
    const c = this.controls;
    c.innerHTML = '';
    for (const sp of SPEEDS) {
      const b = document.createElement('button');
      b.dataset.speed = String(sp);
      b.textContent = sp === 0 ? '⏸' : `${sp}×`;
      b.title = sp === 0 ? t('ui.pause') : t('ui.speed');
      b.onclick = () => this.cb.onSpeed(sp);
      c.appendChild(b);
    }
    const stats = document.createElement('span');
    stats.className = 'stats';
    stats.id = 'stats';
    c.appendChild(stats);
    const spacer = document.createElement('span');
    spacer.className = 'spacer';
    c.appendChild(spacer);
    const vic = document.createElement('button');
    vic.id = 'victory-btn';
    vic.textContent = '🏆';
    vic.hidden = true;
    vic.onclick = () => { if (this.currentState) this.victoryModal.show(this.currentState); };
    c.appendChild(vic);
    const sel = document.createElement('select');
    for (const l of LOCALES) {
      const o = document.createElement('option');
      o.value = l.id; o.textContent = l.label;
      sel.appendChild(o);
    }
    sel.value = getLocale();
    sel.onchange = () => this.cb.onLocale(sel.value as Locale);
    c.appendChild(sel);
    const reset = document.createElement('button');
    reset.id = 'reset';
    reset.onclick = () => { if (confirm(t('ui.confirmReset'))) this.cb.onReset(); };
    c.appendChild(reset);
    const fs = document.createElement('button');
    fs.id = 'fullscreen';
    fs.onclick = () => this.cb.onFullscreen();
    c.appendChild(fs);
    const m3d = document.createElement('button');
    m3d.id = 'mode3d-btn';
    m3d.textContent = '🧊 3D';
    m3d.onclick = () => this.cb.on3D?.();
    c.appendChild(m3d);
    const cam = document.createElement('button');
    cam.id = 'camera-btn';
    cam.textContent = '🎥';
    cam.onclick = () => this.cb.onCamera?.();
    c.appendChild(cam);
    const mu = document.createElement('button');
    mu.id = 'mute';
    mu.onclick = () => this.cb.onMute();
    c.appendChild(mu);
    this.setMuted(this.muted);
    this.setCamera(this.cameraOn);
    this.set3D(this.mode3dOn);
    this.setSpeed(this.speed);
  }

  /** Called a few times per second; cheap DOM updates only. */
  update(s: GameState): void {
    this.currentState = s;
    const localeChanged = this.lastLocale !== getLocale();
    if (localeChanged) {
      this.lastLocale = getLocale();
      document.title = t('app.title');
      document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n!); });
      document.getElementById('reset')!.textContent = t('ui.newGame');
      this.setFullscreen(this.fullscreen);
      this.setMuted(this.muted);
      this.setCamera(this.cameraOn);
      this.set3D(this.mode3dOn);
      this.lastLogLen = -1; this.lastChronLen = -1;
    }
    this.updateTop(s);
    this.updateAdventurers(s);
    if (s.log.length !== this.lastLogLen || s.log[s.log.length - 1] !== this.lastLogTail) {
      this.lastLogLen = s.log.length; this.lastLogTail = s.log[s.log.length - 1];
      this.renderList(this.eventList, s.log.slice(-40).reverse());
    }
    if (s.chronicle.length !== this.lastChronLen) {
      this.lastChronLen = s.chronicle.length;
      this.renderList(this.chronList, s.chronicle.slice(-30).reverse());
    }
    document.getElementById('stats')!.textContent = t('ui.stats', { built: s.stats.built, slain: s.stats.monstersSlain, runs: s.stats.dungeonRuns });
    this.updateBanner(s);
    this.victoryModal.update(s, document.getElementById('victory-btn') as HTMLButtonElement | null);
  }
  private lastLogTail: unknown = null;

  private updateTop(s: GameState): void {
    const parts: string[] = [];
    parts.push(`<span class="title">${esc(t('app.title'))} · ${esc(t(`tier.${s.tier}`))}</span>`);
    parts.push(`<span class="stat">${esc(t('ui.year', { year: year(s) }))} · ${esc(t('ui.day', { day: currentDay(s) }))} · ${esc(t(`season.${season(s)}`))}</span>`);
    const kids = s.children?.length ?? 0;
    parts.push(`<span class="stat">${esc(t('ui.population'))} <b>${s.workers.length}</b>${kids ? ` <small>+${kids} ${esc(t('ui.children'))}</small>` : ''}</span>`);
    for (const r of RESOURCE_IDS) {
      parts.push(`<span class="stat"><i class="dot" style="background:${resourceColor(r)}"></i>${esc(t(`res.${r}`))} <b>${Math.floor(s.resources[r])}</b></span>`);
    }
    parts.push(`<span class="stat">${esc(t('ui.adventurers'))} <b>${alive(s).length}</b></span>`);
    parts.push(`<span class="stat">${esc(t('ui.equipment'))} <b>${s.equipment}</b></span>`);
    const want = s.mayor.want ? t('ui.mayorWants', { building: `building.${s.mayor.want}` }) : t('ui.mayorIdle');
    parts.push(`<span class="next">${esc(want)}</span>`);
    this.top.innerHTML = parts.join('');
  }

  private updateAdventurers(s: GameState): void {
    const list = [...s.adventurers].sort((a, b) => (a.status === 'dead' ? 1 : 0) - (b.status === 'dead' ? 1 : 0) || b.level - a.level).slice(0, 14);
    const html = list.map((a) => {
      let status = t(`ui.${a.status}`);
      if (a.status === 'resting' && a.pastime === 'sally') status = t('ui.defending');
      else if (a.status === 'resting' && a.pastime === 'train') status = t('ui.training');
      if (a.status === 'questing') {
        const p = s.parties.find((x) => x.id === a.partyId);
        if (p?.encounter) status = t('ui.fighting', { monster: `monster.${p.encounter.monster}` });
        else if (p && p.phase !== 'travel' && p.phase !== 'return') status = t('ui.questing', { dungeon: `dungeon.${p.dungeon}`, floor: p.floor });
        else if (p) status = t(`dungeon.${p.dungeon}`);
      }
      return `<li class="adv ${a.status === 'dead' ? 'dead' : ''}">
        <i class="cls" style="background:${CLASSES[a.cls].color}"></i>
        <span class="name">${esc(a.name)}<small>${esc(t(`class.${a.cls}`))} ${esc(t('ui.level', { level: a.level }))}</small>${skillsFor(a.cls, a.level).map((sk) => `<b class="sk ${sk.level > 1 ? 'adv' : ''}" style="color:${sk.level > 1 ? '#f0d050' : CLASSES[a.cls].color}" title="${esc(t(`skill.${sk.id}`))}">${sk.level > 1 ? '★' : '◆'}</b>`).join('')}</span>
        <span class="status">${esc(status)}</span>
        <span class="hp"><i style="width:${Math.max(0, Math.min(100, (a.hp / a.maxHp) * 100)).toFixed(0)}%"></i></span>
      </li>`;
    }).join('');
    if (html !== this.advList.innerHTML) this.advList.innerHTML = html;
  }

  private renderList(ul: HTMLUListElement, entries: GameState['log']): void {
    ul.innerHTML = entries.map((e) => `<li class="kind-${e.kind}"><span class="day">${esc(t('ui.day', { day: e.day }))}</span>${esc(t(e.key, e.params))}</li>`).join('');
  }

  private updateBanner(s: GameState): void {
    let text = '';
    let danger = false;
    if (this.toast && performance.now() < this.toast.until) text = this.toast.text;
    else if (s.raid) { text = t('ui.raid', { count: s.raid.count, monster: `monster.${s.raid.monster}` }); danger = true; }
    else if (s.victory) text = t('ui.victory');
    this.banner.hidden = !text;
    this.banner.textContent = text;
    this.banner.classList.toggle('danger', danger);
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

export { BUILDINGS };
