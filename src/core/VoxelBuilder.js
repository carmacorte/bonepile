/**
 * VoxelBuilder.js
 * 
 * Primitives geométricas para construir assets voxel.
 * En Unity esto se convierte en un generador de meshes o de datos de voxel grid.
 */

export class VoxelBuilder {
  static box(x, y, z, w, d, h, color) {
    const out = [];
    for (let ix = 0; ix < w; ix++)
      for (let iy = 0; iy < d; iy++)
        for (let iz = 0; iz < h; iz++)
          out.push({ x: x + ix, y: y + iy, z: z + iz, c: color });
    return out;
  }

  static shell(x, y, z, w, d, h, color, opts = {}) {
    const out = [];
    for (let ix = 0; ix < w; ix++)
      for (let iy = 0; iy < d; iy++)
        for (let iz = 0; iz < h; iz++) {
          const wall = ix === 0 || ix === w - 1 || iy === 0 || iy === d - 1 || iz === 0 || (opts.floor !== false && iz === h - 1);
          if (wall) out.push({ x: x + ix, y: y + iy, z: z + iz, c: color });
        }
    return out;
  }

  static cylinder(cx, cy, z, r, h, color) {
    const out = [];
    for (let ix = -r; ix <= r; ix++)
      for (let iy = -r; iy <= r; iy++)
        if (ix * ix + iy * iy <= r * r + 0.5)
          for (let iz = 0; iz < h; iz++)
            out.push({ x: cx + ix, y: cy + iy, z: z + iz, c: color });
    return out;
  }

  static dome(cx, cy, z, r, color) {
    const out = [];
    for (let iz = 0; iz <= r; iz++) {
      const rr = r - iz;
      for (let ix = -rr; ix <= rr; ix++)
        for (let iy = -rr; iy <= rr; iy++)
          if (ix * ix + iy * iy <= rr * rr + 0.5)
            out.push({ x: cx + ix, y: cy + iy, z: z + iz, c: color });
    }
    return out;
  }

  static pyramidRoof(x, y, z, w, d, h, color) {
    const out = [];
    for (let iz = 0; iz < h; iz++) {
      const inset = iz;
      const x0 = x + inset, y0 = y + inset;
      const x1 = x + w - inset, y1 = y + d - inset;
      if (x1 <= x0 || y1 <= y0) break;
      for (let ix = x0; ix < x1; ix++)
        for (let iy = y0; iy < y1; iy++)
          out.push({ x: ix, y: iy, z: z + iz, c: color });
    }
    return out;
  }

  static compose(...parts) {
    const out = [];
    for (const part of parts) {
      if (Array.isArray(part)) out.push(...part);
      else if (part) out.push(part);
    }
    return out;
  }
}
