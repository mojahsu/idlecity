// Heroes and the pack (figures only). Drawn twice: once mirrored for the floor
// reflection. Wind-ups telegraph whose turn is next; lunges, hurt flashes,
// auras, breath, curses and deaths all come from the view state.
import type { Adventurer, GameState, Party } from '../../sim/types';
import { ACT_TIME } from '../../sim/constants';
import { circle, ellipse, poly, rgba, type Env } from '../palette';
import { drawClassFigure } from '../units';
import { drawMonster, monsterHeight } from '../monsters';
import { PANEL_W } from './layout';
import { enemyScale, enemyX, heroX } from './hud';
import type { ViewState } from './state';

export function drawFigures(ctx: CanvasRenderingContext2D, s: GameState, p: Party, v: ViewState, env: Env, floorY: number, team: Adventurer[], mx: number): void {
  const e = p.encounter;
  const enemies = e?.enemies ?? [];
  const n = enemies.length;
  const actIdx = p.actIdx ?? 0;
  const windup = p.phase === 'fight' ? Math.max(0, Math.min(1, (p.timer + ACT_TIME) / ACT_TIME)) : 0;
  // Scorch marks left by fireballs.
  for (const sc of v.scorch) {
    const a = Math.min(1, sc.ttl / 0.8);
    ellipse(ctx, sc.x, floorY + 1, 13, 3.8, `rgba(25,12,8,${0.55 * a})`);
    ellipse(ctx, sc.x, floorY + 1, 8, 2.2, `rgba(255,110,30,${0.4 * a})`);
    for (let i = 0; i < 3; i++) {
      const et = (env.clock * 1.6 + i * 0.33) % 1;
      circle(ctx, sc.x - 6 + i * 6 + Math.sin(env.clock * 4 + i) * 2, floorY - et * 14, 1 * (1 - et) + 0.3, `rgba(255,160,50,${0.7 * a * (1 - et)})`);
    }
  }
  const retreatShift = v.outro > 0 && v.retreating ? (1.35 - v.outro) * 26 : 0;
  const heroDir = v.outro > 0 && v.retreating ? -1 : 1;
  team.forEach((a, i) => {
    const hx = heroX(i) - retreatShift;
    // The line has depth: the warrior in front stands on the near edge of the floor, the casters a step back.
    const fy = floorY - (team.length - 1 - i) * 1.6;
    const l = v.heroLunge.get(a.id);
    const lunge = l ? Math.sin((1 - l.t / 0.45) * Math.PI) : 0;
    const cover = v.guardCover && v.guardCover.actorIdx === i ? Math.sin((1 - v.guardCover.t / 0.55) * Math.PI) * 9 : 0;
    const lx = (l ? hx + (l.tx - hx) * lunge : hx) + cover;
    const cheerHop = v.cheer > 0 ? Math.abs(Math.sin(env.clock * 14 + i * 1.3)) * -3.5 * Math.min(1, v.cheer * 2) : 0;
    // Wind-up: the hero whose turn is next steps back a little.
    const next = p.phase === 'fight' && actIdx === i && !l ? windup * -3 : 0;
    const hurt = v.heroHurt.get(a.id) ?? 0, heal = v.heal.get(a.id) ?? 0;
    ellipse(ctx, lx + next, fy + 1, 6, 2.5, 'rgba(0,0,0,0.4)');
    if (a.hero) {
      ctx.strokeStyle = `rgba(255,224,102,${0.65 + 0.2 * Math.sin(env.clock * 5)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(lx + next, fy + 1, 8.5, 3.1, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (v.taunt > 0 && v.tauntIdx === i) {
      const tk = 1 - v.taunt / 0.8;
      ctx.strokeStyle = `rgba(255,212,96,${0.85 * (1 - tk)})`; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(lx, fy + 1, 7 + tk * 14, 2.5 + tk * 5, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (heal > 0) { circle(ctx, hx, floorY - 10, 9 * (1 - heal), rgba('#90f090', heal * 0.5)); for (let k = 0; k < 4; k++) circle(ctx, hx - 6 + k * 4, floorY - 4 - ((env.clock * 30 + k * 7) % 24), 1, rgba('#c0ffc0', heal)); }
    if (lunge > 0.3) { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * 0.3; drawClassFigure(ctx, a.cls, a.level, env, false, hx + (lx - hx) * 0.5, fy, heroDir, 1.35, false, s.equipment); ctx.globalAlpha = ga; }
    drawClassFigure(ctx, a.cls, a.level, env, p.phase === 'explore' || lunge > 0 || v.outro > 0, lx + next, fy + cheerHop, heroDir, 1.35, hurt > 0, s.equipment);
    if (lunge > 0.7) { ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(lx + 11, floorY - 14, 8, -1.2, 0.6); ctx.stroke(); }
    if (v.taunt > 0 && v.tauntIdx === i) {
      const sy = floorY - 32 - Math.sin(v.taunt * 10) * 1.5;
      poly(ctx, [hx - 3.5, sy - 3, hx + 3.5, sy - 3, hx + 3, sy + 1, hx, sy + 4, hx - 3, sy + 1], `rgba(255,212,96,${Math.min(1, v.taunt * 2)})`);
      ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#5a2010'; ctx.fillText('!', hx, sy + 2.5);
    }
    if (v.beam > 0 && v.beamIdx === i) {
      const g = ctx.createLinearGradient(0, 0, 0, floorY); g.addColorStop(0, `rgba(255,240,160,${0.7 * v.beam})`); g.addColorStop(1, `rgba(255,240,160,${0.15 * v.beam})`); ctx.fillStyle = g; ctx.fillRect(hx - 7, 0, 14, floorY);
      ctx.strokeStyle = `rgba(255,240,160,${0.8 * v.beam})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(hx, fy + 1, 9, 3.2, 0, 0, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 4; k++) circle(ctx, hx - 8 + k * 5.5, floorY - 8 - ((env.clock * 40 + k * 9) % 30), 1.2, rgba('#fff8c0', v.beam));
    }
    if (v.block > 0 && v.blockIdx === i) { ctx.strokeStyle = `rgba(200,220,255,${v.block * 2})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(hx + 9, floorY - 12, 9, -1.4, 1.4); ctx.stroke(); }
    if (v.revive > 0 && v.reviveIdx === i) {
      const rk = Math.min(1, v.revive);
      circle(ctx, hx, floorY - 12, 16 * (1.2 - v.revive) + 4, rgba('#ffffff', v.revive * 0.5));
      poly(ctx, [hx - 2, floorY - 14, hx - 12, floorY - 26, hx - 6, floorY - 10], `rgba(255,245,190,${0.6 * rk})`);
      poly(ctx, [hx + 2, floorY - 14, hx + 12, floorY - 26, hx + 6, floorY - 10], `rgba(255,245,190,${0.6 * rk})`);
    }
    if (v.casting > 0 && v.castIdx === i) { circle(ctx, hx + 8, floorY - 18, 5 + (0.4 - v.casting) * 10, rgba(a.cls === 'priest' ? '#fff0a0' : '#ffa040', v.casting * 2)); for (let k = 0; k < 3; k++) { const ang = env.clock * 8 + k * 2.1; circle(ctx, hx + 8 + Math.cos(ang) * 6, floorY - 18 + Math.sin(ang) * 4, 1, rgba('#ffffff', v.casting * 2)); } }
    if (v.curse > 0 && v.curseIdx === i) { const k = v.curse; circle(ctx, hx, floorY - 28, 7, rgba('#8030c0', 0.25 * k)); ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = rgba('#d080ff', Math.min(1, k * 2)); ctx.fillText('\u2620', hx, floorY - 25 - (1 - k) * 6); }
    if (a.cls === 'mage') circle(ctx, hx + 6, floorY - 22, 9, rgba('#80c0ff', 0.12 + 0.05 * Math.sin(env.clock * 4)));
    if (a.cls === 'priest') circle(ctx, hx, floorY - 24, 8, rgba('#ffe890', 0.1 + 0.04 * Math.sin(env.clock * 3)));
    if (a.hero) {
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffe060';
      ctx.fillText('★', lx + next, fy - 24 + cheerHop + Math.sin(env.clock * 4) * 1.2);
    }
  });
  // Dragon's breath: a cone from the breather across the heroes.
  if (v.breath > 0) {
    const k = v.breath / 0.8, bx = enemyX(v.breathFrom, n, !!e?.boss, PANEL_W) - 8, by = floorY - 18;
    const g = ctx.createLinearGradient(bx, 0, 20, 0); g.addColorStop(0, rgba('#ff8030', 0.75 * k)); g.addColorStop(1, rgba('#ffe080', 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(10, floorY - 44 + Math.sin(env.clock * 20) * 3); ctx.lineTo(10, floorY + 2); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 10; i++) { const q = (env.clock * 1.5 + i * 0.1) % 1; circle(ctx, bx - q * (bx - 20), by + (Math.sin(i * 1.7 + env.clock * 9) * 10 - 6) * q, 2.5 * (1 - q) + 0.5, rgba(i % 2 ? '#ffe080' : '#ff6020', k * (1 - q))); }
  }
  enemies.forEach((en, i) => {
    if (en.hp <= 0) return;
    const ev = v.enemies[i] ?? { lunge: 0, hurt: 0, shownHp: 1 };
    const sc = enemyScale(en.monster, !!e?.boss, n) * (en.nemesis ? 1.15 : 1);
    const x = enemyX(i, n, !!e?.boss, PANEL_W);
    const lunge = ev.lunge > 0 ? Math.sin((1 - ev.lunge / 0.45) * Math.PI) : 0;
    // Wind-up: the enemy whose turn is next crouches and rears.
    const myTurn = p.phase === 'fight' && actIdx === team.length + i && !ev.lunge;
    const crouch = myTurn ? 1 - 0.12 * Math.sin(windup * Math.PI) : 1;
    ellipse(ctx, x - lunge * 6, floorY + 1, 9 * sc, 3 * sc, 'rgba(0,0,0,0.45)');
    if (en.nemesis) {
      ctx.strokeStyle = `rgba(255,208,64,${0.55 + 0.25 * Math.sin(env.clock * 5)})`; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(x - lunge * 6, floorY + 1, 11 * sc, 3.6 * sc, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.save(); ctx.translate(x, floorY); ctx.scale(-sc * (myTurn ? 1 + 0.06 * windup : 1), sc * crouch);
    drawMonster(ctx, en.monster, env, 1, ev.hurt, v.frozen > 0 ? 0 : lunge * 1.4, 'panel', p.phase === 'explore');
    ctx.restore();
    if (en.nemesis) {
      const h = monsterHeight(en.monster) * sc, cy = floorY - h - 10 + Math.sin(env.clock * 4) * 1.2;
      poly(ctx, [x - 4.5, cy, x - 3.5, cy - 4, x - 1.5, cy - 1.5, x, cy - 5, x + 1.5, cy - 1.5, x + 3.5, cy - 4, x + 4.5, cy], '#ffd040');
      circle(ctx, x, cy - 5, 0.9, '#ff4060');
    }
    if (lunge > 0.7) { const h = monsterHeight(en.monster) * sc; ctx.strokeStyle = 'rgba(255,120,80,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x - lunge * 8 - 8, floorY - h * 0.5, 7, Math.PI - 0.6, Math.PI + 1.2); ctx.stroke(); }
    if (v.frozen > 0) {
      const h = monsterHeight(en.monster) * sc, a = Math.min(1, v.frozen * 2);
      ctx.fillStyle = `rgba(140,210,255,${0.35 * a})`; ctx.beginPath(); ctx.ellipse(x, floorY - h / 2, 12 * sc, h / 2 + 4, 0, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 5; k++) { const cx = x - 10 * sc + k * 5 * sc, cy = floorY - h * 0.2 - (k % 2) * h * 0.5; poly(ctx, [cx, cy - 5, cx + 2.5, cy, cx, cy + 3, cx - 2.5, cy], rgba('#dff4ff', 0.9 * a)); }
    }
  });
  for (const d of v.dying) {
    ctx.save(); ctx.translate(d.x, floorY); ctx.scale(-d.scale, d.scale); ctx.globalAlpha *= Math.max(0, 1 - d.t); ctx.translate(0, d.t * 8); ctx.rotate(d.t * 0.5);
    drawMonster(ctx, d.monster, env, 1, 1, 0, 'panel');
    ctx.restore();
  }
  void mx;
}
