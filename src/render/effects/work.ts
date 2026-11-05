// Debris from working people: chips, sparks, dust, scattered feed.
import type { GameState, Worker } from '../../sim/types';
import { TILE } from '../constants';
import type { Env } from '../palette';
import type { Particles } from './particles';

export class WorkDebris {
  private workTimers = new Map<number, number>();

  emitWork(s: GameState, env: Env, dt: number, P: Particles): void {
    const seen = new Set<number>();
    for (const w of s.workers) {
      const feeding = w.task?.kind === 'rest' && w.task.activity === 'feed' && w.task.phase === 'do';
      if (!feeding && (!w.task || !('phase' in w.task) || w.task.phase !== 'work')) continue;
      seen.add(w.id);
      const t = (this.workTimers.get(w.id) ?? 0.3) - dt;
      if (t > 0) { this.workTimers.set(w.id, t); continue; }
      this.workTimers.set(w.id, 0.45 + Math.random() * 0.2);
      this.workDebris(w, env, P);
    }
    for (const k of [...this.workTimers.keys()]) if (!seen.has(k)) this.workTimers.delete(k);
  }

  workDebris(w: Worker, env: Env, P: Particles): void {
    const px = w.x * TILE + TILE / 2 + 6, py = w.y * TILE + TILE / 2;
    const task = w.task!;
    if (task.kind === 'rest') { for (let i = 0; i < 3; i++) P.spawn('chip', px - 4, py - 6, (Math.random() - 0.3) * 30 + 10, -10 - Math.random() * 20, 0.6, 1, '#e8d080'); return; }
    const res = task.kind === 'gather' ? task.resource : task.kind === 'farm' ? 'food' : 'build';
    if (res === 'wood') for (let i = 0; i < 4; i++) P.spawn('chip', px, py - 2, (Math.random() - 0.3) * 40, -30 - Math.random() * 30, 0.6, 1.4, i % 2 ? '#d6a86c' : '#8a5a30');
    else if (res === 'stone' || res === 'iron') { for (let i = 0; i < 3; i++) P.spawn('chip', px, py, (Math.random() - 0.3) * 40, -20 - Math.random() * 30, 0.5, 1.2, '#a8a8a4'); P.spawn('spark', px, py - 2, (Math.random() - 0.5) * 50, -40, 0.25, 1.2, '#ffe080'); }
    else if (res === 'build') { P.spawn('dust', px - 4, py + 4, (Math.random() - 0.5) * 6, -4, 0.8, 2, 'rgba(200,180,140,0.5)'); if (Math.random() < 0.5) P.spawn('spark', px, py - 4, (Math.random() - 0.5) * 30, -30, 0.2, 1, '#ffe080'); }
    else P.spawn('dust', px - 4, py + 4, (Math.random() - 0.5) * 6, -3, 0.7, 1.8, 'rgba(160,130,80,0.5)');
    void env;
  }

}
