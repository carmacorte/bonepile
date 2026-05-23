/**
 * IsoMath.js
 * 
 * Matemáticas isométricas 2:1 (diamante). Sin estado, sin dependencias.
 * Directamente portable a C# en Unity.
 */

export const TILE_W = 64;
export const TILE_H = 32;
export const VOXEL_SIZE = 16;
export const VOXEL_HEIGHT = 16;

/**
 * Convierte coordenadas de grid (gx, gy) a coordenadas de mundo isométrico (x, y).
 * En Unity: Vector3 con z = 0 para el plano de suelo.
 */
export function cellToWorld(gx, gy) {
  return {
    x: (gx - gy) * TILE_W / 2,
    y: (gx + gy) * TILE_H / 2
  };
}

/**
 * Inverso: de coordenadas de mundo a celda de grid.
 * Usado para raycast / click-to-grid.
 */
export function worldToCell(wx, wy) {
  const gx = Math.floor((wx / (TILE_W / 2) + wy / (TILE_H / 2)) / 2);
  const gy = Math.floor((wy / (TILE_H / 2) - wx / (TILE_W / 2)) / 2);
  return { gx, gy };
}

/**
 * Proyecta un voxel (x, y, z en coordenadas de tile-local) a mundo isométrico.
 * x,y,z son índices de voxel dentro de un tile (0..VPT-1).
 */
export function voxelToWorld(vx, vy, vz) {
  const isoX = (vx - vy) * VOXEL_SIZE / 2;
  const isoY = (vx + vy) * VOXEL_SIZE / 2 - vz * VOXEL_HEIGHT;
  return { x: isoX, y: isoY };
}

/**
 * Calcula los bounds del grid completo en coordenadas de mundo.
 * Útil para centrar la cámara al inicio.
 */
export function computeGridBounds(width, height) {
  const corners = [
    cellToWorld(0, 0),
    cellToWorld(width, 0),
    cellToWorld(width, height),
    cellToWorld(0, height)
  ];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const c of corners) {
    minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x);
    minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y);
  }
  return { minX, maxX, minY, maxY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
}

/**
 * Depth sort key para painter's algorithm.
 * En Unity se usa para ordenar los meshes antes de renderizar.
 */
export function depthSortKey(gx, gy, footprintW, footprintD) {
  return (gx + footprintW - 1) + (gy + footprintD - 1);
}
