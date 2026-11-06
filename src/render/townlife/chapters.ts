// Story chapter scroll banners as the town progresses through its eras, plus
// the multi-stage Dawn of Peace canvas sequence when the Demon Lord falls.
import type { GameState } from '../../sim/types';
import { t } from '../../i18n';
import { TILE } from '../constants';
import { circle, rect, roundRect, rgba, type Env } from '../palette';

interface ChapterBanner {
  titleKey: string;
  subKey: string;
  ttl: number;
  life: number;
}

const CHAPTER_LIFE = 5.4;

export class Chapters {
  private inited = false;
  private lastSeed = -1;
  private seen = new Set<string>();
  private queue: { titleKey: string; subKey: string }[] = [];
  private active: ChapterBanner | null = null;
  private victoryCine = 0;

  update(s: GameState, dt: number): void {
    if (!this.inited || this.lastSeed !== s.seed) {
      this.inited = true;
      this.lastSeed = s.seed;
      this.seen.clear();
      this.queue = [];
      this.active = null;
      this.victoryCine = 0;
      if (s.tick > 30) {
        for (const id of this.reached(s)) this.seen.add(id);
      }
    }

    for (const id of this.reached(s)) {
      if (!this.seen.has(id)) {
        this.seen.add(id);
        this.queue.push({ titleKey: `chapter.${id}.title`, subKey: `chapter.${id}.sub` });
        if (id === '6') this.victoryCine = 15;
      }
    }

    if (this.victoryCine > 0) this.victoryCine = Math.max(0, this.victoryCine - dt);

    if (this.active) {
      this.active.ttl -= dt;
      if (this.active.ttl <= 0) this.active = null;
    } else if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.active = { ...next, ttl: CHAPTER_LIFE, life: CHAPTER_LIFE };
    }
  }

  overlay(ctx: CanvasRenderingContext2D, env: Env, s: GameState): void {
    const W = s.width * TILE, H = s.height * TILE;
    if (this.victoryCine > 0) this.drawVictorySequence(ctx, env, s, W, H);
    if (this.active) this.drawBanner(ctx, W, this.active);
  }

  private reached(s: GameState): string[] {
    const out: string[] = [];
    if (s.buildings.some((b) => b.built && b.type === 'tavern')) out.push('1');
    if (s.dungeons.some((d) => d.id === 'goblinCave' && d.unlocked)) out.push('2');
    if (s.dungeons.some((d) => d.id === 'emeraldCavern' && d.unlocked)) out.push('3');
    if (s.dungeons.some((d) => d.id === 'emberPeak' && d.unlocked)) out.push('4');
    if (s.dungeons.some((d) => d.id === 'darkTower' && d.unlocked)) out.push('5');
    if (s.victory) out.push('6');
    return out;
  }

  private drawVictorySequence(ctx: CanvasRenderingContext2D, env: Env, s: GameState, W: number, H: number): void {
    const elapsed = 15 - this.victoryCine;
    const tower = s.dungeons.find((d) => d.id === 'darkTower');
    ctx.save();
    // Stage 1 (0..7s): Dawn pillar of light cleaves the Dark Tower's clouds & shockwave rings expand.
    if (elapsed < 7 && tower) {
      const k = elapsed / 7;
      const a = Math.sin(k * Math.PI);
      const tx = tower.x * TILE + TILE / 2, ty = tower.y * TILE + TILE / 2;
      const g = ctx.createLinearGradient(tx, 0, tx, ty + 12);
      g.addColorStop(0, `rgba(255,245,180,${0.75 * a})`);
      g.addColorStop(1, `rgba(255,215,90,${0.15 * a})`);
      ctx.fillStyle = g;
      const bw = 22 + Math.sin(env.clock * 8) * 4;
      ctx.fillRect(tx - bw / 2, 0, bw, ty + 12);
      ctx.strokeStyle = `rgba(255,235,140,${0.7 * (1 - k)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(tx, ty, 12 + k * 95, 6 + k * 45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Stage 2 (2..15s): Golden blessing beam over the town square and drifting light motes across the realm.
    if (elapsed > 1.5) {
      const a = Math.min(1, (elapsed - 1.5) / 2, this.victoryCine / 2.5);
      const cx = s.center.x * TILE + TILE / 2, cy = s.center.y * TILE + TILE / 2;
      const g = ctx.createLinearGradient(cx, 0, cx, cy + 16);
      g.addColorStop(0, `rgba(255,240,170,${0.42 * a})`);
      g.addColorStop(1, 'rgba(255,220,100,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - 28, 0, 56, cy + 16);
      for (let i = 0; i < 24; i++) {
        const mx = ((i * 67 + env.clock * 18 * (i % 2 ? 1 : -1)) % W + W) % W;
        const my = ((i * 43 + env.clock * 22) % H + H) % H;
        circle(ctx, mx, my, 1.4 + (i % 2) * 0.6, rgba('#ffe888', 0.55 * a));
      }
    }
    ctx.restore();
  }

  private drawBanner(ctx: CanvasRenderingContext2D, W: number, b: ChapterBanner): void {
    const k = 1 - b.ttl / b.life;
    const unfurl = Math.min(1, k / 0.14, (1 - k) / 0.16);
    if (unfurl <= 0) return;

    const title = t(b.titleKey);
    const sub = t(b.subKey);
    ctx.save();
    ctx.font = 'bold 11px system-ui, sans-serif';
    const w1 = ctx.measureText(title).width;
    ctx.font = '9px system-ui, sans-serif';
    const w2 = ctx.measureText(sub).width;
    const fullW = Math.max(190, Math.max(w1, w2) + 38);
    const cw = Math.max(16, fullW * unfurl);
    const ch = 34;
    const cx = (W - cw) / 2, cy = 12;

    ctx.globalAlpha = Math.min(1, unfurl * 1.3);
    roundRect(ctx, cx, cy, cw, ch, 4, 'rgba(34,24,16,0.92)');
    ctx.strokeStyle = '#d8b058';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect(cx + 1, cy + 1, cw - 2, ch - 2, 3.5);
    ctx.stroke();

    // Wooden & gold scroll rods on the left and right ends.
    rect(ctx, cx - 3, cy - 2, 4, ch + 4, '#6a4624');
    rect(ctx, cx + cw - 1, cy - 2, 4, ch + 4, '#6a4624');
    circle(ctx, cx - 1, cy - 2, 2.4, '#f0d070');
    circle(ctx, cx - 1, cy + ch + 2, 2.4, '#f0d070');
    circle(ctx, cx + cw + 1, cy - 2, 2.4, '#f0d070');
    circle(ctx, cx + cw + 1, cy + ch + 2, 2.4, '#f0d070');

    if (unfurl > 0.55) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx + 4, cy, cw - 8, ch);
      ctx.clip();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe898';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(title, W / 2, cy + 15);
      ctx.fillStyle = '#e8dcc8';
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillText(sub, W / 2, cy + 27);
      ctx.restore();
    }
    ctx.restore();
  }
}
