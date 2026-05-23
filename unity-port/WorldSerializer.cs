using System.IO;
using UnityEngine;

namespace Bonepile.Core
{
    /// <summary>
    /// Guarda/carga mundos en Application.persistentDataPath.
    /// Compatible con el formato JSON de WorldData.js.
    /// </summary>
    public static class WorldSerializer
    {
        static string GetPath(string slotName) =>
            Path.Combine(Application.persistentDataPath, $"bonepile_{slotName}.json");

        public static void Save(BonepileWorld world, string slotName = "save1")
        {
            string json = JsonUtility.ToJson(world, true);
            File.WriteAllText(GetPath(slotName), json);
            Debug.Log($"World saved to {GetPath(slotName)}");
        }

        public static BonepileWorld Load(string slotName = "save1")
        {
            string path = GetPath(slotName);
            if (!File.Exists(path)) return null;
            string json = File.ReadAllText(path);
            return JsonUtility.FromJson<BonepileWorld>(json);
        }

        public static void ExportToFile(BonepileWorld world, string filename)
        {
            string path = Path.Combine(Application.persistentDataPath, filename);
            File.WriteAllText(path, JsonUtility.ToJson(world, true));
        }
    }
}
