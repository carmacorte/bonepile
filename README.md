# Bonepile Voxel Builder — Modular Engine

Arquitectura desacoplada para construir y probar un builder isométrico/voxel de Bonepile, con demo web funcional y scaffold de port a Unity.

## Estructura

```txt
bonepile-engine/
├── index.html
├── package.json
├── RUNBOOK.md
├── src/
│   ├── core/
│   │   ├── WorldData.js
│   │   ├── AssetRegistry.js
│   │   ├── VoxelBuilder.js
│   │   └── IsoMath.js
│   ├── gameplay/
│   │   └── SampleWorldFactory.js
│   ├── systems/
│   │   ├── PlacementSystem.js
│   │   ├── CameraSystem.js
│   │   └── InputSystem.js
│   ├── render/
│   │   └── CanvasRenderer.js
│   ├── ui/
│   │   └── UIManager.js
│   └── save/
│       └── SaveManager.js
├── tools/
│   └── check.mjs
└── unity-port/
    ├── BonepileWorld.cs
    ├── AssetDefinition.cs
    ├── IsoGrid.cs
    ├── VoxelMeshBuilder.cs
    ├── PlacementController.cs
    └── WorldSerializer.cs
```

## Ejecutar

```bash
python3 -m http.server 8080
```

Abrir:

```txt
http://localhost:8080
```

O usando npm:

```bash
npm run serve
```

## Validar

```bash
npm run check
```

## Controles

| Input | Acción |
|---|---|
| Click izquierdo | Colocar asset seleccionado |
| Click derecho | Borrar |
| Shift + drag | Pan cámara |
| Scroll | Zoom |
| E | Toggle erase |
| G | Toggle grid |
| H/V | Flip horizontal/vertical |
| 1-5 | Cambiar categoría |

## Funciones actuales

- Grid isométrico 14×14.
- 27 assets voxel definidos en `AssetRegistry`.
- Terrenos, props, hazards y buildings.
- Validación de footprint y overlap.
- Save/load en `localStorage`.
- Export/import JSON.
- Sample map con **Seed Necropolis**.
- Cache de render separado por terrain/object version.

## Portar a Unity

1. Copia `unity-port/` dentro de `Assets/Scripts/Bonepile/`.
2. Crea ScriptableObjects `AssetDefinition` para cada asset.
3. Usa `VoxelMeshBuilder.BuildMesh()` para convertir voxels a Mesh.
4. Usa `BonepileWorld` como estado serializable.
5. Usa `WorldSerializer` para save/load JSON compatible con el demo web.
6. Implementa un scene bootstrap que instancie el sample map o cargue un JSON exportado desde el navegador.

## Siguiente bloque técnico

El siguiente paso recomendado es endurecer el port Unity:

- scene bootstrap
- mesh preview runtime
- material palette
- face culling real
- shader voxel oscuro
