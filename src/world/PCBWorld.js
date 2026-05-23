import * as THREE from 'three';
import { COLORS, WORLD_LIMIT } from '../core/Constants.js';
import { createGlowMaterial, createStandardMaterial } from '../rendering/LightingRig.js';
import { makeBox3FromObject, createTextLabel } from '../core/MathUtils.js';

export class PCBWorld {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'MRB Vault PCB Environment';
    this.coverBoxes = [];
    this.scrapPickups = [];
    this.repairNPCs = [];
    this.dronePatrols = [];
    this.lights = [];
    scene.add(this.group);

    this.materials = {
      floor: createStandardMaterial(COLORS.pcbBase, { roughness: 0.94, metalness: 0.05 }),
      floorEdge: createStandardMaterial(COLORS.pcbEdge, { roughness: 0.8, metalness: 0.1 }),
      traceGreen: createStandardMaterial(COLORS.traceGreen, { roughness: 0.38, metalness: 0.25, emissive: COLORS.traceGreen, emissiveIntensity: 0.3 }),
      traceAmber: createStandardMaterial(COLORS.traceAmber, { roughness: 0.42, metalness: 0.2, emissive: COLORS.traceAmber, emissiveIntensity: 0.25 }),
      copper: createStandardMaterial(COLORS.viaCopper, { roughness: 0.46, metalness: 0.72, emissive: 0x4f1805, emissiveIntensity: 0.1 }),
      solder: createStandardMaterial(COLORS.solder, { roughness: 0.22, metalness: 0.62, emissive: COLORS.solder, emissiveIntensity: 0.25 }),
      chip: createStandardMaterial(COLORS.chipBlack, { roughness: 0.72, metalness: 0.18 }),
      chipEdge: createStandardMaterial(COLORS.chipEdge, { roughness: 0.78, metalness: 0.18 }),
      metal: createStandardMaterial(COLORS.pinMetal, { roughness: 0.4, metalness: 0.78 }),
      npc: createStandardMaterial(0x324350, { roughness: 0.55, metalness: 0.38, emissive: 0x00151d, emissiveIntensity: 0.18 }),
      scrap: createStandardMaterial(COLORS.scrap, { roughness: 0.32, metalness: 0.6, emissive: 0x5a3900, emissiveIntensity: 0.5 })
    };
  }

  build() {
    this._createBoard();
    this._createTraceNetwork();
    this._createIndustrialProps();
    this._createScrap();
    this._createRepairNPCs();
    this._createLabels();
    this._seedDronePatrols();
    return this;
  }

  update(dt, elapsed) {
    for (const pickup of this.scrapPickups) {
      if (!pickup.userData.collected) {
        pickup.rotation.y += dt * 2.2;
        pickup.position.y = 0.45 + Math.sin(elapsed * 3 + pickup.userData.phase) * 0.09;
      }
    }

    for (const npc of this.repairNPCs) {
      const glow = npc.userData.glow;
      if (glow) {
        const intensity = npc.userData.repaired ? 0.7 : 0.25 + Math.sin(elapsed * 4 + npc.userData.phase) * 0.08;
        glow.material.opacity = THREE.MathUtils.clamp(intensity, 0.15, 0.72);
      }
      npc.rotation.y = Math.sin(elapsed * 0.6 + npc.userData.phase) * 0.05;
    }
  }

  isInsideBounds(position, margin = 0) {
    return Math.abs(position.x) <= WORLD_LIMIT - margin && Math.abs(position.z) <= WORLD_LIMIT - margin;
  }

  isBlocked(position, radius = 0.6) {
    const testBox = new THREE.Box3(
      new THREE.Vector3(position.x - radius, 0, position.z - radius),
      new THREE.Vector3(position.x + radius, 2.2, position.z + radius)
    );
    return this.coverBoxes.some((box) => box.intersectsBox(testBox));
  }

  hasLineOfSight(from, to) {
    const direction = to.clone().sub(from);
    const distance = direction.length();
    if (distance <= 0.001) return true;
    const ray = new THREE.Ray(from.clone(), direction.normalize());
    const hit = new THREE.Vector3();
    for (const box of this.coverBoxes) {
      const impact = ray.intersectBox(box, hit);
      if (impact && impact.distanceTo(from) < distance - 0.35) return false;
    }
    return true;
  }

  addCoverObject(object, expand = 0.12) {
    const box = makeBox3FromObject(object);
    box.expandByScalar(expand);
    this.coverBoxes.push(box);
  }

  _createBoard() {
    const floor = new THREE.Mesh(new THREE.BoxGeometry(74, 0.28, 74), this.materials.floor);
    floor.position.y = -0.16;
    floor.receiveShadow = true;
    floor.name = 'Giant PCB floor';
    this.group.add(floor);

    const edgeGeom = new THREE.BoxGeometry(76, 0.8, 1.2);
    const north = new THREE.Mesh(edgeGeom, this.materials.floorEdge);
    north.position.set(0, 0.12, -37.6);
    const south = north.clone();
    south.position.z = 37.6;
    const east = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 76), this.materials.floorEdge);
    east.position.set(37.6, 0.12, 0);
    const west = east.clone();
    west.position.x = -37.6;
    for (const edge of [north, south, east, west]) {
      edge.castShadow = true;
      edge.receiveShadow = true;
      this.group.add(edge);
    }
  }

  _createTraceNetwork() {
    const green = this.materials.traceGreen;
    const amber = this.materials.traceAmber;
    const traceDefs = [
      [-28, -21, 19, -21, 0.42, green],
      [-30, -9, 29, -9, 0.34, amber],
      [-24, 0, 31, 0, 0.48, green],
      [-29, 14, 26, 14, 0.36, amber],
      [-18, 26, 18, 26, 0.3, green],
      [-22, -31, -22, 23, 0.36, green],
      [-9, -29, -9, 30, 0.34, amber],
      [6, -33, 6, 28, 0.42, green],
      [21, -27, 21, 20, 0.3, amber],
      [-31, 8, -16, -6, 0.34, green],
      [14, 18, 31, 3, 0.28, green],
      [-2, -28, 18, -13, 0.28, amber]
    ];

    for (const def of traceDefs) this._createTrace(...def);

    const viaPositions = [
      [-28, -21], [-9, -21], [6, -21], [19, -21],
      [-30, -9], [-22, -9], [6, -9], [29, -9],
      [-22, 0], [-9, 0], [6, 0], [21, 0], [31, 0],
      [-22, 14], [-9, 14], [6, 14], [21, 14],
      [-18, 26], [6, 26], [18, 26], [-31, 8], [14, 18]
    ];
    for (const [x, z] of viaPositions) this._createVia(x, z);
  }

  _createTrace(x1, z1, x2, z2, width, material) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    const geom = new THREE.BoxGeometry(width, 0.055, length);
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.set((x1 + x2) / 2, 0.018, (z1 + z2) / 2);
    mesh.rotation.y = Math.atan2(dx, dz);
    mesh.receiveShadow = true;
    this.group.add(mesh);

    const glowGeom = new THREE.BoxGeometry(width * 1.8, 0.018, length);
    const glow = new THREE.Mesh(glowGeom, createGlowMaterial(material.color.getHex(), 0.11));
    glow.position.copy(mesh.position);
    glow.position.y = 0.075;
    glow.rotation.copy(mesh.rotation);
    this.group.add(glow);
  }

  _createVia(x, z) {
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.075, 28), this.materials.copper);
    outer.position.set(x, 0.05, z);
    outer.receiveShadow = true;
    outer.castShadow = true;
    this.group.add(outer);

    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.09, 24), this.materials.solder);
    inner.position.set(x, 0.105, z);
    inner.receiveShadow = true;
    this.group.add(inner);
  }

  _createIndustrialProps() {
    this._createSOICBlock(-17, -17, 4.4, 6.2, 'QFN-Tombstone');
    this._createSOICBlock(12, -24, 5.2, 7.2, 'BGA-Survivor');
    this._createSOICBlock(23, 8, 5.8, 4.8, 'Memory Crypt');
    this._createSOICBlock(-27, 14, 4.8, 8, 'Scrap Monolith');

    this._createResistorBridge(-4, -12, 8, Math.PI / 2.8);
    this._createResistorBridge(17, 21, 7, -Math.PI / 7);
    this._createCapacitorTower(-2, 18, 2.2);
    this._createCapacitorTower(-15, 26, 1.7);
    this._createCapacitorTower(29, -5, 1.9);
    this._createConveyor(-2, 6, 17, Math.PI / 2);
    this._createAOITower(-29, -25);
    this._createAOITower(28, 28);
  }

  _createSOICBlock(x, z, width, depth, label) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(width, 1.4, depth), this.materials.chip);
    body.position.set(x, 0.78, z);
    body.castShadow = true;
    body.receiveShadow = true;
    body.name = label;
    this.group.add(body);

    const bevel = new THREE.Mesh(new THREE.BoxGeometry(width + 0.16, 0.24, depth + 0.16), this.materials.chipEdge);
    bevel.position.set(x, 1.56, z);
    bevel.castShadow = true;
    this.group.add(bevel);

    const pinCount = Math.max(5, Math.round(depth));
    for (let i = 0; i < pinCount; i++) {
      const t = (i / (pinCount - 1) - 0.5) * (depth - 0.7);
      for (const side of [-1, 1]) {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.16, 0.22), this.materials.metal);
        pin.position.set(x + side * (width / 2 + 0.42), 0.48, z + t);
        pin.castShadow = true;
        this.group.add(pin);
      }
    }

    this.addCoverObject(body, 0.55);
  }

  _createResistorBridge(x, z, length, rotation) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotation;

    const ceramic = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, length), createStandardMaterial(0xd6c18e, { roughness: 0.55, metalness: 0.08 }));
    ceramic.position.y = 0.72;
    ceramic.castShadow = true;
    ceramic.receiveShadow = true;
    group.add(ceramic);

    const bandMaterial = createStandardMaterial(0x27140d, { roughness: 0.6, metalness: 0.18 });
    for (const offset of [-length * 0.22, 0, length * 0.23]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(2.08, 1.16, 0.28), bandMaterial);
      band.position.set(0, 0.74, offset);
      band.castShadow = true;
      group.add(band);
    }

    this.group.add(group);
    this.addCoverObject(group, 0.42);
  }

  _createCapacitorTower(x, z, scale) {
    const capMat = createStandardMaterial(0x1d2428, { roughness: 0.46, metalness: 0.55 });
    const ringMat = createStandardMaterial(COLORS.pinMetal, { roughness: 0.35, metalness: 0.8 });
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(scale * 0.72, scale * 0.72, scale * 2.2, 32), capMat);
    cylinder.position.set(x, scale * 1.1, z);
    cylinder.castShadow = true;
    cylinder.receiveShadow = true;
    this.group.add(cylinder);

    const top = new THREE.Mesh(new THREE.CylinderGeometry(scale * 0.76, scale * 0.76, 0.16, 32), ringMat);
    top.position.set(x, scale * 2.23, z);
    top.castShadow = true;
    this.group.add(top);

    this.addCoverObject(cylinder, 0.4);
  }

  _createConveyor(x, z, length, rotation) {
    const group = new THREE.Group();
    group.position.set(x, 0.15, z);
    group.rotation.y = rotation;
    const belt = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.28, length), createStandardMaterial(0x181b1d, { roughness: 0.64, metalness: 0.42 }));
    belt.castShadow = true;
    belt.receiveShadow = true;
    group.add(belt);

    const railMat = createStandardMaterial(0xa4a090, { roughness: 0.38, metalness: 0.78 });
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.55, length + 0.4), railMat);
      rail.position.set(side * 1.76, 0.2, 0);
      rail.castShadow = true;
      group.add(rail);
    }
    this.group.add(group);
    this.addCoverObject(group, 0.28);
  }

  _createAOITower(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 5.8, 16), this.materials.metal);
    mast.position.y = 2.9;
    mast.castShadow = true;
    group.add(mast);

    const head = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.0, 1.4), createStandardMaterial(0x202326, { roughness: 0.48, metalness: 0.52 }));
    head.position.y = 5.6;
    head.castShadow = true;
    group.add(head);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.28, 24), createGlowMaterial(COLORS.droneRed, 0.85));
    lens.position.set(0, 5.6, -0.82);
    lens.rotation.x = Math.PI / 2;
    group.add(lens);

    const light = new THREE.PointLight(COLORS.droneRed, 2.2, 16, 2);
    light.position.set(x, 5.7, z - 1.2);
    this.scene.add(light);
    this.lights.push(light);

    this.group.add(group);
  }

  _createScrap() {
    const positions = [
      [-13, -5], [-6, -18], [3, -15], [15, -10], [26, -17],
      [-28, 2], [-17, 8], [-6, 11], [8, 8], [19, 16], [27, 24],
      [-21, 25], [-2, 28], [12, 27]
    ];
    positions.forEach(([x, z], index) => {
      const scrap = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), this.materials.scrap);
      scrap.position.set(x, 0.45, z);
      scrap.castShadow = true;
      scrap.userData = { collected: false, phase: index * 0.73, value: 1 };
      this.group.add(scrap);
      this.scrapPickups.push(scrap);
    });
  }

  _createRepairNPCs() {
    const npcs = [
      { type: 'CAP-NPC', x: -24, z: -4 },
      { type: 'BGA Survivor', x: 10, z: 2 },
      { type: 'QFN Worker', x: -1, z: 23 }
    ];
    npcs.forEach((npc, index) => {
      const group = new THREE.Group();
      group.position.set(npc.x, 0, npc.z);
      group.userData = { type: npc.type, repaired: false, phase: index * 1.7 };

      const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 1.1), this.materials.npc);
      body.position.y = 0.72;
      body.castShadow = true;
      group.add(body);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), createGlowMaterial(COLORS.npcBlue, 0.62));
      eye.position.set(0, 0.84, -0.58);
      group.add(eye);
      group.userData.glow = eye;

      const pinMat = this.materials.metal;
      for (const side of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), pinMat);
        leg.position.set(side * 0.42, 0.24, 0.26);
        leg.castShadow = true;
        group.add(leg);
      }

      this.group.add(group);
      this.repairNPCs.push(group);
    });
  }

  _createLabels() {
    const texture = createTextLabel('MRB VAULT', { color: '#ffbd62', font: '800 52px Segoe UI, Arial, sans-serif' });
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), material);
    label.position.set(-29, 0.12, 31.5);
    label.rotation.x = -Math.PI / 2;
    this.group.add(label);
  }

  _seedDronePatrols() {
    this.dronePatrols = [
      [new THREE.Vector3(-18, 2.7, -25), new THREE.Vector3(-2, 2.7, -18), new THREE.Vector3(-15, 2.7, -4)],
      [new THREE.Vector3(17, 2.9, -19), new THREE.Vector3(28, 2.9, -7), new THREE.Vector3(12, 2.9, 4)],
      [new THREE.Vector3(-12, 3.1, 17), new THREE.Vector3(9, 3.1, 19), new THREE.Vector3(22, 3.1, 28), new THREE.Vector3(-4, 3.1, 30)]
    ];
  }
}
