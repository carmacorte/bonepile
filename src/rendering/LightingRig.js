import * as THREE from 'three';
import { COLORS } from '../core/Constants.js';

export function setupRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x030605, 1);
  return renderer;
}

export function setupScene(scene) {
  scene.background = new THREE.Color(0x030605);
  scene.fog = new THREE.FogExp2(0x07120f, 0.029);

  const ambient = new THREE.HemisphereLight(0xb5ffce, 0x130805, 0.55);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffd0a0, 2.1);
  key.position.set(-12, 19, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 80;
  key.shadow.camera.left = -40;
  key.shadow.camera.right = 40;
  key.shadow.camera.top = 40;
  key.shadow.camera.bottom = -40;
  scene.add(key);

  const rim = new THREE.DirectionalLight(COLORS.traceGreen, 1.1);
  rim.position.set(18, 7, -12);
  scene.add(rim);

  const warning = new THREE.PointLight(COLORS.droneRed, 3.6, 30, 2);
  warning.position.set(0, 7, -18);
  scene.add(warning);

  return { ambient, key, rim, warning };
}

export function createGlowMaterial(color, opacity = 0.8) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
}

export function createStandardMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.78,
    metalness: options.metalness ?? 0.18,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1
  });
}
