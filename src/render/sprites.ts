// Sprite sheets: the CC0 packs in public/assets (see CREDITS.md there). Each
// sheet is loaded once; until it arrives, callers get `false` and keep the
// procedural art, so the town never shows blank tiles. Tinted copies of tiles
// (job colours, snow, hurt flashes) are cached as tiny offscreen canvases.
export type SheetId = 'tiny-town' | 'tiny-dungeon' | 'tiny-creatures' | 'dungeon-ii';

/** One tile of a grid sheet. */
export interface SpriteRef { s: SheetId; i: number }

export interface DrawOpts {
  flip?: boolean;
  alpha?: number;
  /** Colour washed over the opaque pixels, with `tintA` strength (default 0.45). */
  tint?: string | null;
  tintA?: number;
  /** Rotation in radians about the bottom-centre anchor. */
  rot?: number;
  /** Vertical squash (1 = none), about the bottom-centre anchor. */
  sy?: number;
  /** For animations: force a frame instead of picking one from `t`. */
  frame?: number;
}

interface Sheet { img: HTMLImageElement | null; cols: number; tile: number }

const BASE = import.meta.env.BASE_URL + 'assets/';
const sheets: Record<SheetId, Sheet> = {
  'tiny-town': { img: null, cols: 12, tile: 16 },
  'tiny-dungeon': { img: null, cols: 12, tile: 16 },
  'tiny-creatures': { img: null, cols: 10, tile: 16 },
  'dungeon-ii': { img: null, cols: 32, tile: 16 },
};
interface Named { x: number; y: number; w: number; h: number; frames: number }
/** Named rectangles (and frame counts) for the 0x72 sheet, read from its tile list. */
const named = new Map<string, Named>();
let started = false;
const tinted = new Map<string, HTMLCanvasElement>();

/** Kick off loading (idempotent). Called by the renderer when it is created. */
export function loadSprites(): void {
  if (started || typeof Image === 'undefined') return;
  started = true;
  for (const id of Object.keys(sheets) as SheetId[]) {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth >= sheets[id].cols * 16) {
        sheets[id].tile = Math.round(img.naturalWidth / sheets[id].cols);
      }
      sheets[id].img = img;
    };
    img.src = `${BASE}${id}.png`;
  }
  fetch(`${BASE}dungeon-ii.txt`).then((r) => r.text()).then((txt) => {
    for (const line of txt.split('\n')) {
      const p = line.trim().split(/\s+/);
      if (p.length < 5) continue;
      named.set(p[0], { x: +p[1], y: +p[2], w: +p[3], h: +p[4], frames: p[5] ? +p[5] : 1 });
    }
  }).catch(() => { /* the panel keeps its procedural art */ });
}

export function spritesReady(id: SheetId): boolean { return !!sheets[id].img; }

/** The three Kenney-style sheets the map is drawn with. */
export function townSprites(): boolean { return !!sheets['tiny-town'].img && !!sheets['tiny-dungeon'].img && !!sheets['tiny-creatures'].img; }

/** The 0x72 sheet and its tile list, for the dungeon panel. */
export function dungeonSprites(): boolean { return !!sheets['dungeon-ii'].img && named.size > 0; }

/** The source image for a tile, tinted and cached when a tint is asked for. */
function source(sh: Sheet, id: SheetId, sx: number, sy: number, w: number, h: number, tint: string | null | undefined, tintA: number): CanvasImageSource | null {
  if (!sh.img) return null;
  if (!tint) return sh.img;
  const key = `${id}:${sx}:${sy}:${w}:${h}:${tint}:${tintA}`;
  let c = tinted.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d')!;
    g.drawImage(sh.img, sx, sy, w, h, 0, 0, w, h);
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = tintA; g.fillStyle = tint; g.fillRect(0, 0, w, h);
    tinted.set(key, c);
  }
  return c;
}

function blit(ctx: CanvasRenderingContext2D, img: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, x: number, y: number, w: number, h: number, o: DrawOpts, fromCache: boolean): void {
  ctx.save();
  ctx.imageSmoothingEnabled = sw >= 32;
  if (o.alpha !== undefined && o.alpha < 1) ctx.globalAlpha *= o.alpha;
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(o.flip ? -1 : 1, o.sy ?? 1);
  if (fromCache) ctx.drawImage(img, 0, 0, sw, sh, -w / 2, -h, w, h);
  else ctx.drawImage(img, sx, sy, sw, sh, -w / 2, -h, w, h);
  ctx.restore();
}

/**
 * Draw a tile of a grid sheet with its bottom-centre at (x, y), `size`
 * pixels wide and tall. Returns false when the sheet is not loaded yet.
 */
export function drawSprite(ctx: CanvasRenderingContext2D, ref: SpriteRef, x: number, y: number, size: number, o: DrawOpts = {}): boolean {
  const sh = sheets[ref.s];
  if (!sh.img) return false;
  const sx = (ref.i % sh.cols) * sh.tile, sy = Math.floor(ref.i / sh.cols) * sh.tile;
  const img = source(sh, ref.s, sx, sy, sh.tile, sh.tile, o.tint, o.tintA ?? 0.45);
  if (!img) return false;
  blit(ctx, img, sx, sy, sh.tile, sh.tile, x, y, size, size, o, !!o.tint);
  return true;
}

/**
 * Draw a vertically stacked 2-tile sprite (top tile `ref` and the tile directly
 * below it in the sheet) as a single 16x32 image with its bottom-centre at (x, y),
 * `size` wide and `2 * size` tall, avoiding any seam between the two halves.
 */
export function drawSpriteTall(ctx: CanvasRenderingContext2D, topRef: SpriteRef, x: number, y: number, size: number, o: DrawOpts = {}): boolean {
  const sh = sheets[topRef.s];
  if (!sh.img) return false;
  const sx = (topRef.i % sh.cols) * sh.tile, sy = Math.floor(topRef.i / sh.cols) * sh.tile;
  const sw = sh.tile, sh2 = sh.tile * 2;
  const img = source(sh, topRef.s, sx, sy, sw, sh2, o.tint, o.tintA ?? 0.45);
  if (!img) return false;
  blit(ctx, img, sx, sy, sw, sh2, x, y, size, size * 2, o, !!o.tint);
  return true;
}

/** Draw a tile filling a rect (ground tiles); optional tint. */
export function drawTileRect(ctx: CanvasRenderingContext2D, ref: SpriteRef, x: number, y: number, w: number, h: number, tint?: string | null, tintA = 0.45): boolean {
  const sh = sheets[ref.s];
  if (!sh.img) return false;
  const sx = (ref.i % sh.cols) * sh.tile, sy = Math.floor(ref.i / sh.cols) * sh.tile;
  const img = source(sh, ref.s, sx, sy, sh.tile, sh.tile, tint, tintA);
  if (!img) return false;
  ctx.imageSmoothingEnabled = sh.tile >= 32;
  if (tint) ctx.drawImage(img, 0, 0, sh.tile, sh.tile, x, y, w, h);
  else ctx.drawImage(img, sx, sy, sh.tile, sh.tile, x, y, w, h);
  return true;
}

/**
 * Draw part of a tile: (u, v, uw, vh) in 16px-normalised tile units, to the
 * rect (x, y, w, h). Used to lay grass fringes over road edges.
 */
export function drawTilePart(ctx: CanvasRenderingContext2D, ref: SpriteRef, u: number, v: number, uw: number, vh: number, x: number, y: number, w: number, h: number): boolean {
  const sh = sheets[ref.s];
  if (!sh.img) return false;
  const k = sh.tile / 16;
  const sx = (ref.i % sh.cols) * sh.tile + u * k, sy = Math.floor(ref.i / sh.cols) * sh.tile + v * k;
  ctx.imageSmoothingEnabled = sh.tile >= 32;
  ctx.drawImage(sh.img, sx, sy, uw * k, vh * k, x, y, w, h);
  return true;
}

/**
 * Draw a named 0x72 animation with its bottom-centre at (x, y), scaled by
 * `scale` (1 = sheet pixels). `t` in seconds picks the frame at `fps`.
 */
export function drawNamed(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, scale: number, t: number, o: DrawOpts = {}, fps = 8): boolean {
  const sh = sheets['dungeon-ii'];
  const r = named.get(name);
  if (!sh.img || !r) return false;
  const f = o.frame !== undefined ? Math.max(0, Math.min(r.frames - 1, Math.floor(o.frame))) : r.frames > 1 ? Math.floor(t * fps) % r.frames : 0;
  const sx = r.x + f * r.w;
  const img = source(sh, 'dungeon-ii', sx, r.y, r.w, r.h, o.tint, o.tintA ?? 0.45);
  if (!img) return false;
  blit(ctx, img, sx, r.y, r.w, r.h, x, y, r.w * scale, r.h * scale, o, !!o.tint);
  return true;
}

export function namedSize(name: string): { w: number; h: number; frames: number } { const r = named.get(name); return r ? { w: r.w, h: r.h, frames: r.frames } : { w: 16, h: 16, frames: 1 }; }
export function hasNamed(name: string): boolean { return named.has(name); }
