// Multi-turn back-and-forth villager & hero skits. Picks a contextual script
// from skitScripts.ts, steps through the turns at a readable pace, draws speech
// bubbles above the speakers, and exposes the active scene for the Spotlight.
import type { GameState } from '../../sim/types';
import { isIndoors } from '../../sim/workers';
import { t } from '../../i18n';
import { TILE } from '../constants';
import { poly, roundRect, type Env } from '../palette';
import type { Walker } from './shared';
import { buildSkitPlans, type SkitPlan, type SkitSpeaker } from './skitScripts';

const TURN_TIME = 2.4;

export interface ActiveSkitView {
  id: number;
  topic: string;
  a: SkitSpeaker;
  b: SkitSpeaker;
  activeIdx: 0 | 1;
  line: string;
  prevLine: string | null;
  prevSpeaker: string | null;
}

let activeWorkerIds = new Set<number>();

/** True when a worker is currently participating in a multi-turn skit. */
export function isSpeakingInSkit(workerId: number): boolean {
  return activeWorkerIds.has(workerId);
}

interface RunningSkit {
  id: number;
  plan: SkitPlan;
  turnIdx: number;
  turnElapsed: number;
}

export class Skits {
  private running: RunningSkit | null = null;
  private nextId = 1;
  private cooldown = 4;
  private recentKeys = new Set<string>();
  private weddingDone = false;

  update(
    s: GameState,
    env: Env,
    dt: number,
    couple: { a: Walker; b: Walker } | null,
    kids: { id: number; name: string; x: number; y: number }[],
  ): void {
    if (!couple) this.weddingDone = false;
    if (s.raid) {
      if (this.running) this.stop();
      return;
    }

    if (this.running) {
      const { plan } = this.running;
      if (!this.refreshSpeaker(s, plan.a, couple, kids) || !this.refreshSpeaker(s, plan.b, couple, kids)) {
        this.stop();
        return;
      }
      if (Math.hypot(plan.a.x - plan.b.x, plan.a.y - plan.b.y) > 5.5) {
        this.stop();
        return;
      }
      this.running.turnElapsed += dt;
      if (this.running.turnElapsed >= TURN_TIME) {
        this.running.turnIdx++;
        this.running.turnElapsed = 0;
        if (this.running.turnIdx >= plan.turns.length) {
          this.stop();
          return;
        }
      }
      this.syncWorkerIds();
      return;
    }

    activeWorkerIds.clear();
    this.cooldown -= dt;
    const urgentWedding = couple && !this.weddingDone;
    if (!urgentWedding && (this.cooldown > 0 || env.dark > 0.75)) return;

    const plans = buildSkitPlans(s, urgentWedding ? couple : null, kids, this.recentKeys);
    if (!plans.length) {
      this.cooldown = 2.5;
      return;
    }
    const chosen = this.pickWeighted(plans);
    if (chosen.key === 'wedding') this.weddingDone = true;
    this.recentKeys.add(chosen.key);
    if (this.recentKeys.size > 10) {
      const first = this.recentKeys.values().next().value;
      if (first) this.recentKeys.delete(first);
    }
    this.running = { id: this.nextId++, plan: chosen, turnIdx: 0, turnElapsed: 0 };
    this.syncWorkerIds();
  }

  /** View of the currently playing skit for the Spotlight card. */
  current(): ActiveSkitView | null {
    if (!this.running) return null;
    const { id, plan, turnIdx } = this.running;
    const turn = plan.turns[turnIdx];
    const prev = turnIdx > 0 ? plan.turns[turnIdx - 1] : null;
    return {
      id,
      topic: t(plan.topicKey),
      a: plan.a,
      b: plan.b,
      activeIdx: turn.speaker,
      line: turn.text,
      prevLine: prev ? prev.text : null,
      prevSpeaker: prev ? (prev.speaker === 0 ? plan.a.name : plan.b.name) : null,
    };
  }

  /** Draw the active speaker's comic dialogue bubble above their head. */
  drawOverlay(ctx: CanvasRenderingContext2D, s: GameState): void {
    if (!this.running) return;
    const { plan, turnIdx, turnElapsed } = this.running;
    const turn = plan.turns[turnIdx];
    const sp = turn.speaker === 0 ? plan.a : plan.b;
    const other = turn.speaker === 0 ? plan.b : plan.a;
    const alpha = Math.max(0, Math.min(1, turnElapsed / 0.2, (TURN_TIME - turnElapsed) / 0.22));
    if (alpha <= 0) return;

    const W = s.width * TILE;
    const px = sp.x * TILE + TILE / 2;
    const py = sp.y * TILE + TILE / 2 - 20;
    const ox = other.x * TILE + TILE / 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 7px system-ui, sans-serif';
    const label = `${sp.name}: ${turn.text}`;
    const bw = Math.max(24, Math.ceil(ctx.measureText(label).width) + 10);
    const bh = 11;
    const bx = Math.max(4, Math.min(W - bw - 4, px - bw / 2));
    const by = Math.max(4, py - bh);

    roundRect(ctx, bx, by, bw, bh, 3, 'rgba(255,250,240,0.96)');
    ctx.strokeStyle = 'rgba(90,65,40,0.55)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(bx + 0.4, by + 0.4, bw - 0.8, bh - 0.8, 3);
    ctx.stroke();

    const tailX = Math.max(bx + 5, Math.min(bx + bw - 5, px));
    const lean = ox > px ? 1.5 : -1.5;
    poly(ctx, [tailX - 2.5, by + bh, tailX + 2.5, by + bh, tailX + lean, by + bh + 3.2], 'rgba(255,250,240,0.96)');

    ctx.textAlign = 'center';
    ctx.fillStyle = turn.color;
    ctx.fillText(label, bx + bw / 2, by + bh - 3);
    ctx.restore();
  }

  private stop(): void {
    this.running = null;
    this.cooldown = 5.5 + Math.random() * 4.5;
    activeWorkerIds.clear();
  }

  private syncWorkerIds(): void {
    activeWorkerIds.clear();
    if (!this.running) return;
    const { a, b } = this.running.plan;
    if (a.kind === 'worker') activeWorkerIds.add(a.id);
    if (b.kind === 'worker') activeWorkerIds.add(b.id);
  }

  private refreshSpeaker(
    s: GameState,
    sp: SkitSpeaker,
    couple: { a: Walker; b: Walker } | null,
    kids: { id: number; name: string; x: number; y: number }[],
  ): boolean {
    if (sp.kind === 'worker') {
      const w = s.workers.find((x) => x.id === sp.id);
      if (!w || isIndoors(s, w) || w.task?.kind === 'sleep' || w.task?.kind === 'douse') return false;
      sp.x = w.x;
      sp.y = w.y;
      return true;
    }
    if (sp.kind === 'adventurer') {
      const a = s.adventurers.find((x) => x.id === sp.id);
      if (!a || a.status !== 'resting') return false;
      sp.x = a.x;
      sp.y = a.y;
      return true;
    }
    if (sp.kind === 'child') {
      const k = kids.find((x) => x.id === sp.id);
      if (!k) return false;
      sp.x = k.x;
      sp.y = k.y;
      return true;
    }
    if (sp.kind === 'wedding') {
      if (!couple) return false;
      const w = sp.id === 0 ? couple.a : couple.b;
      sp.x = w.x;
      sp.y = w.y;
      return true;
    }
    return false;
  }

  private pickWeighted(plans: SkitPlan[]): SkitPlan {
    const total = plans.reduce((n, p) => n + p.weight, 0);
    let r = Math.random() * total;
    for (const p of plans) {
      r -= p.weight;
      if (r <= 0) return p;
    }
    return plans[plans.length - 1];
  }
}
