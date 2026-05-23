export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.justPressed = new Set();
    this.mouseButtons = new Set();
    this.pointerDelta = { x: 0, y: 0 };
    this.wheelDelta = 0;
    this.pointerLocked = false;
    this.enabled = false;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onContextMenu = (event) => event.preventDefault();
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('wheel', this._onWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this._onContextMenu);
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('wheel', this._onWheel);
    this.canvas.removeEventListener('contextmenu', this._onContextMenu);
  }

  beginFrame() {
    // Reserved for future fixed-step input work. Pointer deltas are cleared after update.
  }

  endFrame() {
    this.justPressed.clear();
    this.pointerDelta.x = 0;
    this.pointerDelta.y = 0;
    this.wheelDelta = 0;
  }

  isDown(code) {
    return this.keys.has(code);
  }

  wasPressed(code) {
    return this.justPressed.has(code);
  }

  isMouseDown(button = 0) {
    return this.mouseButtons.has(button);
  }

  getMoveVector() {
    let x = 0;
    let y = 0;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) y += 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) y -= 1;
    return { x, y };
  }

  _onKeyDown(event) {
    if (!this.enabled) return;
    if (!this.keys.has(event.code)) this.justPressed.add(event.code);
    this.keys.add(event.code);
  }

  _onKeyUp(event) {
    this.keys.delete(event.code);
  }

  _onPointerMove(event) {
    if (!this.enabled) return;
    if (this.isMouseDown(0) || this.isMouseDown(1) || this.isMouseDown(2)) {
      this.pointerDelta.x += event.movementX || 0;
      this.pointerDelta.y += event.movementY || 0;
    }
  }

  _onPointerDown(event) {
    if (!this.enabled) return;
    this.mouseButtons.add(event.button);
    this.canvas.focus?.();
  }

  _onPointerUp(event) {
    this.mouseButtons.delete(event.button);
  }

  _onWheel(event) {
    if (!this.enabled) return;
    event.preventDefault();
    this.wheelDelta += Math.sign(event.deltaY);
  }
}
