// Buildings assembled from Tiny Town tiles: rows of roof and wall pieces
// stacked on the ground line, windows that glow when the house is lit, snow
// on the roofs in winter, and a prop or two beside the door.
import type { Building, GameState } from '../../sim/types';
import { TILE } from '../constants';
import { circle, ellipse, glow, hash, line, poly, rect, type Env } from '../palette';
import { drawSprite, drawTileRect, townSprites } from '../sprites';
import { BUILDING_SPRITES, ROOF_TILES, WINDOW_TILES } from '../spriteMap';
import { flag } from './shared';
import { isLit } from './index';

/** Whether this type is drawn from the sheets (and they are loaded). */
export function hasSpriteBuilding(type: Building['type']): boolean { return townSprites() && !!BUILDING_SPRITES[type]; }

/** Height above the ground line, for sun shadows. */
export function spriteBuildingHeight(type: Building['type']): number {
  const def = BUILDING_SPRITES[type];
  if (!def) return 0;
  const rowsH = def.rows.length === 3 ? (type === 'keep' ? 2.65 : 2.5) : def.rows.length;
  return rowsH * TILE * def.k * 0.95;
}

/** Distinct roof tints so houses, cottages, workplaces and halls never blur together. */
function roofTint(b: Building, snow: boolean): [string | null, number] {
  if (snow) return ['#eef3f8', 0.55];
  if (b.type === 'hut') return ['#c89a40', 0.52];
  if (b.type === 'lumberCamp') return ['#6e4826', 0.5];
  if (b.type === 'granary') return ['#b88428', 0.45];
  if (b.type === 'chapel') return ['#5c4a82', 0.42];
  if (b.type === 'guildHall') return ['#2b4c7e', 0.58];
  if (b.type === 'tavern') return ['#8c5220', 0.46];
  if (b.type === 'house') {
    const pick = [null, '#9e4c36', '#7d5a38', '#48665a'][Math.floor(hash(b.x, b.y, 19) * 4)];
    return [pick, 0.35];
  }
  return [null, 0];
}

export function drawSpriteBuilding(ctx: CanvasRenderingContext2D, s: GameState, b: Building, env: Env, px: number, py: number): boolean {
  const def = BUILDING_SPRITES[b.type];
  if (!def || !townSprites()) return false;
  const ts = Math.round(TILE * def.k), cx = px + TILE / 2, ground = py + TILE - 1;
  const lit = isLit(b, env), snow = env.season === 'winter';
  const glowA = 0.8 + 0.2 * Math.sin(env.clock * 3 + b.x);
  const [rTint, rAlpha] = roofTint(b, snow);
  const nRows = def.rows.length;
  if (b.type === 'keep') {
    rect(ctx, cx - ts * 0.68, ground - ts * 1.9, ts * 1.36, ts * 1.88, '#1a1620');
  }
  // Draw from bottom row to top row; for 3-row buildings, overlap the roof ridge
  // slightly over the eaves row so roofs have natural proportions without hiding neighbours.
  const rowY = (r: number): number => {
    if (nRows === 3 && r === 0) return Math.round(ground - (b.type === 'keep' ? 2.65 : 2.5) * ts);
    return Math.round(ground - (nRows - r) * ts);
  };
  for (let r = nRows - 1; r >= 0; r--) {
    const row = def.rows[r];
    const y = rowY(r), x0 = Math.round(cx - (row.length * ts) / 2);
    row.forEach((i, c) => {
      const x = x0 + c * ts;
      const isRoof = ROOF_TILES.has(i);
      drawTileRect(ctx, { s: 'tiny-town', i }, x, y, ts, ts, isRoof ? rTint : null, isRoof ? rAlpha : 0.55);
      if (b.type === 'walls' && r === 1) {
        rect(ctx, x, y, 1.2, ts, '#2a2630');
        rect(ctx, x + ts - 1.2, y, 1.2, ts, '#2a2630');
      }
      if (lit && WINDOW_TILES.has(i)) rect(ctx, x + ts * 0.34, y + ts * 0.32, ts * 0.32, ts * 0.32, `rgba(255,214,110,${0.85 * glowA})`);
    });
  }
  for (const p of def.props ?? []) drawSprite(ctx, p.ref, cx + p.dx * TILE, ground + p.dy * TILE, p.size * TILE);
  const topH = ground - rowY(0);
  drawLandmarkTrim(ctx, s, b, env, cx, ground, ts, topH, lit, snow);
  return true;
}

/** Bespoke signs, crests, noticeboards and victory banners over sprite buildings. */
function drawLandmarkTrim(ctx: CanvasRenderingContext2D, s: GameState, b: Building, env: Env, cx: number, ground: number, ts: number, topH: number, lit: boolean, snow: boolean): void {
  if (b.type === 'tavern') {
    // Swinging golden ale-mug sign on a timber arm, a warm doorway lantern, and an oak barrel.
    const sx = cx - ts * 0.95, sy = ground - ts * 1.35;
    rect(ctx, sx, sy, 7, 1.5, '#4a321a');
    ctx.save(); ctx.translate(sx + 2, sy + 1.5); ctx.rotate(Math.sin(env.clock * 2.6 + b.id) * 0.16);
    rect(ctx, -2.5, 1, 5, 5.5, '#e0a838'); rect(ctx, -2.5, 0.5, 5, 1.5, '#fff8e0');
    rect(ctx, 2.2, 2, 1.5, 3, '#c88a20');
    ctx.restore();
    // Doorway lantern and barrel.
    const lx = cx - ts * 0.32, ly = ground - ts * 0.68;
    rect(ctx, lx - 1.2, ly, 2.4, 3, lit ? '#ffd870' : '#6a5a4a');
    if (lit) glow(ctx, lx, ly + 1.5, 8, '#ffb850', 0.35);
    const bx = cx - ts * 0.85, by = ground - 2;
    ellipse(ctx, bx, by - 3, 3.2, 4, '#8a5a2e'); rect(ctx, bx - 3, by - 4.5, 6, 1, '#4a3a2a'); rect(ctx, bx - 3, by - 2, 6, 1, '#4a3a2a');
  } else if (b.type === 'guildHall') {
    // Crossed-swords shield crest above the portal, twin blue-and-gold banners, and a quest board.
    const gy = ground - ts * 1.15;
    const wave = Math.sin(env.clock * 4 + b.id) * 0.8;
    for (const dx of [-ts * 0.62, ts * 0.62]) {
      const bx = cx + dx;
      poly(ctx, [bx - 2.2, gy, bx + 2.2, gy, bx + 2.2 + wave * 0.4, gy + 9, bx + wave * 0.5, gy + 11.5, bx - 2.2 + wave * 0.4, gy + 9], '#2b4c7e');
      rect(ctx, bx - 2.2, gy, 4.4, 1.2, '#f0d060');
    }
    line(ctx, cx - 4.5, gy - 4, cx + 4.5, gy + 4, '#d8e0e8', 1.3);
    line(ctx, cx + 4.5, gy - 4, cx - 4.5, gy + 4, '#d8e0e8', 1.3);
    poly(ctx, [cx - 3.5, gy - 3.5, cx + 3.5, gy - 3.5, cx + 3, gy + 1.5, cx, gy + 4.5, cx - 3, gy + 1.5], '#2b4c7e');
    circle(ctx, cx, gy, 1.3, '#f0d060');
    // Quest noticeboard on the right.
    const qx = cx + ts * 0.88, qy = ground - 1;
    rect(ctx, qx - 3.5, qy - 8, 1.2, 8, '#5a3a1e'); rect(ctx, qx + 2.3, qy - 8, 1.2, 8, '#5a3a1e');
    rect(ctx, qx - 4.5, qy - 9, 9, 6, '#7a5230'); rect(ctx, qx - 5, qy - 9.5, 10, 1.2, '#4a3018');
    rect(ctx, qx - 3.2, qy - 7.5, 2.4, 3, '#f5ebd6'); rect(ctx, qx - 0.2, qy - 7.2, 2.2, 2.5, '#f0d890'); rect(ctx, qx + 2.2, qy - 7.5, 1.8, 3.2, '#f5ebd6');
  } else if (b.type === 'blacksmith') {
    // Glowing forge hearth and a water quench tub on the right.
    const fx = cx + ts * 0.78, fy = ground - 2;
    rect(ctx, fx - 4, fy - 6, 8, 6, '#5a5a60'); rect(ctx, fx - 4.5, fy - 6.5, 9, 1.2, '#7a7a80');
    const pulse = 0.7 + 0.3 * Math.sin(env.clock * 8 + b.id);
    ellipse(ctx, fx, fy - 6.5, 2.8, 1.4, `rgba(255,${Math.round(110 + 60 * pulse)},30,0.95)`);
    glow(ctx, fx, fy - 7, 10, '#ff7020', 0.3 * pulse);
    // Quench tub beside the anvil.
    const wx = cx - ts * 0.92, wy = ground - 1;
    rect(ctx, wx - 3, wy - 4, 6, 4, '#6b4a2b'); ellipse(ctx, wx, wy - 4, 2.8, 1.1, '#5aa0e0');
  } else if (b.type === 'granary') {
    // Rotating windmill sails on the roof peak.
    const wy = ground - topH + 2;
    rect(ctx, cx - 0.8, wy - 5, 1.6, 6, '#5a3a1e');
    const a = env.clock * (env.rainy ? 2.8 : 1.5) + b.id;
    for (let i = 0; i < 4; i++) {
      const an = a + (i * Math.PI) / 2;
      poly(ctx, [cx, wy - 5, cx + Math.cos(an) * 7.5, wy - 5 + Math.sin(an) * 7.5, cx + Math.cos(an + 0.34) * 6.5, wy - 5 + Math.sin(an + 0.34) * 6.5], '#f0e4c8');
    }
    circle(ctx, cx, wy - 5, 1.2, '#5a3a1e');
  } else if (b.type === 'chapel') {
    // Rooftop golden cross and a stained-glass rose window.
    const topY = ground - topH;
    rect(ctx, cx - 0.7, topY - 5, 1.4, 6, '#f0d060'); rect(ctx, cx - 2.4, topY - 3.2, 4.8, 1.3, '#f0d060');
    circle(ctx, cx, ground - ts * 1.45, 2.8, '#4a3a4a');
    circle(ctx, cx, ground - ts * 1.45, 2, lit ? '#ffd880' : '#70a8e0');
  } else if (b.type === 'house' && (s.tier === 'town' || s.tier === 'city')) {
    // Window flower box on established town houses.
    const fx = cx + ts * 0.36, fy = ground - ts * 0.42;
    rect(ctx, fx - 3.5, fy, 7, 2, '#6b4a2b');
    if (snow) rect(ctx, fx - 3.5, fy - 1, 7, 1.2, '#eef3f8');
    else { circle(ctx, fx - 2, fy - 0.8, 1.1, '#e85a70'); circle(ctx, fx, fy - 1, 1.1, '#f7d94c'); circle(ctx, fx + 2, fy - 0.8, 1.1, '#70b8f0'); }
  } else if (b.type === 'keep' || b.type === 'walls') {
    const col = s.victory ? '#f0d050' : '#d04040';
    flag(ctx, cx, ground - topH + 2, b.type === 'keep' ? 11 : 7, col, env, b.id);
    if (s.victory) {
      const wy = ground - ts * 1.2, wv = Math.sin(env.clock * 3.5 + b.id) * 0.7;
      for (const dx of b.type === 'keep' ? [-ts * 0.5, ts * 0.5] : [0]) {
        const bx = cx + dx;
        poly(ctx, [bx - 2, wy, bx + 2, wy, bx + 2 + wv * 0.4, wy + 8, bx + wv * 0.5, wy + 10.5, bx - 2 + wv * 0.4, wy + 8], '#f0d050');
        rect(ctx, bx - 2, wy, 4, 1.2, '#d04040');
      }
    }
  }
}
