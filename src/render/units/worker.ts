// Workers: job tools, hats, loads, buckets, rest poses, elders.
import { TILE } from '../constants';
import { t } from '../../i18n';
import { circle, ellipse, poly, rect, line, rgba, hash, shade, type Env } from '../palette';
import { SKIN, HAIR, HERO_SCALE, WORKER_SCALE, facing, Pose, pose, body, withUnit, bubble, spriteFigures, villagerFig } from './shared';
import { isSpeakingInSkit } from '../townlife/skits';
import { drawSprite } from '../sprites';
import { PROP, TOOL } from '../spriteMap';
import type { Worker } from '../../sim/types';
import { JOBS } from '../../data/jobs';
import { isElder } from '../../sim/population';

/**
 * Custom heroic figure for the Founding Pioneer / Protagonist's Father (`w.father`).
 * Clothing evolves with `stage` (`0..3`):
 * - Stage 0 (Camp): Coarse unbleached linen tunic, hemp rope belt, cloth leg-wraps,
 *   bare arms with cloth wrist-wraps, and a simple linen headband with tails.
 * - Stage 1 (Hamlet): Slate homespun tunic, leather boots, short travel mantle, wooden-hilt sword.
 * - Stage 2 (Village / Vanguard): Azure surcoat, silver pauldrons, flowing blue cape, sapphire headband.
 * - Stage 3 (Town / City / Mentor): Gold-trimmed royal sapphire cloak, golden circlet & master regalia.
 */
export function drawFatherFigure(
  ctx: CanvasRenderingContext2D,
  p: Pose,
  env: Env,
  id: number,
  sitting = false,
  mentor = false,
  minStage: 0 | 1 | 2 | 3 = 0,
): void {
  const stage = (mentor ? 3 : Math.max(env.clothTier, minStage)) as 0 | 1 | 2 | 3;
  const wave = Math.sin(env.clock * 6.5 + id) * 1.5;
  const legA = sitting ? 0 : p.walk * 2.2;
  const legB = sitting ? 0 : -p.walk * 2.2;

  // 1. Cloak / Mantle (none at stage 0, short weathered mantle at stage 1, full cape at 2, gold-trimmed at 3).
  if (stage === 1) {
    poly(
      ctx,
      [-2.4, -10.8, -5.4, -4.5 + wave * 0.4, -2.4, -4.0 + wave * 0.25, 1.4, -10.6],
      '#586474',
    );
  } else if (stage >= 2) {
    if (stage === 3) {
      poly(
        ctx,
        [-2.8, -11.2, -8.2, -1.2 + wave * 0.7, -3.2, -0.6 + wave * 0.4, 2.2, -11.0],
        '#f0c850',
      );
    }
    poly(
      ctx,
      [-2.4, -11.0, -7.4, -1.8 + wave * 0.65, -3.0, -1.2 + wave * 0.35, 1.8, -10.8],
      '#1b4688',
    );
    poly(
      ctx,
      [-1.8, -10.5, -5.6, -3.0 + wave * 0.5, -2.6, -2.4 + wave * 0.3, 1.0, -10.5],
      '#2e68c0',
    );
  }

  // 2. Legs / Boots (cloth leg-wraps at stage 0, leather boots at 1, dark riding boots at 2-3).
  if (!sitting) {
    const legCol1 = stage === 0 ? '#9a8c74' : stage === 1 ? '#4a3828' : '#242a38';
    const legCol2 = stage === 0 ? '#887a62' : stage === 1 ? '#3c2c1e' : '#1c2230';
    rect(ctx, -2.7 + legA * 0.32, -4.4, 2.2, 4.4, legCol1);
    rect(ctx, 0.5 + legB * 0.32, -4.4, 2.2, 4.4, legCol2);
    if (stage === 0) {
      // Criss-cross coarse cloth leg-wrap bindings.
      rect(ctx, -2.7 + legA * 0.32, -2.6, 2.2, 0.6, '#cbbca2');
      rect(ctx, 0.5 + legB * 0.32, -2.6, 2.2, 0.6, '#cbbca2');
    } else if (stage === 3) {
      rect(ctx, -2.8 + legA * 0.32, -2.6, 2.4, 0.7, '#d8b048');
      rect(ctx, 0.4 + legB * 0.32, -2.6, 2.4, 0.7, '#d8b048');
    }
  } else {
    rect(ctx, 0.5, -4.2, 4.2, 1.8, stage === 0 ? '#9a8c74' : '#242a38');
  }

  // 3. Tunic / Surcoat.
  if (stage === 0) {
    // Stage 0: Coarse unbleached linen cloth tunic with stitched hem & knotted hemp rope belt.
    rect(ctx, -3.3, -10.8, 6.6, 6.8, '#cbbca2');
    rect(ctx, -1.2, -10.8, 2.4, 6.6, '#dfd2ba');
    line(ctx, 0, -10.8, 0, -7.8, '#7a6850', 0.7); // open v-neck collar lace
    rect(ctx, -3.4, -5.4, 6.8, 1.1, '#8c7248'); // hemp rope belt
    line(ctx, 0.8, -5.0, 1.8, -2.8, '#8c7248', 0.9); // hanging rope knot tail
  } else if (stage === 1) {
    // Stage 1: Dyed slate-blue homespun tunic with leather belt.
    rect(ctx, -3.4, -11.0, 6.8, 7.0, '#36547a');
    rect(ctx, -1.2, -10.8, 2.4, 6.8, '#4a6e98');
    rect(ctx, -3.4, -5.4, 6.8, 1.2, '#4a301e');
    rect(ctx, -0.9, -5.5, 1.8, 1.3, '#a8b2bc');
  } else {
    // Stage 2 & 3: Royal Azure Surcoat & Silver Breastplate / Tabard.
    rect(ctx, -3.5, -11.2, 7.0, 7.2, '#1e3f74');
    rect(ctx, -1.3, -11.0, 2.6, 7.0, '#3474d0');
    if (stage === 3) rect(ctx, -0.45, -11.0, 0.9, 7.0, '#f4d060');
    rect(ctx, -3.5, -11.2, 7.0, 1.1, '#a8c4e0');
    rect(ctx, -3.5, -5.4, 7.0, 1.2, '#3a2618');
    rect(ctx, -1.1, -5.5, 2.2, 1.4, stage === 3 ? '#ffd858' : '#c8d8e8');
  }

  // 4. Sidearm / Staff (none at stage 0, simple short sword at stage 1, Pioneer Broadsword at 2+, Mentor Staff when mentor).
  if (mentor) {
    line(ctx, -3.8, 0, -3.4, -13.5, '#c89838', 1.3);
    circle(ctx, -3.4, -14.2, 1.5, '#ffd860');
    circle(ctx, -3.4, -14.2, 0.9, '#68d0ff');
  } else if (stage === 1) {
    ctx.save();
    ctx.translate(-2.1, -5.0);
    ctx.rotate(0.42);
    rect(ctx, -0.6, 0, 1.2, 5.2, '#5a4632');
    rect(ctx, -1.6, -0.5, 3.2, 0.8, '#8a94a0');
    ctx.restore();
  } else if (stage >= 2) {
    ctx.save();
    ctx.translate(-2.2, -5.2);
    ctx.rotate(0.45);
    rect(ctx, -0.7, 0, 1.4, 6.2, '#4a6488');
    rect(ctx, -0.3, 0.4, 0.6, 5.4, '#98b8dc');
    rect(ctx, -2.0, -0.6, 4.0, 0.9, '#ffd050');
    circle(ctx, 0, -1.4, 0.9, '#58c8ff');
    ctx.restore();
  }

  // 5. Arms & Shoulders (bare arms + cloth wrist-wraps at stage 0; sleeves at stage 1; pauldrons & clasps at 2-3).
  if (stage === 0) {
    rect(ctx, -4.5, -10.0, 1.5, 4.6, '#f4ceb0');
    rect(ctx, 3.0, -10.0, 1.5, 4.6, '#f4ceb0');
    rect(ctx, -4.5, -7.2, 1.5, 1.2, '#b5a488'); // cloth wrist-wraps
    rect(ctx, 3.0, -7.2, 1.5, 1.2, '#b5a488');
    circle(ctx, -3.8, -5.2, 1.0, '#f4ceb0');
    circle(ctx, 3.8, -5.2, 1.0, '#f4ceb0');
  } else {
    rect(ctx, -4.7, -10.2, 1.7, 4.8, stage === 1 ? '#36547a' : '#285698');
    rect(ctx, 3.0, -10.2, 1.7, 4.8, stage === 1 ? '#36547a' : '#285698');
    circle(ctx, -4.0, -5.2, 1.0, '#f4ceb0');
    circle(ctx, 3.8, -5.2, 1.0, '#f4ceb0');
    if (stage >= 2) {
      ellipse(ctx, -3.4, -10.6, 2.1, 1.3, '#c8ddf0');
      ellipse(ctx, 3.4, -10.6, 2.1, 1.3, '#c8ddf0');
      circle(ctx, -2.5, -10.5, 0.9, stage === 3 ? '#ffd858' : '#a8c8e8');
      circle(ctx, 2.5, -10.5, 0.9, stage === 3 ? '#ffd858' : '#a8c8e8');
    }
  }

  // 6. Handsome Head, Sharp Eyes, Windswept Heroic Hair & Headband / Circlet.
  circle(ctx, 0, -14.0, 3.6, '#f4ceb0');
  line(ctx, 0.6, -15.0, 2.5, -14.7, '#1c2840', 0.8);
  rect(ctx, 1.1, -14.4, 1.2, 1.1, '#183060');
  rect(ctx, 1.5, -14.4, 0.5, 0.5, '#ffffff');

  const hairCol = mentor ? '#dce6f2' : '#1e2c48';
  const hairHi = mentor ? '#ffffff' : '#385488';
  ctx.fillStyle = hairCol;
  ctx.beginPath();
  ctx.arc(0, -14.6, 3.8, Math.PI * 0.95, Math.PI * 2.08);
  ctx.fill();
  poly(ctx, [-2.8, -16.8, -6.2 - wave * 0.3, -15.6, -3.2, -14.2], hairCol);
  poly(ctx, [-2.2, -14.8, -5.8 - wave * 0.4, -13.0, -2.6, -12.6], hairCol);
  poly(ctx, [-0.8, -17.6, -2.8, -19.5, 0.6, -17.8], hairCol);
  poly(ctx, [0.4, -17.6, 2.4, -19.0, 2.8, -16.6], hairHi);
  poly(ctx, [-1.2, -14.6, -0.4, -11.8, 0.4, -14.2], hairCol);

  if (stage === 0) {
    // Simple unbleached cloth headband with fluttering cloth knot tails at the back.
    rect(ctx, -3.5, -15.9, 7.1, 1.0, '#dfd4be');
    line(ctx, -3.5, -15.4, -6.2, -14.2 + wave * 0.35, '#dfd4be', 0.9);
  } else if (stage === 1) {
    rect(ctx, -3.5, -15.9, 7.1, 1.0, '#4a7ab8');
    line(ctx, -3.5, -15.4, -6.2, -14.2 + wave * 0.35, '#4a7ab8', 0.9);
  } else if (stage === 2) {
    rect(ctx, -3.5, -15.9, 7.1, 1.0, '#3868b0');
    circle(ctx, 2.2, -15.4, 1.0, '#38b8ff');
    circle(ctx, 2.4, -15.6, 0.4, '#ffffff');
  } else {
    rect(ctx, -3.5, -15.9, 7.1, 1.1, '#ffd858');
    circle(ctx, 2.2, -15.4, 1.1, '#38b8ff');
    circle(ctx, 2.4, -15.6, 0.45, '#ffffff');
  }
}

function drawFatherAura(ctx: CanvasRenderingContext2D, px: number, py: number, env: Env, id: number): void {
  const pulse = Math.sin(env.clock * 3.6 + id);
  ctx.strokeStyle = rgba('#68b8ff', 0.72);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(px, py + 3.8, 6.8 + pulse * 0.7, 2.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = rgba('#ffe070', 0.5);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.ellipse(px, py + 3.8, 4.8 - pulse * 0.4, 1.7, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Two orbiting starlight motes around the Father.
  for (let i = 0; i < 2; i++) {
    const ang = env.clock * 2.8 + id + i * Math.PI;
    const mx = px + Math.cos(ang) * 6.5;
    const my = py - 4 + Math.sin(ang) * 2.2;
    circle(ctx, mx, my, 1.0, i === 0 ? '#88d8ff' : '#ffe880');
  }
  ctx.font = 'bold 8px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#80d0ff';
  ctx.fillText('✦', px, py - 17 + pulse * 1.1);
}

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
  const elder = isElder(w) && !w.father;
  const skin = SKIN[Math.floor(hash(w.id, 1) * SKIN.length)], hair = elder ? '#d8d8d8' : HAIR[Math.floor(hash(w.id, 2) * HAIR.length)];
  const COARSE_CLOTH = ['#b8ab92', '#a89b82', '#c2b59c', '#9e9078'];
  const tunic = env.clothTier === 0
    ? COARSE_CLOTH[w.id % COARSE_CLOTH.length]
    : env.clothTier === 1
      ? shade(JOBS[w.job].color, -0.18)
      : JOBS[w.job].color;
  const baseFig = villagerFig(w.id, elder);
  const fig = { ...baseFig, tintA: env.clothTier === 0 ? 0.62 : env.clothTier === 1 ? 0.46 : 0.38 };
  const spr = spriteFigures();
  const px = w.x * TILE + TILE / 2, py = w.y * TILE + TILE / 2;
  if (elder) p.bob += 1.2; // a slight stoop
  const sit = { walk: 0, bob: 0, swing: 0 };
  const uScale = w.father ? HERO_SCALE : WORKER_SCALE;
  const drawBody = (sittingPose: boolean) => {
    if (w.father) drawFatherFigure(ctx, sittingPose ? sit : p, env, w.id, sittingPose, !!w.mentor);
    else {
      body(ctx, tunic, skin, hair, sittingPose ? sit : p, sittingPose, fig);
      if (env.clothTier >= 1) hat(ctx, w.job);
      if (env.clothTier >= 3 && !sittingPose) {
        // Fine town attire: gold-trimmed collar and belt buckle.
        rect(ctx, -2.8, -10.5, 5.6, 0.7, '#ebd078');
        rect(ctx, -0.8, -5.2, 1.6, 1.0, '#e8c458');
      }
    }
  };
  if (sleeping || rest?.activity === 'nap') {
    if (env.raid && !env.night) {
      // Crouching by the fire if no indoor building exists yet during a daytime raid.
      withUnit(ctx, w.x, w.y, dir, 3, () => drawBody(true), uScale);
      if (w.father) drawFatherAura(ctx, px, py, env, w.id);
      const k = (env.clock * 0.45 + w.id * 0.27) % 1;
      bubble(ctx, px, py - 18, '!', k < 0.4 ? 1 : 0, '#c83020');
      return;
    }
    // Dozing: reclined/leaning back, breathing slowly, the odd "z".
    const breath = Math.sin(env.clock * 1.5 + w.id) * 0.4;
    withUnit(ctx, w.x, w.y, dir, 3 + breath, () => {
      ctx.save(); ctx.translate(-2, -1); ctx.rotate(-0.55);
      drawBody(true);
      ctx.restore();
    }, uScale);
    if (w.father) drawFatherAura(ctx, px, py, env, w.id);
    sleepZ(ctx, w, env, dir);
    return;
  }
  if (rest?.activity === 'lunch') {
    withUnit(ctx, w.x, w.y, dir, 3, () => { drawBody(true); ellipse(ctx, 3.5, -5.5, 2.4, 1.4, '#8a6a3a'); ellipse(ctx, 3.5, -6, 1.8, 0.8, '#d8b060'); const sp = Math.sin(env.clock * 3 + w.id) > 0.3 ? -2 : 0; line(ctx, 4.5, -6, 5.5, -9 + sp, '#e0d0b0', 0.8); }, uScale);
    if (w.father) drawFatherAura(ctx, px, py, env, w.id);
    if (!isSpeakingInSkit(w.id)) {
      const k = (env.clock * 0.35 + w.id * 0.23) % 1;
      bubble(ctx, px + dir * 2, py - 18, '♥', k < 0.3 ? 1 : 0, '#d84a4a');
    }
    return;
  }
  if (rest?.activity === 'fish') {
    const bite = Math.sin(env.clock * 1.2 + w.id) > 0.86;
    withUnit(ctx, w.x, w.y, dir, 3, () => {
      drawBody(true);
      const tug = bite ? Math.sin(env.clock * 18) * 1.8 : 0;
      line(ctx, 3, -7, 12, -16 + tug * 0.4, '#6b4a2b', 1); line(ctx, 12, -16 + tug * 0.4, 14 + tug, 2, 'rgba(255,255,255,0.6)', 0.5);
      if (bite) {
        ellipse(ctx, 14 + tug, 2, 2.2, 0.9, 'rgba(220,240,255,0.75)');
        ellipse(ctx, 14, -1 - Math.abs(tug), 2, 1, '#70b8e8');
      }
    }, uScale);
    if (w.father) drawFatherAura(ctx, px, py, env, w.id);
    if (bite) bubble(ctx, px + dir * 2, py - 18, '><>', 0.95, '#2a7ab8');
    return;
  }
  if (rest?.activity === 'sunset') {
    // Sat on the bank, knees up, watching the river and the sky.
    withUnit(ctx, w.x, w.y, dir, 3, () => { drawBody(true); rect(ctx, 1, -5, 4, 1.4, shade(w.father ? '#1e3f74' : tunic, -0.2)); }, uScale);
    if (w.father) drawFatherAura(ctx, px, py, env, w.id);
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
    withUnit(ctx, w.x, w.y, dir, 3, () => { drawBody(true); rect(ctx, 2.8 + reach, -7.5 + reach * 0.3, 1.6, 4, w.father ? '#285698' : tunic); circle(ctx, 3.6 + reach, -3.5 + reach * 0.3, 1.1, w.father ? '#f4ceb0' : skin); }, uScale);
    if (w.father) drawFatherAura(ctx, px, py, env, w.id);
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
    withUnit(ctx, w.x, w.y, dir, 3, () => { drawBody(true); if (Math.sin(env.clock * 2 + w.id) > 0.4) { circle(ctx, 4, -8, 1.2, '#f06a4f'); } }, uScale);
    if (w.father) drawFatherAura(ctx, px, py, env, w.id);
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
    circle(ctx, sx, sy - 2, 3.2, w.father ? '#f4ceb0' : skin); ctx.fillStyle = w.father ? '#1e2c48' : hair; ctx.beginPath(); ctx.arc(sx, sy - 2.6, 3.2, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    rect(ctx, sx - 7 + stroke * 2, sy - 1 - Math.max(0, stroke) * 3, 2, 4, w.father ? '#f4ceb0' : skin); rect(ctx, sx + 5 - stroke * 2, sy - 1 - Math.max(0, -stroke) * 3, 2, 4, w.father ? '#f4ceb0' : skin);
    for (let i = 0; i < 3; i++) { const t = (env.clock * 1.5 + i * 0.33 + w.id) % 1; circle(ctx, sx - 6 + i * 6 + Math.sin(t * 6) * 2, sy + 1 - t * 6, 1.2 * (1 - t) + 0.3, `rgba(230,240,255,${0.8 * (1 - t)})`); }
    return;
  }
  if (rest?.activity === 'snowman') {
    // Rolling a ball that grows as the break goes on; the finished snowman is kept by the town-life layer.
    const k = Math.max(0, Math.min(1, 1 - w.timer / 20)); // breaks can run past 20 s; the ball never shrinks below nothing
    const bx = px + dir * 10, by = py + 6;
    circle(ctx, bx, by - 3 * k, 3 + 4 * k, '#f4f7f9'); circle(ctx, bx - 1, by - 4 * k, 2 + 3 * k, '#ffffff');
    withUnit(ctx, w.x, w.y, dir, p.bob, () => { drawBody(false); rect(ctx, 2.8, -8, 4.5, 1.5, w.father ? '#285698' : tunic); circle(ctx, 7.5, -7.5, 1.1, w.father ? '#f4ceb0' : skin); }, uScale);
    if (w.father) drawFatherAura(ctx, px, py, env, w.id);
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
    load(ctx, w);
    drawBody(false);
    if (dancing && (!spr || w.father)) { rect(ctx, -5.2, -15, 1.6, 6, w.father ? '#285698' : tunic); rect(ctx, 3.6, -15, 1.6, 6, w.father ? '#285698' : tunic); circle(ctx, -4.4, -15.5, 1.1, w.father ? '#f4ceb0' : skin); circle(ctx, 4.4, -15.5, 1.1, w.father ? '#f4ceb0' : skin); }
    if (rest?.activity === 'archery' && spr) drawSprite(ctx, PROP.bow, 5.5, -2, 12, { rot: 0.1 });
    else if (rest?.activity === 'archery') { ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(4, -8, 6, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke(); const draw = Math.max(0, Math.sin(env.clock * 1.5 + w.id)) * 3; line(ctx, 4, -14, 4 - draw, -8, '#e0e0e0', 0.5); line(ctx, 4 - draw, -8, 4, -2, '#e0e0e0', 0.5); }
    if (throwing > 0) { ctx.save(); ctx.translate(3.6, -9); ctx.rotate(-1.2 * throwing); rect(ctx, -0.8, -4, 1.6, 4, w.father ? '#285698' : tunic); circle(ctx, 0, -4.5, 1.1, w.father ? '#f4ceb0' : skin); circle(ctx, 0, -6.5, 1.6, '#f4f7f9'); ctx.restore(); }
    if (tipsy) { circle(ctx, 1.2, -12, 1.1, 'rgba(240,80,80,0.55)'); circle(ctx, -1.6, -12, 1.1, 'rgba(240,80,80,0.55)'); }
    if (elder && !dousing && !rest) line(ctx, -4.5, 0, -4, -8, '#6b4a2b', 1.2);
    if (dousing) bucket(ctx, env, (w.task as { phase: 'fetch' | 'carry' | 'throw' }).phase, w.id);
    else if (rest?.activity === 'feed') {
      ellipse(ctx, -4.5, -6, 2.6, 1.8, '#b08a52');
      for (let i = 0; i < 3; i++) { const gt = (env.clock * 2.2 + i * 0.33 + w.id) % 1; circle(ctx, 3 + gt * 5, -6 + gt * 6, 0.7, '#f0d060'); }
    }
    else if (!rest && !fleeing && (working || !w.carrying)) tool(ctx, w, p);
  }, uScale);
  if (w.father) drawFatherAura(ctx, px, py, env, w.id);
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
