using UnityEngine;
using UnityEngine.EventSystems;

namespace Bonepile.Core
{
    /// <summary>
    /// Controller de colocación. Recibe input y modifica BonepileWorld.
    /// </summary>
    public class PlacementController : MonoBehaviour
    {
        public BonepileWorld world;
        public AssetDefinition[] assetRegistry; // Asignar en inspector
        public Camera isoCamera;
        public float panSpeed = 1f;
        public float zoomSpeed = 0.1f;

        [Header("Current Tool")]
        public string selectedAssetId = "ash";
        public bool eraseMode = false;
        public bool flipH = false;
        public bool flipV = false;

        Vector3 lastMousePos;
        bool isPanning = false;

        void Update()
        {
            HandlePan();
            HandleZoom();
            HandlePlace();
            HandleKeyboard();
        }

        void HandlePan()
        {
            if (Input.GetMouseButtonDown(2) || (Input.GetMouseButtonDown(0) && Input.GetKey(KeyCode.LeftShift)))
            {
                isPanning = true;
                lastMousePos = Input.mousePosition;
            }
            if (Input.GetMouseButtonUp(2) || Input.GetMouseButtonUp(0)) isPanning = false;

            if (isPanning)
            {
                Vector3 delta = Input.mousePosition - lastMousePos;
                isoCamera.transform.position -= new Vector3(delta.x, delta.y, 0) * panSpeed * Time.deltaTime;
                lastMousePos = Input.mousePosition;
            }
        }

        void HandleZoom()
        {
            float scroll = Input.GetAxis("Mouse ScrollWheel");
            if (scroll != 0)
            {
                isoCamera.orthographicSize = Mathf.Clamp(
                    isoCamera.orthographicSize - scroll * zoomSpeed * 100,
                    2f, 50f
                );
            }
        }

        void HandlePlace()
        {
            if (EventSystem.current.IsPointerOverGameObject()) return;
            if (!Input.GetMouseButtonDown(0) && !Input.GetMouseButtonDown(1)) return;

            Vector3 worldPos = isoCamera.ScreenToWorldPoint(Input.mousePosition);
            Vector2Int cell = IsoGrid.WorldToCell(worldPos.x, worldPos.y);

            if (Input.GetMouseButtonDown(1) || eraseMode)
            {
                world.RemoveObject(cell.x, cell.y);
                if (world.GetTerrain(cell.x, cell.y) != null)
                    world.SetTerrain(cell.x, cell.y, null);
            }
            else
            {
                var def = FindAsset(selectedAssetId);
                if (def == null) return;

                if (def.kind == AssetKind.Terrain)
                    world.SetTerrain(cell.x, cell.y, selectedAssetId);
                else
                    world.AddObject(selectedAssetId, cell.x, cell.y, def, flipH, flipV);
            }
        }

        void HandleKeyboard()
        {
            if (Input.GetKeyDown(KeyCode.E)) eraseMode = !eraseMode;
            if (Input.GetKeyDown(KeyCode.H)) flipH = !flipH;
            if (Input.GetKeyDown(KeyCode.V)) flipV = !flipV;
        }

        AssetDefinition FindAsset(string id)
        {
            foreach (var a in assetRegistry) if (a.assetId == id) return a;
            return null;
        }
    }
}
