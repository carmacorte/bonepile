
import { WorldData } from './src/core/WorldData.js';
import { ASSET_INDEX, CATEGORIES, PALETTE } from './src/core/AssetRegistry.js';
import { VoxelBuilder } from './src/core/VoxelBuilder.js';
import { cellToWorld, worldToCell, computeGridBounds } from './src/core/IsoMath.js';
import { PlacementSystem } from './src/systems/PlacementSystem.js';
import { CameraSystem } from './src/systems/CameraSystem.js';
import { InputSystem, ACTIONS } from './src/systems/InputSystem.js';
import { SaveManager } from './src/save/SaveManager.js';
import { CanvasRenderer } from './src/render/CanvasRenderer.js';
import { UIManager } from './src/ui/UIManager.js';
import { createNecropolisSample } from './src/gameplay/SampleWorldFactory.js';

// ── Game Controller ──────────────────────────────────────
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.world = new WorldData(14, 14);
    this.camera = new CameraSystem();
    this.renderer = new CanvasRenderer(canvas, this.camera, this.world, ASSET_INDEX);
    this.placement = new PlacementSystem(this.world, ASSET_INDEX);
    this.input = new InputSystem(canvas);
    this.ui = new UIManager(ASSET_INDEX, CATEGORIES);
    this.save = new SaveManager();

    this.tool = 'place';
    this.flipH = false; this.flipV = false;

    this._bindInput();
    this._bindUI();
    this._syncUI();
    this._updateStatus();
    this._centerCamera();

    this.ui.onChange(() => { this._syncUI(); this._updateStatus(); });
    this.camera.onChange(() => this.renderer.markDirty());

    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _bindInput() {
    this.input.onAction((action, payload) => {
      switch (action) {
        case ACTIONS.HOVER:
          this._onHover(payload);
          break;
        case ACTIONS.PRIMARY_DOWN:
          this._onPaint(payload, false);
          break;
        case ACTIONS.SECONDARY_DOWN:
          this._onPaint(payload, true);
          break;
        case ACTIONS.PAN_MOVE:
          this.camera.pan(payload.dx, payload.dy);
          break;
        case ACTIONS.ZOOM:
          this.camera.zoomAt(payload.pos.x, payload.pos.y, payload.factor);
          break;
        case ACTIONS.KEY_PRESS:
          this._onKey(payload.key);
          break;
      }
    });
  }

  _replaceWorld(world) {
    this.world = world;
    this.renderer.world = world;
    this.placement.world = world;
    this.renderer._terrainVersion = -1;
    this.renderer._objectsVersion = -1;
    this.renderer.markDirty();
    this._centerCamera();
    this._updateStatus();
  }

  _bindUI() {
    document.getElementById('btn-seed').onclick = () => {
      if (this.world.objects.length > 0 && !confirm('Replace current world with sample necropolis?')) return;
      this._replaceWorld(createNecropolisSample(this.world.width, this.world.height));
      showToast('Necropolis sample generated');
    };
    document.getElementById('btn-fill').onclick = () => {
      const filled = this.placement.fillTerrain('ash');
      this.renderer.markDirty();
      this._updateStatus();
      showToast(`Covered ${filled} tiles in ash`);
    };
    document.getElementById('btn-grid').onclick = () => {
      this.renderer.showGrid = !this.renderer.showGrid;
      this.renderer.markDirty();
    };
    document.getElementById('btn-erase').onclick = () => this._toggleTool('erase');
    document.getElementById('btn-reset').onclick = () => {
      if (confirm('Reset world?')) { this.world.clearAll(); this._centerCamera(); showToast('World consumed'); }
    };
    document.getElementById('btn-save').onclick = () => {
      if (this.save.save(this.world)) showToast('World saved');
    };
    document.getElementById('btn-load').onclick = () => {
      const loaded = this.save.load();
      if (loaded) {
        this._replaceWorld(loaded);
        showToast('World loaded');
      }
    };
    document.getElementById('btn-export').onclick = () => {
      this.save.exportToFile(this.world);
      showToast('World JSON exported');
    };
    const importInput = document.getElementById('import-file');
    document.getElementById('btn-import').onclick = () => importInput.click();
    importInput.onchange = async () => {
      const file = importInput.files?.[0];
      if (!file) return;
      try {
        this._replaceWorld(await this.save.importFromFile(file));
        showToast('World JSON imported');
      } catch (err) {
        console.error(err);
        showToast('Import failed');
      } finally {
        importInput.value = '';
      }
    };
    document.getElementById('palette-toggle').onclick = () => {
      document.getElementById('palette').classList.toggle('collapsed');
    };
  }

  _syncUI() {
    const catTabs = document.getElementById('cat-tabs');
    const assetGrid = document.getElementById('asset-grid');
    const assetCount = document.getElementById('asset-count');

    catTabs.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'cat-tab' + (cat === this.ui.category ? ' active' : '');
      btn.textContent = cat;
      btn.onclick = () => this.ui.setCategory(cat);
      catTabs.appendChild(btn);
    });

    assetGrid.innerHTML = '';
    const items = this.ui.getAssetsInCategory();
    assetCount.textContent = items.length + ' items';
    items.forEach(a => {
      const btn = document.createElement('div');
      btn.className = 'asset-btn' + (a.id === this.ui.selectedAssetId ? ' selected' : '');
      btn.textContent = a.name;
      btn.onclick = () => this.ui.selectAsset(a.id);
      assetGrid.appendChild(btn);
    });
  }

  _updateStatus() {
    const el = document.getElementById('status');
    if (!el) return;
    const asset = this.ui.selectedAssetId ? ASSET_INDEX[this.ui.selectedAssetId] : null;
    el.innerHTML = `Tool: ${this.tool === 'erase' ? 'Erase' : 'Place'}<br>Asset: ${asset ? asset.name : '-'}<br>Objects: ${this.world.objects.length}<br>Flip: ${this.flipH ? 'H' : '-'} / ${this.flipV ? 'V' : '-'}`;
  }

  _centerCamera() {
    const bounds = computeGridBounds(this.world.width, this.world.height);
    this.camera.centerOn(bounds.centerX, bounds.centerY, window.innerWidth, window.innerHeight);
  }

  _onHover(pos) {
    const w = this.camera.screenToWorld(pos.x, pos.y);
    const cell = worldToCell(w.x, w.y);
    this.renderer.hoverCell = cell;

    if (this.tool === 'erase') {
      this.renderer.previewAssetId = null;
      this.renderer.previewValid = !!this.world.objectAt(cell.gx, cell.gy) || !!this.world.getTerrain(cell.gx, cell.gy);
    } else {
      this.renderer.previewAssetId = this.ui.selectedAssetId;
      this.renderer.previewValid = this.placement.canPlace(this.ui.selectedAssetId, cell.gx, cell.gy);
    }
    this.renderer.previewFlipH = this.flipH;
    this.renderer.previewFlipV = this.flipV;
    this.renderer.markDirty();
  }

  _onPaint(pos, erase) {
    const w = this.camera.screenToWorld(pos.x, pos.y);
    const cell = worldToCell(w.x, w.y);
    if (erase || this.tool === 'erase') {
      if (this.placement.erase(cell.gx, cell.gy)) { this.renderer.markDirty(); this._updateStatus(); }
    } else {
      const result = this.placement.place(this.ui.selectedAssetId, cell.gx, cell.gy, { flipH: this.flipH, flipV: this.flipV });
      if (result?.kind === 'object') {
        const o = result.object;
        this.renderer.spawnAnim(`obj-${o.id}`, { gx: o.gx, gy: o.gy, w: o.footprintW, d: o.footprintD });
      } else if (result?.kind === 'terrain') {
        this.renderer.spawnAnim(`t-${result.gx},${result.gy}`, { gx: result.gx, gy: result.gy });
      }
      this._updateStatus();
    }
  }

  _toggleTool(t) {
    this.tool = this.tool === t ? 'place' : t;
    this.renderer.eraseMode = (this.tool === 'erase');
    this.canvas.style.cursor = this.tool === 'pan' ? 'grab' : 'crosshair';
    this.renderer.markDirty();
    this._updateStatus();
  }

  _onKey(key) {
    if (key === 'e' || key === 'E') this._toggleTool('erase');
    if (key === 'g' || key === 'G') { this.renderer.showGrid = !this.renderer.showGrid; this.renderer.markDirty(); }
    if (key === 'h' || key === 'H') { this.flipH = !this.flipH; this._updateStatus(); this.renderer.markDirty(); }
    if (key === 'v' || key === 'V') { this.flipV = !this.flipV; this._updateStatus(); this.renderer.markDirty(); }
    if (key === '1') this.ui.setCategory('terrain');
    if (key === '2') this.ui.setCategory('nature');
    if (key === '3') this.ui.setCategory('props');
    if (key === '4') this.ui.setCategory('hazards');
    if (key === '5') this.ui.setCategory('buildings');
  }

  _loop() {
    this.renderer.draw();
    requestAnimationFrame(this._loop);
  }
}

// ── Boot ─────────────────────────────────────────────────
const toastEl = document.getElementById('toast');
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 1800);
}

document.getElementById('start-btn').onclick = () => {
  try {
    const game = new Game(document.getElementById('game-canvas'));
    document.getElementById('start').classList.add('hidden');
    document.getElementById('app').style.opacity = 1;
    showToast('Welcome to Bonepile');
  } catch (err) {
    console.error(err);
    document.getElementById('start').classList.add('error');
    document.getElementById('start-err').textContent = err.message;
  }
};

document.addEventListener('contextmenu', e => e.preventDefault());
