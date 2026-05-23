# RUNBOOK — Bonepile v0.4 Alpha

## 1. Requirements

Install Node.js LTS. Then use a terminal inside this project folder.

## 2. First run

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## 3. Fast validation checklist

1. Press **Enter the Vault**.
2. Move R3-W0RK with **WASD**.
3. Rotate camera with **mouse drag** or **Q/E**.
4. Approach yellow scrap nodes; they should disappear and increase Scrap.
5. Approach a damaged NPC; press **E** when the prompt appears.
6. Enter an AOI cone; Detection should rise.
7. Hide behind large SMT components; Detection should stop or decay.
8. Press **Space** to deploy Flux Smoke; Detection should not rise while active.

## 4. Build validation

```bash
npm run check
npm run build
npm run preview
```

## 5. GitHub upload

```bash
git init
git add .
git commit -m "Bonepile v0.4 alpha Three.js playable prototype"
git branch -M main
git remote add origin https://github.com/<YOUR_USER>/bonepile.git
git push -u origin main
```

## 6. GitHub Pages

This project includes `.github/workflows/deploy.yml`.

Recommended setup:

1. Push to GitHub.
2. Go to repository **Settings > Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. Push to `main`; the workflow builds and publishes `dist/`.

## 7. Troubleshooting

### npm command not found
Install Node.js LTS and reopen the terminal.

### Black screen after start
Open browser DevTools and check Console. Most likely causes are dependency install failure or WebGL disabled.

### Camera feels too close/far
Use mouse wheel. Defaults are configured in `src/core/Game.js`.

### Need to tune AOI detection
Adjust values in `src/core/Constants.js`:

```js
droneDetectionDistance
droneDetectionAngle
droneDetectionGain
droneDetectionLoss
```
