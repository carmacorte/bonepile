import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'index.html',
  'package.json',
  'vite.config.js',
  'src/main.js',
  'src/core/Game.js',
  'src/player/R3Work.js',
  'src/ai/AOIDrone.js',
  'src/world/PCBWorld.js',
  'src/gameplay/InteractionSystem.js',
  'src/ui/HUD.js'
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length > 0) {
  console.error('Missing required files:');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const script of ['dev', 'build', 'preview']) {
  if (!packageJson.scripts?.[script]) {
    console.error(`Missing npm script: ${script}`);
    process.exit(1);
  }
}

const source = fs.readFileSync(path.join(root, 'src/core/Game.js'), 'utf8');
const expectedSignals = ['AOIDrone', 'R3Work', 'InteractionSystem', 'PCBWorld'];
for (const signal of expectedSignals) {
  if (!source.includes(signal)) {
    console.error(`Game.js does not reference ${signal}`);
    process.exit(1);
  }
}

console.log('Bonepile v0.4 alpha smoke check passed.');
