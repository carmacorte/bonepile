/**
 * CanvasRenderer.js
 * 
 * Renderer HTML5 de referencia. En Unity esto se reemplaza por:
 * - MeshRenderer + MeshFilter para cada tile/objeto
 * - O un sistema de instanced rendering para voxels
 * - Shader Graph para el shading automático (top/left/right faces)
 */

import { cellToWorld, TILE_W, TILE_H, VOXEL_SIZE, VOXEL_HEIGHT, depthSortKey } from '../core/IsoMath.js';

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
}

export class CanvasRenderer {
  constructor(canvas, camera, worldData, assetRegistry) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.camera = camera;
    this.world = worldData;
    this.registry = assetRegistry;

    this.showGrid = false;
    this.hoverCell = null;
    this.previewAssetId = null;
    this.previewValid = true;
    this.eraseMode = false;
    this.previewFlipH = false;
    this.previewFlipV = false;

    this._dirty = true;
    this._terrainCanvas = null;
    this._terrainVersion = -1;
    this._objectsCanvas = null;
    this._objectsVersion = -1;
    this._worldBounds = null;
    this._assetCache = new Map();

    this._anims = new Map();
    this._frameAnims = new Map();

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  markDirty() { this._dirty = true; }

  // ── Asset rasterization cache ────────────────────────────
  _getAssetRender(assetDef) {
    if (this._assetCache.has(assetDef.id)) return this._assetCache.get(assetDef.id);
    const rendered = this._rasterizeVoxels(assetDef.generateVoxels());
    if (!rendered) return null;
    this._assetCache.set(assetDef.id, rendered);
    return rendered;
  }

  _rasterizeVoxels(voxels) {
    if (!voxels || voxels.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const projected = voxels.map(v => {
      const isoX = (v.x - v.y) * VOXEL_SIZE / 2;
      const isoY = (v.x + v.y) * VOXEL_SIZE / 2 - v.z * VOXEL_HEIGHT;
      return { x: isoX, y: isoY, w: VOXEL_SIZE, h: VOXEL_SIZE / 2, c: v.c, z: v.z };
    });
    projected.forEach(p => {
      minX = Math.min(minX, p.x - p.w / 2);
      minY = Math.min(minY, p.y - p.h / 2);
      maxX = Math.max(maxX, p.x + p.w / 2);
      maxY = Math.max(maxY, p.y + p.h);
    });
    const pad = 4;
    const cw = Math.ceil(maxX - minX + pad * 2);
    const ch = Math.ceil(maxY - minY + pad * 2);
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const ctx = c.getContext('2d');
    projected.sort((a, b) => (a.z - b.z) || (a.y - b.y) || (a.x - b.x));
    projected.forEach(p => {
      const cx = p.x - minX + pad, cy = p.y - minY + pad;
      const hw = p.w / 2, hh = p.h / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - hh); ctx.lineTo(cx + hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx - hw, cy);
      ctx.closePath(); ctx.fillStyle = p.c; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx, cy + hh + VOXEL_HEIGHT); ctx.lineTo(cx - hw, cy + VOXEL_HEIGHT);
      ctx.closePath(); ctx.fillStyle = shadeColor(p.c, -20); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx, cy + hh + VOXEL_HEIGHT); ctx.lineTo(cx + hw, cy + VOXEL_HEIGHT);
      ctx.closePath(); ctx.fillStyle = shadeColor(p.c, -35); ctx.fill();
    });
    return { canvas: c, width: cw, height: ch, anchorX: -minX + pad, anchorY: -minY + pad };
  }

  // ── Cache management ─────────────────────────────────────
  _computeWorldBounds() {
    const W = this.world.width, H = this.world.height;
    const corners = [cellToWorld(0, 0), cellToWorld(W, 0), cellToWorld(W, H), cellToWorld(0, H)];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const c of corners) {
      minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x);
      minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y);
    }
    const padX = 320, padTop = 600, padBottom = 200;
    return { x: Math.floor(minX - padX), y: Math.floor(minY - padTop), w: Math.ceil(maxX - minX + padX * 2), h: Math.ceil(maxY - minY + padTop + padBottom) };
  }

  _ensureWorldBounds() { if (!this._worldBounds) this._worldBounds = this._computeWorldBounds(); return this._worldBounds; }

  _ensureTerrainCache() {
    if (this._terrainCanvas && this._terrainVersion === this.world.terrainVersion) return;
    const wb = this._ensureWorldBounds();
    const c = document.createElement('canvas'); c.width = wb.w; c.height = wb.h;
    const ctx = c.getContext('2d'); ctx.translate(-wb.x, -wb.y);
    for (let gy = 0; gy < this.world.height; gy++)
      for (let gx = 0; gx < this.world.width; gx++) {
        const id = this.world.getTerrain(gx, gy); if (!id) continue;
        const def = this.registry[id]; if (!def) continue;
        const asset = this._getAssetRender(def); if (!asset) continue;
        const pos = cellToWorld(gx, gy);
        ctx.drawImage(asset.canvas, pos.x - asset.anchorX, pos.y - asset.anchorY);
      }
    this._terrainCanvas = c; this._terrainVersion = this.world.terrainVersion;
  }

  _ensureObjectsCache() {
    if (this._objectsCanvas && this._objectsVersion === this.world.objectsVersion) return;
    const wb = this._ensureWorldBounds();
    const c = document.createElement('canvas'); c.width = wb.w; c.height = wb.h;
    const ctx = c.getContext('2d'); ctx.translate(-wb.x, -wb.y);
    const drawables = [...this.world.objects].sort((a, b) => depthSortKey(a.gx, a.gy, a.footprintW, a.footprintD) - depthSortKey(b.gx, b.gy, b.footprintW, b.footprintD));
    for (const obj of drawables) {
      const def = this.registry[obj.assetId]; if (!def) continue;
      const asset = this._getAssetRender(def); if (!asset) continue;
      const pos = cellToWorld(obj.gx, obj.gy);
      const dx = pos.x - asset.anchorX, dy = pos.y - asset.anchorY;
      if (!obj.flipH && !obj.flipV) { ctx.drawImage(asset.canvas, dx, dy); continue; }
      const pivot = cellToWorld(obj.gx + obj.footprintW / 2, obj.gy + obj.footprintD / 2);
      ctx.save(); ctx.translate(pivot.x, pivot.y); ctx.scale(obj.flipH ? -1 : 1, obj.flipV ? -1 : 1); ctx.translate(-pivot.x, -pivot.y);
      ctx.drawImage(asset.canvas, dx, dy); ctx.restore();
    }
    this._objectsCanvas = c; this._objectsVersion = this.world.objectsVersion;
  }

  // ── Drawing ──────────────────────────────────────────────
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = w * dpr; this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true; this.ctx.imageSmoothingQuality = 'high';
    this._worldBounds = null; this._terrainCanvas = null; this._objectsCanvas = null;
    this._dirty = true;
  }

  _drawGrid() {
    const ctx = this.ctx; ctx.save(); ctx.lineWidth = 1 / this.camera.zoom; ctx.strokeStyle = 'rgba(212,74,58,0.15)';
    ctx.beginPath();
    for (let g = 0; g <= this.world.width; g++) { const a = cellToWorld(g, 0), b = cellToWorld(g, this.world.height); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    for (let g = 0; g <= this.world.height; g++) { const a = cellToWorld(0, g), b = cellToWorld(this.world.width, g); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }
    ctx.stroke(); ctx.restore();
  }

  _drawHover() {
    if (!this.hoverCell) return;
    const { gx, gy } = this.hoverCell; const ctx = this.ctx; ctx.save();
    const previewDef = this.previewAssetId ? this.registry[this.previewAssetId] : null;
    const fp = previewDef ? previewDef.footprint : { w: 1, d: 1 };
    const valid = this.previewValid;
    const stroke = this.eraseMode ? 'rgba(212,74,58,0.9)' : (valid ? 'rgba(212,74,58,0.7)' : 'rgba(138,28,28,0.8)');
    const fill = this.eraseMode ? 'rgba(212,74,58,0.12)' : (valid ? 'rgba(212,74,58,0.10)' : 'rgba(138,28,28,0.12)');
    ctx.lineWidth = 2 / this.camera.zoom; ctx.strokeStyle = stroke; ctx.fillStyle = fill;
    for (let ix = 0; ix < fp.w; ix++)
      for (let iy = 0; iy < fp.d; iy++) {
        const cx = gx + ix, cy = gy + iy; if (!this.world.inBounds(cx, cy)) continue;
        const a = cellToWorld(cx, cy), b = cellToWorld(cx + 1, cy), c_ = cellToWorld(cx + 1, cy + 1), d = cellToWorld(cx, cy + 1);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c_.x, c_.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    ctx.restore();
  }

  _drawPreview() {
    if (!this.hoverCell || !this.previewAssetId || this.eraseMode) return;
    const def = this.registry[this.previewAssetId]; if (!def) return;
    const asset = this._getAssetRender(def); if (!asset) return;
    const { gx, gy } = this.hoverCell; const pos = cellToWorld(gx, gy);
    const dx = pos.x - asset.anchorX, dy = pos.y - asset.anchorY;
    this.ctx.save(); this.ctx.globalAlpha = this.previewValid ? 0.35 : 0.22;
    if (def.kind === 'object' && (this.previewFlipH || this.previewFlipV)) {
      const pivot = cellToWorld(gx + def.footprint.w / 2, gy + def.footprint.d / 2);
      this.ctx.translate(pivot.x, pivot.y); this.ctx.scale(this.previewFlipH ? -1 : 1, this.previewFlipV ? -1 : 1); this.ctx.translate(-pivot.x, -pivot.y);
    }
    this.ctx.drawImage(asset.canvas, dx, dy); this.ctx.restore();
  }

  _easeOutElastic(t) { if (t <= 0) return 0; if (t >= 1) return 1; const c4 = (2 * Math.PI) / 3; return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; }

  spawnAnim(key, cell, duration = 460, startAt = performance.now()) {
    this._anims.set(key, { start: startAt, duration, cell });
    if (key.startsWith('obj-')) this._objectsVersion = -1;
    else if (key.startsWith('t-')) this._terrainVersion = -1;
    this._dirty = true;
  }

  _snapshotAnims() {
    const now = performance.now(); this._frameAnims.clear(); let removed = false;
    for (const [key, a] of this._anims) {
      const t = (now - a.start) / a.duration;
      if (t >= 1) { this._anims.delete(key); removed = true; continue; }
      if (t < 0) continue;
      this._frameAnims.set(key, { t, cell: a.cell });
    }
    if (removed) { this._objectsVersion = -1; this._terrainVersion = -1; this._dirty = true; }
  }

  _drawAnims() {
    for (const [key, entry] of this._frameAnims) {
      const t = entry.t, s = this._easeOutElastic(t);
      if (key.startsWith('obj-')) {
        const id = +key.slice(4); const obj = this.world.objects.find(o => o.id === id); if (!obj) continue;
        const def = this.registry[obj.assetId]; if (!def) continue;
        const asset = this._getAssetRender(def); if (!asset) continue;
        const pos = cellToWorld(obj.gx, obj.gy); const dx = pos.x - asset.anchorX, dy = pos.y - asset.anchorY;
        const pivot = cellToWorld(obj.gx + obj.footprintW / 2, obj.gy + obj.footprintD / 2);
        this.ctx.save(); this.ctx.globalAlpha *= Math.min(1, t * 1.6); this.ctx.translate(pivot.x, pivot.y); this.ctx.scale(s, s); this.ctx.translate(-pivot.x, -pivot.y);
        if (!obj.flipH && !obj.flipV) { this.ctx.drawImage(asset.canvas, dx, dy); }
        else { this.ctx.translate(pivot.x, pivot.y); this.ctx.scale(obj.flipH ? -1 : 1, obj.flipV ? -1 : 1); this.ctx.translate(-pivot.x, -pivot.y); this.ctx.drawImage(asset.canvas, dx, dy); }
        this.ctx.restore();
      } else if (key.startsWith('t-')) {
        const parts = key.slice(2).split(','); const gx = +parts[0], gy = +parts[1];
        const id = this.world.getTerrain(gx, gy); if (!id) continue;
        const def = this.registry[id]; if (!def) continue;
        const asset = this._getAssetRender(def); if (!asset) continue;
        const pos = cellToWorld(gx, gy); const dx = pos.x - asset.anchorX, dy = pos.y - asset.anchorY;
        const pivot = cellToWorld(gx + 0.5, gy + 0.5);
        this.ctx.save(); this.ctx.globalAlpha *= Math.min(1, t * 1.6); this.ctx.translate(pivot.x, pivot.y); this.ctx.scale(s, s); this.ctx.translate(-pivot.x, -pivot.y);
        this.ctx.drawImage(asset.canvas, dx, dy); this.ctx.restore();
      }
    }
  }

  draw() {
    this._snapshotAnims();
    const pending = this._anims.size > 0;
    if (!this._dirty && !pending) return; this._dirty = false;
    const ctx = this.ctx; const w = window.innerWidth, h = window.innerHeight;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#121212'; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(this.camera.offsetX, this.camera.offsetY); ctx.scale(this.camera.zoom, this.camera.zoom);
    this._ensureTerrainCache(); this._ensureObjectsCache();
    const wb = this._ensureWorldBounds();
    if (this._terrainCanvas) ctx.drawImage(this._terrainCanvas, wb.x, wb.y);
    if (this.showGrid) this._drawGrid();
    if (this._objectsCanvas) ctx.drawImage(this._objectsCanvas, wb.x, wb.y);
    this._drawAnims(); this._drawPreview(); this._drawHover();
    ctx.restore();
  }
}
