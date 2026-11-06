// Town urbanization details: the inlaid stone Grand Plaza at the town center,
// an arched bridge across the river, courtyard fences, flower boxes, barrels,
// and festive street bunting between houses.
import type { GameState } from '../../sim/types';
import type { LightSource } from '../buildings';
import { TILE } from '../constants';
import { circle, ellipse, line, poly, rect, rgba, groundShadow, hash, type Env } from '../palette';

/** Static ground-level plaza inlay around the town center, drawn onto the cached terrain canvas. */
export function drawGrandPlaza(ctx: CanvasRenderingContext2D, s: GameState, env: Env): void {
  if (s.tier === 'camp' || s.tier === 'hamlet') return;
  const cx = s.center.x * TILE + TILE / 2;
  const cy = s.center.y * TILE + TILE / 2;
  const r = s.tier === 'city' ? TILE * 1.42 : s.tier === 'town' ? TILE * 1.18 : TILE * 0.95;
  const stone = env.season === 'winter' ? '#c8ccd4' : '#b8ac98';
  const rim = env.season === 'winter' ? '#8c929c' : '#7e705e';
  const gold = '#d4af58';

  ctx.save();
  // Outer curb ring and warm flagstone disc.
  circle(ctx, cx, cy, r + 2, rgba(rim, 0.72));
  circle(ctx, cx, cy, r, rgba(stone, 0.65));
  ctx.strokeStyle = rgba(rim, 0.6);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2); ctx.stroke();

  // Radial masonry joints and 8-point compass rose inlay.
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    line(ctx, cx + Math.cos(a) * (r * 0.28), cy + Math.sin(a) * (r * 0.28), cx + Math.cos(a) * r, cy + Math.sin(a) * r, rgba(rim, 0.45), 0.9);
    const tipR = i % 2 === 0 ? r * 0.62 : r * 0.44;
    const sideA = a + 0.16, sideB = a - 0.16;
    poly(
      ctx,
      [
        cx + Math.cos(a) * tipR, cy + Math.sin(a) * tipR,
        cx + Math.cos(sideA) * (r * 0.22), cy + Math.sin(sideA) * (r * 0.22),
        cx + Math.cos(sideB) * (r * 0.22), cy + Math.sin(sideB) * (r * 0.22),
      ],
      rgba(i % 2 === 0 ? gold : rim, 0.48),
    );
  }
  circle(ctx, cx, cy, r * 0.22, rgba(stone, 0.8));
  ctx.restore();
}

/** Find the water span at the town center's latitude for the river bridge. */
function bridgeSpan(s: GameState): { y: number; x0: number; x1: number } | null {
  const by = Math.max(2, Math.min(s.height - 3, s.center.y));
  let x0 = -1, x1 = -1;
  for (let x = 0; x < Math.min(8, s.width); x++) {
    if (s.tiles[by * s.width + x]?.terrain === 'water') {
      if (x0 < 0) x0 = x;
      x1 = x;
    }
  }
  if (x0 < 0) return null;
  return { y: by, x0, x1 };
}

/** Depth-sorted urban props: river bridge, house flowerboxes/barrels/fences, and street bunting. */
export function urbanActors(s: GameState, env: Env): { y: number; draw: (ctx: CanvasRenderingContext2D, e: Env) => void }[] {
  const out: { y: number; draw: (ctx: CanvasRenderingContext2D, e: Env) => void }[] = [];
  const span = bridgeSpan(s);
  if (span) {
    out.push({
      y: span.y + 0.55,
      draw: (ctx, e) => drawRiverBridge(ctx, s, span.y, span.x0, span.x1, e),
    });
  }

  for (const b of s.buildings) {
    if (!b.built) continue;
    if (b.type === 'house' || b.type === 'hut') {
      out.push({
        y: b.y + 0.96,
        draw: (ctx, e) => drawHouseCourtyard(ctx, s, b.x, b.y, b.type === 'house', e),
      });
    }
  }
  return out;
}

/** Nighttime lantern lights on the river bridge posts. */
export function urbanLights(s: GameState, env: Env): LightSource[] {
  if (env.dark <= 0.25) return [];
  const span = bridgeSpan(s);
  if (!span) return [];
  const xLeft = span.x0 * TILE + 2;
  const xRight = (span.x1 + 1) * TILE - 2;
  const py = span.y * TILE + TILE / 2;
  return [
    { x: xLeft, y: py - 8, r: 18, color: '#ffc870', flicker: 0.08 },
    { x: xRight, y: py - 8, r: 18, color: '#ffc870', flicker: 0.08 },
  ];
}

function drawRiverBridge(ctx: CanvasRenderingContext2D, s: GameState, y: number, x0: number, x1: number, env: Env): void {
  const left = x0 * TILE - 3;
  const right = (x1 + 1) * TILE + 3;
  const w = right - left;
  const cy = y * TILE + TILE / 2;
  const stoneBridge = s.tier === 'town' || s.tier === 'city';

  // Bridge shadow & water reflection beneath the arch.
  ellipse(ctx, left + w / 2, cy + 7, w * 0.48, 4.5, 'rgba(10, 20, 35, 0.36)');
  // Support pilings at each end.
  rect(ctx, left + 2, cy + 2, 3.5, 7, '#4a3520');
  rect(ctx, right - 5.5, cy + 2, 3.5, 7, '#4a3520');

  // Arched deck planks.
  const segments = Math.max(6, Math.round(w / 5));
  const segW = w / segments;
  for (let i = 0; i < segments; i++) {
    const q = (i + 0.5) / segments;
    const arch = Math.sin(q * Math.PI) * 3.2;
    const sx = left + i * segW;
    const col = stoneBridge
      ? (i % 2 === 0 ? '#9e9689' : '#8c8478')
      : (i % 2 === 0 ? '#8c6239' : '#7a522e');
    rect(ctx, sx, cy - 4 - arch, segW + 0.6, 8.5, col);
    rect(ctx, sx, cy - 4 - arch, segW + 0.6, 1.4, stoneBridge ? '#b8b0a2' : '#a87b4c');
  }

  // Top & bottom bridge handrails and posts.
  for (let i = 0; i <= 4; i++) {
    const q = i / 4;
    const arch = Math.sin(q * Math.PI) * 3.2;
    const px = left + q * w;
    rect(ctx, px - 1.1, cy - 9.5 - arch, 2.2, 6, stoneBridge ? '#787066' : '#5a3a1e');
    rect(ctx, px - 1.1, cy + 1 - arch, 2.2, 4.5, stoneBridge ? '#686058' : '#4a2e16');
  }
  ctx.strokeStyle = stoneBridge ? '#aba396' : '#9a6e40';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(left, cy - 8.5);
  ctx.quadraticCurveTo(left + w / 2, cy - 12.2, right, cy - 8.5);
  ctx.stroke();

  // Warm lanterns on the bridge entrance posts.
  for (const lx of [left + 1, right - 1]) {
    rect(ctx, lx - 1.4, cy - 12, 2.8, 3.2, env.dark > 0.25 ? '#ffd070' : '#6a6a70');
    if (env.dark > 0.25) circle(ctx, lx, cy - 10.4, 4, rgba('#ffc860', 0.35));
  }
}

function drawHouseCourtyard(ctx: CanvasRenderingContext2D, s: GameState, x: number, y: number, isHouse: boolean, env: Env): void {
  const px = x * TILE, py = y * TILE;
  const h = hash(x, y, 88);

  // Small wooden barrel or crate on one side of the front wall.
  if (h > 0.35) {
    const bx = px + (h > 0.68 ? TILE - 3.5 : 3.5), by = py + TILE - 2.5;
    groundShadow(ctx, bx, by + 0.8, 2.6, 1.1, 0.25);
    rect(ctx, bx - 2, by - 3.5, 4, 3.8, '#8a5c32');
    rect(ctx, bx - 2, by - 2.4, 4, 0.7, '#3e3a38');
    ellipse(ctx, bx, by - 3.5, 2, 0.8, '#a67646');
  }

  // Window flower box on houses in spring/summer/autumn.
  if (isHouse && env.season !== 'winter') {
    const fx = px + 6, fy = py + TILE - 6.5;
    rect(ctx, fx - 3, fy, 6, 1.8, '#6e4826');
    circle(ctx, fx - 1.8, fy - 0.6, 1.1, '#e85068');
    circle(ctx, fx, fy - 0.8, 1.1, '#ffd848');
    circle(ctx, fx + 1.8, fy - 0.6, 1.1, '#68b8f8');
  }

  // Picket fence & festive bunting connecting to a horizontally adjacent house/hut.
  const right = s.buildings.find((o) => o.built && o.x === x + 1 && o.y === y && (o.type === 'house' || o.type === 'hut'));
  if (right) {
    // Low wooden garden fence between the two houses.
    const fy = py + TILE - 2;
    line(ctx, px + TILE - 3, fy - 2.5, px + TILE + 3, fy - 2.5, '#b89464', 1);
    for (let k = -2; k <= 2; k += 2) {
      rect(ctx, px + TILE + k - 0.5, fy - 4.2, 1, 4, '#caa674');
    }
    // Overhead pennant bunting in town/city tiers.
    if (s.tier === 'town' || s.tier === 'city') {
      const x1 = px + TILE - 5, x2 = px + TILE + 5, by = py + 3;
      line(ctx, x1, by, x2, by + 1, 'rgba(70,50,30,0.65)', 0.7);
      const cols = ['#e04848', '#f0c848', '#4898e0'];
      for (let k = 0; k < 3; k++) {
        const bx = x1 + 2 + k * 3;
        poly(ctx, [bx - 1.1, by + 0.5, bx + 1.1, by + 0.5, bx, by + 3.2], cols[(x + y + k) % 3]);
      }
    }
  }
}
