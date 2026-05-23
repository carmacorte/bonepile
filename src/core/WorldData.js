/**
 * WorldData.js
 * 
 * Estado puro del mundo. Sin dependencias de render ni DOM.
 * En Unity esto se mapea a una clase C# con [Serializable].
 */

export class WorldData {
  constructor(width = 14, height = 14) {
    this.width = width;
    this.height = height;
    this.terrain = new Array(width * height).fill(null); // string[]
    this.objects = []; // PlacedObject[]
    this.nextObjectId = 1;
    this.version = 0; // Incrementado en cada mutación
    this.terrainVersion = 0;
    this.objectsVersion = 0;
  }

  // ── Terrain ─────────────────────────────────────────────
  inBounds(gx, gy) {
    return gx >= 0 && gy >= 0 && gx < this.width && gy < this.height;
  }

  idx(gx, gy) { return gy * this.width + gx; }

  getTerrain(gx, gy) {
    return this.inBounds(gx, gy) ? this.terrain[this.idx(gx, gy)] : null;
  }

  setTerrain(gx, gy, assetId) {
    if (!this.inBounds(gx, gy)) return false;
    const old = this.terrain[this.idx(gx, gy)];
    this.terrain[this.idx(gx, gy)] = assetId;
    if (old !== assetId) {
      this.version++;
      this.terrainVersion++;
    }
    return true;
  }

  // ── Objects ─────────────────────────────────────────────
  objectAt(gx, gy) {
    return this.objects.find(o => 
      gx >= o.gx && gx < o.gx + o.footprintW &&
      gy >= o.gy && gy < o.gy + o.footprintD
    );
  }

  canPlaceObject(assetDef, gx, gy) {
    for (let ix = 0; ix < assetDef.footprint.w; ix++)
      for (let iy = 0; iy < assetDef.footprint.d; iy++)
        if (!this.inBounds(gx + ix, gy + iy) || this.objectAt(gx + ix, gy + iy))
          return false;
    return true;
  }

  addObject(assetId, gx, gy, opts = {}) {
    const def = opts.assetDef; // AssetDefinition instance
    if (!def || !this.canPlaceObject(def, gx, gy)) return null;

    const obj = {
      id: this.nextObjectId++,
      assetId,
      gx, gy,
      footprintW: def.footprint.w,
      footprintD: def.footprint.d,
      flipH: !!opts.flipH,
      flipV: !!opts.flipV,
      sortKey: () => (gx + def.footprint.w - 1) + (gy + def.footprint.d - 1)
    };
    this.objects.push(obj);
    this.version++;
    this.objectsVersion++;
    return obj;
  }

  removeObject(gx, gy) {
    const idx = this.objects.findIndex(o =>
      gx >= o.gx && gx < o.gx + o.footprintW &&
      gy >= o.gy && gy < o.gy + o.footprintD
    );
    if (idx >= 0) {
      this.objects.splice(idx, 1);
      this.version++;
      this.objectsVersion++;
      return true;
    }
    return false;
  }

  removeAt(gx, gy) {
    // Try object first, then terrain
    if (this.removeObject(gx, gy)) return { kind: 'object' };
    if (this.getTerrain(gx, gy)) {
      this.setTerrain(gx, gy, null);
      return { kind: 'terrain' };
    }
    return null;
  }

  clearAll() {
    this.terrain.fill(null);
    this.objects = [];
    this.nextObjectId = 1;
    this.version++;
    this.terrainVersion++;
    this.objectsVersion++;
  }

  // ── Serialization (Unity-compatible) ────────────────────
  toJSON() {
    return JSON.stringify({
      width: this.width,
      height: this.height,
      terrain: this.terrain,
      objects: this.objects.map(o => ({
        id: o.id,
        assetId: o.assetId,
        gx: o.gx, gy: o.gy,
        footprintW: o.footprintW,
        footprintD: o.footprintD,
        flipH: o.flipH,
        flipV: o.flipV
      })),
      nextObjectId: this.nextObjectId,
      version: this.version,
      terrainVersion: this.terrainVersion,
      objectsVersion: this.objectsVersion
    });
  }

  static fromJSON(json) {
    const data = JSON.parse(json);
    const world = new WorldData(data.width, data.height);
    world.terrain = data.terrain;
    world.objects = (data.objects || []).map(o => ({
      ...o,
      sortKey: () => (o.gx + o.footprintW - 1) + (o.gy + o.footprintD - 1)
    }));
    world.nextObjectId = data.nextObjectId || 1;
    world.version = data.version || 0;
    world.terrainVersion = data.terrainVersion ?? world.version;
    world.objectsVersion = data.objectsVersion ?? world.version;
    return world;
  }
}
