using UnityEngine;

namespace Bonepile.Core
{
    /// <summary>
    /// Matemáticas isométricas 2:1. Equivalente a IsoMath.js.
    /// </summary>
    public static class IsoGrid
    {
        public const float TILE_W = 64f;
        public const float TILE_H = 32f;
        public const float VOXEL_SIZE = 16f;
        public const float VOXEL_HEIGHT = 16f;

        /// <summary>
        /// Grid cell to world position (on the ground plane Y=0).
        /// En Unity: Vector3(x, 0, y) si usas XZ plane, o Vector3(x, y, 0) si usas XY.
        /// </summary>
        public static Vector2 CellToWorld(int gx, int gy)
        {
            return new Vector2(
                (gx - gy) * TILE_W * 0.5f,
                (gx + gy) * TILE_H * 0.5f
            );
        }

        public static Vector2Int WorldToCell(float wx, float wy)
        {
            int gx = Mathf.FloorToInt((wx / (TILE_W * 0.5f) + wy / (TILE_H * 0.5f)) * 0.5f);
            int gy = Mathf.FloorToInt((wy / (TILE_H * 0.5f) - wx / (TILE_W * 0.5f)) * 0.5f);
            return new Vector2Int(gx, gy);
        }

        public static Vector2 VoxelToWorld(int vx, int vy, int vz)
        {
            return new Vector2(
                (vx - vy) * VOXEL_SIZE * 0.5f,
                (vx + vy) * VOXEL_SIZE * 0.5f - vz * VOXEL_HEIGHT
            );
        }

        public static int DepthSortKey(int gx, int gy, int footprintW, int footprintD)
        {
            return (gx + footprintW - 1) + (gy + footprintD - 1);
        }

        public static Bounds ComputeGridBounds(int width, int height)
        {
            var corners = new Vector2[] {
                CellToWorld(0, 0),
                CellToWorld(width, 0),
                CellToWorld(width, height),
                CellToWorld(0, height)
            };
            float minX = float.MaxValue, maxX = float.MinValue;
            float minY = float.MaxValue, maxY = float.MinValue;
            foreach (var c in corners)
            {
                minX = Mathf.Min(minX, c.x); maxX = Mathf.Max(maxX, c.x);
                minY = Mathf.Min(minY, c.y); maxY = Mathf.Max(maxY, c.y);
            }
            return new Bounds(
                new Vector3((minX + maxX) * 0.5f, (minY + maxY) * 0.5f, 0),
                new Vector3(maxX - minX, maxY - minY, 1)
            );
        }
    }
}
