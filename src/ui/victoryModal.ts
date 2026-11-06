// Grand Victory Chronicle modal: unfurls after the Demon Lord falls (and can be
// reopened anytime from the trophy button in the footer).
import type { GameState } from '../sim/types';
import { CLASSES } from '../data/adventurers';
import { DUNGEONS } from '../data/dungeons';
import { currentDay, year } from '../sim/time';
import { t } from '../i18n';

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

export class VictoryModal {
  private el: HTMLDivElement;
  private open = false;
  private victorySeen: boolean | null = null;
  private delayTimer = -1;
  private lastTick = -1;

  constructor(stage: HTMLElement, private onReset: () => void) {
    this.el = document.createElement('div');
    this.el.id = 'victory-modal';
    this.el.hidden = true;
    stage.appendChild(this.el);
  }

  update(s: GameState, btn: HTMLButtonElement | null): void {
    if (btn) {
      btn.hidden = !s.victory;
      btn.title = t('ui.victoryTitle');
    }
    if (this.lastTick >= 0 && s.tick < this.lastTick) {
      this.victorySeen = s.victory;
      this.delayTimer = -1;
      this.hide();
    }
    this.lastTick = s.tick;

    if (this.victorySeen === null) {
      this.victorySeen = s.victory;
    } else if (!this.victorySeen && s.victory) {
      this.victorySeen = true;
      this.delayTimer = performance.now() + 4500;
    }

    if (this.delayTimer > 0 && performance.now() >= this.delayTimer) {
      this.delayTimer = -1;
      this.show(s);
    } else if (this.open) {
      this.render(s);
    }
  }

  show(s: GameState): void {
    this.open = true;
    this.el.hidden = false;
    this.render(s);
  }

  hide(): void {
    this.open = false;
    this.el.hidden = true;
  }

  private render(s: GameState): void {
    const champs = [...s.adventurers]
      .filter((a) => a.status !== 'dead')
      .sort((a, b) => b.bossKills - a.bossKills || b.level - a.level || b.kills - a.kills)
      .slice(0, 4);
    const fallen = s.adventurers.filter((a) => a.status === 'dead');

    const champsHtml = champs.map((a) => `
      <div class="v-champ">
        <span class="v-cls" style="background:${CLASSES[a.cls].color}"></span>
        <div class="v-champ-info">
          <b>${esc(a.name)}</b>
          <small>${esc(t(`class.${a.cls}`))} · ${esc(t('ui.level', { level: a.level }))} · ⚔ ${a.kills}</small>
        </div>
      </div>
    `).join('');

    const dungeonsHtml = DUNGEONS.map((def) => {
      const d = s.dungeons.find((x) => x.id === def.id);
      const runs = d?.runs ?? 0;
      const done = d?.bossDefeated;
      return `<div class="v-row"><span>${esc(t(`dungeon.${def.id}`))}</span><b>${esc(t('ui.dungeonRuns', { runs, status: t(done ? 'ui.bossDown' : 'ui.bossAlive') }))}</b></div>`;
    }).join('');

    const fallenHtml = fallen.length
      ? fallen.map((a) => `<span class="v-fallen-tag">${esc(a.name)} (${esc(t(`class.${a.cls}`))} ${esc(t('ui.level', { level: a.level }))})</span>`).join(' ')
      : `<span class="v-perfect">✦ ${esc(t('ui.victoryNoDeaths'))}</span>`;

    const kids = s.children?.length ?? 0;
    this.el.innerHTML = `
      <div class="v-card">
        <div class="v-crown">👑</div>
        <h2>${esc(t('ui.victoryTitle'))}</h2>
        <p class="v-epilogue">${esc(t('ui.victoryEpilogue'))}</p>
        <div class="v-section">
          <h3>⚔ ${esc(t('ui.victoryHeroes'))}</h3>
          <div class="v-champs">${champsHtml}</div>
        </div>
        <div class="v-grid">
          <div class="v-section">
            <h3>🏰 ${esc(t('ui.victoryRealm'))}</h3>
            <div class="v-row"><span>${esc(t('ui.year', { year: year(s) }))} · ${esc(t('ui.day', { day: currentDay(s) }))}</span><b>${esc(t(`tier.${s.tier}`))}</b></div>
            <div class="v-row"><span>${esc(t('ui.population'))}</span><b>${s.workers.length}${kids ? ` + ${kids} ${esc(t('ui.children'))}` : ''}</b></div>
            <div class="v-row"><span>${esc(t('ui.equipment'))}</span><b>${esc(t('ui.level', { level: s.equipment }))}</b></div>
            <div class="v-row"><span>${esc(t('ui.log'))}</span><b>${esc(t('ui.stats', { built: s.stats.built, slain: s.stats.monstersSlain, runs: s.stats.dungeonRuns }))}</b></div>
          </div>
          <div class="v-section">
            <h3>🗺 ${esc(t('ui.victoryDungeons'))}</h3>
            ${dungeonsHtml}
          </div>
        </div>
        <div class="v-section">
          <h3>🕊 ${esc(t('ui.victoryFallen'))}</h3>
          <div class="v-fallen">${fallenHtml}</div>
        </div>
        <div class="v-actions">
          <button class="v-btn primary" id="v-keep">✨ ${esc(t('ui.keepWatching'))}</button>
          <button class="v-btn" id="v-new">🏰 ${esc(t('ui.newGame'))}</button>
        </div>
      </div>
    `;

    this.el.querySelector<HTMLButtonElement>('#v-keep')!.onclick = () => this.hide();
    this.el.querySelector<HTMLButtonElement>('#v-new')!.onclick = () => {
      if (confirm(t('ui.confirmReset'))) {
        this.hide();
        this.onReset();
      }
    };
  }
}
