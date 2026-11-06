// golem: obsidian giant with a glowing magma core, drawn around (0,0) = feet centre, facing +x.
import { circle, rect, rgba } from '../palette';
import type { MonsterArt } from './shared';

export function drawGolem(art: MonsterArt): void {
  const { ctx, c, breathe } = art;
  rect(ctx, -5, -6, 4, 6, '#2a1c1c');
  rect(ctx, 1, -6, 4, 6, '#221616');
  rect(ctx, -7, -18 + breathe * 0.4, 14, 12, '#382624');
  circle(ctx, 0, -12 + breathe * 0.4, 3, rgba('#ff6820', 0.75 + 0.25 * Math.sin(c * 4)));
  circle(ctx, 0, -12 + breathe * 0.4, 1.5, '#ffe070');
  rect(ctx, -4, -23 + breathe * 0.4, 8, 5, '#442e2c');
  rect(ctx, 1, -21 + breathe * 0.4, 2, 1.4, '#ffa030');
}
