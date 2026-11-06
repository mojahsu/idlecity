// troll: hulking cavern troll with a stone club, drawn around (0,0) = feet centre, facing +x.
import { circle, ellipse, rect } from '../palette';
import type { MonsterArt } from './shared';

export function drawTroll(art: MonsterArt): void {
  const { ctx, breathe, attacking } = art;
  rect(ctx, -4, -6, 3, 6, '#2e5848');
  rect(ctx, 1, -6, 3, 6, '#264a3c');
  ellipse(ctx, 0, -12 + breathe * 0.5, 6.5, 7, '#3a6e5a');
  circle(ctx, 2, -19 + breathe * 0.5, 4.2, '#46826a');
  rect(ctx, 3.5, -20, 1.4, 1.4, '#ffd040');
  ctx.save();
  ctx.translate(4, -12);
  ctx.rotate(-0.4 + attacking * 0.9);
  rect(ctx, 0, -10, 3.5, 11, '#6a5844');
  ellipse(ctx, 1.8, -10, 3.2, 2.5, '#8a8e94');
  ctx.restore();
}
