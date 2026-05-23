/**
 * CameraSystem.js
 * 
 * Cámara virtual ortográfica isométrica.
 * En Unity: Camera con proyección Orthographic + rotación 30° en X.
 */

export class CameraSystem {
  constructor() {
    this.offsetX = 0;
    this.offsetY = 0;
    this.zoom = 1.4;
    this.minZoom = 0.5;
    this.maxZoom = 3.0;
    this.listeners = [];
  }

  onChange(cb) { this.listeners.push(cb); }
  _notify() { this.listeners.forEach(cb => cb()); }

  pan(dx, dy) {
    if (dx || dy) {
      this.offsetX += dx;
      this.offsetY += dy;
      this._notify();
    }
  }

  zoomAt(screenX, screenY, factor) {
    const next = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
    if (next === this.zoom) return;
    const before = this.screenToWorld(screenX, screenY);
    this.zoom = next;
    const after = this.screenToWorld(screenX, screenY);
    this.offsetX += (after.x - before.x) * this.zoom;
    this.offsetY += (after.y - before.y) * this.zoom;
    this._notify();
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.offsetX) / this.zoom,
      y: (sy - this.offsetY) / this.zoom
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: wx * this.zoom + this.offsetX,
      y: wy * this.zoom + this.offsetY
    };
  }

  centerOn(worldX, worldY, canvasW, canvasH) {
    this.offsetX = canvasW / 2 - worldX * this.zoom;
    this.offsetY = canvasH / 2 - worldY * this.zoom;
    this._notify();
  }
}
