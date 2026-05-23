# Bonepile v0.4 Alpha — Three.js First Playable Prototype

This build moves Bonepile from the previous isometric/voxel construction prototype into a fast playable Three.js prototype focused on the SMT survival-adventure direction.

## Current gameplay slice

- Third-person playable R3-W0RK placeholder.
- Zelda/Conker-style follow camera.
- Giant PCB / MRB Vault environment.
- AOI drone patrols.
- AOI vision cones and detection meter.
- Cover-based line-of-sight blocking.
- Flux Smoke stealth ability.
- Scrap pickup resource loop.
- Damaged electronic NPC repair interaction.
- GitHub Pages-ready Vite setup.

## Controls

| Action | Input |
|---|---|
| Move | WASD / Arrow keys |
| Rotate camera | Mouse drag or Q/E |
| Zoom camera | Mouse wheel |
| Dash | Shift |
| Flux Smoke | Space |
| Repair / interact | E |

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually:

```txt
http://localhost:5173
```

## Build for GitHub Pages

```bash
npm run build
```

The production files are generated in:

```txt
dist/
```

## Smoke check

This command checks that the project structure and core modules exist:

```bash
npm run check
```

## Technical direction

This is intentionally built with procedural placeholder geometry. The objective is speed: validate movement, camera, stealth, scale, AOI behavior, and visual mood before investing time in Blender/Unity asset pipelines.

The future GLB/FBX pipeline can replace the procedural placeholders without changing the high-level architecture.

## Recommended next milestones

1. Replace R3-W0RK placeholder with GLB model.
2. Add real locomotion/repair/hide animations.
3. Add AOI alarm chase and capture consequence.
4. Add repair minigame.
5. Expand MRB Vault into connected rooms.
6. Add audio: hum, scanner sweep, solder dash, repair cue.
