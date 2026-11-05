// Workers: job tools, hats, loads, buckets, rest poses, elders.
import { TILE } from '../constants';
import { circle, ellipse, poly, rect, line, rgba, hash, type Env } from '../palette';
import { SKIN, HAIR, facing, Pose, pose, body, withUnit, bubble } from './shared';
import type { Worker } from '../../sim/types';
import { JOBS } from '../../data/jobs';
import { isElder } from '../../sim/population';

// ---- workers -----------------------------------------------------------------
function tool(ctx: CanvasRenderingContext2D, w: Worker, p: Pose): void {
  // Held at the right hand (3.5,-6), swung forward when working.
  ctx.save(); ctx.translate(3.6, -6); ctx.rotate(p.swing * 0.9 - 0.4);
  switch (w.job) {
    case 'lumberjack': line(ctx, 0, 0, 0, -9, '#8a5a2a', 1.4); poly(ctx, [-0.5, -9.5, 3.5, -8.5, 3.5, -5.5, -0.5, -6.5], '#b8bec6'); break;
    case 'quarryman': case 'miner': line(ctx, 0, 0, 0, -9, '#8a5a2a', 1.4); poly(ctx, [-3.5, -8, 0, -10, 3.5, -8, 0, -8.5], '#8a8f96'); break;
    case 'builder': line(ctx, 0, 0, 0, -8, '#8a5a2a', 1.4); rect(ctx, -2.5, -10, 5, 3, '#6a6a70'); break;
    case 'farmer': line(ctx, 0, 0, 0, -10, '#8a5a2a', 1.4); poly(ctx, [-0.5, -10.5, 3.5, -9.5, 3.5, -8.5, -0.5, -8.5], '#8a8f96'); break;
    case 'forager': ctx.rotate(-p.swing * 0.9 + 0.4); ellipse(ctx, 1, 1, 3, 2, '#b08a52'); circle(ctx, 0, 0, 1, '#d83a4a'); circle(ctx, 2, 0.5, 1, '#f7d94c'); break;
  }
  ctx.restore();
}

/** A wooden bucket: empty on the way to the well, full and sloshing on the way back, tipped when thrown. */
function bucket(ctx: CanvasRenderingContext2D, env: Env, phase: 'fetch' | 'carry' | 'throw', id: number): void {
  ctx.save(); ctx.translate(3.6, -6);
  ctx.rotate(phase === 'throw' ? -1.4 + 0.6 * Math.sin(env.clock * 12 + id) : phase === 'carry' ? 0.1 + 0.15 * Math.sin(env.clock * 9 + id) : 0.25);
  line(ctx, 0, 0, 0, 3, '#5a3a1e', 0.8);
  poly(ctx, [-2.5, 3, 2.5, 3, 2, 8, -2, 8], '#8a6a3a'); rect(ctx, -2.5, 3, 5, 1, '#6b4a2b');
  if (phase !== 'fetch') ellipse(ctx, 0, 3.5, 2, 0.9, '#5aa0e0');
  ctx.restore();
}

function hat(ctx: CanvasRenderingContext2D, job: string): void {
  switch (job) {
    case 'farmer': ellipse(ctx, 0, -15.5, 5.5, 1.6, '#d8b860'); ellipse(ctx, 0, -16.5, 3, 2, '#e0c468'); break;
    case 'miner': ctx.fillStyle = '#5a6a8a'; ctx.beginPath(); ctx.arc(0, -14, 3.6, Math.PI, 0); ctx.fill(); circle(ctx, 2.2, -15, 1, '#ffd870'); break;
    case 'builder': ctx.fillStyle = '#b8862a'; ctx.beginPath(); ctx.arc(0, -14, 3.6, Math.PI, 0); ctx.fill(); rect(ctx, 0, -14.5, 5, 1.2, '#b8862a'); break;
    case 'forager': ctx.fillStyle = '#4f8a3a'; ctx.beginPath(); ctx.arc(0, -13.6, 3.9, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); break;
    case 'quarryman': rect(ctx, -3.4, -15, 6.8, 1.4, '#a0a0a0'); break;
    default: break;
  }
}

function load(ctx: CanvasRenderingContext2D, w: Worker): void {
  if (!w.carrying) return;
  // Carried on the back/shoulder, behind the head.
  switch (w.carrying) {
    case 'wood': for (let i = 0; i < 3; i++) { circle(ctx, -5 + i * 2.2, -16 - (i % 2) * 1.5, 1.6, '#8a5a30'); circle(ctx, -5 + i * 2.2, -16 - (i % 2) * 1.5, 0.8, '#d6a86c'); } break;
    case 'stone': rect(ctx, -5.5, -18.5, 6, 4.5, '#9a9a96'); rect(ctx, -5.5, -18.5, 6, 1.2, '#c0c0bc'); break;
    case 'food': ellipse(ctx, -3.5, -16.5, 3.4, 2.2, '#b08a52'); circle(ctx, -4.5, -17.5, 1, '#d83a4a'); circle(ctx, -2.5, -18, 1, '#f7d94c'); circle(ctx, -3.5, -16.8, 1, '#8fcf7a'); break;
    case 'iron': rect(ctx, -5.5, -18, 6, 3.5, '#5a6a8a'); rect(ctx, -5.5, -18, 6, 1, '#8a9ab8'); break;
    case 'gold': circle(ctx, -3.5, -17, 2.2, '#e0b040'); break;
  }
}

function sleepZ(ctx: CanvasRenderingContext2D, w: Worker, env: Env, dir: number): void {
  const zt = (env.clock * 0.6 + w.id * 0.37) % 1;
  if (zt < 0.7) { ctx.font = 'bold 6px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = `rgba(230,235,255,${0.8 * (1 - zt / 0.7)})`; ctx.fillText('z', w.x * TILE + TILE / 2 + dir * 5 + zt * 4, w.y * TILE + TILE / 2 - 6 - zt * 10); }
}

export function drawWorker(ctx: CanvasRenderingContext2D, w: Worker, env: Env): void {
  const moving = w.path.length > 0;
  const working = !!w.task && 'phase' in w.task && w.task.phase === 'work';
  const sleeping = w.task?.kind === 'sleep' && w.task.phase === 'sleep';
  const dousing = w.task?.kind === 'douse';
  const rest = w.task?.kind === 'rest' && w.task.phase === 'do' ? w.task : null;
  const p = pose(moving, working || rest?.activity === 'feed', env.clock, w.id);
  let dir = rest ? rest.dir : facing(w.x, w.path, w.id);
  const elder = isElder(w);
  const skin = SKIN[Math.floor(hash(w.id, 1) * SKIN.length)], hair = elder ? '#d8d8d8' : HAIR[Math.floor(hash(w.id, 2) * HAIR.length)];
  const tunic = JOBS[w.job].color;
  const px = w.x * TILE + TILE / 2, py = w.y * TILE + TILE / 2;
  if (elder) p.bob += 1.2; // a slight stoop
  const sit = { walk: 0, bob: 0, swing: 0 };
  if (sleeping || rest?.activity === 'nap') {
    // Dozing: sat down, head nodding, the odd "z".
    const nod = Math.sin(env.clock * 1.5 + w.id) * 0.6;
    withUnit(ctx, w.x, w.y, dir, 3 + nod, () => { body(ctx, tunic, skin, hair, sit, true); hat(ctx, w.job); });
    sleepZ(ctx, w, env, dir);
    return;
  }
  if (rest?.activity === 'lunch') {
    withUnit(ctx, w.x, w.y, dir, 3, () => { body(ctx, tunic, skin, hair, sit, true); hat(ctx, w.job); ellipse(ctx, 3.5, -5.5, 2.4, 1.4, '#8a6a3a'); ellipse(ctx, 3.5, -6, 1.8, 0.8, '#d8b060'); const sp = Math.sin(env.clock * 3 + w.id) > 0.3 ? -2 : 0; line(ctx, 4.5, -6, 5.5, -9 + sp, '#e0d0b0', 0.8); });
    return;
  }
  if (rest?.activity === 'fish') {
    withUnit(ctx, w.x, w.y, dir, 3, () => {
      body(ctx, tunic, skin, hair, sit, true); hat(ctx, w.job);
      const tug = Math.sin(env.clock * 1.2 + w.id) > 0.95 ? 2 : 0;
      line(ctx, 3, -7, 12, -16, '#6b4a2b', 1); line(ctx, 12, -16, 14 + tug, 2, 'rgba(255,255,255,0.6)', 0.5);
    });
    return;
  }
  // Standing about: chatting, strolling, feeding the hens, watching something.
  const tipsy = (w.tipsy ?? 0) > 0;
  const wobble = tipsy && moving ? Math.sin(env.clock * 5 + w.id) * 2.2 : 0;
  if (tipsy && moving) dir = Math.sin(env.clock * 2.5 + w.id) > -0.6 ? dir : -dir;
  withUnit(ctx, w.x + wobble / TILE, w.y, dir, p.bob + (tipsy ? Math.sin(env.clock * 5 + w.id) : 0), () => {
    load(ctx, w);
    body(ctx, tunic, skin, hair, p);
    hat(ctx, w.job);
    if (tipsy) { circle(ctx, 1.2, -12, 1.1, 'rgba(240,80,80,0.55)'); circle(ctx, -1.6, -12, 1.1, 'rgba(240,80,80,0.55)'); }
    if (elder && !dousing && !rest) line(ctx, -4.5, 0, -4, -8, '#6b4a2b', 1.2);
    if (dousing) bucket(ctx, env, (w.task as { phase: 'fetch' | 'carry' | 'throw' }).phase, w.id);
    else if (rest?.activity === 'feed') { ellipse(ctx, -4.5, -6, 2.6, 1.8, '#b08a52'); }
    else if (!rest && (working || !w.carrying)) tool(ctx, w, p);
  });
  if (rest?.activity === 'chat') { const k = (env.clock * 0.5 + (w.id % 2) * 0.5) % 1; bubble(ctx, px + dir * 2, py - 20, '…', k < 0.45 ? 1 : 0); }
  else if (rest?.activity === 'watch') { const k = (env.clock * 0.3 + w.id * 0.13) % 1; bubble(ctx, px + dir * 2, py - 20, '!', k < 0.25 ? 1 : 0); }
  else if (tipsy) { const k = (env.clock * 0.4 + w.id * 0.21) % 1; bubble(ctx, px + dir * 2, py - 20, '~', k < 0.35 ? 1 : 0); }
}
