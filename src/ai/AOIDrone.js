import * as THREE from 'three';
import { COLORS, GAME_BALANCE } from '../core/Constants.js';
import { angleDifference, damp } from '../core/MathUtils.js';
import { createGlowMaterial, createStandardMaterial } from '../rendering/LightingRig.js';

const target = new THREE.Vector3();
const toPlayer = new THREE.Vector3();
const droneForward = new THREE.Vector3();
const playerProbe = new THREE.Vector3();
const droneProbe = new THREE.Vector3();

export class AOIDrone {
  constructor(scene, patrolPoints, index = 0) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = `AOI Drone ${index + 1}`;
    this.group.position.copy(patrolPoints[0]);
    scene.add(this.group);

    this.patrolPoints = patrolPoints.map((point) => point.clone());
    this.index = index;
    this.currentPatrolIndex = 1;
    this.speed = 3.3 + index * 0.25;
    this.heading = 0;
    this.alert = 0;
    this.state = 'patrol';
    this.time = 0;

    this._buildModel(index);
    this._buildVisionCone();
  }

  update(dt, player, world) {
    this.time += dt;
    this._movePatrol(dt, player);
    const detection = this._evaluateDetection(player, world);

    if (detection.visible) {
      this.alert = Math.min(1, this.alert + GAME_BALANCE.droneDetectionGain * detection.strength * dt);
    } else {
      this.alert = Math.max(0, this.alert - GAME_BALANCE.droneDetectionLoss * dt);
    }

    if (this.alert > 0.72) this.state = 'alarm';
    else if (this.alert > 0.2) this.state = 'suspicious';
    else this.state = 'patrol';

    this._updateVisuals(dt, detection);
    return { alert: this.alert, state: this.state, visible: detection.visible };
  }

  _movePatrol(dt, player) {
    if (this.state === 'alarm') {
      target.copy(player.group.position);
      target.y = this.group.position.y;
    } else {
      target.copy(this.patrolPoints[this.currentPatrolIndex]);
    }

    const delta = target.clone().sub(this.group.position);
    delta.y = 0;
    const distance = delta.length();
    if (distance > 0.08) {
      delta.normalize();
      const stateSpeed = this.state === 'alarm' ? this.speed * 1.35 : this.state === 'suspicious' ? this.speed * 0.72 : this.speed;
      this.group.position.addScaledVector(delta, stateSpeed * dt);
      const desiredHeading = Math.atan2(delta.x, delta.z);
      this.heading += angleDifference(this.heading, desiredHeading) * (1 - Math.exp(-5.5 * dt));
    }

    if (this.state !== 'alarm' && distance < 0.75) {
      this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
    }

    this.group.position.y = this.patrolPoints[0].y + Math.sin(this.time * 2.4 + this.index) * 0.2;
    this.group.rotation.y = this.heading;
  }

  _evaluateDetection(player, world) {
    if (player.isHidden) return { visible: false, strength: 0, reason: 'flux-smoke' };

    playerProbe.copy(player.group.position).add(new THREE.Vector3(0, 0.85, 0));
    droneProbe.copy(this.group.position).add(new THREE.Vector3(0, -0.4, 0));
    toPlayer.copy(playerProbe).sub(droneProbe);
    const distance = toPlayer.length();
    if (distance > GAME_BALANCE.droneDetectionDistance) return { visible: false, strength: 0, reason: 'range' };

    toPlayer.normalize();
    droneForward.set(Math.sin(this.heading), 0, Math.cos(this.heading)).normalize();
    const flatToPlayer = new THREE.Vector3(toPlayer.x, 0, toPlayer.z).normalize();
    const dot = THREE.MathUtils.clamp(droneForward.dot(flatToPlayer), -1, 1);
    const angle = Math.acos(dot);
    if (angle > GAME_BALANCE.droneDetectionAngle) return { visible: false, strength: 0, reason: 'angle' };

    if (!world.hasLineOfSight(droneProbe, playerProbe)) return { visible: false, strength: 0, reason: 'cover' };

    const rangeStrength = 1 - distance / GAME_BALANCE.droneDetectionDistance;
    const angleStrength = 1 - angle / GAME_BALANCE.droneDetectionAngle;
    return {
      visible: true,
      strength: THREE.MathUtils.clamp(0.45 + rangeStrength * 0.42 + angleStrength * 0.55, 0, 1),
      reason: 'visible'
    };
  }

  _buildModel(index) {
    const bodyMat = createStandardMaterial(COLORS.droneBody, { roughness: 0.5, metalness: 0.62 });
    const metalMat = createStandardMaterial(COLORS.pinMetal, { roughness: 0.36, metalness: 0.86 });
    const redGlow = createGlowMaterial(COLORS.droneRed, 0.85);

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.65, 1.2), bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    this.group.add(body);
    this.body = body;

    const camera = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.72, 20), bodyMat);
    camera.rotation.x = Math.PI / 2;
    camera.position.set(0, -0.05, -0.72);
    camera.castShadow = true;
    this.group.add(camera);

    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 14), redGlow);
    lens.position.set(0, -0.05, -1.11);
    this.group.add(lens);
    this.lens = lens;

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.035, 8, 36), metalMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    ring.castShadow = true;
    this.group.add(ring);

    this.rotors = [];
    for (const [x, z] of [[-0.92, -0.64], [0.92, -0.64], [-0.92, 0.62], [0.92, 0.62]]) {
      const rotor = new THREE.Group();
      rotor.position.set(x, 0.03, z);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 14), metalMat);
      hub.castShadow = true;
      rotor.add(hub);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.03, 0.09), metalMat);
      blade.position.y = 0.07;
      rotor.add(blade);
      this.group.add(rotor);
      this.rotors.push(rotor);
    }

    const light = new THREE.PointLight(COLORS.droneRed, 3.0, 12, 2);
    light.position.set(0, -0.1, -1.1);
    this.group.add(light);
    this.scanLight = light;
  }

  _buildVisionCone() {
    const segments = 28;
    const distance = GAME_BALANCE.droneDetectionDistance;
    const angle = GAME_BALANCE.droneDetectionAngle;
    const vertices = [0, 0, 0];
    for (let i = 0; i <= segments; i++) {
      const t = -angle + (angle * 2 * i) / segments;
      vertices.push(Math.sin(t) * distance, 0, Math.cos(t) * distance);
    }

    const indices = [];
    for (let i = 1; i <= segments; i++) indices.push(0, i, i + 1);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({
      color: COLORS.droneRed,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    this.visionCone = new THREE.Mesh(geometry, material);
    this.visionCone.position.y = 0.095;
    this.scene.add(this.visionCone);
  }

  _updateVisuals(dt, detection) {
    const alarmPulse = this.state === 'alarm' ? 0.65 + Math.sin(this.time * 12) * 0.35 : 0.35 + this.alert * 0.5;
    this.lens.material.opacity = THREE.MathUtils.clamp(alarmPulse, 0.28, 1);
    this.scanLight.intensity = this.state === 'alarm' ? 6.5 : 2.2 + this.alert * 3.2;

    const bodyTilt = this.state === 'alarm' ? 0.16 : 0.06;
    this.body.rotation.x = damp(this.body.rotation.x, Math.sin(this.time * 3.5) * bodyTilt, 8, dt);
    this.body.rotation.z = damp(this.body.rotation.z, Math.cos(this.time * 2.7) * bodyTilt * 0.7, 8, dt);

    for (const rotor of this.rotors) rotor.rotation.y += dt * (this.state === 'alarm' ? 28 : 18);

    this.visionCone.position.x = this.group.position.x;
    this.visionCone.position.z = this.group.position.z;
    this.visionCone.rotation.y = this.heading;
    this.visionCone.material.opacity = this.state === 'alarm' ? 0.28 : detection.visible ? 0.22 : 0.09 + this.alert * 0.08;
    this.visionCone.material.color.setHex(this.state === 'alarm' ? 0xff1111 : COLORS.droneRed);
  }

  dispose() {
    this.scene.remove(this.visionCone);
  }
}
