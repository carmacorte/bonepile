import * as THREE from 'three';
import { COLORS, GAME_BALANCE, WORLD_LIMIT } from '../core/Constants.js';
import { angleDifference, damp } from '../core/MathUtils.js';
import { createGlowMaterial, createStandardMaterial } from '../rendering/LightingRig.js';

const tempForward = new THREE.Vector3();
const tempRight = new THREE.Vector3();
const desiredMove = new THREE.Vector3();
const candidate = new THREE.Vector3();

export class R3Work {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.name = 'R3-W0RK';
    this.group.position.set(-28, 0, 30);
    this.scene = scene;
    scene.add(this.group);

    this.velocity = new THREE.Vector3();
    this.facing = 0;
    this.isMoving = false;
    this.isDashing = false;
    this.hiddenTimer = 0;
    this.fluxCooldown = 0;
    this.stepPhase = 0;
    this.visualRoot = new THREE.Group();
    this.group.add(this.visualRoot);

    this._buildModel();
  }

  update(dt, input, cameraYaw, world) {
    this.hiddenTimer = Math.max(0, this.hiddenTimer - dt);
    this.fluxCooldown = Math.max(0, this.fluxCooldown - dt);

    const raw = input.getMoveVector();
    desiredMove.set(0, 0, 0);
    const hasInput = Math.abs(raw.x) + Math.abs(raw.y) > 0;

    if (hasInput) {
      tempForward.set(Math.sin(cameraYaw), 0, Math.cos(cameraYaw)).normalize();
      tempRight.set(tempForward.z, 0, -tempForward.x).normalize();
      desiredMove.addScaledVector(tempForward, raw.y);
      desiredMove.addScaledVector(tempRight, raw.x);
      desiredMove.normalize();
    }

    this.isDashing = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const targetSpeed = this.isDashing ? GAME_BALANCE.dashSpeed : GAME_BALANCE.walkSpeed;
    const targetVelocity = desiredMove.multiplyScalar(targetSpeed);
    const accel = hasInput ? GAME_BALANCE.acceleration : GAME_BALANCE.friction;
    this.velocity.lerp(targetVelocity, 1 - Math.exp(-accel * dt));

    candidate.copy(this.group.position).addScaledVector(this.velocity, dt);
    candidate.x = THREE.MathUtils.clamp(candidate.x, -WORLD_LIMIT + 1.4, WORLD_LIMIT - 1.4);
    candidate.z = THREE.MathUtils.clamp(candidate.z, -WORLD_LIMIT + 1.4, WORLD_LIMIT - 1.4);

    if (!world.isBlocked(candidate, GAME_BALANCE.playerRadius)) {
      this.group.position.copy(candidate);
    } else {
      // Slide attempt: solve X and Z separately before stopping completely.
      const slideX = this.group.position.clone();
      slideX.x = candidate.x;
      const slideZ = this.group.position.clone();
      slideZ.z = candidate.z;
      if (!world.isBlocked(slideX, GAME_BALANCE.playerRadius)) this.group.position.copy(slideX);
      else if (!world.isBlocked(slideZ, GAME_BALANCE.playerRadius)) this.group.position.copy(slideZ);
      else this.velocity.multiplyScalar(0.18);
    }

    this.isMoving = this.velocity.lengthSq() > 0.12;
    if (this.isMoving) {
      const targetFacing = Math.atan2(this.velocity.x, this.velocity.z);
      this.facing += angleDifference(this.facing, targetFacing) * (1 - Math.exp(-12 * dt));
    }
    this.group.rotation.y = this.facing;
    this._animateVisuals(dt);
  }

  tryFluxSmoke() {
    if (this.fluxCooldown > 0) return false;
    this.hiddenTimer = GAME_BALANCE.fluxDuration;
    this.fluxCooldown = GAME_BALANCE.fluxCooldown;
    return true;
  }

  get isHidden() {
    return this.hiddenTimer > 0;
  }

  get fluxReady() {
    return this.fluxCooldown <= 0;
  }

  _buildModel() {
    const chipMat = createStandardMaterial(COLORS.chipBlack, { roughness: 0.68, metalness: 0.2 });
    const edgeMat = createStandardMaterial(0x202020, { roughness: 0.74, metalness: 0.2 });
    const pinMat = createStandardMaterial(COLORS.pinMetal, { roughness: 0.38, metalness: 0.78 });
    const capeMat = createStandardMaterial(COLORS.cape, { roughness: 0.92, metalness: 0.02, transparent: true, opacity: 1 });
    const amberGlow = createGlowMaterial(COLORS.traceAmber, 0.75);
    const greenGlow = createGlowMaterial(COLORS.traceGreen, 0.62);

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.62, 2.18), chipMat);
    body.position.y = 0.95;
    body.castShadow = true;
    body.receiveShadow = true;
    this.visualRoot.add(body);
    this.body = body;

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.08, 1.96), edgeMat);
    top.position.set(0, 1.31, 0);
    top.castShadow = true;
    this.visualRoot.add(top);

    const textPlate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.025, 0.22), greenGlow);
    textPlate.position.set(0, 1.365, -0.3);
    this.visualRoot.add(textPlate);

    const optic = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), amberGlow);
    optic.position.set(0, 1.03, -1.12);
    this.visualRoot.add(optic);
    this.optic = optic;

    this.legs = [];
    for (let i = 0; i < 8; i++) {
      const z = -0.78 + i * 0.225;
      for (const side of [-1, 1]) {
        const root = new THREE.Group();
        root.position.set(side * 0.82, 0.7, z);
        const upper = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.09, 0.08), pinMat);
        upper.position.set(side * 0.22, -0.08, 0);
        upper.rotation.z = side * 0.32;
        upper.castShadow = true;
        root.add(upper);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.11), pinMat);
        foot.position.set(side * 0.48, -0.36, 0.02);
        foot.rotation.z = side * -0.24;
        foot.castShadow = true;
        root.add(foot);
        this.visualRoot.add(root);
        this.legs.push({ root, side, phase: i * 0.7 + (side > 0 ? 0 : Math.PI) });
      }
    }

    const solderArm = new THREE.Group();
    solderArm.position.set(-0.9, 1.03, -0.55);
    const solderRod = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 1.18, 12), pinMat);
    solderRod.rotation.z = Math.PI / 2.6;
    solderRod.rotation.x = 0.18;
    solderRod.position.set(-0.46, -0.12, -0.28);
    solderRod.castShadow = true;
    solderArm.add(solderRod);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 16), amberGlow);
    tip.position.set(-0.88, -0.38, -0.52);
    tip.rotation.z = Math.PI / 2.6;
    solderArm.add(tip);
    this.visualRoot.add(solderArm);
    this.solderArm = solderArm;

    const clawArm = new THREE.Group();
    clawArm.position.set(0.9, 1.02, -0.4);
    const clawRod = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.98, 12), pinMat);
    clawRod.rotation.z = -Math.PI / 2.5;
    clawRod.position.set(0.42, -0.08, -0.18);
    clawRod.castShadow = true;
    clawArm.add(clawRod);
    for (const side of [-1, 1]) {
      const finger = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.08), pinMat);
      finger.position.set(0.83, -0.34 + side * 0.09, -0.34 + side * 0.08);
      finger.rotation.x = side * 0.7;
      finger.castShadow = true;
      clawArm.add(finger);
    }
    this.visualRoot.add(clawArm);
    this.clawArm = clawArm;

    const cape = new THREE.Mesh(new THREE.ConeGeometry(0.98, 1.4, 5, 1, true), capeMat);
    cape.position.set(0, 0.64, 0.7);
    cape.rotation.x = 0.45;
    cape.scale.set(0.86, 1, 0.78);
    cape.castShadow = true;
    this.visualRoot.add(cape);
    this.cape = cape;

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.95, 28),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.025;
    this.group.add(shadow);
  }

  _animateVisuals(dt) {
    const speed = THREE.MathUtils.clamp(this.velocity.length() / GAME_BALANCE.dashSpeed, 0, 1);
    this.stepPhase += dt * (5 + speed * 12);
    const bob = Math.sin(this.stepPhase * 2) * 0.045 * speed;
    this.visualRoot.position.y = bob + (this.isHidden ? -0.12 : 0);
    this.body.rotation.x = damp(this.body.rotation.x, Math.sin(this.stepPhase) * 0.04 * speed, 10, dt);
    this.body.rotation.z = damp(this.body.rotation.z, Math.cos(this.stepPhase * 0.9) * 0.03 * speed, 10, dt);
    this.optic.material.opacity = this.isHidden ? 0.24 : 0.62 + Math.sin(this.stepPhase * 2.5) * 0.12;

    for (const leg of this.legs) {
      const gait = Math.sin(this.stepPhase + leg.phase) * speed;
      leg.root.rotation.z = leg.side * (0.15 + gait * 0.3);
      leg.root.position.y = 0.7 + Math.max(0, gait) * 0.07;
    }

    this.solderArm.rotation.z = Math.sin(this.stepPhase * 1.4) * 0.08 * speed;
    this.clawArm.rotation.z = Math.cos(this.stepPhase * 1.25) * 0.07 * speed;
    this.cape.rotation.z = Math.sin(this.stepPhase * 0.8) * 0.06 * (0.4 + speed);
    this.cape.material.opacity = this.isHidden ? 0.88 : 1;
  }
}
