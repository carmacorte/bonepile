/**
 * AssetRegistry.js
 * 
 * Fuente de verdad para todos los assets. Solo datos, cero render.
 * En Unity esto se convierte en ScriptableObjects.
 */

import { VoxelBuilder } from './VoxelBuilder.js';

export const PALETTE = Object.freeze({
  // Ash / ground
  ash: '#2a2a2a', ashLight: '#3a3a3a', ashDark: '#1a1a1a',
  // Bone
  bone: '#e3dac9', boneShadow: '#c4b9a3', boneDark: '#9e917a',
  // Lava
  lava: '#d44a3a', lavaLight: '#ff6b35', lavaDark: '#9a2e22', lavaGlow: '#ff9500',
  // Obsidian
  obsidian: '#1f1f2e', obsidianLight: '#2e2e42', obsidianHighlight: '#3a3a55',
  // Moss / rot
  moss: '#4a5d23', mossLight: '#5e7330', mossDark: '#354a18',
  // Stone
  stone: '#6b7280', stoneDark: '#4b505a', stoneLight: '#8b929e',
  // Blood
  blood: '#8a1c1c', bloodDark: '#5a0f0f',
  // Magic
  purple: '#4a306d', purpleLight: '#6b4f9e', purpleDark: '#301a4a',
  // Metal
  iron: '#4a4a4a', ironRust: '#6b4226', ironLight: '#6b6b6b',
  // Fire
  flame: '#ff9500', flameDark: '#cc5500', flameCore: '#ffeb3b',
  // Wood
  wood: '#5c4033', woodDark: '#3e2b22', woodLight: '#7a5c4a'
});

const P = PALETTE;
const VPT = 4; // voxels per tile edge

// ── Asset Definition Factory ─────────────────────────────
export class AssetDefinition {
  constructor(props) {
    this.id = props.id;
    this.name = props.name;
    this.category = props.category; // 'terrain' | 'nature' | 'props' | 'hazards' | 'buildings'
    this.footprint = props.footprint || { w: 1, d: 1 };
    this.kind = props.kind || 'object'; // 'terrain' | 'object'
    this.sizeScale = props.sizeScale || 1;
    this.tileLike = props.tileLike || false;
    this.flatBase = props.flatBase || false;
    this.noShadow = props.noShadow || false;
    this.shadowStyle = props.shadowStyle || 'cast'; // 'cast' | 'contact'
    this.builder = props.builder; // function() -> Voxel[]
  }

  generateVoxels() {
    return this.builder ? this.builder() : [];
  }
}

// ── Terrain Builders ───────────────────────────────────────
function flatTile(color, accentFn) {
  const v = [];
  for (let ix = 0; ix < VPT; ix++)
    for (let iy = 0; iy < VPT; iy++) {
      const c = accentFn ? (accentFn(ix, iy) || color) : color;
      v.push({ x: ix, y: iy, z: 0, c });
    }
  return v;
}

const TERRAIN_BUILDERS = {
  ash: () => flatTile(P.ash, (ix, iy) => {
    const n = (ix * 7 + iy * 13) % 5;
    return n === 0 ? P.ashDark : (n === 1 ? P.ashLight : null);
  }),
  boneFloor: () => flatTile(P.bone, (ix, iy) => {
    const n = (ix + iy) % 3;
    return n === 0 ? P.boneShadow : (n === 1 ? null : P.ash);
  }),
  lava: () => flatTile(P.lava, (ix, iy) => {
    const n = (ix * 13 + iy * 7) % 6;
    return n === 0 ? P.lavaGlow : (n < 3 ? null : P.lavaDark);
  }).map(v => ({ ...v, lava: true })),
  obsidian: () => flatTile(P.obsidian, (ix, iy) => {
    const n = (ix * 3 + iy * 5) % 4;
    return n === 0 ? P.obsidianHighlight : (n === 1 ? P.obsidianLight : null);
  }),
  mossStone: () => flatTile(P.stone, (ix, iy) => {
    const n = (ix + iy) % 4;
    return n === 0 ? P.moss : (n === 1 ? P.stoneDark : null);
  }),
  bloodPool: () => flatTile(P.blood, (ix, iy) => {
    return (ix * 11 + iy * 3) % 5 === 0 ? P.bloodDark : null;
  }).map(v => ({ ...v, blood: true }))
};

// ── Object Builders ──────────────────────────────────────
const OBJECT_BUILDERS = {
  // Nature
  deadTree: () => {
    const trunk = P.boneDark;
    return [
      { x: 1, y: 2, z: 0, c: trunk }, { x: 1, y: 2, z: 1, c: trunk }, { x: 1, y: 2, z: 2, c: P.ashLight },
      { x: 0, y: 2, z: 3, c: trunk }, { x: 2, y: 2, z: 3, c: trunk },
      { x: 1, y: 1, z: 4, c: trunk }, { x: 1, y: 3, z: 4, c: trunk },
      { x: 0, y: 2, z: 4, c: P.mossDark }, { x: 2, y: 2, z: 4, c: P.moss }
    ];
  },
  boneTree: () => {
    const out = [
      { x: 1, y: 2, z: 0, c: P.boneDark }, { x: 1, y: 2, z: 1, c: P.bone }, { x: 1, y: 2, z: 2, c: P.bone }
    ];
    for (let i = 0; i < 3; i++) {
      out.push({ x: 0, y: 2, z: 3 + i, c: P.boneShadow });
      out.push({ x: 2, y: 2, z: 3 + i, c: P.boneShadow });
    }
    out.push({ x: 1, y: 2, z: 6, c: P.bone });
    return out;
  },
  mushroomRed: () => VoxelBuilder.compose(
    VoxelBuilder.box(1, 1, 0, 1, 1, 2, P.boneShadow),
    VoxelBuilder.box(0, 0, 2, 3, 3, 1, P.blood),
    VoxelBuilder.box(1, 1, 3, 1, 1, 1, P.bloodDark)
  ),
  thorns: () => {
    const out = [];
    for (let i = 0; i < 5; i++) {
      const x = 1 + (i % 2), y = 1 + Math.floor(i / 2);
      out.push({ x, y, z: 0, c: P.mossDark }, { x, y, z: 1, c: P.moss });
    }
    return out;
  },
  hangingSkull: () => [
    ...VoxelBuilder.box(1, 1, 4, 1, 1, 2, P.ironRust),
    ...VoxelBuilder.box(1, 1, 3, 1, 1, 1, P.bone),
    ...VoxelBuilder.box(0, 1, 2, 1, 1, 1, P.boneShadow),
    { x: 2, y: 1, z: 2, c: P.boneShadow },
    { x: 1, y: 1, z: 1, c: P.bone }
  ],

  // Props
  skullPile: () => [
    ...VoxelBuilder.box(1, 1, 0, 2, 2, 1, P.boneShadow),
    ...VoxelBuilder.box(1, 1, 1, 1, 1, 1, P.bone),
    ...VoxelBuilder.box(2, 2, 1, 1, 1, 1, P.boneDark),
    { x: 1, y: 2, z: 1, c: P.bone }
  ],
  boneFence: () => {
    const out = [];
    for (let ix = 0; ix < VPT; ix++) {
      if (ix === 0 || ix === VPT - 1 || ix === Math.floor(VPT / 2)) {
        out.push({ x: ix, y: VPT - 1, z: 0, c: P.boneDark });
        out.push({ x: ix, y: VPT - 1, z: 1, c: P.bone });
      }
      out.push({ x: ix, y: VPT - 1, z: 1, c: P.boneShadow });
    }
    return out;
  },
  tombstone: () => [
    ...VoxelBuilder.box(1, 1, 0, 2, 2, 1, P.stoneDark),
    ...VoxelBuilder.box(1, 1, 1, 2, 2, 2, P.stone),
    ...VoxelBuilder.box(1, 1, 3, 2, 2, 1, P.stoneLight),
    { x: 1, y: 1, z: 2, c: P.bloodDark }
  ],
  coffin: () => [
    ...VoxelBuilder.box(0, 1, 0, VPT, 2, 1, P.wood),
    ...VoxelBuilder.box(0, 1, 1, VPT, 2, 1, P.wood),
    { x: 1, y: 1, z: 1, c: P.ironRust },
    { x: VPT - 2, y: 1, z: 1, c: P.ironRust }
  ],
  chains: () => {
    const out = [];
    for (let iz = 0; iz < 4; iz++) out.push({ x: 1, y: 2, z: iz, c: iz % 2 === 0 ? P.iron : P.ironLight });
    return out;
  },
  torch: () => [
    ...VoxelBuilder.box(1, 1, 0, 1, 1, 3, P.ironRust),
    ...VoxelBuilder.box(1, 1, 3, 1, 1, 1, P.flameDark),
    ...VoxelBuilder.box(1, 1, 4, 1, 1, 1, P.flame),
    { x: 1, y: 1, z: 5, c: P.flameCore }
  ],
  spikeTrap: () => {
    const out = [...VoxelBuilder.box(0, 0, 0, VPT, VPT, 1, P.iron)];
    for (let ix = 0; ix < VPT; ix++)
      for (let iy = 0; iy < VPT; iy++)
        if ((ix + iy) % 2 === 0) out.push({ x: ix, y: iy, z: 1, c: P.ironLight });
    return out;
  },
  ribcage: () => {
    const out = [
      { x: 0, y: 2, z: 0, c: P.boneDark }, { x: 3, y: 2, z: 0, c: P.boneDark }
    ];
    for (let iz = 1; iz < 4; iz++) {
      out.push({ x: 0, y: 2, z: iz, c: P.bone }, { x: 3, y: 2, z: iz, c: P.bone });
      out.push({ x: 1, y: 2, z: iz, c: P.boneShadow }, { x: 2, y: 2, z: iz, c: P.boneShadow });
    }
    return out;
  },

  // Hazards
  lavaBridge: () => {
    const out = [];
    for (let ix = 0; ix < VPT * 2; ix++) {
      const arch = Math.floor(Math.sin((ix / (VPT * 2 - 1)) * Math.PI) * 2);
      for (let iy = 0; iy < VPT; iy++) out.push({ x: ix, y: iy, z: arch, c: P.obsidian });
      if (arch > 0) {
        out.push({ x: ix, y: 0, z: arch + 1, c: P.lava });
        out.push({ x: ix, y: VPT - 1, z: arch + 1, c: P.lava });
      }
    }
    return out;
  },
  bloodWell: () => VoxelBuilder.compose(
    VoxelBuilder.box(0, 0, 0, VPT, VPT, 1, P.stoneDark),
    VoxelBuilder.shell(1, 1, 1, 2, 2, 2, P.stone),
    [{ x: 1, y: 1, z: 1, c: P.blood }, { x: 2, y: 1, z: 1, c: P.blood }],
    VoxelBuilder.box(0, 0, 3, 1, 1, 3, P.ironRust),
    VoxelBuilder.box(VPT - 1, VPT - 1, 3, 1, 1, 3, P.ironRust),
    VoxelBuilder.box(0, 0, 6, VPT, VPT, 1, P.ironRust),
    VoxelBuilder.pyramidRoof(0, 0, 7, VPT, VPT, 2, P.iron)
  ),

  // Buildings
  mausoleum: () => {
    const W = VPT * 2, D = VPT * 2;
    return VoxelBuilder.compose(
      VoxelBuilder.box(0, 0, 0, W, D, 1, P.stoneDark),
      VoxelBuilder.shell(0, 0, 0, W, D, 5, P.stone),
      VoxelBuilder.box(0, 0, 5, W, D, 1, P.stoneLight),
      VoxelBuilder.dome(Math.floor(W / 2), Math.floor(D / 2), 6, 3, P.purple),
      [{ x: 3, y: D - 1, z: 0, c: P.purpleDark }, { x: 4, y: D - 1, z: 0, c: P.purpleDark },
       { x: 3, y: D - 1, z: 1, c: P.purpleLight }, { x: 4, y: D - 1, z: 1, c: P.purpleLight }]
    );
  },
  boneTower: () => {
    const cx = Math.floor(VPT), cy = Math.floor(VPT);
    return VoxelBuilder.compose(
      VoxelBuilder.cylinder(cx, cy, 0, 3, 8, P.boneShadow),
      VoxelBuilder.cylinder(cx, cy, 8, 2, 1, P.bone),
      VoxelBuilder.dome(cx, cy, 9, 2, P.boneDark),
      [{ x: cx, y: cy, z: 5, c: P.flame }, { x: cx + 2, y: cy, z: 5, c: P.flameDark }, { x: cx - 2, y: cy, z: 5, c: P.flameDark }]
    );
  },
  crypt: () => {
    const W = VPT * 3, D = VPT * 3;
    return VoxelBuilder.compose(
      VoxelBuilder.box(0, 0, 0, W, D, 1, P.ashDark),
      VoxelBuilder.shell(0, 0, 0, W, D, 4, P.stoneDark),
      VoxelBuilder.box(0, 0, 4, W, D, 1, P.stone),
      VoxelBuilder.shell(1, 1, 5, W - 2, D - 2, 3, P.stoneLight),
      VoxelBuilder.box(1, 1, 8, W - 2, D - 2, 1, P.purpleDark),
      VoxelBuilder.dome(Math.floor(W / 2), Math.floor(D / 2), 9, 4, P.purple),
      [{ x: Math.floor(W / 2), y: D - 1, z: 0, c: P.blood }, { x: Math.floor(W / 2) - 1, y: D - 1, z: 0, c: P.blood }]
    );
  },
  altarDark: () => {
    const W = VPT * 2, D = VPT * 2;
    return VoxelBuilder.compose(
      VoxelBuilder.box(0, 0, 0, W, D, 2, P.obsidian),
      VoxelBuilder.box(1, 1, 2, W - 2, D - 2, 1, P.obsidianLight),
      VoxelBuilder.box(2, 2, 3, W - 4, D - 4, 2, P.purpleDark),
      [{ x: Math.floor(W / 2), y: Math.floor(D / 2), z: 5, c: P.flameCore },
       { x: Math.floor(W / 2), y: Math.floor(D / 2), z: 6, c: P.flame },
       { x: Math.floor(W / 2) - 1, y: Math.floor(D / 2), z: 5, c: P.blood },
       { x: Math.floor(W / 2) + 1, y: Math.floor(D / 2), z: 5, c: P.blood }]
    );
  },
  skullFort: () => {
    const W = VPT * 3, D = VPT * 2;
    return VoxelBuilder.compose(
      VoxelBuilder.box(0, 0, 0, W, D, 1, P.stoneDark),
      VoxelBuilder.shell(0, 0, 0, W, D, 6, P.stone),
      VoxelBuilder.box(0, 0, 6, W, D, 1, P.stoneLight),
      VoxelBuilder.box(0, 0, 7, 1, 1, 3, P.bone),
      VoxelBuilder.box(W - 1, 0, 7, 1, 1, 3, P.bone),
      VoxelBuilder.box(0, D - 1, 7, 1, 1, 3, P.bone),
      VoxelBuilder.box(W - 1, D - 1, 7, 1, 1, 3, P.bone),
      [{ x: Math.floor(W / 2), y: D - 1, z: 0, c: P.bloodDark }, { x: Math.floor(W / 2) - 1, y: D - 1, z: 0, c: P.bloodDark }]
    );
  },
  necropolisGate: () => {
    const W = VPT * 2;
    return VoxelBuilder.compose(
      VoxelBuilder.box(0, 1, 0, 1, 2, 5, P.stoneDark),
      VoxelBuilder.box(W - 1, 1, 0, 1, 2, 5, P.stoneDark),
      VoxelBuilder.box(0, 1, 5, W, 2, 1, P.stone),
      VoxelBuilder.box(0, 1, 6, W, 2, 1, P.purpleDark),
      [{ x: 0, y: 1, z: 5, c: P.purpleLight }, { x: W - 1, y: 1, z: 5, c: P.purpleLight }, { x: Math.floor(W / 2), y: 1, z: 4, c: P.flameCore }]
    );
  }
};

// ── Manifest ───────────────────────────────────────────────
export const ASSET_MANIFEST = [
  // Terrain
  new AssetDefinition({ id: 'ash', name: 'Ash Wastes', category: 'terrain', kind: 'terrain', tileLike: true, builder: TERRAIN_BUILDERS.ash }),
  new AssetDefinition({ id: 'boneFloor', name: 'Bone Floor', category: 'terrain', kind: 'terrain', tileLike: true, builder: TERRAIN_BUILDERS.boneFloor }),
  new AssetDefinition({ id: 'lava', name: 'Lava Flow', category: 'terrain', kind: 'terrain', tileLike: true, builder: TERRAIN_BUILDERS.lava }),
  new AssetDefinition({ id: 'obsidian', name: 'Obsidian', category: 'terrain', kind: 'terrain', tileLike: true, builder: TERRAIN_BUILDERS.obsidian }),
  new AssetDefinition({ id: 'mossStone', name: 'Moss Stone', category: 'terrain', kind: 'terrain', tileLike: true, builder: TERRAIN_BUILDERS.mossStone }),
  new AssetDefinition({ id: 'bloodPool', name: 'Blood Pool', category: 'terrain', kind: 'terrain', tileLike: true, builder: TERRAIN_BUILDERS.bloodPool }),

  // Nature
  new AssetDefinition({ id: 'deadTree', name: 'Dead Tree', category: 'nature', footprint: { w: 1, d: 1 }, sizeScale: 0.70, builder: OBJECT_BUILDERS.deadTree }),
  new AssetDefinition({ id: 'boneTree', name: 'Bone Tree', category: 'nature', footprint: { w: 1, d: 1 }, sizeScale: 0.75, builder: OBJECT_BUILDERS.boneTree }),
  new AssetDefinition({ id: 'mushroomRed', name: 'Blood Mushroom', category: 'nature', footprint: { w: 1, d: 1 }, sizeScale: 0.50, builder: OBJECT_BUILDERS.mushroomRed }),
  new AssetDefinition({ id: 'thorns', name: 'Thorn Bush', category: 'nature', footprint: { w: 1, d: 1 }, sizeScale: 0.55, builder: OBJECT_BUILDERS.thorns }),
  new AssetDefinition({ id: 'hangingSkull', name: 'Hanging Skull', category: 'nature', footprint: { w: 1, d: 1 }, sizeScale: 0.40, builder: OBJECT_BUILDERS.hangingSkull }),

  // Props
  new AssetDefinition({ id: 'skullPile', name: 'Skull Pile', category: 'props', footprint: { w: 1, d: 1 }, sizeScale: 0.55, builder: OBJECT_BUILDERS.skullPile }),
  new AssetDefinition({ id: 'boneFence', name: 'Bone Fence', category: 'props', footprint: { w: 1, d: 1 }, sizeScale: 0.70, flatBase: true, shadowStyle: 'contact', builder: OBJECT_BUILDERS.boneFence }),
  new AssetDefinition({ id: 'tombstone', name: 'Tombstone', category: 'props', footprint: { w: 1, d: 1 }, sizeScale: 0.60, builder: OBJECT_BUILDERS.tombstone }),
  new AssetDefinition({ id: 'coffin', name: 'Coffin', category: 'props', footprint: { w: 1, d: 1 }, sizeScale: 0.60, builder: OBJECT_BUILDERS.coffin }),
  new AssetDefinition({ id: 'chains', name: 'Chains', category: 'props', footprint: { w: 1, d: 1 }, sizeScale: 0.40, builder: OBJECT_BUILDERS.chains }),
  new AssetDefinition({ id: 'torch', name: 'Wall Torch', category: 'props', footprint: { w: 1, d: 1 }, sizeScale: 0.40, builder: OBJECT_BUILDERS.torch }),
  new AssetDefinition({ id: 'spikeTrap', name: 'Spike Trap', category: 'props', footprint: { w: 1, d: 1 }, sizeScale: 0.90, builder: OBJECT_BUILDERS.spikeTrap }),
  new AssetDefinition({ id: 'ribcage', name: 'Ribcage', category: 'props', footprint: { w: 1, d: 1 }, sizeScale: 0.55, builder: OBJECT_BUILDERS.ribcage }),

  // Hazards
  new AssetDefinition({ id: 'lavaBridge', name: 'Lava Bridge', category: 'hazards', footprint: { w: 2, d: 1 }, sizeScale: 0.95, builder: OBJECT_BUILDERS.lavaBridge }),
  new AssetDefinition({ id: 'bloodWell', name: 'Blood Well', category: 'hazards', footprint: { w: 1, d: 1 }, sizeScale: 0.60, builder: OBJECT_BUILDERS.bloodWell }),

  // Buildings
  new AssetDefinition({ id: 'mausoleum', name: 'Mausoleum', category: 'buildings', footprint: { w: 2, d: 2 }, builder: OBJECT_BUILDERS.mausoleum }),
  new AssetDefinition({ id: 'boneTower', name: 'Bone Tower', category: 'buildings', footprint: { w: 2, d: 2 }, builder: OBJECT_BUILDERS.boneTower }),
  new AssetDefinition({ id: 'crypt', name: 'Grand Crypt', category: 'buildings', footprint: { w: 3, d: 3 }, builder: OBJECT_BUILDERS.crypt }),
  new AssetDefinition({ id: 'altarDark', name: 'Dark Altar', category: 'buildings', footprint: { w: 2, d: 2 }, builder: OBJECT_BUILDERS.altarDark }),
  new AssetDefinition({ id: 'skullFort', name: 'Skull Fort', category: 'buildings', footprint: { w: 3, d: 2 }, builder: OBJECT_BUILDERS.skullFort }),
  new AssetDefinition({ id: 'necropolisGate', name: 'Necropolis Gate', category: 'buildings', footprint: { w: 2, d: 1 }, builder: OBJECT_BUILDERS.necropolisGate })
];

export const ASSET_INDEX = Object.freeze(
  ASSET_MANIFEST.reduce((acc, a) => { acc[a.id] = a; return acc; }, {})
);

export const CATEGORIES = ['terrain', 'nature', 'props', 'hazards', 'buildings'];
