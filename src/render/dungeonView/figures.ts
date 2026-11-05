// Heroes and the monster (figures only). Drawn twice: once mirrored for the floor reflection.
import type { Adventurer, GameState, Party } from '../../sim/types';
import { circle, ellipse, poly, rgba, type Env } from '../palette';
import { drawClassFigure } from '../units';
import { drawMonster, monsterHeight } from '../monsters';
import { heroX } from './hud';
import type { ViewState } from './state';

/** Heroes and the monster (figures only). Called twice: once mirrored for the floor reflection. */
export function drawFigures(ctx: CanvasRenderingContext2D, s: GameState, p: Party, v: ViewState, env: Env, floorY: number, team: Adventurer[], mx: number): void {
  const e = p.encounter;
  team.forEach((a, i) => {
    const hx = heroX(i), lunge = v.heroIdx === i && v.heroLunge > 0 ? Math.sin((v.heroLunge / 0.35) * Math.PI) * 22 : 0;
    const hurt = v.heroHurt.get(a.id) ?? 0, heal = v.heal.get(a.id) ?? 0;
    ellipse(ctx, hx + lunge * 0.5, floorY + 1, 6, 2.5, 'rgba(0,0,0,0.4)');
    if (heal > 0) circle(ctx, hx, floorY - 10, 9 * (1 - heal), rgba('#90f090', heal * 0.5));
    if (lunge > 4) { const ga = ctx.globalAlpha; ctx.globalAlpha = ga * 0.3; drawClassFigure(ctx, a.cls, a.level, env, false, hx + lunge * 0.45, floorY, 1, 1.35, false, s.equipment); ctx.globalAlpha = ga; }
    drawClassFigure(ctx, a.cls, a.level, env, p.phase === 'explore', hx + lunge, floorY, 1, 1.35, hurt > 0, s.equipment);
    if (lunge > 8) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx + lunge + 10, floorY - 14, 8, -1.2, 0.6); ctx.stroke(); }
    if (v.taunt > 0 && v.tauntIdx === i) { ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff6060'; ctx.fillText('!', hx, floorY - 34 - Math.sin(v.taunt * 12) * 2); }
    if (v.beam > 0 && v.beamIdx === i) { const g = ctx.createLinearGradient(0, 0, 0, floorY); g.addColorStop(0, `rgba(255,240,160,${0.7 * v.beam})`); g.addColorStop(1, `rgba(255,240,160,${0.15 * v.beam})`); ctx.fillStyle = g; ctx.fillRect(hx - 7, 0, 14, floorY); for (let k = 0; k < 4; k++) circle(ctx, hx - 8 + k * 5.5, floorY - 8 - ((env.clock * 40 + k * 9) % 30), 1.2, rgba('#fff8c0', v.beam)); }
    if (v.block > 0 && v.blockIdx === i) { ctx.strokeStyle = `rgba(200,220,255,${v.block * 2})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(hx + 9, floorY - 12, 9, -1.4, 1.4); ctx.stroke(); }
    if (v.revive > 0 && v.reviveIdx === i) { circle(ctx, hx, floorY - 12, 16 * (1.2 - v.revive) + 4, rgba('#ffffff', v.revive * 0.5)); }
    if (v.casting > 0 && v.castIdx === i) circle(ctx, hx + 8, floorY - 18, 5, rgba('#ffa040', v.casting * 2));
    // The mage's staff and the priest's halo throw a little light.
    if (a.cls === 'mage') circle(ctx, hx + 6, floorY - 22, 9, rgba('#80c0ff', 0.12 + 0.05 * Math.sin(env.clock * 4)));
    if (a.cls === 'priest') circle(ctx, hx, floorY - 24, 8, rgba('#ffe890', 0.1 + 0.04 * Math.sin(env.clock * 3)));
  });
  if (e) {
    const sc = e.boss ? (e.monster === 'demonLord' ? 1.8 : 1.5) : 1.15;
    const lunge = v.monsterLunge > 0 ? Math.sin((v.monsterLunge / 0.35) * Math.PI) : 0;
    ellipse(ctx, mx - lunge * 4, floorY + 1, 9 * sc, 3 * sc, 'rgba(0,0,0,0.45)');
    ctx.save(); ctx.translate(mx, floorY); ctx.scale(-1, 1);
    drawMonster(ctx, e.monster, env, sc, v.monsterHurt, v.frozen > 0 ? 0 : lunge);
    ctx.restore();
    if (v.frozen > 0) {
      const h = monsterHeight(e.monster) * sc, a = Math.min(1, v.frozen * 2);
      ctx.fillStyle = `rgba(140,210,255,${0.35 * a})`; ctx.beginPath(); ctx.ellipse(mx, floorY - h / 2, 12 * sc, h / 2 + 4, 0, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 5; k++) { const cx = mx - 10 * sc + k * 5 * sc, cy = floorY - h * 0.2 - (k % 2) * h * 0.5; poly(ctx, [cx, cy - 5, cx + 2.5, cy, cx, cy + 3, cx - 2.5, cy], rgba('#dff4ff', 0.9 * a)); }
    }
  } else if (v.death > 0) {
    ctx.save(); ctx.translate(mx, floorY); ctx.scale(-1, 1); ctx.globalAlpha *= v.death; ctx.translate(0, (0.9 - v.death) * 10);
    drawMonster(ctx, v.deathMonster, env, v.deathBoss ? 1.5 : 1.15, 1);
    ctx.restore();
  }
}
