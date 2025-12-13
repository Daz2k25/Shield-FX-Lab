import { THREE } from '../vendor/three.js';
import { makeGlowSprite } from '../gfx/glowSprite.js';
import { emissive, metal, paint } from './materials.js';

export function createShipSystem(scene) {
  const shipRoot = new THREE.Group();
  shipRoot.position.set(0, 1.05, 0);
  scene.add(shipRoot);

  const addEngineGlow = (group, pos, color = 0x66d9ff, scale = 0.6) => {
    const spr = makeGlowSprite(new THREE.Color(color), 1.0);
    spr.position.copy(pos);
    spr.scale.setScalar(scale);
    group.add(spr);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), emissive(color, 3.2));
    core.position.copy(pos);
    group.add(core);
  };

  const makeEmitterNodes = (group, points, color = 0x66ffcc) => {
    const nodes = [];
    const mat = emissive(color, 2.6);
    const geo = new THREE.SphereGeometry(0.05, 14, 14);
    points.forEach((p) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(p);
      group.add(m);
      const glow = makeGlowSprite(new THREE.Color(color), 0.65);
      glow.position.copy(p);
      glow.scale.setScalar(0.42);
      group.add(glow);
      nodes.push(m);
    });
    return nodes;
  };

  function buildFighter() {
    const g = new THREE.Group();

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 2.0), paint(0x111a2b, 0.55, 0.48));
    body.position.set(0, 0, 0);
    g.add(body);

    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 20, 20),
      new THREE.MeshStandardMaterial({
        color: 0x0a1220,
        metalness: 0.1,
        roughness: 0.05,
        envMapIntensity: 1.0,
      })
    );
    cockpit.scale.set(1.0, 0.75, 1.25);
    cockpit.position.set(0, 0.18, 0.35);
    g.add(cockpit);

    const wingMat = metal(0x0f1726, 0.85, 0.38);
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.9), wingMat);
    wingL.position.set(-0.95, -0.06, 0.1);
    wingL.rotation.z = 0.18;
    g.add(wingL);
    const wingR = wingL.clone();
    wingR.position.x *= -1;
    wingR.rotation.z *= -1;
    g.add(wingR);

    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.85, 20),
      metal(0x0b1220, 0.75, 0.35)
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.02, 1.35);
    g.add(nose);

    const thruster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 0.35, 20),
      metal(0x0b1220, 0.85, 0.28)
    );
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(0, 0, -1.08);
    g.add(thruster);

    addEngineGlow(g, new THREE.Vector3(0, 0.02, -1.28), 0x66d9ff, 0.75);

    const emitters = makeEmitterNodes(
      g,
      [
        new THREE.Vector3(-0.55, 0.02, 0.65),
        new THREE.Vector3(0.55, 0.02, 0.65),
        new THREE.Vector3(0.0, 0.1, -0.55),
      ],
      0x66ffcc
    );

    return { group: g, emitters };
  }

  function buildInterceptor() {
    const g = new THREE.Group();

    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.22, 2.6), paint(0x0f1726, 0.55, 0.5));
    spine.position.set(0, 0, 0);
    g.add(spine);

    const longNose = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 1.15, 18),
      metal(0x0b1322, 0.8, 0.35)
    );
    longNose.rotation.x = Math.PI / 2;
    longNose.position.set(0, 0.02, 1.65);
    g.add(longNose);

    const finMat = metal(0x0d1424, 0.85, 0.33);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 1.0), finMat);
    fin.position.set(0, 0.35, -0.15);
    g.add(fin);

    const sidePodMat = metal(0x0c1323, 0.85, 0.32);
    const podL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 1.55, 16), sidePodMat);
    podL.rotation.x = Math.PI / 2;
    podL.position.set(-0.55, -0.05, 0.15);
    g.add(podL);
    const podR = podL.clone();
    podR.position.x *= -1;
    g.add(podR);

    const cockpit = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 18, 18),
      new THREE.MeshStandardMaterial({
        color: 0x081021,
        metalness: 0.1,
        roughness: 0.06,
        envMapIntensity: 1.0,
      })
    );
    cockpit.scale.set(1.1, 0.7, 1.5);
    cockpit.position.set(0, 0.14, 0.6);
    g.add(cockpit);

    const thrusterL = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.25, 16), sidePodMat);
    thrusterL.rotation.x = Math.PI / 2;
    thrusterL.position.set(-0.55, -0.05, -1.0);
    g.add(thrusterL);
    const thrusterR = thrusterL.clone();
    thrusterR.position.x *= -1;
    g.add(thrusterR);

    addEngineGlow(g, new THREE.Vector3(-0.55, -0.04, -1.2), 0x66d9ff, 0.62);
    addEngineGlow(g, new THREE.Vector3(0.55, -0.04, -1.2), 0x66d9ff, 0.62);

    const emitters = makeEmitterNodes(
      g,
      [
        new THREE.Vector3(-0.62, 0.02, 0.9),
        new THREE.Vector3(0.62, 0.02, 0.9),
        new THREE.Vector3(0.0, 0.22, -0.15),
        new THREE.Vector3(0.0, 0.05, -0.85),
      ],
      0x66ffcc
    );

    return { group: g, emitters };
  }

  function buildCorvette() {
    const g = new THREE.Group();

    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 3.4), paint(0x101b2e, 0.5, 0.55));
    hull.position.set(0, 0, 0);
    g.add(hull);

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.8), metal(0x0c1323, 0.85, 0.28));
    bridge.position.set(0, 0.32, 0.65);
    g.add(bridge);

    const module1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.3, 0.9), metal(0x0a1220, 0.8, 0.35));
    module1.position.set(-0.55, -0.05, -0.6);
    g.add(module1);
    const module2 = module1.clone();
    module2.position.x *= -1;
    g.add(module2);

    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 12), metal(0x0e1628, 0.8, 0.3));
    gun.rotation.x = Math.PI / 2;
    gun.position.set(0, 0.12, 1.35);
    g.add(gun);

    const stern = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.55, 22), metal(0x0b1220, 0.85, 0.26));
    stern.rotation.x = Math.PI / 2;
    stern.position.set(0, 0, -1.75);
    g.add(stern);

    addEngineGlow(g, new THREE.Vector3(-0.24, 0.02, -2.05), 0x66d9ff, 0.78);
    addEngineGlow(g, new THREE.Vector3(0.24, 0.02, -2.05), 0x66d9ff, 0.78);

    const emitters = makeEmitterNodes(
      g,
      [
        new THREE.Vector3(-0.75, 0.05, 1.05),
        new THREE.Vector3(0.75, 0.05, 1.05),
        new THREE.Vector3(-0.75, 0.0, -1.05),
        new THREE.Vector3(0.75, 0.0, -1.05),
        new THREE.Vector3(0.0, 0.26, 0.2),
      ],
      0x66ffcc
    );

    return { group: g, emitters };
  }

  function buildFreighter() {
    const g = new THREE.Group();

    const core = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.6, 2.8), paint(0x0f1a2c, 0.5, 0.62));
    core.position.set(0, 0, 0);
    g.add(core);

    const podMat = metal(0x0b1220, 0.85, 0.32);
    const podA = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.45, 1.15), podMat);
    podA.position.set(-1.25, -0.12, 0.35);
    podA.rotation.y = 0.06;
    g.add(podA);

    const podB = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 1.35), podMat);
    podB.position.set(1.1, -0.15, -0.55);
    podB.rotation.y = -0.08;
    g.add(podB);

    const spine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 3.4, 16),
      metal(0x0c1426, 0.8, 0.35)
    );
    spine.rotation.x = Math.PI / 2;
    spine.position.set(0, 0.18, -0.1);
    g.add(spine);

    const aft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.7, 0.65, 24),
      metal(0x0b1220, 0.85, 0.25)
    );
    aft.rotation.x = Math.PI / 2;
    aft.position.set(0, 0, -1.75);
    g.add(aft);

    addEngineGlow(g, new THREE.Vector3(0, 0.02, -2.1), 0x66d9ff, 0.95);

    const emitters = makeEmitterNodes(
      g,
      [
        new THREE.Vector3(-1.05, 0.1, 0.95),
        new THREE.Vector3(1.05, 0.08, 0.65),
        new THREE.Vector3(-0.35, 0.22, -0.35),
        new THREE.Vector3(0.35, 0.22, -0.35),
        new THREE.Vector3(0.0, 0.0, -1.25),
      ],
      0x66ffcc
    );

    return { group: g, emitters };
  }

  let currentShip = null;
  let shipEmitters = [];

  const setShip = (kind) => {
    if (currentShip) shipRoot.remove(currentShip);
    shipEmitters = [];

    let built;
    if (kind === 'fighter') built = buildFighter();
    if (kind === 'interceptor') built = buildInterceptor();
    if (kind === 'corvette') built = buildCorvette();
    if (kind === 'freighter') built = buildFreighter();

    currentShip = built.group;
    shipEmitters = built.emitters;

    currentShip.rotation.y = -0.35;
    shipRoot.add(currentShip);
  };

  setShip('fighter');

  return {
    shipRoot,
    setShip,
    getCurrentShip: () => currentShip,
    getEmitters: () => shipEmitters,
  };
}

