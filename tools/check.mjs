import { WorldData } from '../src/core/WorldData.js';
import { ASSET_INDEX, CATEGORIES } from '../src/core/AssetRegistry.js';
import { PlacementSystem } from '../src/systems/PlacementSystem.js';
import { computeGridBounds, worldToCell, cellToWorld } from '../src/core/IsoMath.js';
import { createNecropolisSample } from '../src/gameplay/SampleWorldFactory.js';

const world = new WorldData(14,14);
const placement = new PlacementSystem(world, ASSET_INDEX);
let failures = [];
if (!Array.isArray(CATEGORIES) || CATEGORIES.length < 5) failures.push('CATEGORIES missing');
if (Object.keys(ASSET_INDEX).length < 20) failures.push('Asset count too low');
const r1 = placement.place('ash',0,0);
if (!r1 || world.getTerrain(0,0) !== 'ash') failures.push('Terrain placement failed');
const r2 = placement.place('mausoleum',2,2);
if (!r2 || r2.kind !== 'object') failures.push('Object placement failed');
if (placement.canPlace('mausoleum',2,2)) failures.push('Overlap validation failed');
const json = world.toJSON();
const loaded = WorldData.fromJSON(json);
if (loaded.objects.length !== 1 || loaded.getTerrain(0,0) !== 'ash') failures.push('Save/load failed');
const p = cellToWorld(3,5); const c = worldToCell(p.x + 1, p.y + 1);
if (!Number.isFinite(c.gx) || !Number.isFinite(c.gy)) failures.push('Iso conversion failed');
const b = computeGridBounds(14,14);
if (!Number.isFinite(b.centerX) || !Number.isFinite(b.centerY)) failures.push('Grid bounds failed');
const sample = createNecropolisSample();
if (sample.objects.length < 10) failures.push('Sample world object count too low');
if (!sample.getTerrain(0,0)) failures.push('Sample world terrain missing');
if (world.terrainVersion === 0 || world.objectsVersion === 0) failures.push('World split versions not incrementing');

if (failures.length) {
  console.error('CHECK FAILED');
  for (const f of failures) console.error('- ' + f);
  process.exit(1);
}
console.log('CHECK PASSED');
console.log(`Assets: ${Object.keys(ASSET_INDEX).length}`);
console.log(`Categories: ${CATEGORIES.join(', ')}`);
console.log(`Serialized bytes: ${json.length}`);
console.log(`Sample objects: ${sample.objects.length}`);
