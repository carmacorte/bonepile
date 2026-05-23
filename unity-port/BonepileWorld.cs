using System;
using System.Collections.Generic;
using UnityEngine;

namespace Bonepile.Core
{
    /// <summary>
    /// Estado serializable del mundo. Equivalente a WorldData.js.
    /// Usar JsonUtility.ToJson(this) para guardar.
    /// </summary>
    [Serializable]
    public class BonepileWorld
    {
        public int width = 14;
        public int height = 14;
        public string[] terrain; // null o assetId por celda
        public List<PlacedObject> objects = new List<PlacedObject>();
        public int nextObjectId = 1;
        public int version = 0;

        public BonepileWorld(int w = 14, int h = 14)
        {
            width = w; height = h;
            terrain = new string[w * h];
        }

        public bool InBounds(int gx, int gy) => gx >= 0 && gy >= 0 && gx < width && gy < height;
        int Idx(int gx, int gy) => gy * width + gx;

        public string GetTerrain(int gx, int gy) => InBounds(gx, gy) ? terrain[Idx(gx, gy)] : null;

        public void SetTerrain(int gx, int gy, string assetId)
        {
            if (!InBounds(gx, gy)) return;
            terrain[Idx(gx, gy)] = assetId;
            version++;
        }

        public PlacedObject ObjectAt(int gx, int gy)
        {
            foreach (var o in objects)
                if (gx >= o.gx && gx < o.gx + o.footprintW && gy >= o.gy && gy < o.gy + o.footprintD)
                    return o;
            return null;
        }

        public bool CanPlaceObject(AssetDefinition def, int gx, int gy)
        {
            for (int ix = 0; ix < def.footprintW; ix++)
                for (int iy = 0; iy < def.footprintD; iy++)
                    if (!InBounds(gx + ix, gy + iy) || ObjectAt(gx + ix, gy + iy) != null)
                        return false;
            return true;
        }

        public PlacedObject AddObject(string assetId, int gx, int gy, AssetDefinition def, bool flipH = false, bool flipV = false)
        {
            if (!CanPlaceObject(def, gx, gy)) return null;
            var obj = new PlacedObject
            {
                id = nextObjectId++,
                assetId = assetId,
                gx = gx, gy = gy,
                footprintW = def.footprintW,
                footprintD = def.footprintD,
                flipH = flipH,
                flipV = flipV
            };
            objects.Add(obj);
            version++;
            return obj;
        }

        public bool RemoveObject(int gx, int gy)
        {
            for (int i = 0; i < objects.Count; i++)
            {
                var o = objects[i];
                if (gx >= o.gx && gx < o.gx + o.footprintW && gy >= o.gy && gy < o.gy + o.footprintD)
                {
                    objects.RemoveAt(i);
                    version++;
                    return true;
                }
            }
            return false;
        }

        public void ClearAll()
        {
            Array.Fill(terrain, null);
            objects.Clear();
            nextObjectId = 1;
            version++;
        }
    }

    [Serializable]
    public class PlacedObject
    {
        public int id;
        public string assetId;
        public int gx, gy;
        public int footprintW, footprintD;
        public bool flipH, flipV;

        public int SortKey() => (gx + footprintW - 1) + (gy + footprintD - 1);
    }
}
