// One panel: backdrop, reflections, figures, bars, banners, frame.
import type { GameState, Party } from '../../sim/types';
import { DUNGEONS } from '../../data/dungeons';
import { CLASSES } from '../../data/adventurers';
import { t } from '../../i18n';
import { circle, line, poly, rect, rgba, type Env } from '../palette';
import { PANEL_H, PANEL_W } from './layout';
import { HERO_GAP, enemyScale, enemyX, fitText, heroX, hpBar, members } from './hud';
import { monsterHeight } from '../monsters';
import type { ViewState } from './state';
import { drawBackdrop } from './backdrops';
import { drawFigures } from './figures';
import { drawChest } from './chest';

export function drawPanel(ctx: CanvasRenderingContext2D, s: GameState, p: Party, v: ViewState, env: Env): void {
  const def = DUNGEONS.find((d) => d.id === p.dungeon)!;
  const team = members(s, p);
  const e = p.encounter;
  const floorY = PANEL_H - 22;
  // Frame.
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.roundRect(-4, -4, PANEL_W + 8, PANEL_H + 8, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.roundRect(0, 0, PANEL_W, PANEL_H, 4); ctx.clip();
  drawBackdrop(ctx, p.dungeon, v, env, floorY);
  // Dust in the air.
  for (const m of v.motes) { const a = Math.min(1, m.ttl, m.life - m.ttl) * 0.5; circle(ctx, m.x, m.y, 0.9, `rgba(255,240,200,${a})`); }
  {
    const mx0 = PANEL_W * 0.74;
    // Mirror image on the polished floor (strongest in the tower, faint in the cave).
    const mirrorA = p.dungeon === 'darkTower' ? 0.22 : p.dungeon === 'ancientRuins' ? 0.12 : 0.07;
    ctx.save(); ctx.beginPath(); ctx.rect(0, floorY + 1, PANEL_W, PANEL_H - floorY); ctx.clip();
    ctx.translate(0, 2 * floorY + 3); ctx.scale(1, -0.55); ctx.globalAlpha = mirrorA;
    drawFigures(ctx, s, p, v, env, floorY, team, mx0);
    ctx.restore();
    // Dust puffs at the feet.
    for (const q of v.puffs) { const k = 1 - q.ttl / 0.45; ctx.globalAlpha = (1 - k) * 0.5; circle(ctx, q.x - k * 6, q.y - k * 3, 2 + k * 5, '#c8b8a0'); circle(ctx, q.x + k * 5, q.y - k * 2, 1.5 + k * 4, '#c8b8a0'); }
    ctx.globalAlpha = 1;
    if (e && e.boss) {
      // Boss aura: a pulsing pool of light on the floor and embers drifting up.
      const col = e.monster === 'demonLord' ? '#ff3060' : e.monster === 'dragon' ? '#ff8030' : '#c060ff';
      const pulse = 0.6 + 0.4 * Math.sin(env.clock * 4);
      const g = ctx.createRadialGradient(mx0, floorY, 0, mx0, floorY, 34); g.addColorStop(0, rgba(col, 0.35 * pulse)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(mx0, floorY + 1, 34, 10, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 7; i++) { const tt = (env.clock * 0.6 + i * 0.37) % 1; circle(ctx, mx0 - 16 + ((i * 53) % 32) + Math.sin(env.clock * 2 + i) * 3, floorY - tt * 46, 1.2 * (1 - tt) + 0.3, rgba(col, 0.8 * (1 - tt))); }
    }
    drawFigures(ctx, s, p, v, env, floorY, team, mx0);
  }
  // Hero HP bars and names (figures are drawn by drawFigures).
  const retreatShift = v.outro > 0 && v.retreating ? (1.35 - v.outro) * 26 : 0;
  team.forEach((a, i) => {
    const hx = heroX(i) - retreatShift;
    const w = 26, hp = Math.max(0, v.shownHp.get(a.id) ?? a.hp / a.maxHp);
    hpBar(ctx, hx - w / 2, floorY + 6, w, 3.5, hp, hp > 0.5 ? '#7ad07a' : hp > 0.25 ? '#e0b040' : '#e05050');
    ctx.textAlign = 'center'; ctx.fillStyle = CLASSES[a.cls].color;
    fitText(ctx, a.name, hx, floorY + 18, HERO_GAP - 4);
  });
  // Monster.
  const mx = PANEL_W * 0.74;
  if (v.chest > 0) drawChest(ctx, mx - 30, floorY, v.chest, env);
  if (e) {
    const enemies = e.enemies ?? [];
    const n = enemies.length;
    if (e.boss) {
      // Bosses get a wide segmented bar with their name.
      const w = 120, hp = Math.max(0, v.enemies[0]?.shownHp ?? e.hp / e.maxHp);
      const bx = PANEL_W - 8 - w, by = 8;
      hpBar(ctx, bx, by, w, 6, hp, '#e040c0');
      for (let k = 1; k < 4; k++) rect(ctx, bx + w * k / 4, by, 1, 6, 'rgba(0,0,0,0.5)');
      ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'right';
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(t(`monster.${e.monster}`), PANEL_W - 8, by + 18);
      ctx.fillStyle = '#ffb0f0'; ctx.fillText(t(`monster.${e.monster}`), PANEL_W - 8, by + 18);
    } else {
      // Each monster of the pack carries a small bar over its head; the lead one is named top right.
      enemies.forEach((en, i) => {
        if (en.hp <= 0) return;
        const x = enemyX(i, n, false, PANEL_W), h = monsterHeight(en.monster) * enemyScale(en.monster, false, n);
        hpBar(ctx, x - 10, floorY - h - 7, 20, 2.5, Math.max(0, v.enemies[i]?.shownHp ?? en.hp / en.maxHp), '#e04040');
      });
      ctx.font = '9px system-ui, sans-serif'; ctx.textAlign = 'right';
      const alive = enemies.filter((x) => x.hp > 0).length;
      const name = n > 1 ? `${t(`monster.${e.monster}`)} ×${alive}` : t(`monster.${e.monster}`);
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(name, PANEL_W - 8, 16);
      ctx.fillStyle = '#f0e0e0'; ctx.fillText(name, PANEL_W - 8, 16);
    }
  } else if (p.phase === 'explore') {
    ctx.font = '9px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const dots = '.'.repeat(1 + Math.floor(env.clock * 2) % 3);
    ctx.fillText(t('ui.exploring') + dots, PANEL_W - 8, 16);
  }
  // Projectiles.
  for (const sh of v.shots) {
    if (sh.t < 0) continue;
    const k = Math.min(1, sh.t / sh.life), x = sh.x + (sh.tx - sh.x) * k, y = sh.y + (sh.ty - sh.y) * k - Math.sin(k * Math.PI) * 10;
    const d = sh.tx > sh.x ? 1 : -1;
    if (sh.kind === 'arrow') { line(ctx, x - 6 * d, y + 1.5, x, y, '#e8dcc0', 1.5); poly(ctx, [x, y, x - 2.5 * d, y - 1.5, x - 2.5 * d, y + 1.5], '#d0d0d8'); }
    else if (sh.kind === 'fire') { circle(ctx, x, y, 5, rgba('#ff6020', 0.5)); circle(ctx, x, y, 3.2, '#ff9040'); circle(ctx, x - 1, y - 1, 1.5, '#ffe080'); for (let q = 1; q <= 3; q++) circle(ctx, x - q * 4 * d, y + q * 1.5, 3 - q * 0.7, rgba('#ff8030', 0.35 - q * 0.1)); }
    else if (sh.kind === 'bolt') { circle(ctx, x, y, 3, rgba('#80c0ff', 0.5)); circle(ctx, x, y, 1.6, '#e0f4ff'); for (let q = 1; q <= 3; q++) circle(ctx, x - q * 3.5 * d, y + Math.sin(q + env.clock * 20) * 1.5, 1.6 - q * 0.4, rgba('#a0e0ff', 0.4 - q * 0.1)); }
    else if (sh.kind === 'light') { circle(ctx, x, y, 3.5, rgba('#fff0a0', 0.5)); circle(ctx, x, y, 1.8, '#ffffff'); }
    else { circle(ctx, x, y, 3.5, rgba('#8030c0', 0.6)); circle(ctx, x, y, 2, '#d080ff'); for (let q = 1; q <= 3; q++) circle(ctx, x - q * 3.5 * d, y - q * 1, 2 - q * 0.5, rgba('#8030c0', 0.4 - q * 0.1)); }
  }
  // Sparks and numbers.
  for (const sp of v.sparks) { ctx.globalAlpha = Math.min(1, sp.ttl * 2); circle(ctx, sp.x, sp.y, 1.4, sp.color); }
  ctx.globalAlpha = 1;
  ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'center';
  for (const n of v.nums) { ctx.font = n.big ? 'bold 13px system-ui, sans-serif' : 'bold 10px system-ui, sans-serif'; ctx.globalAlpha = Math.min(1, n.ttl * 2); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(n.text, n.x, n.y); ctx.fillStyle = n.color; ctx.fillText(n.text, n.x, n.y); }
  ctx.globalAlpha = 1;
  // Hero and monster dialogue bubbles.
  for (const tk of v.talks) {
    const a = Math.min(1, tk.ttl / 0.25, (tk.life - tk.ttl) / 0.15 + 0.2);
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = 'bold 7.5px system-ui, sans-serif';
    const tw = Math.min(PANEL_W * 0.56, ctx.measureText(tk.text).width);
    const bw = tw + 10, bh = 13;
    const bx = Math.max(4, Math.min(PANEL_W - bw - 4, tk.x - bw / 2));
    const by = Math.max(24, Math.min(floorY - 36, tk.y - bh - 4));
    const isHero = tk.side === 'hero';
    ctx.fillStyle = isHero ? 'rgba(255,250,236,0.94)' : 'rgba(34,14,24,0.92)';
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 3); ctx.fill();
    ctx.strokeStyle = isHero ? '#8a6838' : '#d04870'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 3); ctx.stroke();
    const tailX = Math.max(bx + 4, Math.min(bx + bw - 4, tk.x));
    poly(ctx, [tailX - 2.5, by + bh, tailX + 2.5, by + bh, tailX + (isHero ? -1 : 1), by + bh + 3.5], isHero ? 'rgba(255,250,236,0.94)' : 'rgba(34,14,24,0.92)');
    ctx.textAlign = 'center'; ctx.fillStyle = isHero ? '#2a1a10' : '#ffd8e4';
    fitText(ctx, tk.text, bx + bw / 2, by + 9.2, bw - 6);
    ctx.restore();
  }
  // Header.
  ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#f0e0c0';
  ctx.fillText(t(`dungeon.${p.dungeon}`), 8, 14);
  ctx.font = '9px system-ui, sans-serif'; ctx.fillStyle = p.floor === def.floors ? '#ffb0f0' : '#d0c8b8';
  ctx.fillText(t('ui.floor', { floor: p.floor, floors: def.floors }), 8, 25);
  // Floor progress dots, bottom right.
  for (let i = 0; i < def.floors; i++) {
    const dx = PANEL_W - 8 - (def.floors - 1 - i) * 6, dy = PANEL_H - 6;
    circle(ctx, dx, dy, i + 1 === p.floor ? 2.2 : 1.4, i + 1 < p.floor ? '#d0c8b8' : i + 1 === p.floor ? '#ffe080' : 'rgba(255,255,255,0.25)');
  }
  if (v.floorFlash > 0) { ctx.fillStyle = `rgba(255,255,255,${v.floorFlash * 0.25})`; ctx.fillRect(0, 0, PANEL_W, PANEL_H); }
  if (v.revive > 0.8) { ctx.fillStyle = `rgba(255,255,255,${(v.revive - 0.8) * 1.5})`; ctx.fillRect(0, 0, PANEL_W, PANEL_H); }
  if (v.bossIntro > 0) {
    // Red pulse around the edges while the boss steps out.
    const a = Math.min(1, v.bossIntro) * (0.5 + 0.5 * Math.sin(env.clock * 10));
    const g = ctx.createRadialGradient(PANEL_W / 2, PANEL_H / 2, PANEL_H * 0.4, PANEL_W / 2, PANEL_H / 2, PANEL_W * 0.6);
    g.addColorStop(0, 'rgba(255,0,40,0)'); g.addColorStop(1, `rgba(255,0,40,${0.45 * a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, PANEL_W, PANEL_H);
  }
  if (v.banner) {
    const b = v.banner, k = 1 - b.ttl / b.life;
    const a = k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1;
    const slide = (k < 0.15 ? (1 - k / 0.15) * -30 : 0) + (k > 0.75 ? (k - 0.75) / 0.25 * 30 : 0);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, PANEL_H / 2 - (b.big ? 13 : 9), PANEL_W, b.big ? 26 : 18);
    ctx.font = `bold ${b.big ? 15 : 11}px system-ui, sans-serif`; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(b.text, PANEL_W / 2 + slide, PANEL_H / 2 + (b.big ? 5 : 4));
    ctx.fillStyle = b.color; ctx.fillText(b.text, PANEL_W / 2 + slide, PANEL_H / 2 + (b.big ? 5 : 4));
    ctx.globalAlpha = 1;
  }
  // Inner vignette so the edges fall into darkness.
  const vg = ctx.createRadialGradient(PANEL_W / 2, PANEL_H / 2, PANEL_H * 0.5, PANEL_W / 2, PANEL_H / 2, PANEL_W * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, PANEL_W, PANEL_H);
  ctx.restore();
  // Ornate frame: double line with gold corner studs.
  ctx.strokeStyle = '#6a5030'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-1, -1, PANEL_W + 2, PANEL_H + 2, 4); ctx.stroke();
  ctx.strokeStyle = '#c8a050'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.roundRect(-2.5, -2.5, PANEL_W + 5, PANEL_H + 5, 5); ctx.stroke();
  for (const [cx, cy] of [[0, 0], [PANEL_W, 0], [0, PANEL_H], [PANEL_W, PANEL_H]]) { circle(ctx, cx, cy, 2.6, '#8a6a30'); circle(ctx, cx - 0.6, cy - 0.6, 1.3, '#f0d080'); }
}
