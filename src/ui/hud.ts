// DOM-side HUD: top bar, adventurer list, event log, chronicle, controls.
import type { GameState } from '../sim/types';
import { RESOURCE_IDS } from '../sim/types';
import { BUILDINGS } from '../data/buildings';
import { CLASSES } from '../data/adventurers';
import { currentDay, season, year } from '../sim/time';
import { resourceColor } from '../sim/workers';
import { alive } from '../sim/adventurers';
import { LOCALES, getLocale, setLocale, t, type Locale } from '../i18n';

export interface HudCallbacks {
  onSpeed(speed: number): void;
  onLocale(locale: Locale): void;
  onReset(): void;
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
  private lastLogLen = -1;
  private lastChronLen = -1;
  private lastLocale = '';
  private toast: { text: string; until: number } | null = null;

  constructor(private cb: HudCallbacks) {
    this.buildControls();
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
    this.setSpeed(this.speed);
  }

  /** Called a few times per second; cheap DOM updates only. */
  update(s: GameState): void {
    const localeChanged = this.lastLocale !== getLocale();
    if (localeChanged) {
      this.lastLocale = getLocale();
      document.title = t('app.title');
      document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n!); });
      document.getElementById('reset')!.textContent = t('ui.newGame');
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
  }
  private lastLogTail: unknown = null;

  private updateTop(s: GameState): void {
    const parts: string[] = [];
    parts.push(`<span class="title">${esc(t('app.title'))} · ${esc(t(`tier.${s.tier}`))}</span>`);
    parts.push(`<span class="stat">${esc(t('ui.year', { year: year(s) }))} · ${esc(t('ui.day', { day: currentDay(s) }))} · ${esc(t(`season.${season(s)}`))}</span>`);
    parts.push(`<span class="stat">${esc(t('ui.population'))} <b>${s.workers.length}</b></span>`);
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
      if (a.status === 'questing') {
        const p = s.parties.find((x) => x.id === a.partyId);
        if (p?.encounter) status = t('ui.fighting', { monster: `monster.${p.encounter.monster}` });
        else if (p && p.phase !== 'travel' && p.phase !== 'return') status = t('ui.questing', { dungeon: `dungeon.${p.dungeon}`, floor: p.floor });
        else if (p) status = t(`dungeon.${p.dungeon}`);
      }
      return `<li class="adv ${a.status === 'dead' ? 'dead' : ''}">
        <i class="cls" style="background:${CLASSES[a.cls].color}"></i>
        <span class="name">${esc(a.name)}<small>${esc(t(`class.${a.cls}`))} ${esc(t('ui.level', { level: a.level }))}</small></span>
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
