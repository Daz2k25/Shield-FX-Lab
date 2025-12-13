import { THREE } from '../vendor/three.js';
import { makeGlowSprite } from '../gfx/glowSprite.js';

function randomPointOnSphere(radius) {
  const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  v.normalize();
  return v.multiplyScalar(radius);
}

function makeStarLayer({ count, radius, radiusJitter, sizePx, opacity }) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const r = radius + (Math.random() * 2 - 1) * radiusJitter;
    const p = randomPointOnSphere(r);
    positions[i * 3 + 0] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;

    const t = Math.random();
    const col =
      t < 0.72
        ? [1.0, 1.0, 1.0]
        : t < 0.86
          ? [0.72, 0.86, 1.0]
          : t < 0.94
            ? [1.0, 0.82, 0.66]
            : [0.78, 1.0, 0.88];
    colors[i * 3 + 0] = col[0];
    colors[i * 3 + 1] = col[1];
    colors[i * 3 + 2] = col[2];
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: sizePx,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const pts = new THREE.Points(geo, mat);
  pts.renderOrder = -1000;
  return pts;
}

export function createLabEnvironment({ scene }) {
  const space = new THREE.Group();
  scene.add(space);

  const sun = new THREE.DirectionalLight(0xfff1d6, 3.0);
  sun.position.set(10, 6, 10);
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0x66d9ff, 1.25);
  rim.position.set(-10, 4, -8);
  scene.add(rim);

  const ambient = new THREE.AmbientLight(0x0b1020, 0.55);
  scene.add(ambient);

  const starsFar = makeStarLayer({ count: 9000, radius: 1800, radiusJitter: 260, sizePx: 1.2, opacity: 0.9 });
  const starsNear = makeStarLayer({ count: 2400, radius: 620, radiusJitter: 80, sizePx: 1.6, opacity: 0.55 });
  space.add(starsFar);
  space.add(starsNear);

  const nebulaA = makeGlowSprite(new THREE.Color(0x6b4cff), 1.0);
  nebulaA.position.set(320, 120, -1200);
  nebulaA.scale.setScalar(720);
  nebulaA.material.opacity = 0.16;
  nebulaA.material.depthWrite = false;
  space.add(nebulaA);

  const nebulaB = makeGlowSprite(new THREE.Color(0x66ffcc), 0.95);
  nebulaB.position.set(-420, -80, -1400);
  nebulaB.scale.setScalar(680);
  nebulaB.material.opacity = 0.12;
  nebulaB.material.depthWrite = false;
  space.add(nebulaB);

  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(140, 64, 48),
    new THREE.MeshStandardMaterial({
      color: 0x11162a,
      metalness: 0.05,
      roughness: 1.0,
      envMapIntensity: 0.6,
    })
  );
  planet.position.set(520, -180, -1700);
  planet.rotation.y = 0.6;
  space.add(planet);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(143, 64, 48),
    new THREE.MeshBasicMaterial({
      color: 0x66d9ff,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    })
  );
  atmosphere.position.copy(planet.position);
  space.add(atmosphere);

  const animatePracticals = (t, flashKick) => {
    starsFar.rotation.y = t * 0.004;
    starsNear.rotation.y = t * 0.009;
    starsNear.rotation.x = t * 0.003;

    const twinkle = 0.92 + 0.08 * Math.sin(t * 0.35);
    starsFar.material.opacity = 0.9 * twinkle;
    starsNear.material.opacity = 0.55 * twinkle;

    nebulaA.material.opacity = 0.15 + 0.015 * Math.sin(t * 0.08) + 0.015 * flashKick;
    nebulaB.material.opacity = 0.11 + 0.012 * Math.sin(t * 0.06);

    planet.rotation.y = 0.6 + t * 0.01;
  };

  return { lab: space, practicals: [], animatePracticals };
}

