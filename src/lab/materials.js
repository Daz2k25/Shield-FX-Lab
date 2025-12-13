import { THREE } from '../vendor/three.js';

export function metal(color = 0x101826, metalness = 0.85, roughness = 0.35) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    envMapIntensity: 0.8,
  });
}

export function paint(color = 0x12192a, metalness = 0.55, roughness = 0.45) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    envMapIntensity: 0.6,
  });
}

export function emissive(color = 0x66d9ff, intensity = 2.0) {
  return new THREE.MeshStandardMaterial({
    color: 0x0b0f18,
    metalness: 0.1,
    roughness: 0.5,
    emissive: new THREE.Color(color),
    emissiveIntensity: intensity,
  });
}

