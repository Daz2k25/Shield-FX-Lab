import { THREE } from '../vendor/three.js';

export function makeGlowSprite(color, intensity = 1.0) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');

  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0.0, `rgba(255,255,255,${0.9 * intensity})`);
  g.addColorStop(
    0.2,
    `rgba(${Math.floor(color.r * 255)},${Math.floor(color.g * 255)},${Math.floor(
      color.b * 255
    )},${0.55 * intensity})`
  );
  g.addColorStop(1.0, 'rgba(0,0,0,0)');

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.encoding = THREE.sRGBEncoding;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    color: 0xffffff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const spr = new THREE.Sprite(mat);
  spr.renderOrder = 10;
  return spr;
}

