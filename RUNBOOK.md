# Bonepile Runbook

## Current playable target
This package is a browser-based vertical-slice reference for the Bonepile voxel/isometric engine. It is not yet the Unity project; the Unity C# folder is a porting scaffold.

## Run locally

From the project root:

```bash
python3 -m http.server 8080
```

Open:

```txt
http://localhost:8080
```

Alternative with npm:

```bash
npm run serve
```

## Validate logic

```bash
npm run check
```

Expected output:

```txt
CHECK PASSED
Assets: 27
Categories: terrain, nature, props, hazards, buildings
Sample objects: 18
```

## Browser controls

| Input | Action |
|---|---|
| Left click | Place selected asset |
| Right click | Erase terrain/object |
| Shift + drag | Pan camera |
| Mouse wheel | Zoom |
| E | Toggle erase mode |
| G | Toggle grid |
| H | Toggle horizontal flip preview |
| V | Toggle vertical flip preview |
| 1-5 | Switch asset category |

## Test checklist

1. Click **Enter the Void**.
2. Click **Seed Necropolis**. A complete sample map should appear.
3. Toggle **Grid**.
4. Select a building and place it on an empty area.
5. Try placing over another object; preview should mark invalid.
6. Right-click an object to erase it.
7. Click **Save**, reload the browser, then click **Load**.
8. Click **Export JSON**, then **Import JSON** with the exported file.

## What changed in this iteration

- Added `terrainVersion` and `objectsVersion` in `WorldData` so renderer caches invalidate correctly.
- Fixed the start overlay by adding the missing `.hidden` CSS behavior.
- Fixed `Game._toggleTool()` by assigning `this.canvas`.
- Added status HUD: tool, selected asset, object count, flip state.
- Added deterministic sample generator: `src/gameplay/SampleWorldFactory.js`.
- Added **Seed Necropolis**, **Export JSON**, and **Import JSON** controls.
- Added `package.json` and `tools/check.mjs` for repeatable validation.

## Next development block

Recommended next block: move from 2D canvas reference into Unity mesh validation.

Deliverables:

- `VoxelMeshBuilder.cs` hardening
- `AssetDefinition` ScriptableObject workflow
- Unity scene bootstrap script
- runtime mesh preview for the same sample necropolis
