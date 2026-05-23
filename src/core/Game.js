import * as THREE from 'three';
import { setupRenderer, setupScene } from '../rendering/LightingRig.js';
import { InputManager } from './InputManager.js';
import { PCBWorld } from '../world/PCBWorld.js';
import { R3Work } from '../player/R3Work.js';
import { AOIDrone } from '../ai/AOIDrone.js';
import { InteractionSystem } from '../gameplay/InteractionSystem.js';
import { HUD } from '../ui/HUD.js';
import { dampVector } from './MathUtils.js';

const cameraTarget = new THREE.Vector3();
const desiredCameraPosition = new THREE.Vector3();
const lookAtTarget = new THREE.Vector3();

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = setupRenderer(canvas);
    this.scene = new THREE.Scene();
    this.lighting = setupScene(this.scene);
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 220);
    this.camera.position.set(-12, 10, 12);

    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.started = false;
    this.cameraYaw = Math.PI * 0.76;
    this.cameraPitch = 0.46;
    this.cameraDistance = 14.5;
    this.cameraFocus = new THREE.Vector3(-28, 1, 30);

    this.input = new InputManager(canvas);
    this.input.attach();

    this.world = new PCBWorld(this.scene).build();
    this.player = new R3Work(this.scene);
    this.interactions = new InteractionSystem(this.scene, this.world);
    this.drones = this.world.dronePatrols.map((patrol, index) => new AOIDrone(this.scene, patrol, index));
    this.hud = new HUD();
    this.dust = this._createDustField();

    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.input.enabled = true;
    this.clock.start();
    this.loop();
  }

  loop() {
    requestAnimationFrame(this.loop);
    if (!this.started) return;

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += dt;

    this._updateCameraInput(dt);
    this.player.update(dt, this.input, this.cameraYaw, this.world);

    if (this.input.wasPressed('Space')) {
      if (this.player.tryFluxSmoke()) this.interactions.spawnFluxSmoke(this.player.group.position);
    }

    this.world.update(dt, this.elapsed);
    this.interactions.update(dt, this.player, this.input);

    let maxDetection = 0;
    let aggregateState = 'Safe';
    for (const drone of this.drones) {
      const info = drone.update(dt, this.player, this.world);
      maxDetection = Math.max(maxDetection, info.alert);
      if (info.state === 'alarm') aggregateState = 'AOI ALARM';
      else if (info.state === 'suspicious' && aggregateState !== 'AOI ALARM') aggregateState = 'Suspicious';
    }

    this._updateCamera(dt);
    this._updateDust(dt);
    this._updateLighting(maxDetection);
    this.hud.update({
      detection: maxDetection,
      state: this.player.isHidden ? 'Flux Smoke' : aggregateState,
      resources: this.interactions.resources,
      player: this.player,
      prompt: this.interactions.prompt
    });

    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    window.removeEventListener('resize', this.resize);
    this.input.detach();
    for (const drone of this.drones) drone.dispose();
  }

  _updateCameraInput(dt) {
    const rotateSpeed = 1.55;
    if (this.input.isDown('KeyQ')) this.cameraYaw += rotateSpeed * dt;
    if (this.input.isDown('KeyE')) this.cameraYaw -= rotateSpeed * dt;

    if (this.input.isMouseDown(0) || this.input.isMouseDown(2)) {
      this.cameraYaw -= this.input.pointerDelta.x * 0.006;
      this.cameraPitch += this.input.pointerDelta.y * 0.003;
      this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch, 0.28, 0.82);
    }

    if (this.input.wheelDelta !== 0) {
      this.cameraDistance += this.input.wheelDelta * 1.2;
      this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance, 8.5, 22);
    }
  }

  _updateCamera(dt) {
    cameraTarget.copy(this.player.group.position).add(new THREE.Vector3(0, 1.08, 0));
    dampVector(this.cameraFocus, cameraTarget, 7.4, dt);

    const horizontal = Math.cos(this.cameraPitch) * this.cameraDistance;
    desiredCameraPosition.set(
      this.cameraFocus.x - Math.sin(this.cameraYaw) * horizontal,
      this.cameraFocus.y + Math.sin(this.cameraPitch) * this.cameraDistance,
      this.cameraFocus.z - Math.cos(this.cameraYaw) * horizontal
    );

    dampVector(this.camera.position, desiredCameraPosition, 6.2, dt);
    lookAtTarget.copy(this.cameraFocus);
    lookAtTarget.y += 0.55;
    this.camera.lookAt(lookAtTarget);
  }

  _updateLighting(alertLevel) {
    this.lighting.warning.intensity = 2.2 + alertLevel * 7.5 + Math.sin(this.elapsed * 9) * alertLevel;
    this.lighting.warning.position.x = this.player.group.position.x * 0.25;
    this.lighting.warning.position.z = this.player.group.position.z * 0.25 - 10;
  }

  _createDustField() {
    const geometry = new THREE.BufferGeometry();
    const count = 520;
    const positions = new Float32Array(count * 3);
    const phases = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 78;
      positions[i * 3 + 1] = 0.7 + Math.random() * 9.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 78;
      phases.push(Math.random() * Math.PI * 2);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xa8ffd5,
      size: 0.035,
      transparent: true,
      opacity: 0.34,
      depthWrite: false
    });
    const points = new THREE.Points(geometry, material);
    points.userData.phases = phases;
    this.scene.add(points);
    return points;
  }

  _updateDust(dt) {
    this.dust.rotation.y += dt * 0.011;
    const position = this.dust.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i) + Math.sin(this.elapsed * 0.4 + this.dust.userData.phases[i]) * 0.0008;
      position.setY(i, y);
    }
    position.needsUpdate = true;
  }
}
