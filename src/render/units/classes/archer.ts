// archer: class art drawn over the shared body.
import { rect, line } from '../../palette';
import { body } from '../shared';
import type { ClassArt } from './shared';

export function drawArcher(art: ClassArt): void {
  const { ctx, p } = art;
  body(ctx, '#3f8a3a', '#e8b88a', '#a8702a', p);
  rect(ctx, -4.5, -11, 2.5, 7, '#6a4a2a'); for (let i = 0; i < 3; i++) rect(ctx, -4.2 + i, -13 - (i % 2), 0.6, 2.5, '#d8d8d8'); // quiver
  ctx.fillStyle = '#2f6a2a'; ctx.beginPath(); ctx.arc(0, -13.4, 3.9, Math.PI * 0.9, Math.PI * 2.1); ctx.fill(); // hood
  ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(4, -8, 6, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
  line(ctx, 4, -14, 4, -2, '#e0e0e0', 0.5);
}
