// Workers: job tools, hats, loads, buckets, rest poses, elders.
import { TILE } from '../constants';
import { t } from '../../i18n';
import { circle, ellipse, poly, rect, line, rgba, hash, shade, type Env } from '../palette';
import { SKIN, HAIR, facing, Pose, pose, body, withUnit, bubble, spriteFigures, villagerFig } from './shared';
import { isSpeakingInSkit } from '../townlife/skits';
import { drawSprite } from '../sprites';
import { PROP, TOOL } from '../spriteMap';
import type { Worker } from '../../sim/types';
import { JOBS } from '../../data/jobs';
import { isElder } from '../../sim/population';

// ---- workers -----------------------------------------------------------------
function tool(ctx: CanvasRenderingContext2D, w: Worker, p: Pose): void {
  // Held at the right hand (3.5,-6), swung forward when working.
  ctx.save(); ctx.translate(3.6, -6); ctx.rotate(p.swing * 0.9 - 0.4);
  const spr = spriteFigures() ? TOOL[w.job] : undefined;
  if (spr) { drawSprite(ctx, spr, 1, 3, 13, { rot: 0.35 }); ctx.restore(); return; }
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
  if (spriteFigures()) return; // the sprites wear their own
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
  // Carried on the back/shoulder, behind the head (a little higher on the taller sprites).
  ctx.save(); if (spriteFigures()) ctx.translate(0, -4);
  switch (w.carrying) {
    case 'wood': for (let i = 0; i < 3; i++) { circle(ctx, -5 + i * 2.2, -16 - (i % 2) * 1.5, 1.6, '#8a5a30'); circle(ctx, -5 + i * 2.2, -16 - (i % 2) * 1.5, 0.8, '#d6a86c'); } break;
    case 'stone': rect(ctx, -5.5, -18.5, 6, 4.5, '#9a9a96'); rect(ctx, -5.5, -18.5, 6, 1.2, '#c0c0bc'); break;
    case 'food': ellipse(ctx, -3.5, -16.5, 3.4, 2.2, '#b08a52'); circle(ctx, -4.5, -17.5, 1, '#d83a4a'); circle(ctx, -2.5, -18, 1, '#f7d94c'); circle(ctx, -3.5, -16.8, 1, '#8fcf7a'); break;
    case 'iron': rect(ctx, -5.5, -18, 6, 3.5, '#5a6a8a'); rect(ctx, -5.5, -18, 6, 1, '#8a9ab8'); break;
    case 'gold': circle(ctx, -3.5, -17, 2.2, '#e0b040'); break;
  }
  ctx.restore();
}

function sleepZ(ctx: CanvasRenderingContext2D, w: Worker, env: Env, dir: number): void {
  for (let i = 0; i < 2; i++) {
    const zt = (env.clock * 0.55 + w.id * 0.37 + i * 0.45) % 1;
    if (zt < 0.75) {
      ctx.font = `bold ${i ? 7 : 5.5}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(230,235,255,${0.85 * (1 - zt / 0.75)})`;
      ctx.fillText(i ? 'Z' : 'z', w.x * TILE + TILE / 2 + dir * 4 + zt * 5, w.y * TILE + TILE / 2 - 7 - zt * 12);
    }
  }
}

export function drawWorker(ctx: CanvasRenderingContext2D, w: Worker, env: Env): void {
  const moving = w.path.length > 0;
  const working = !!w.task && 'phase' in w.task && w.task.phase === 'work';
  const sleeping = w.task?.kind === 'sleep' && w.task.phase === 'sleep';
  const fleeing = env.raid && w.task?.kind === 'sleep' && w.task.phase === 'go';
  const dousing = w.task?.kind === 'douse';
  const rest = w.task?.kind === 'rest' && w.task.phase === 'do' ? w.task : null;
  const p = pose(moving, working || rest?.activity === 'feed', env.clock, w.id);
  let dir = rest ? rest.dir : facing(w.x, w.path, w.id);
  const elder = isElder(w);
  const skin = SKIN[Math.floor(hash(w.id, 1) * SKIN.length)], hair = elder ? '#d8d8d8' : HAIR[Math.floor(hash(w.id, 2) * HAIR.length)];
  const tunic = JOBS[w.job].color;
  const fig = villagerFig(w.id, elder);
  const spr = spriteFigures();
  const px = w.x * TILE + TILE / 2, py = w.y * TILE + TILE / 2;
  if (elder) p.bob += 1.2; // a slight stoop
  const sit = { walk: 0, bob: 0, swing: 0 };
  if (sleeping || rest?.activity === 'nap') {
    if (env.raid && !env.night) {
      // Crouching by the fire if no indoor building exists yet during a daytime raid.
      withUnit(ctx, w.x, w.y, dir, 3, () => { body(ctx, tunic, skin, hair, sit, true, fig); hat(ctx, w.job); });
      const k = (env.clock * 0.45 + w.id * 0.27) % 1;
      bubble(ctx, px, py - 18, '!', k < 0.4 ? 1 : 0, '#c83020');
      return;
    }
    // Dozing: reclined/leaning back, breathing slowly, the odd "z".
    const breath = Math.sin(env.clock * 1.5 + w.id) * 0.4;
    withUnit(ctx, w.x, w.y, dir, 3 + breath, () => {
      ctx.save(); ctx.translate(-2, -1); ctx.rotate(-0.55);
      body(ctx, tunic, skin, hair, sit, true, fig); hat(ctx, w.job);
      ctx.restore();
    });
    sleepZ(ctx, w, env, dir);
    return;
  }
  if (rest?.activity === 'lunch') {
    withUnit(ctx, w.x, w.y, dir, 3, () => { body(ctx, tunic, skin, hair, sit, true, fig); hat(ctx, w.job); ellipse(ctx, 3.5, -5.5, 2.4, 1.4, '#8a6a3a'); ellipse(ctx, 3.5, -6, 1.8, 0.8, '#d8b060'); const sp = Math.sin(env.clock * 3 + w.id) > 0.3 ? -2 : 0; line(ctx, 4.5, -6, 5.5, -9 + sp, '#e0d0b0', 0.8); });
    if (!isSpeakingInSkit(w.id)) {
      const k = (env.clock * 0.35 + w.id * 0.23) % 1;
      bubble(ctx, px + dir * 2, py - 18, '♥', k < 0.3 ? 1 : 0, '#d84a4a');
    }
    return;
  }
  if (rest?.activity === 'fish') {
    const bite = Math.sin(env.clock * 1.2 + w.id) > 0.86;
    withUnit(ctx, w.x, w.y, dir, 3, () => {
      body(ctx, tunic, skin, hair, sit, true, fig); hat(ctx, w.job);
      const tug = bite ? Math.sin(env.clock * 18) * 1.8 : 0;
      line(ctx, 3, -7, 12, -16 + tug * 0.4, '#6b4a2b', 1); line(ctx, 12, -16 + tug * 0.4, 14 + tug, 2, 'rgba(255,255,255,0.6)', 0.5);
      if (bite) {
        ellipse(ctx, 14 + tug, 2, 2.2, 0.9, 'rgba(220,240,255,0.75)');
        ellipse(ctx, 14, -1 - Math.abs(tug), 2, 1, '#70b8e8');
      }
    });
    if (bite) bubble(ctx, px + dir * 2, py - 18, '><>', 0.95, '#2a7ab8');
    return;
  }
  if (rest?.activity === 'sunset') {
    // Sat on the bank, knees up, watching the river and the sky.
    withUnit(ctx, w.x, w.y, dir, 3, () => { body(ctx, tunic, skin, hair, sit, true, fig); hat(ctx, w.job); rect(ctx, 1, -5, 4, 1.4, shade(tunic, -0.2)); });
    const k = (env.clock * 0.25 + w.id * 0.31) % 1;
    bubble(ctx, px + dir * 2, py - 18, '✦', k < 0.3 ? 1 : 0, '#d88030');
    return;
  }
  if (rest?.activity === 'chess') {
    // Two seats face each other over a board; the left seat draws the board. Hands reach out in turn.
    const turn = Math.floor(env.clock * 0.5) % 2, mv = (env.clock * 0.5) % 1;
    if (dir === 1) {
      const bx = px + 12, by = py + 1;
      rect(ctx, bx - 6, by + 2, 12, 3, '#6b4a2b');
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) rect(ctx, bx - 6 + c * 3, by - 5 + r * 1.8, 3, 1.8, (r + c) % 2 ? '#e8dcc0' : '#4a3a2a');
      for (let i = 0; i < 4; i++) circle(ctx, bx - 4.5 + i * 3 + (i === 1 && turn === 0 ? mv * 3 : 0), by - 4.5 + (i % 2) * 1.8, 0.9, '#f4f0e6');
      for (let i = 0; i < 4; i++) circle(ctx, bx - 4.5 + i * 3 - (i === 2 && turn === 1 ? mv * 3 : 0), by - 0.5 - (i % 2) * 1.8, 0.9, '#2a1a1a');
    }
    const myTurn = (turn === 0) === (dir === 1);
    const reach = myTurn ? Math.max(0, Math.sin(mv * Math.PI)) * 3 : 0;
    withUnit(ctx, w.x, w.y, dir, 3, () => { body(ctx, tunic, skin, hair, sit, true, fig); hat(ctx, w.job); rect(ctx, 2.8 + reach, -7.5 + reach * 0.3, 1.6, 4, tunic); circle(ctx, 3.6 + reach, -3.5 + reach * 0.3, 1.1, skin); });
    if (!isSpeakingInSkit(w.id)) {
      if (myTurn && mv < 0.45) bubble(ctx, px - dir * 2, py - 18, '?', 0.9, '#4a6a9a');
      else if (!myTurn && mv > 0.55 && mv < 0.8) bubble(ctx, px - dir * 2, py - 18, '!', 0.9, '#c86030');
    }
    return;
  }
  if (rest?.activity === 'picnic') {
    // A checked blanket, a basket, and the couple sat on it.
    if (dir === 1) {
      const bx = px + 10, by = py + 6;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) rect(ctx, bx - 15 + c * 5, by - 3 + r * 3, 5, 3, (r + c) % 2 ? '#d84a4a' : '#f0e0d0');
      ellipse(ctx, bx, by - 6, 3.4, 2.4, '#b08a52'); rect(ctx, bx - 3.4, by - 8, 6.8, 1.2, '#8a6a3a'); circle(ctx, bx - 1, by - 7.5, 1, '#d83a4a'); circle(ctx, bx + 1.5, by - 7.8, 1, '#f7d94c');
    }
    withUnit(ctx, w.x, w.y, dir, 3, () => { body(ctx, tunic, skin, hair, sit, true, fig); hat(ctx, w.job); if (Math.sin(env.clock * 2 + w.id) > 0.4) { circle(ctx, 4, -8, 1.2, '#f06a4f'); } });
    if (!isSpeakingInSkit(w.id)) {
      const k = (env.clock * 0.4 + w.id * 0.5) % 1;
      bubble(ctx, px + dir * 2, py - 18, '♥', k < 0.35 ? 1 : 0, '#e05070');
    }
    return;
  }
  if (rest?.activity === 'swim') {
    // In the water one tile to the left: head and arms above the surface, ripples around.
    const sx = px - TILE, sy = py + 2 + Math.sin(env.clock * 2 + w.id) * 1;
    const rip = (env.clock * 0.6 + w.id * 0.3) % 1;
    ctx.strokeStyle = `rgba(230,240,255,${0.5 * (1 - rip)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(sx, sy + 2, 5 + rip * 9, 2 + rip * 4, 0, 0, Math.PI * 2); ctx.stroke();
    const stroke = Math.sin(env.clock * 4 + w.id);
    circle(ctx, sx, sy - 2, 3.2, skin); ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(sx, sy - 2.6, 3.2, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    rect(ctx, sx - 7 + stroke * 2, sy - 1 - Math.max(0, stroke) * 3, 2, 4, skin); rect(ctx, sx + 5 - stroke * 2, sy - 1 - Math.max(0, -stroke) * 3, 2, 4, skin);
    for (let i = 0; i < 3; i++) { const t = (env.clock * 1.5 + i * 0.33 + w.id) % 1; circle(ctx, sx - 6 + i * 6 + Math.sin(t * 6) * 2, sy + 1 - t * 6, 1.2 * (1 - t) + 0.3, `rgba(230,240,255,${0.8 * (1 - t)})`); }
    return;
  }
  if (rest?.activity === 'snowman') {
    // Rolling a ball that grows as the break goes on; the finished snowman is kept by the town-life layer.
    const k = Math.max(0, Math.min(1, 1 - w.timer / 20)); // breaks can run past 20 s; the ball never shrinks below nothing
    const bx = px + dir * 10, by = py + 6;
    circle(ctx, bx, by - 3 * k, 3 + 4 * k, '#f4f7f9'); circle(ctx, bx - 1, by - 4 * k, 2 + 3 * k, '#ffffff');
    withUnit(ctx, w.x, w.y, dir, p.bob, () => { body(ctx, tunic, skin, hair, { walk: 0, bob: 0, swing: 0 }, false, fig); hat(ctx, w.job); rect(ctx, 2.8, -8, 4.5, 1.5, tunic); circle(ctx, 7.5, -7.5, 1.1, skin); });
    return;
  }
  // Standing about: chatting, strolling, feeding the hens, watching something.
  const tipsy = (w.tipsy ?? 0) > 0;
  const wobble = tipsy && moving ? Math.sin(env.clock * 5 + w.id) * 2.2 : 0;
  if (tipsy && moving) dir = Math.sin(env.clock * 2.5 + w.id) > -0.6 ? dir : -dir;
  const listening = rest?.activity === 'listen', dancing = listening && w.id % 3 === 0;
  const sway = listening ? (dancing ? Math.abs(Math.sin(env.clock * 6 + w.id)) * -3 : Math.sin(env.clock * 3 + w.id) * 0.8) : 0;
  if (dancing) dir = Math.sin(env.clock * 3 + w.id) > 0 ? 1 : -1;
  const throwing = rest?.activity === 'snowball' ? Math.max(0, Math.sin(env.clock * 2.5 + w.id * 1.7)) : 0;
  withUnit(ctx, w.x + wobble / TILE, w.y, dir, p.bob + (tipsy ? Math.sin(env.clock * 5 + w.id) : 0) + sway, () => {
    if (w.father) {
      const wave = Math.sin(env.clock * 7 + w.id) * 1.3;
      poly(ctx, [-1.5, -10.5, -6.8, -4.5 + wave, -3.6, -2.5 + wave, -1, -6.5], '#2c5aa0');
    }
    load(ctx, w);
    body(ctx, tunic, skin, hair, p, false, fig);
    hat(ctx, w.job);
    if (dancing && !spr) { rect(ctx, -5.2, -15, 1.6, 6, tunic); rect(ctx, 3.6, -15, 1.6, 6, tunic); circle(ctx, -4.4, -15.5, 1.1, skin); circle(ctx, 4.4, -15.5, 1.1, skin); }
    if (rest?.activity === 'archery' && spr) drawSprite(ctx, PROP.bow, 5.5, -2, 12, { rot: 0.1 });
    else if (rest?.activity === 'archery') { ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(4, -8, 6, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke(); const draw = Math.max(0, Math.sin(env.clock * 1.5 + w.id)) * 3; line(ctx, 4, -14, 4 - draw, -8, '#e0e0e0', 0.5); line(ctx, 4 - draw, -8, 4, -2, '#e0e0e0', 0.5); }
    if (throwing > 0) { ctx.save(); ctx.translate(3.6, -9); ctx.rotate(-1.2 * throwing); rect(ctx, -0.8, -4, 1.6, 4, tunic); circle(ctx, 0, -4.5, 1.1, skin); circle(ctx, 0, -6.5, 1.6, '#f4f7f9'); ctx.restore(); }
    if (tipsy) { circle(ctx, 1.2, -12, 1.1, 'rgba(240,80,80,0.55)'); circle(ctx, -1.6, -12, 1.1, 'rgba(240,80,80,0.55)'); }
    if (elder && !dousing && !rest) line(ctx, -4.5, 0, -4, -8, '#6b4a2b', 1.2);
    if (dousing) bucket(ctx, env, (w.task as { phase: 'fetch' | 'carry' | 'throw' }).phase, w.id);
    else if (rest?.activity === 'feed') {
      ellipse(ctx, -4.5, -6, 2.6, 1.8, '#b08a52');
      for (let i = 0; i < 3; i++) { const gt = (env.clock * 2.2 + i * 0.33 + w.id) % 1; circle(ctx, 3 + gt * 5, -6 + gt * 6, 0.7, '#f0d060'); }
    }
    else if (!rest && !fleeing && (working || !w.carrying)) tool(ctx, w, p);
  });
  if (w.father) {
    ctx.strokeStyle = rgba('#68b8ff', 0.68);
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(px, py + 3.5, 6.2 + Math.sin(env.clock * 3.5) * 0.7, 2.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#80c8ff';
    ctx.fillText('✦', px, py - 15 + Math.sin(env.clock * 3.5) * 1.1);
  }
  if (dousing) { const k = (env.clock * 0.4 + w.id * 0.23) % 1; bubble(ctx, px, py - 20, t('talk.w.fire'), k < 0.35 ? 1 : 0, '#c83020'); }
  else if (fleeing) { const k = (env.clock * 0.55 + w.id * 0.29) % 1; bubble(ctx, px, py - 20, t(w.id % 2 ? 'talk.w.raid.0' : 'talk.w.raid.1'), k < 0.5 ? 1 : 0, '#c83020'); }
  else if (isSpeakingInSkit(w.id)) { /* skit overlay draws the full multi-turn bubble */ }
  else if (w.father && ((env.clock * 0.18 + w.id * 0.13) % 1) < 0.24) {
    const fk = (env.clock * 0.18 + w.id * 0.13) % 1;
    const key = w.mentor ? (fk < 0.12 ? 'talk.father.mentor.0' : 'talk.father.mentor.1') : (fk < 0.12 ? 'talk.father.pioneer.0' : 'talk.father.pioneer.1');
    bubble(ctx, px + dir * 2, py - 22, t(key), 1, '#2c5aa0');
  }
  else if (rest?.activity === 'chat' || rest?.activity === 'visit') { const k = (env.clock * 0.45 + (w.id % 2) * 0.5) % 1; bubble(ctx, px + dir * 2, py - 20, w.id % 3 === 0 ? t(w.id % 2 ? 'talk.w.chat.0' : 'talk.w.chat.1') : '…', k < 0.4 ? 1 : 0); }
  else if (listening && !dancing) { const k = (env.clock * 0.35 + w.id * 0.17) % 1; bubble(ctx, px + dir * 2, py - 20, '♪', k < 0.3 ? 1 : 0, '#b86a2a'); }
  else if (rest?.activity === 'watch') { const k = (env.clock * 0.3 + w.id * 0.13) % 1; bubble(ctx, px + dir * 2, py - 20, '!', k < 0.25 ? 1 : 0, '#c86030'); }
  else if (rest?.activity === 'feed') { const k = (env.clock * 0.35 + w.id * 0.19) % 1; bubble(ctx, px + dir * 2, py - 20, '♥', k < 0.3 ? 1 : 0, '#e05070'); }
  else if (w.task?.kind === 'rest' && w.task.activity === 'pray') { const k = (env.clock * 0.35 + w.id * 0.29) % 1; bubble(ctx, px + dir * 2, py - 20, '✦', k < 0.35 ? 1 : 0, '#d8a020'); }
  else if (tipsy) { const k = (env.clock * 0.4 + w.id * 0.21) % 1; bubble(ctx, px + dir * 2, py - 20, w.id % 2 ? t('talk.w.drink') : '~', k < 0.4 ? 1 : 0, '#c85060'); }
}
