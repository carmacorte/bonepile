using System;
using UnityEngine;

namespace Bonepile.Core
{
    /// <summary>
    /// Definición de asset como ScriptableObject.
    /// En el editor de Unity, creas uno por cada asset (Mausoleum, Ash Wastes, etc.)
    /// </summary>
    [CreateAssetMenu(fileName = "NewAsset", menuName = "Bonepile/Asset Definition")]
    public class AssetDefinition : ScriptableObject
    {
        public string assetId;
        public string displayName;
        public AssetCategory category;
        public AssetKind kind = AssetKind.Object;
        public int footprintW = 1;
        public int footprintD = 1;
        public float sizeScale = 1f;
        public bool tileLike;
        public bool flatBase;
        public bool noShadow;
        public ShadowStyle shadowStyle = ShadowStyle.Cast;

        [Header("Voxel Data")]
        public VoxelData[] voxels; // Precalculado desde JS o generado en editor

        public int FootprintW => footprintW;
        public int FootprintD => footprintD;
    }

    public enum AssetCategory { Terrain, Nature, Props, Hazards, Buildings }
    public enum AssetKind { Terrain, Object }
    public enum ShadowStyle { Cast, Contact }

    [Serializable]
    public struct VoxelData
    {
        public byte x, y, z;
        public Color32 color;
        public byte flags; // bit 0: lava, bit 1: blood
    }
}
