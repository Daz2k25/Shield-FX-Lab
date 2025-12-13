import { THREE } from '../vendor/three.js';
import { makeGlowSprite } from '../gfx/glowSprite.js';

function makeGridTexture(renderer) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#070913';
  ctx.fillRect(0, 0, c.width, c.height);

  const drawLine = (x1, y1, x2, y2, a, w) => {
    ctx.strokeStyle = `rgba(140,190,255,${a})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  for (let i = 0; i <= 32; i++) {
    const t = i / 32;
    const y = t * c.height;
    drawLine(0, y, c.width, y, i % 8 === 0 ? 0.22 : 0.08, i % 8 === 0 ? 2 : 1);
    const x = t * c.width;
    drawLine(x, 0, x, c.height, i % 8 === 0 ? 0.22 : 0.08, i % 8 === 0 ? 2 : 1);
  }

  ctx.globalAlpha = 0.06;
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * c.width,
      y = Math.random() * c.height;
    const a = Math.random();
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3.5, 3.5);
  tex.encoding = THREE.sRGBEncoding;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.needsUpdate = true;
  return tex;
}

export function createLabEnvironment({ scene, renderer }) {
  const lab = new THREE.Group();
  scene.add(lab);

  const gridTex = makeGridTexture(renderer);

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0a0d16,
    metalness: 0.65,
    roughness: 0.28,
    envMapIntensity: 0.6,
    map: gridTex,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = false;
  lab.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x070913,
    metalness: 0.3,
    roughness: 0.85,
    envMapIntensity: 0.25,
  });
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), wallMat);
  backWall.position.set(0, 8, -12);
  lab.add(backWall);

  const sideWallL = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), wallMat);
  sideWallL.position.set(-12, 8, 0);
  sideWallL.rotation.y = Math.PI / 2;
  lab.add(sideWallL);

  const sideWallR = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), wallMat);
  sideWallR.position.set(12, 8, 0);
  sideWallR.rotation.y = -Math.PI / 2;
  lab.add(sideWallR);

  const railMat = new THREE.MeshStandardMaterial({
    color: 0x0b1230,
    metalness: 0.7,
    roughness: 0.35,
    envMapIntensity: 0.55,
  });
  for (let i = 0; i < 6; i++) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 18), railMat);
    rail.position.set(-7 + i * 2.8, 0.11, -3);
    lab.add(rail);
  }

  const key = new THREE.DirectionalLight(0xbfe6ff, 3.2);
  key.position.set(6, 8, 3);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x88aaff, 1.2);
  fill.position.set(-6, 5, 7);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0x8cffd8, 2.0);
  rim.position.set(-5, 7, -8);
  scene.add(rim);

  const practicals = [];
  const addPractical = (x, y, z, color, intensity, dist) => {
    const p = new THREE.PointLight(color, intensity, dist, 2.2);
    p.position.set(x, y, z);
    scene.add(p);

    const bulb = makeGlowSprite(new THREE.Color(color), 0.9);
    bulb.position.copy(p.position);
    bulb.scale.setScalar(0.7);
    lab.add(bulb);

    practicals.push({ light: p, base: intensity, phase: Math.random() * 10 });
  };

  addPractical(-9.5, 5.5, -8, 0x66d9ff, 3.1, 22);
  addPractical(9.5, 5.0, -6, 0x66ffcc, 2.8, 22);
  addPractical(0.0, 6.5, -10, 0x99bbff, 2.6, 24);

  const animatePracticals = (t, flashKick) => {
    practicals.forEach((p, i) => {
      const breathe = 0.85 + 0.15 * Math.sin(t * 0.9 + p.phase + i * 0.7);
      const flash = 1.0 + 0.6 * flashKick;
      p.light.intensity = p.base * breathe * flash;
    });
  };

  return { lab, practicals, animatePracticals };
}

