// Monster art, drawn around (0,0) = feet centre, facing +x, roughly 18px tall
// at scale 1. Used by the dungeon view and by raids on the map.
import { circle, ellipse, poly, rect, line, rgba, type Env } from './palette';

export function drawMonster(ctx: CanvasRenderingContext2D, id: string, env: Env, scale = 1, hurt = 0, attacking = 0): void {
  const c = env.clock;
  const breathe = Math.sin(c * 3) * 0.4;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-attacking * 6, 0);
  if (hurt > 0) { ctx.filter = 'brightness(1.6) saturate(0.4)'; ctx.translate(Math.sin(c * 60) * 1.5, 0); }
  switch (id) {
    case 'rat':
      ellipse(ctx, 0, -3, 5, 2.6 + breathe * 0.3, '#7a6a5a'); circle(ctx, 4.5, -4, 2.2, '#8a7a6a'); circle(ctx, 4, -6, 1, '#9a8a7a'); rect(ctx, 5.6, -4.5, 0.8, 0.8, '#ff4040');
      line(ctx, -5, -3, -10, -1 + Math.sin(c * 5) * 1.5, '#b08a7a', 1); break;
    case 'goblin':
      rect(ctx, -2.2, -3, 1.8, 3, '#3a4a2a'); rect(ctx, 0.6, -3, 1.8, 3, '#3a4a2a');
      rect(ctx, -2.8, -8, 5.6, 5.5, '#5a3a2a'); circle(ctx, 0, -10.5 + breathe, 3, '#6a9a3a');
      poly(ctx, [-3, -11, -5.5, -12.5, -3, -9.5], '#6a9a3a'); poly(ctx, [3, -11, 5.5, -12.5, 3, -9.5], '#6a9a3a');
      rect(ctx, 0.8, -11, 1, 1, '#ff4040'); line(ctx, 3, -7, 6, -11, '#c0c0c8', 1.2); break;
    case 'goblinChief':
      rect(ctx, -3, -4, 2.4, 4, '#3a4a2a'); rect(ctx, 0.8, -4, 2.4, 4, '#3a4a2a');
      rect(ctx, -4.5, -11.5, 9, 8, '#6a3a2a'); rect(ctx, -4.5, -8, 9, 1.5, '#e0b040'); circle(ctx, 0, -14 + breathe, 4, '#5a8a30');
      poly(ctx, [-4, -15, -7.5, -17, -4, -13], '#5a8a30'); poly(ctx, [4, -15, 7.5, -17, 4, -13], '#5a8a30');
      poly(ctx, [-3.5, -17.5, -2, -21, 0, -18, 2, -21, 3.5, -17.5], '#e0b040'); rect(ctx, 1, -14.5, 1.2, 1.2, '#ff4040');
      ctx.save(); ctx.translate(5.5, -9); ctx.rotate(-0.5); rect(ctx, -0.8, -11, 1.6, 11, '#6a4a2a'); poly(ctx, [-3.5, -11, 0, -14, 3.5, -11, 0, -9], '#8a8f96'); ctx.restore(); break;
    case 'wolf':
      ellipse(ctx, 0, -4, 6, 3 + breathe * 0.3, '#6a6a70'); circle(ctx, 5.5, -6, 2.6, '#7a7a80');
      poly(ctx, [4, -8, 5, -10.5, 6, -8], '#6a6a70'); poly(ctx, [6, -8, 7.2, -10.5, 8, -8], '#6a6a70');
      rect(ctx, 7, -6.2, 1, 1, '#ffd040'); line(ctx, -6, -5, -9, -8 + Math.sin(c * 4) * 1, '#6a6a70', 1.5);
      for (let k = 0; k < 4; k++) rect(ctx, -4 + k * 3, -2, 1.4, 2.5, '#5a5a60'); break;
    case 'skeleton':
      rect(ctx, -2.4, -4, 1.6, 4, '#e8e4d8'); rect(ctx, 0.8, -4, 1.6, 4, '#e8e4d8');
      rect(ctx, -0.8, -11, 1.6, 7, '#e8e4d8'); for (let i = 0; i < 3; i++) rect(ctx, -3, -10 + i * 2, 6, 0.9, '#e8e4d8');
      circle(ctx, 0, -13.5 + breathe, 3.2, '#efeadc'); rect(ctx, -2, -14, 1.3, 1.3, '#1a1410'); rect(ctx, 0.8, -14, 1.3, 1.3, '#1a1410'); rect(ctx, -1.5, -11.5, 3, 0.8, '#1a1410');
      line(ctx, 3, -8, 7, -12, '#b8b8c0', 1.4); circle(ctx, -4.5, -7, 2.8, '#8a7a5a'); break;
    case 'ghoul':
      rect(ctx, -2.6, -4, 2, 4, '#5a6a5a'); rect(ctx, 0.6, -4, 2, 4, '#5a6a5a');
      poly(ctx, [-3.5, -4, -3, -11, 3, -11, 3.5, -4], '#6a7a6a'); circle(ctx, 0, -13 + breathe, 3.4, '#8a9a7a');
      rect(ctx, -2, -13.5, 1.4, 1, '#f0f040'); rect(ctx, 0.8, -13.5, 1.4, 1, '#f0f040'); rect(ctx, -1.5, -11, 3, 1.5, '#3a2a2a');
      line(ctx, 3, -9, 7, -6 + Math.sin(c * 6) * 1, '#6a7a6a', 2); break;
    case 'bandit':
      rect(ctx, -2.4, -4, 2, 4, '#2a2a30'); rect(ctx, 0.6, -4, 2, 4, '#2a2a30');
      rect(ctx, -3.2, -10.5, 6.4, 7, '#3a3240'); circle(ctx, 0, -13 + breathe, 3.3, '#e8b88a');
      ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.arc(0, -13.4 + breathe, 3.6, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();
      rect(ctx, -3, -13 + breathe, 6, 1.6, '#8a2a2a'); line(ctx, 3.5, -7, 6.5, -10, '#d0d0d8', 1.2); break;
    case 'lich':
      poly(ctx, [-5, 0, -3.5, -14, 3.5, -14, 5, 0], '#2a1a3a'); rect(ctx, -3.5, -14, 7, 1.5, '#6a3aa0');
      circle(ctx, 0, -16.5 + breathe, 3.4, '#e8e4d8'); rect(ctx, -2, -17, 1.4, 1.4, '#60e0ff'); rect(ctx, 0.8, -17, 1.4, 1.4, '#60e0ff');
      poly(ctx, [-4.5, -19.5, -3, -24, -1, -20, 1, -24, 3, -20, 4.5, -19.5], '#3a2a5a');
      rect(ctx, 5, -20, 1.2, 20, '#4a3a5a'); circle(ctx, 5.6, -21.5, 2.6, rgba('#60e0ff', 0.35 + 0.2 * Math.sin(c * 4))); circle(ctx, 5.6, -21.5, 1.4, '#a0f0ff');
      for (let i = 0; i < 3; i++) circle(ctx, -6 + Math.sin(c * 2 + i * 2) * 2, -6 - i * 4 + Math.cos(c * 3 + i) * 2, 1, rgba('#60e0ff', 0.6)); break;
    case 'imp':
      rect(ctx, -2, -3, 1.6, 3, '#8a2a2a'); rect(ctx, 0.6, -3, 1.6, 3, '#8a2a2a');
      rect(ctx, -2.8, -8.5, 5.6, 5.5, '#b03030'); circle(ctx, 0, -10.5 + breathe, 2.8, '#c04040');
      poly(ctx, [-2, -12.5, -2.5, -15.5, -0.5, -13], '#6a1a1a'); poly(ctx, [2, -12.5, 2.5, -15.5, 0.5, -13], '#6a1a1a');
      rect(ctx, 0.8, -11, 1, 1, '#ffe040');
      { const w = Math.sin(c * 10) * 2; poly(ctx, [-3, -8, -8, -11 - w, -6, -6], '#6a1a1a'); }
      line(ctx, -2, -3, -6, -1 + Math.sin(c * 5), '#b03030', 1); break;
    case 'demon':
      rect(ctx, -3.5, -5, 2.8, 5, '#6a1a1a'); rect(ctx, 0.8, -5, 2.8, 5, '#6a1a1a');
      rect(ctx, -5.5, -15, 11, 10, '#a02020'); rect(ctx, -5.5, -15, 11, 1.5, '#c04040');
      circle(ctx, 0, -18 + breathe, 4.2, '#b03030'); poly(ctx, [-3, -21, -5, -26, -1.5, -22], '#3a1010'); poly(ctx, [3, -21, 5, -26, 1.5, -22], '#3a1010');
      rect(ctx, -2.2, -19, 1.6, 1.2, '#ffe040'); rect(ctx, 0.8, -19, 1.6, 1.2, '#ffe040');
      { const w = Math.sin(c * 6) * 3; poly(ctx, [-5, -13, -13, -18 - w, -10, -8], '#4a1010'); }
      line(ctx, 5, -10, 9, -16, '#4a4a50', 2); break;
    case 'orc':
      rect(ctx, -3, -4, 2.4, 4, '#3a3a2a'); rect(ctx, 0.8, -4, 2.4, 4, '#3a3a2a');
      rect(ctx, -4.5, -12, 9, 8.5, '#4a7a3a'); rect(ctx, -4.5, -8, 9, 1.5, '#5a3a1a');
      circle(ctx, 0, -14.5 + breathe, 3.6, '#5a8a40'); rect(ctx, -2, -13, 1.2, 1.5, '#f4f4f4'); rect(ctx, 1, -13, 1.2, 1.5, '#f4f4f4'); rect(ctx, 1.2, -15.5, 1, 1, '#ff4040');
      ctx.save(); ctx.translate(5, -9); ctx.rotate(-0.6); rect(ctx, -0.8, -10, 1.6, 10, '#6a4a2a'); circle(ctx, 0, -10, 2.5, '#5a5a5a'); ctx.restore(); break;
    case 'dragon': {
      const w = Math.sin(c * 4) * 4;
      poly(ctx, [-4, -10, -16, -18 - w, -8, -6], '#2a6a3a'); poly(ctx, [2, -11, 10, -20 - w, 6, -8], '#2a6a3a');
      ellipse(ctx, -2, -7, 9, 5 + breathe * 0.4, '#3a8a4a'); ellipse(ctx, -2, -5, 7, 2.5, '#9ad070');
      for (let k = 0; k < 4; k++) rect(ctx, -7 + k * 4, -3, 2, 3, '#2a6a3a');
      line(ctx, -10, -7, -17, -3 + Math.sin(c * 2) * 2, '#3a8a4a', 3);
      ellipse(ctx, 8, -13 + breathe, 5, 3, '#3a8a4a'); poly(ctx, [12, -14, 16, -12, 12, -11], '#3a8a4a'); rect(ctx, 9, -14.5, 1.4, 1.2, '#ffe040');
      for (let k = 0; k < 4; k++) poly(ctx, [-8 + k * 4, -11, -6.5 + k * 4, -14.5, -5 + k * 4, -11], '#2a6a3a');
      if (attacking > 0.3) { ellipse(ctx, 20, -12, 7 * attacking, 3 * attacking, rgba('#ff8020', 0.8)); ellipse(ctx, 18, -12, 4 * attacking, 1.8 * attacking, '#ffe060'); }
      break;
    }
    case 'demonLord': {
      const aura = 0.25 + 0.15 * Math.sin(c * 3);
      circle(ctx, 0, -14, 20, rgba('#a020e0', aura * 0.5)); circle(ctx, 0, -14, 13, rgba('#ff3060', aura * 0.4));
      rect(ctx, -4.5, -6, 3.4, 6, '#2a0a2a'); rect(ctx, 1.1, -6, 3.4, 6, '#2a0a2a');
      poly(ctx, [-8, -6, -7, -20, 7, -20, 8, -6], '#3a0a3a'); rect(ctx, -7, -20, 14, 2, '#8a2060'); rect(ctx, -3, -17, 6, 8, '#1a0a1a');
      circle(ctx, 0, -24 + breathe, 5, '#4a1040'); poly(ctx, [-4, -27, -8, -36, -2, -29], '#1a0a1a'); poly(ctx, [4, -27, 8, -36, 2, -29], '#1a0a1a');
      rect(ctx, -2.8, -25.5, 2, 1.4, '#ff3030'); rect(ctx, 0.8, -25.5, 2, 1.4, '#ff3030'); rect(ctx, -2, -22, 4, 1, '#ff6040');
      { const w = Math.sin(c * 5) * 4; poly(ctx, [-7, -16, -20, -24 - w, -16, -8], '#1a0a1a'); poly(ctx, [7, -16, 20, -24 - w, 16, -8], '#1a0a1a'); }
      ctx.save(); ctx.translate(9, -12); ctx.rotate(-0.4); rect(ctx, -1, -18, 2, 18, '#2a1a2a'); poly(ctx, [-4, -18, 0, -26, 4, -18], '#ff3060'); circle(ctx, 0, -18, 2, rgba('#ff80a0', 0.8)); ctx.restore();
      break;
    }
    default:
      circle(ctx, 0, -8, 5, '#8a4a8a');
  }
  ctx.restore();
}

/** Rough visual height so the dungeon view can place labels and HP bars. */
export function monsterHeight(id: string): number {
  switch (id) {
    case 'rat': return 8; case 'wolf': return 12; case 'imp': return 16; case 'dragon': return 24;
    case 'demon': return 28; case 'lich': return 26; case 'demonLord': return 40; case 'goblinChief': return 22;
    default: return 18;
  }
}
