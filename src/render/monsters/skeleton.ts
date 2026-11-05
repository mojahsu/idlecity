// skeleton: drawn around (0,0) = feet centre, facing +x.
import { circle, rect, line } from '../palette';
import type { MonsterArt } from './shared';

export function drawSkeleton(art: MonsterArt): void {
  const { ctx, breathe } = art;
  rect(ctx, -2.4, -4, 1.6, 4, '#e8e4d8'); rect(ctx, 0.8, -4, 1.6, 4, '#e8e4d8');
  rect(ctx, -0.8, -11, 1.6, 7, '#e8e4d8'); for (let i = 0; i < 3; i++) rect(ctx, -3, -10 + i * 2, 6, 0.9, '#e8e4d8');
  circle(ctx, 0, -13.5 + breathe, 3.2, '#efeadc'); rect(ctx, -2, -14, 1.3, 1.3, '#1a1410'); rect(ctx, 0.8, -14, 1.3, 1.3, '#1a1410'); rect(ctx, -1.5, -11.5, 3, 0.8, '#1a1410');
  line(ctx, 3, -8, 7, -12, '#b8b8c0', 1.4); circle(ctx, -4.5, -7, 2.8, '#8a7a5a');
}
