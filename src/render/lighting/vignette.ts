// Soft dark edges.

export function drawVignette(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
