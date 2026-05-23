/**
 * PlacementSystem.js
 * 
 * Lógica pura de colocación y borrado. Sin dependencias de render.
 * En Unity: MonoBehaviour que recibe input y modifica WorldData.
 */

export class PlacementSystem {
  constructor(worldData, assetRegistry) {
    this.world = worldData;
    this.registry = assetRegistry; // ASSET_INDEX
  }

  canPlace(assetId, gx, gy) {
    const def = this.registry[assetId];
    if (!def) return false;
    if (def.kind === 'terrain') return this.world.inBounds(gx, gy);
    return this.world.canPlaceObject(def, gx, gy);
  }

  place(assetId, gx, gy, opts = {}) {
    const def = this.registry[assetId];
    if (!def || !this.canPlace(assetId, gx, gy)) return null;
    if (def.kind === 'terrain') {
      this.world.setTerrain(gx, gy, assetId);
      return { kind: 'terrain', assetId, gx, gy };
    }
    const obj = this.world.addObject(assetId, gx, gy, { assetDef: def, flipH: !!opts.flipH, flipV: !!opts.flipV });
    return obj ? { kind: 'object', object: obj } : null;
  }

  erase(gx, gy) {
    return this.world.removeAt(gx, gy);
  }

  fillTerrain(assetId) {
    const W = this.world.width, H = this.world.height;
    let filled = 0;
    for (let gy = 0; gy < H; gy++)
      for (let gx = 0; gx < W; gx++) {
        if (this.world.getTerrain(gx, gy)) continue;
        if (this.place(assetId, gx, gy)) filled++;
      }
    return filled;
  }
}
