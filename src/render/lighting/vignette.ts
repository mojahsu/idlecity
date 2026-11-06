// HD-2D diorama tilt-shift depth bands and cinematic radial vignette.

export function drawVignette(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  // Top & bottom tilt-shift diorama depth-of-field shading.
  const topG = ctx.createLinearGradient(0, 0, 0, H * 0.14);
  topG.addColorStop(0, 'rgba(14, 18, 32, 0.22)');
  topG.addColorStop(1, 'rgba(14, 18, 32, 0)');
  ctx.fillStyle = topG;
  ctx.fillRect(0, 0, W, H * 0.14);

  const botG = ctx.createLinearGradient(0, H * 0.86, 0, H);
  botG.addColorStop(0, 'rgba(12, 10, 18, 0)');
  botG.addColorStop(1, 'rgba(12, 10, 18, 0.26)');
  ctx.fillStyle = botG;
  ctx.fillRect(0, H * 0.86, W, H * 0.14);

  // Soft radial lens vignette around the corners.
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.7, 'rgba(8,6,14,0.12)');
  g.addColorStop(1, 'rgba(6,4,12,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
