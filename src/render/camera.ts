// Smooth HD-2D Cinematic Camera: gently zooms and pans across the map to follow
// raids, departing/returning parties, active dialogue skits, or spotlighted townsfolk.
import type { GameState } from '../sim/types';
import { TILE } from './constants';
import type { ActiveSkitView } from './townlife/skits';

export class CinematicCamera {
  enabled = false;
  private cx = 15 * TILE;
  private cy = 10 * TILE;
  private zoom = 1;
  private initialized = false;

  toggle(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  state(): { cx: number; cy: number; zoom: number } {
    return { cx: this.cx, cy: this.cy, zoom: this.zoom };
  }

  update(
    s: GameState,
    dt: number,
    skit: ActiveSkitView | null,
    spotlightPos: { x: number; y: number } | null,
  ): void {
    const W = s.width * TILE, H = s.height * TILE;
    if (!this.initialized) {
      this.cx = s.center.x * TILE + TILE / 2;
      this.cy = s.center.y * TILE + TILE / 2;
      this.initialized = true;
    }

    let tx = W / 2, ty = H / 2, tz = 1;
    if (this.enabled) {
      tz = 1.42;
      if (s.raid) {
        tx = s.raid.x * TILE + TILE / 2;
        ty = s.raid.y * TILE + TILE / 2;
        tz = 1.5;
      } else if (skit) {
        tx = ((skit.a.x + skit.b.x) * 0.5) * TILE + TILE / 2;
        ty = ((skit.a.y + skit.b.y) * 0.5) * TILE + TILE / 2;
        tz = 1.48;
      } else if (spotlightPos) {
        tx = spotlightPos.x * TILE + TILE / 2;
        ty = spotlightPos.y * TILE + TILE / 2;
        tz = 1.4;
      } else {
        const roadParty = s.parties.find((p) => p.phase === 'travel' || p.phase === 'return');
        if (roadParty) {
          tx = roadParty.x * TILE + TILE / 2;
          ty = roadParty.y * TILE + TILE / 2;
          tz = 1.42;
        } else {
          tx = s.center.x * TILE + TILE / 2;
          ty = s.center.y * TILE + TILE / 2;
          tz = 1.32;
        }
      }
    }

    const k = 1 - Math.exp(-dt * 2.6);
    this.zoom += (tz - this.zoom) * k;
    // Clamp camera center so the zoomed viewport never goes outside [0, W] x [0, H].
    const halfW = (W * 0.5) / this.zoom;
    const halfH = (H * 0.5) / this.zoom;
    const clampedX = Math.max(halfW, Math.min(W - halfW, tx));
    const clampedY = Math.max(halfH, Math.min(H - halfH, ty));
    this.cx += (clampedX - this.cx) * k;
    this.cy += (clampedY - this.cy) * k;
  }

  /** Apply the camera pan/zoom transform to the canvas context. */
  apply(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    if (Math.abs(this.zoom - 1) < 0.003) return;
    ctx.translate(W * 0.5, H * 0.5);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.cx, -this.cy);
  }

  /** Convert client mouse coordinates into map tile coordinates, accounting for camera zoom/pan. */
  screenToTile(s: GameState, rect: DOMRect, clientX: number, clientY: number): { tx: number; ty: number } {
    const W = s.width * TILE, H = s.height * TILE;
    const sx = ((clientX - rect.left) / rect.width) * W;
    const sy = ((clientY - rect.top) / rect.height) * H;
    if (Math.abs(this.zoom - 1) < 0.003) {
      return { tx: sx / TILE, ty: sy / TILE };
    }
    const worldX = (sx - W * 0.5) / this.zoom + this.cx;
    const worldY = (sy - H * 0.5) / this.zoom + this.cy;
    return { tx: worldX / TILE, ty: worldY / TILE };
  }
}
