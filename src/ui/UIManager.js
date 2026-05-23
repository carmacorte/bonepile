/**
 * UIManager.js
 * 
 * Estado de UI desacoplado del render.
 * En Unity: UI Toolkit o uGUI con bindings a este estado.
 */

export class UIManager {
  constructor(assetRegistry, categories) {
    this.registry = assetRegistry;
    this.categories = categories;
    this.category = 'terrain';
    this.selectedAssetId = null;
    this.listeners = [];
    this._pickFirstAsset();
  }

  onChange(cb) { this.listeners.push(cb); }
  _notify() { this.listeners.forEach(cb => cb()); }

  _pickFirstAsset() {
    const first = Object.values(this.registry).find(a => a.category === this.category);
    this.selectedAssetId = first ? first.id : null;
  }

  setCategory(cat) {
    if (this.category === cat) return;
    this.category = cat;
    this._pickFirstAsset();
    this._notify();
  }

  selectAsset(id) {
    const a = this.registry[id];
    if (!a) return;
    this.selectedAssetId = id;
    this.category = a.category;
    this._notify();
  }

  getAssetsInCategory() {
    return Object.values(this.registry).filter(a => a.category === this.category);
  }
}
