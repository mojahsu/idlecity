// Canvas renderer. Reads GameState, never mutates it. Simple shapes for now;
// swap draw functions for sprites later without touching the simulation.
import type { Building, GameState, Party, Tile, Worker } from '../sim/types';
import { BUILDINGS } from '../data/buildings';
import { JOBS } from '../data/jobs';
import { CLASSES } from '../data/adventurers';
import { DUNGEONS } from '../data/dungeons';
import { darkness, dayFraction, season } from '../sim/time';
import { resourceColor } from '../sim/workers';

export const TILE = 24;

interface FloatText { x: number; y: number; text: string; color: string; ttl: number }
interface Spark { x: number; y: number; ttl: number; a: number }
interface Drop { x: number; y: number; v: number }

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private night: HTMLCanvasElement;
  private floats: FloatText[] = [];
  private sparks: Spark[] = [];
  private drops: Drop[] = [];
  private clock = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.night = document.createElement('canvas');
  }

  /**
   * Match the backing store to the size the canvas is actually shown at
   * (CSS scales it to the stage, including fullscreen) so lines stay crisp.
   * Drawing code keeps using logical TILE coordinates via the transform.
   */
  resize(s: GameState): void {
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const W = s.width * TILE, H = s.height * TILE;
    const rect = this.canvas.getBoundingClientRect();
    const cssW = rect.width || W, cssH = rect.height || H;
    const bw = Math.max(1, Math.round(cssW * dpr)), bh = Math.max(1, Math.round(cssH * dpr));
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw; this.canvas.height = bh;
    }
    if (this.night.width !== W) { this.night.width = W; this.night.height = H; }
    this.ctx.setTransform(bw / W, 0, 0, bh / H, 0, 0);
  }

  render(s: GameState, dt: number): void {
    this.resize(s);
    this.clock += dt;
    const ctx = this.ctx;
    const W = s.width * TILE, H = s.height * TILE;
    const sea = season(s);

    for (const f of s.fx) {
      if (f.kind === 'float') this.floats.push({ x: f.x, y: f.y, text: f.text, color: f.color ?? '#fff', ttl: 1.4 });
      else if (f.kind === 'hit' && this.sparks.length < 60) this.sparks.push({ x: f.x, y: f.y, ttl: 0.4, a: Math.random() * Math.PI * 2 });
    }

    ctx.clearRect(0, 0, W, H);
    this.drawTerrain(s, sea);
    this.drawDungeons(s);
    for (const b of s.buildings) this.drawBuilding(s, b);
    for (const w of s.workers) this.drawWorker(w);
    this.drawAdventurers(s);
    this.drawRaid(s);
    this.drawSparks(dt);
    this.drawFloats(dt);
    this.drawWeather(s, sea, dt, W, H);
    this.drawNight(s, W, H);
  }

  // ---- terrain -------------------------------------------------------------

  private drawTerrain(s: GameState, sea: string): void {
    const ctx = this.ctx;
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
      const t = s.tiles[y * s.width + x];
      const px = x * TILE, py = y * TILE;
      ctx.fillStyle = grassColor(t, sea);
      ctx.fillRect(px, py, TILE, TILE);
      switch (t.terrain) {
        case 'water': this.drawWater(px, py, t); break;
        case 'road': ctx.fillStyle = sea === 'winter' ? '#c9c2b4' : '#b59a6a'; ctx.fillRect(px, py, TILE, TILE); break;
        case 'forest': this.drawTree(px, py, t, sea); break;
        case 'rock': this.drawRock(px, py, t, '#8c8c8c', '#6a6a6a'); break;
        case 'ore': this.drawRock(px, py, t, '#5a5a66', '#3c3c48'); this.drawGlints(px, py, t); break;
        case 'bush': this.drawBush(px, py, t, sea); break;
      }
    }
  }

  private drawWater(px: number, py: number, t: Tile): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#3f7fb5';
    ctx.fillRect(px, py, TILE, TILE);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    const o = Math.sin(this.clock * 1.5 + t.v * 6) * 3;
    ctx.beginPath();
    ctx.moveTo(px + 4, py + 12 + o);
    ctx.quadraticCurveTo(px + 12, py + 8 + o, px + 20, py + 12 + o);
    ctx.stroke();
  }

  private drawTree(px: number, py: number, t: Tile, sea: string): void {
    const ctx = this.ctx;
    const size = 0.45 + 0.55 * Math.min(1, t.amount / 40);
    const r = 9 * size;
    const cx = px + TILE / 2 + (t.v - 0.5) * 4, cy = py + TILE / 2;
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(cx - 1.5, cy, 3, 8 * size);
    ctx.fillStyle = sea === 'autumn' ? (t.v > 0.5 ? '#c46a2a' : '#d9a030') : sea === 'winter' ? '#6f8f6a' : (t.v > 0.5 ? '#2f7a3a' : '#3f8f46');
    ctx.beginPath(); ctx.arc(cx, cy - 2, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.5, r * 0.45, 0, Math.PI * 2); ctx.fill();
    if (sea === 'winter') { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(cx, cy - r * 0.6, r * 0.6, Math.PI, 0); ctx.fill(); }
  }

  private drawRock(px: number, py: number, t: Tile, a: string, b: string): void {
    const ctx = this.ctx;
    const size = 0.5 + 0.5 * Math.min(1, t.amount / 40);
    const cx = px + TILE / 2, cy = py + TILE / 2 + 3;
    ctx.fillStyle = b;
    ctx.beginPath();
    ctx.moveTo(cx - 10 * size, cy + 6); ctx.lineTo(cx - 5 * size, cy - 8 * size); ctx.lineTo(cx + 2, cy - 5 * size); ctx.lineTo(cx + 10 * size, cy + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = a;
    ctx.beginPath();
    ctx.moveTo(cx - 7 * size, cy + 6); ctx.lineTo(cx - 4 * size, cy - 5 * size); ctx.lineTo(cx + 1, cy - 3 * size); ctx.lineTo(cx + 5 * size, cy + 6); ctx.closePath(); ctx.fill();
  }

  private drawGlints(px: number, py: number, t: Tile): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#cfd8ff';
    for (let i = 0; i < 3; i++) ctx.fillRect(px + 6 + ((t.v * 97 + i * 37) % 12), py + 8 + ((t.v * 61 + i * 23) % 10), 2, 2);
  }

  private drawBush(px: number, py: number, t: Tile, sea: string): void {
    const ctx = this.ctx;
    const cx = px + TILE / 2, cy = py + TILE / 2 + 2;
    ctx.fillStyle = sea === 'winter' ? '#6a7f5a' : '#4f9a3f';
    ctx.beginPath(); ctx.arc(cx - 4, cy, 6, 0, Math.PI * 2); ctx.arc(cx + 4, cy, 6, 0, Math.PI * 2); ctx.arc(cx, cy - 4, 6, 0, Math.PI * 2); ctx.fill();
    if (t.amount >= 5 && sea !== 'winter') {
      ctx.fillStyle = '#d83a4a';
      ctx.fillRect(cx - 5, cy - 1, 2, 2); ctx.fillRect(cx + 3, cy + 2, 2, 2); ctx.fillRect(cx, cy - 6, 2, 2);
    }
  }

  // ---- dungeons -------------------------------------------------------------

  private drawDungeons(s: GameState): void {
    const ctx = this.ctx;
    for (const d of s.dungeons) {
      const def = DUNGEONS.find((x) => x.id === d.id)!;
      const px = d.x * TILE, py = d.y * TILE;
      const cx = px + TILE / 2, cy = py + TILE / 2;
      if (!d.unlocked) {
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      if (d.id === 'goblinCave') {
        ctx.fillStyle = '#6a5a4a'; ctx.beginPath(); ctx.arc(cx, cy + 4, 12, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.arc(cx, cy + 5, 7, Math.PI, 0); ctx.fill();
        ctx.fillRect(cx - 7, cy + 5, 14, 5);
      } else if (d.id === 'ancientRuins') {
        ctx.fillStyle = '#8a8a9a';
        ctx.fillRect(cx - 10, cy - 6, 4, 14); ctx.fillRect(cx + 6, cy - 9, 4, 17); ctx.fillRect(cx - 2, cy + 2, 4, 6);
        ctx.fillStyle = '#6a6a7a'; ctx.fillRect(cx - 12, cy + 8, 24, 3);
      } else {
        const glow = 0.3 + 0.2 * Math.sin(this.clock * 2);
        ctx.fillStyle = `rgba(140,60,200,${glow})`; ctx.beginPath(); ctx.arc(cx, cy - 4, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a1a3a'; ctx.fillRect(cx - 7, cy - 16, 14, 26);
        ctx.fillStyle = '#3a2a4a'; ctx.fillRect(cx - 9, cy - 20, 18, 5);
        ctx.fillStyle = s.victory ? '#f0d050' : '#e04060'; ctx.fillRect(cx - 2, cy - 10, 4, 4);
      }
      if (d.bossDefeated) { ctx.fillStyle = '#f0d050'; ctx.fillRect(cx + 8, cy - 14, 2, 10); ctx.fillStyle = '#d04040'; ctx.fillRect(cx + 10, cy - 14, 6, 4); }
    }
  }

  // ---- buildings ------------------------------------------------------------

  private drawBuilding(s: GameState, b: Building): void {
    const ctx = this.ctx;
    const def = BUILDINGS[b.type];
    const px = b.x * TILE, py = b.y * TILE;
    const cx = px + TILE / 2, cy = py + TILE / 2;
    if (!b.built) {
      ctx.strokeStyle = 'rgba(80,50,20,0.8)'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(140,100,60,0.5)';
      ctx.fillRect(px + 4, py + TILE - 4 - (TILE - 8) * b.progress, TILE - 8, (TILE - 8) * b.progress);
      ctx.strokeStyle = '#7a5a3a';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(px + 4, py + 6 + i * 6); ctx.lineTo(px + TILE - 4, py + 6 + i * 6); ctx.stroke(); }
      ctx.fillStyle = '#222'; ctx.fillRect(px + 2, py - 3, TILE - 4, 3);
      ctx.fillStyle = '#e0b040'; ctx.fillRect(px + 2, py - 3, (TILE - 4) * b.progress, 3);
      return;
    }
    switch (b.type) {
      case 'campfire': {
        ctx.fillStyle = '#5a3a1e'; ctx.fillRect(cx - 8, cy + 3, 16, 3); ctx.fillRect(cx - 2, cy - 3, 3, 12);
        const f = 1 + 0.25 * Math.sin(this.clock * 9 + b.x);
        ctx.fillStyle = '#ff9020'; ctx.beginPath(); ctx.moveTo(cx - 6, cy + 4); ctx.lineTo(cx, cy - 9 * f); ctx.lineTo(cx + 6, cy + 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffe060'; ctx.beginPath(); ctx.moveTo(cx - 3, cy + 4); ctx.lineTo(cx, cy - 4 * f); ctx.lineTo(cx + 3, cy + 4); ctx.closePath(); ctx.fill();
        return;
      }
      case 'farm': {
        ctx.fillStyle = '#8a6a3a'; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = season(s) === 'winter' ? '#b0a080' : '#c8c040';
        for (let i = 0; i < 4; i++) ctx.fillRect(px + 4 + i * 5, py + 4, 2, TILE - 8);
        return;
      }
      case 'well': {
        ctx.fillStyle = '#7a7a7a'; ctx.beginPath(); ctx.arc(cx, cy + 3, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2f5f8f'; ctx.beginPath(); ctx.arc(cx, cy + 3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5a3a1e'; ctx.fillRect(cx - 7, cy - 8, 2, 11); ctx.fillRect(cx + 5, cy - 8, 2, 11); ctx.fillRect(cx - 9, cy - 10, 18, 3);
        return;
      }
      case 'grave': {
        ctx.fillStyle = '#9a9a9a'; ctx.fillRect(cx - 1.5, cy - 7, 3, 14); ctx.fillRect(cx - 5, cy - 3, 10, 3);
        return;
      }
      case 'walls': {
        ctx.fillStyle = def.color; ctx.fillRect(px + 5, py - 2, TILE - 10, TILE);
        ctx.fillStyle = def.roof; for (let i = 0; i < 3; i++) ctx.fillRect(px + 5 + i * 5, py - 6, 3, 5);
        ctx.fillStyle = '#222'; ctx.fillRect(cx - 1.5, py + 8, 3, 5);
        return;
      }
      case 'keep': {
        ctx.fillStyle = def.color; ctx.fillRect(px + 1, py - 4, TILE - 2, TILE + 2);
        ctx.fillStyle = def.roof; ctx.fillRect(px - 2, py - 12, 8, 14); ctx.fillRect(px + TILE - 6, py - 12, 8, 14);
        for (let i = 0; i < 2; i++) { ctx.fillRect(px - 2 + i * 4, py - 16, 2, 4); ctx.fillRect(px + TILE - 6 + i * 4, py - 16, 2, 4); }
        ctx.fillStyle = '#d04040'; ctx.fillRect(cx - 1, py - 22, 1, 10); ctx.fillRect(cx, py - 22, 6, 4);
        ctx.fillStyle = '#222'; ctx.fillRect(cx - 3, py + 8, 6, 10);
        return;
      }
      case 'chapel': {
        ctx.fillStyle = def.color; ctx.fillRect(px + 3, py + 4, TILE - 6, TILE - 6);
        ctx.fillStyle = def.roof; ctx.beginPath(); ctx.moveTo(px + 1, py + 5); ctx.lineTo(cx, py - 4); ctx.lineTo(px + TILE - 1, py + 5); ctx.closePath(); ctx.fill();
        ctx.fillRect(cx - 2, py - 12, 4, 9);
        ctx.fillStyle = '#f0e060'; ctx.fillRect(cx - 0.5, py - 17, 1, 6); ctx.fillRect(cx - 2.5, py - 15, 5, 1);
        return;
      }
    }
    // Generic house shape.
    const tall = b.type === 'guildHall' || b.type === 'tavern' || b.type === 'market' ? 3 : 0;
    ctx.fillStyle = def.color; ctx.fillRect(px + 3, py + 6 - tall, TILE - 6, TILE - 8 + tall);
    ctx.fillStyle = def.roof;
    ctx.beginPath(); ctx.moveTo(px + 1, py + 7 - tall); ctx.lineTo(cx, py - 2 - tall); ctx.lineTo(px + TILE - 1, py + 7 - tall); ctx.closePath(); ctx.fill();
    ctx.fillStyle = darkness(s) > 0.5 && def.light ? '#ffd870' : '#2a2018';
    ctx.fillRect(cx - 2, py + TILE - 9, 4, 7);
    if (b.type === 'blacksmith') { ctx.fillStyle = '#333'; ctx.fillRect(px + TILE - 8, py - 6, 4, 8); }
    if (b.type === 'market') { ctx.fillStyle = '#f0f0f0'; for (let i = 0; i < 3; i++) ctx.fillRect(px + 3 + i * 6, py + 7 - tall, 3, 3); }
    if (b.type === 'tavern') { ctx.fillStyle = '#e0c060'; ctx.fillRect(px + TILE - 7, py + 10 - tall, 5, 4); }
    if (b.type === 'guildHall') { ctx.fillStyle = '#e0c060'; ctx.fillRect(cx - 1, py - 10 - tall, 1, 8); ctx.fillStyle = '#6a2aa0'; ctx.fillRect(cx, py - 10 - tall, 5, 3); }
    if (b.type === 'lumberCamp') { ctx.fillStyle = '#c8925a'; ctx.fillRect(px + 2, py + TILE - 6, 8, 2); ctx.fillRect(px + 3, py + TILE - 8, 6, 2); }
    if (b.type === 'quarry' || b.type === 'mine') { ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(cx, py + TILE - 5, 4, Math.PI, 0); ctx.fill(); }
  }

  // ---- people ---------------------------------------------------------------

  private drawPerson(x: number, y: number, color: string, bob: number): void {
    const ctx = this.ctx;
    const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2 + bob;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(px, py + 5, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color; ctx.fillRect(px - 3, py - 3, 6, 7);
    ctx.fillStyle = '#f0c8a0'; ctx.beginPath(); ctx.arc(px, py - 5, 3, 0, Math.PI * 2); ctx.fill();
  }

  private drawWorker(w: Worker): void {
    const ctx = this.ctx;
    const moving = w.path.length > 0;
    const working = w.task && 'phase' in w.task && w.task.phase === 'work';
    const bob = moving ? Math.sin(this.clock * 12 + w.id) * 1.2 : working ? Math.abs(Math.sin(this.clock * 8 + w.id)) * -2 : 0;
    this.drawPerson(w.x, w.y, JOBS[w.job].color, bob);
    const px = w.x * TILE + TILE / 2, py = w.y * TILE + TILE / 2 + bob;
    if (w.carrying) { ctx.fillStyle = resourceColor(w.carrying); ctx.fillRect(px - 3, py - 12, 6, 4); }
    if (working) { ctx.strokeStyle = '#444'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + 3, py - 2); ctx.lineTo(px + 7, py - 7 + bob); ctx.stroke(); }
  }

  private drawAdventurers(s: GameState): void {
    const ctx = this.ctx;
    for (const a of s.adventurers) {
      if (a.status === 'dead' || a.status === 'questing') continue;
      const bob = a.path.length ? Math.sin(this.clock * 12 + a.id) * 1.2 : 0;
      this.drawPerson(a.x, a.y, CLASSES[a.cls].color, bob);
    }
    for (const p of s.parties) this.drawParty(s, p);
  }

  private drawParty(s: GameState, p: Party): void {
    const ctx = this.ctx;
    const inDungeon = p.phase === 'explore' || p.phase === 'fight';
    const members = p.memberIds.map((id) => s.adventurers.find((a) => a.id === id)!).filter((a) => a && a.status === 'questing');
    const px = p.x * TILE + TILE / 2, py = p.y * TILE + TILE / 2;
    if (inDungeon) {
      // Party is underground: show a banner at the entrance with floor and fight state.
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(px - 16, py - 30, 32, 11);
      ctx.fillStyle = '#fff'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`F${p.floor}`, px, py - 21);
      if (p.encounter) {
        const e = p.encounter;
        ctx.fillStyle = '#400'; ctx.fillRect(px - 14, py - 18, 28, 3);
        ctx.fillStyle = e.boss ? '#e040c0' : '#e04040'; ctx.fillRect(px - 14, py - 18, 28 * Math.max(0, e.hp / e.maxHp), 3);
      }
      return;
    }
    members.forEach((a, i) => {
      const ox = (i % 2) * 0.35 - 0.18, oy = Math.floor(i / 2) * 0.35 - 0.18;
      this.drawPerson(p.x + ox, p.y + oy, CLASSES[a.cls].color, Math.sin(this.clock * 12 + a.id) * 1.2);
    });
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(px + 6, py - 20, 1, 14);
    ctx.fillStyle = p.phase === 'return' ? '#f0d050' : '#6a2aa0'; ctx.fillRect(px + 7, py - 20, 6, 4);
  }

  private drawRaid(s: GameState): void {
    const r = s.raid;
    if (!r) return;
    const ctx = this.ctx;
    const n = Math.min(8, r.count);
    for (let i = 0; i < n; i++) {
      const ox = (i % 3) * 0.4 - 0.4, oy = Math.floor(i / 3) * 0.4 - 0.3;
      const px = (r.x + ox) * TILE + TILE / 2, py = (r.y + oy) * TILE + TILE / 2 + Math.sin(this.clock * 10 + i) * 1.5;
      ctx.fillStyle = '#3a2a2a'; ctx.fillRect(px - 3, py - 3, 6, 7);
      ctx.fillStyle = '#a04040'; ctx.beginPath(); ctx.arc(px, py - 5, 3, 0, Math.PI * 2); ctx.fill();
    }
    const px = r.x * TILE + TILE / 2, py = r.y * TILE;
    ctx.fillStyle = '#400'; ctx.fillRect(px - 14, py - 16, 28, 3);
    ctx.fillStyle = '#e04040'; ctx.fillRect(px - 14, py - 16, 28 * Math.max(0, r.hp / r.maxHp), 3);
  }

  // ---- effects --------------------------------------------------------------

  private drawSparks(dt: number): void {
    const ctx = this.ctx;
    this.sparks = this.sparks.filter((sp) => (sp.ttl -= dt) > 0);
    for (const sp of this.sparks) {
      const px = sp.x * TILE + TILE / 2, py = sp.y * TILE + TILE / 2 - 4;
      const r = (0.4 - sp.ttl) * 20;
      ctx.strokeStyle = `rgba(255,220,80,${sp.ttl / 0.4})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px + Math.cos(sp.a) * r * 0.3, py + Math.sin(sp.a) * r * 0.3); ctx.lineTo(px + Math.cos(sp.a) * r, py + Math.sin(sp.a) * r); ctx.stroke();
    }
  }

  private drawFloats(dt: number): void {
    const ctx = this.ctx;
    this.floats = this.floats.filter((f) => (f.ttl -= dt) > 0);
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    for (const f of this.floats) {
      const px = f.x * TILE + TILE / 2, py = f.y * TILE - (1.4 - f.ttl) * 18;
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, f.ttl)})`; ctx.fillText(f.text, px + 1, py + 1);
      ctx.fillStyle = f.color; ctx.globalAlpha = Math.min(1, f.ttl); ctx.fillText(f.text, px, py); ctx.globalAlpha = 1;
    }
  }

  private drawWeather(s: GameState, sea: string, dt: number, W: number, H: number): void {
    const day = Math.floor(s.time / 60);
    const rainy = sea !== 'winter' && (day * 7919) % 5 === 0;
    const snowy = sea === 'winter' && (day * 7919) % 3 !== 0;
    if (!rainy && !snowy) { this.drops.length = 0; return; }
    const ctx = this.ctx;
    while (this.drops.length < (snowy ? 120 : 200)) this.drops.push({ x: Math.random() * W, y: Math.random() * H, v: 60 + Math.random() * 80 });
    for (const d of this.drops) {
      d.y += (snowy ? d.v * 0.3 : d.v * 4) * dt; d.x += (snowy ? Math.sin(d.y * 0.05) * 20 : -40) * dt;
      if (d.y > H) { d.y = -5; d.x = Math.random() * W; }
      if (d.x < 0) d.x += W;
      if (snowy) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(d.x, d.y, 2, 2); }
      else { ctx.strokeStyle = 'rgba(180,200,255,0.5)'; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 1, d.y + 6); ctx.stroke(); }
    }
  }

  private drawNight(s: GameState, W: number, H: number): void {
    const dark = darkness(s);
    const f = dayFraction(s);
    const dusk = (f > 0.7 && f < 0.82) || (f > 0.16 && f < 0.26);
    if (dark <= 0 && !dusk) return;
    const nctx = this.night.getContext('2d')!;
    nctx.clearRect(0, 0, W, H);
    nctx.globalCompositeOperation = 'source-over';
    nctx.fillStyle = dusk && dark < 0.5 ? `rgba(255,120,60,${0.18 * (1 - dark)})` : `rgba(10,15,45,${0.62 * dark})`;
    nctx.fillRect(0, 0, W, H);
    if (dark > 0.05) {
      nctx.globalCompositeOperation = 'destination-out';
      for (const b of s.buildings) {
        if (!b.built || !BUILDINGS[b.type].light) continue;
        const px = b.x * TILE + TILE / 2, py = b.y * TILE + TILE / 2;
        const r = b.type === 'campfire' ? 42 + Math.sin(this.clock * 7) * 3 : b.type === 'keep' ? 40 : 26;
        const g = nctx.createRadialGradient(px, py, 2, px, py, r);
        g.addColorStop(0, `rgba(0,0,0,${0.9 * dark})`); g.addColorStop(1, 'rgba(0,0,0,0)');
        nctx.fillStyle = g; nctx.beginPath(); nctx.arc(px, py, r, 0, Math.PI * 2); nctx.fill();
      }
    }
    this.ctx.drawImage(this.night, 0, 0);
  }
}

function grassColor(t: Tile, sea: string): string {
  const shade = t.v > 0.5 ? 0 : 1;
  if (sea === 'winter') return shade ? '#dfe3e6' : '#d2d8dc';
  if (sea === 'autumn') return shade ? '#7f9a3f' : '#8aa548';
  if (sea === 'summer') return shade ? '#5f9a3c' : '#69a444';
  return shade ? '#5a9442' : '#64a04a';
}
