/**
 * InputSystem.js
 * 
 * Mapea input bruto (mouse/touch/keyboard) a acciones semánticas.
 * En Unity: Input System actions → Command pattern.
 */

export const ACTIONS = Object.freeze({
  PRIMARY_DOWN: 'primaryDown',    // Left click / tap
  PRIMARY_UP: 'primaryUp',
  SECONDARY_DOWN: 'secondaryDown', // Right click / long press
  SECONDARY_UP: 'secondaryUp',
  PAN_START: 'panStart',           // Middle click / shift+drag
  PAN_MOVE: 'panMove',
  PAN_END: 'panEnd',
  ZOOM: 'zoom',
  HOVER: 'hover',
  KEY_PRESS: 'keyPress'
});

export class InputSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.listeners = [];
    this._panning = false;
    this._lastPos = null;
    this._bind();
  }

  onAction(cb) { this.listeners.push(cb); }
  _emit(action, payload) { this.listeners.forEach(cb => cb(action, payload)); }

  _bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', e => this._onPointerDown(e));
    window.addEventListener('pointermove', e => this._onPointerMove(e));
    window.addEventListener('pointerup', e => this._onPointerUp(e));
    c.addEventListener('wheel', e => this._onWheel(e), { passive: false });
    window.addEventListener('keydown', e => this._onKey(e));
  }

  _pos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  _onPointerDown(e) {
    const pos = this._pos(e);
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      this._panning = true;
      this._lastPos = pos;
      this._emit(ACTIONS.PAN_START, pos);
      e.preventDefault();
    } else if (e.button === 2) {
      this._emit(ACTIONS.SECONDARY_DOWN, pos);
      e.preventDefault();
    } else if (e.button === 0) {
      this._emit(ACTIONS.PRIMARY_DOWN, pos);
    }
  }

  _onPointerMove(e) {
    const pos = this._pos(e);
    this._emit(ACTIONS.HOVER, pos);
    if (this._panning && this._lastPos) {
      this._emit(ACTIONS.PAN_MOVE, { dx: pos.x - this._lastPos.x, dy: pos.y - this._lastPos.y, pos });
      this._lastPos = pos;
    }
  }

  _onPointerUp(e) {
    if (this._panning) {
      this._panning = false;
      this._emit(ACTIONS.PAN_END, {});
    }
    this._emit(e.button === 2 ? ACTIONS.SECONDARY_UP : ACTIONS.PRIMARY_UP, {});
  }

  _onWheel(e) {
    e.preventDefault();
    this._emit(ACTIONS.ZOOM, { pos: this._pos(e), factor: e.deltaY < 0 ? 1.08 : 0.92 });
  }

  _onKey(e) {
    this._emit(ACTIONS.KEY_PRESS, { key: e.key, shift: e.shiftKey, ctrl: e.ctrlKey });
  }
}
