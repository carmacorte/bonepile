/**
 * SampleWorldFactory.js
 * Builds deterministic starter layouts for playtesting placement, depth sorting,
 * terrain mixing, and save/load without hand-placing every object.
 */

import { WorldData } from '../core/WorldData.js';
import { PlacementSystem } from '../systems/PlacementSystem.js';
import { ASSET_INDEX } from '../core/AssetRegistry.js';

export function createNecropolisSample(width = 14, height = 14) {
  const world = new WorldData(width, height);
  const placement = new PlacementSystem(world, ASSET_INDEX);

  for (let gy = 0; gy < height; gy++) {
    for (let gx = 0; gx < width; gx++) {
      const edge = gx === 0 || gy === 0 || gx === width - 1 || gy === height - 1;
      const diagonal = Math.abs(gx - gy) <= 1;
      const lavaBand = gy >= 9 && gx >= 1 && gx <= 11 && (gx + gy) % 3 === 0;
      const assetId = edge ? 'obsidian' : lavaBand ? 'lava' : diagonal ? 'boneFloor' : 'ash';
      placement.place(assetId, gx, gy);
    }
  }

  const objects = [
    ['crypt', 5, 2],
    ['mausoleum', 2, 4],
    ['altarDark', 8, 5],
    ['necropolisGate', 5, 10],
    ['boneTower', 10, 2],
    ['bloodWell', 11, 8],
    ['lavaBridge', 3, 9],
    ['skullPile', 1, 2],
    ['skullPile', 12, 11],
    ['tombstone', 4, 6],
    ['tombstone', 7, 8],
    ['boneFence', 1, 7],
    ['boneFence', 2, 7],
    ['torch', 4, 3],
    ['torch', 9, 4],
    ['deadTree', 1, 11],
    ['boneTree', 12, 3],
    ['ribcage', 10, 10]
  ];

  for (const [assetId, gx, gy] of objects) {
    placement.place(assetId, gx, gy);
  }

  return world;
}
