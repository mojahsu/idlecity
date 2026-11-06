// Stone hero on a plinth, raised on the square once the Demon Lord is dead,
// plus bespoke boss trophy monuments for each cleared dungeon.
import { TILE } from '../constants';
import { circle, ellipse, line, poly, rect, rgba, groundShadow, type Env } from '../palette';
import { classArt } from './classes';

/** Stone hero on a plinth, raised on the square once the Demon Lord is dead. */
export function drawStatue(ctx: CanvasRenderingContext2D, x: number, y: number, env: Env): void {
  const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2 + 5;
  groundShadow(ctx, px, py + 2, 9, 3, 0.3);
  rect(ctx, px - 8, py - 4, 16, 6, '#8a8a86'); rect(ctx, px - 8, py - 4, 16, 1.5, '#b0b0ac'); rect(ctx, px - 6, py - 9, 12, 5, '#9a9a96'); rect(ctx, px - 6, py - 9, 12, 1.2, '#c0c0bc');
  rect(ctx, px - 3, py - 2, 6, 2, '#e0c060');
  // Flowers laid at the base of the plinth.
  if (env.season !== 'winter') {
    circle(ctx, px - 6, py + 1.2, 1.2, '#e85a70'); circle(ctx, px - 4, py + 1.6, 1.1, '#f7d94c');
    circle(ctx, px + 4.5, py + 1.5, 1.2, '#70b8f0'); circle(ctx, px + 6.2, py + 1.1, 1.1, '#f7d94c');
  }
  ctx.save(); ctx.translate(px, py - 9); ctx.scale(0.75, 0.75);
  ctx.filter = 'grayscale(1) brightness(1.15) contrast(0.9)';
  classArt(ctx, 'warrior', { walk: 0, bob: 0, swing: 0 }, false, env, 1);
  ctx.restore();
  // Subtle golden glints rising around the monument.
  for (let i = 0; i < 2; i++) {
    const gt = (env.clock * 0.6 + i * 0.5) % 1;
    circle(ctx, px - 5 + i * 10 + Math.sin(env.clock * 2 + i) * 1.5, py - 8 - gt * 14, 0.9 * (1 - gt) + 0.3, `rgba(255,228,120,${0.75 * (1 - gt)})`);
  }
}

/** Trophy monument raised in town for each conquered dungeon boss. */
export function drawTrophyMonument(ctx: CanvasRenderingContext2D, x: number, y: number, dungeonId: string, env: Env): void {
  if (dungeonId === 'darkTower') { drawStatue(ctx, x, y, env); return; }
  const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2 + 5;
  groundShadow(ctx, px, py + 2, 7.5, 2.5, 0.28);
  // Shared stone pedestal base.
  rect(ctx, px - 6.5, py - 3.5, 13, 5, '#7e7e7a');
  rect(ctx, px - 6.5, py - 3.5, 13, 1.2, '#a8a8a2');
  rect(ctx, px - 5, py - 7, 10, 3.5, '#8e8e8a');
  rect(ctx, px - 2.5, py - 2, 5, 1.5, '#d8b450');

  if (dungeonId === 'goblinCave') {
    // Goblin King Totem: wooden trophy pole with crossed war-axes and spiked gold crown.
    rect(ctx, px - 1.2, py - 18, 2.4, 11, '#6a4828');
    line(ctx, px - 5, py - 15, px + 5, py - 9, '#8a6840', 1.2);
    line(ctx, px + 5, py - 15, px - 5, py - 9, '#8a6840', 1.2);
    poly(ctx, [px - 5, py - 18, px - 4, py - 22, px - 1.8, py - 19.5, px, py - 23, px + 1.8, py - 19.5, px + 4, py - 22, px + 5, py - 18], '#f0c840');
    circle(ctx, px, py - 20, 1, '#e03050');
  } else if (dungeonId === 'ancientRuins') {
    // Lich Soul Obelisk: dark runed obelisk with levitating violet soul-orb.
    poly(ctx, [px - 4, py - 7, px + 4, py - 7, px + 2.5, py - 19, px, py - 22, px - 2.5, py - 19], '#382e4a');
    poly(ctx, [px - 4, py - 7, px, py - 7, px, py - 22, px - 2.5, py - 19], '#4c3e64');
    const bob = Math.sin(env.clock * 3) * 1.4;
    circle(ctx, px, py - 25 + bob, 4.5, rgba('#b060ff', 0.3));
    circle(ctx, px, py - 25 + bob, 2.4, '#d890ff');
    circle(ctx, px - 0.6, py - 25.6 + bob, 0.9, '#ffffff');
  } else if (dungeonId === 'emeraldCavern') {
    // Emerald Queen Spire: glowing crystal cluster.
    poly(ctx, [px - 4.5, py - 7, px - 1.5, py - 7, px - 3, py - 18], '#28a868');
    poly(ctx, [px + 1.5, py - 7, px + 4.5, py - 7, px + 3.2, py - 17], '#28a868');
    poly(ctx, [px - 2.5, py - 7, px + 2.5, py - 7, px + 1.5, py - 22, px, py - 25, px - 1.5, py - 22], '#40e890');
    poly(ctx, [px - 2.5, py - 7, px, py - 7, px, py - 25, px - 1.5, py - 22], '#80ffc0');
    for (let i = 0; i < 2; i++) {
      const kt = (env.clock * 0.7 + i * 0.5) % 1;
      circle(ctx, px - 3 + i * 6, py - 10 - kt * 14, 0.9 * (1 - kt) + 0.3, rgba('#80ffc0', 0.8 * (1 - kt)));
    }
  } else {
    // Ember Peak Dragon Skull Trophy: horned dragon skull with glowing ember eyes.
    poly(ctx, [px - 5, py - 13, px - 9, py - 20, px - 3, py - 16], '#d8ccb8');
    poly(ctx, [px + 5, py - 13, px + 9, py - 20, px + 3, py - 16], '#d8ccb8');
    ellipse(ctx, px, py - 12, 5.2, 4, '#ece2d0');
    poly(ctx, [px - 3.5, py - 11, px + 3.5, py - 11, px + 2, py - 6.5, px - 2, py - 6.5], '#dfd4c0');
    const glow = 0.65 + 0.35 * Math.sin(env.clock * 4);
    circle(ctx, px - 2, py - 12.5, 1.2, rgba('#ff6020', glow));
    circle(ctx, px + 2, py - 12.5, 1.2, rgba('#ff6020', glow));
  }
}
