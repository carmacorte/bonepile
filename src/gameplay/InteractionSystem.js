import * as THREE from 'three';
import { COLORS, GAME_BALANCE } from '../core/Constants.js';
import { createGlowMaterial } from '../rendering/LightingRig.js';

const playerPos = new THREE.Vector3();

export class InteractionSystem {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.resources = {
      scrap: 0,
      repaired: 0
    };
    this.prompt = 'WASD move · Mouse drag/QE camera · Shift dash · Space flux smoke · E repair';
    this.smokeEffects = [];
  }

  update(dt, player, input) {
    playerPos.copy(player.group.position);
    this._updatePickups(playerPos);
    this._updateRepair(player, input);
    this._updateSmoke(dt);
  }

  spawnFluxSmoke(position) {
    const group = new THREE.Group();
    group.position.copy(position);
    group.position.y = 0.18;
    group.userData = { life: GAME_BALANCE.fluxDuration, maxLife: GAME_BALANCE.fluxDuration };

    const material = new THREE.MeshBasicMaterial({
      color: COLORS.smoke,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    for (let i = 0; i < 16; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.55 + Math.random() * 0.5, 12, 8), material.clone());
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1.35;
      puff.position.set(Math.cos(angle) * radius, 0.35 + Math.random() * 0.7, Math.sin(angle) * radius);
      puff.scale.setScalar(0.6 + Math.random() * 0.8);
      puff.userData.velocity = new THREE.Vector3(Math.cos(angle) * 0.35, 0.18 + Math.random() * 0.35, Math.sin(angle) * 0.35);
      group.add(puff);
    }

    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(2.45, 2.45, 0.035, 48),
      createGlowMaterial(COLORS.smoke, 0.18)
    );
    ring.position.y = 0.05;
    group.add(ring);

    this.scene.add(group);
    this.smokeEffects.push(group);
  }

  _updatePickups(playerPosition) {
    for (const pickup of this.world.scrapPickups) {
      if (pickup.userData.collected) continue;
      const dist = pickup.position.distanceTo(playerPosition);
      if (dist <= GAME_BALANCE.pickupDistance) {
        pickup.userData.collected = true;
        pickup.visible = false;
        this.resources.scrap += pickup.userData.value ?? 1;
      }
    }
  }

  _updateRepair(player, input) {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const npc of this.world.repairNPCs) {
      if (npc.userData.repaired) continue;
      const distance = npc.position.distanceTo(player.group.position);
      if (distance < nearestDistance) {
        nearest = npc;
        nearestDistance = distance;
      }
    }

    if (nearest && nearestDistance <= GAME_BALANCE.repairDistance) {
      if (this.resources.scrap >= GAME_BALANCE.repairCost) {
        this.prompt = `Press E: repair ${nearest.userData.type} // cost ${GAME_BALANCE.repairCost} scrap`;
        if (input.wasPressed('KeyE')) {
          this.resources.scrap -= GAME_BALANCE.repairCost;
          nearest.userData.repaired = true;
          nearest.userData.glow.material.color.setHex(COLORS.traceGreen);
          nearest.userData.glow.material.opacity = 0.9;
          this.resources.repaired += 1;
          this.prompt = `${nearest.userData.type} repaired. Data fragment recovered.`;
        }
      } else {
        this.prompt = `${nearest.userData.type} needs ${GAME_BALANCE.repairCost} scrap to repair.`;
      }
    } else {
      this.prompt = 'Collect scrap, stay behind cover, repair damaged SMT survivors.';
    }
  }

  _updateSmoke(dt) {
    for (let i = this.smokeEffects.length - 1; i >= 0; i--) {
      const effect = this.smokeEffects[i];
      effect.userData.life -= dt;
      const ratio = Math.max(0, effect.userData.life / effect.userData.maxLife);
      effect.rotation.y += dt * 0.35;
      for (const puff of effect.children) {
        if (puff.userData.velocity) puff.position.addScaledVector(puff.userData.velocity, dt);
        if (puff.material) puff.material.opacity = 0.25 * ratio;
        puff.scale.multiplyScalar(1 + dt * 0.11);
      }
      if (effect.userData.life <= 0) {
        this.scene.remove(effect);
        this.smokeEffects.splice(i, 1);
      }
    }
  }
}
