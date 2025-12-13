import { THREE } from '../vendor/three.js';
import { makeGlowSprite } from '../gfx/glowSprite.js';
import { metal } from './materials.js';

export function createTurret(scene) {
  const turret = new THREE.Group();
  turret.position.set(-7.6, 2.25, 4.9);
  scene.add(turret);

  const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.35, 24), metal(0x0b1322, 0.8, 0.35));
  turretBase.position.y = -0.15;
  turret.add(turretBase);

  const turretNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.9, 16), metal(0x0b1322, 0.8, 0.35));
  turretNeck.position.y = 0.35;
  turret.add(turretNeck);

  const turretHead = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.85), metal(0x0d1526, 0.85, 0.32));
  turretHead.position.y = 0.8;
  turret.add(turretHead);

  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.55, 14), metal(0x0f1a2c, 0.8, 0.3));
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.8, 0.65);
  turret.add(muzzle);

  const muzzleGlow = makeGlowSprite(new THREE.Color(0x66d9ff), 0.8);
  muzzleGlow.position.set(0, 0.8, 0.95);
  muzzleGlow.scale.setScalar(0.6);
  turret.add(muzzleGlow);

  return { turret, turretHead, muzzle, muzzleGlow };
}

