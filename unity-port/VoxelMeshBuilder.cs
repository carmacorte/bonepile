using System.Collections.Generic;
using UnityEngine;

namespace Bonepile.Core
{
    /// <summary>
    /// Genera meshes de voxel a partir de VoxelData[].
    /// En Unity puedes usar esto para crear prefabs en editor o runtime.
    /// </summary>
    public static class VoxelMeshBuilder
    {
        public static Mesh BuildMesh(VoxelData[] voxels, float scale = 1f)
        {
            if (voxels == null || voxels.Length == 0) return null;

            var verts = new List<Vector3>();
            var tris = new List<int>();
            var colors = new List<Color32>();
            var uvs = new List<Vector2>();

            foreach (var v in voxels)
            {
                var worldPos = IsoGrid.VoxelToWorld(v.x, v.y, v.z);
                float s = IsoGrid.VOXEL_SIZE * scale;
                float h = IsoGrid.VOXEL_HEIGHT * scale;

                // Top face (diamond)
                int vi = verts.Count;
                verts.Add(new Vector3(worldPos.x, worldPos.y + h * 0.5f, 0));
                verts.Add(new Vector3(worldPos.x + s * 0.5f, worldPos.y, 0));
                verts.Add(new Vector3(worldPos.x, worldPos.y - h * 0.5f, 0));
                verts.Add(new Vector3(worldPos.x - s * 0.5f, worldPos.y, 0));

                tris.Add(vi); tris.Add(vi + 1); tris.Add(vi + 2);
                tris.Add(vi); tris.Add(vi + 2); tris.Add(vi + 3);

                for (int i = 0; i < 4; i++) { colors.Add(v.color); uvs.Add(Vector2.zero); }

                // Left face
                vi = verts.Count;
                verts.Add(new Vector3(worldPos.x - s * 0.5f, worldPos.y, 0));
                verts.Add(new Vector3(worldPos.x, worldPos.y - h * 0.5f, 0));
                verts.Add(new Vector3(worldPos.x, worldPos.y - h * 0.5f - h, 0));
                verts.Add(new Vector3(worldPos.x - s * 0.5f, worldPos.y - h, 0));
                tris.Add(vi); tris.Add(vi + 1); tris.Add(vi + 2);
                tris.Add(vi); tris.Add(vi + 2); tris.Add(vi + 3);
                var leftColor = ShadeColor(v.color, -0.2f);
                for (int i = 0; i < 4; i++) { colors.Add(leftColor); uvs.Add(Vector2.zero); }

                // Right face
                vi = verts.Count;
                verts.Add(new Vector3(worldPos.x + s * 0.5f, worldPos.y, 0));
                verts.Add(new Vector3(worldPos.x, worldPos.y - h * 0.5f, 0));
                verts.Add(new Vector3(worldPos.x, worldPos.y - h * 0.5f - h, 0));
                verts.Add(new Vector3(worldPos.x + s * 0.5f, worldPos.y - h, 0));
                tris.Add(vi); tris.Add(vi + 2); tris.Add(vi + 1);
                tris.Add(vi); tris.Add(vi + 3); tris.Add(vi + 2);
                var rightColor = ShadeColor(v.color, -0.35f);
                for (int i = 0; i < 4; i++) { colors.Add(rightColor); uvs.Add(Vector2.zero); }
            }

            var mesh = new Mesh();
            mesh.SetVertices(verts);
            mesh.SetTriangles(tris, 0);
            mesh.SetColors(colors);
            mesh.SetUVs(0, uvs);
            mesh.RecalculateBounds();
            return mesh;
        }

        static Color32 ShadeColor(Color32 c, float percent)
        {
            int amt = Mathf.RoundToInt(255f * percent);
            return new Color32(
                (byte)Mathf.Clamp(c.r + amt, 0, 255),
                (byte)Mathf.Clamp(c.g + amt, 0, 255),
                (byte)Mathf.Clamp(c.b + amt, 0, 255),
                c.a
            );
        }
    }
}
