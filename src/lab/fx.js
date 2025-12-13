import { THREE } from '../vendor/three.js';
import { makeGlowSprite } from '../gfx/glowSprite.js';
import { lerp, smoothstep } from '../utils.js';

export function createFxSystem({ scene, clock, shield, state, getShipEmitters }) {
  const fx = new THREE.Group();
  scene.add(fx);

  const activeFX = [];

  function spawnFX(obj, life = 0.5, updateFn = null) {
    fx.add(obj);
    obj.userData.life = life;
    activeFX.push({ obj, t0: clock.getElapsedTime(), life, updateFn });
    return obj;
  }

  function killAllFX() {
    while (activeFX.length) {
      const f = activeFX.pop();
      fx.remove(f.obj);
    }
  }

  function updateFX(dt) {
    const now = clock.getElapsedTime();
    for (let i = activeFX.length - 1; i >= 0; i--) {
      const f = activeFX[i];
      const age = now - f.t0;
      if (f.updateFn) f.updateFn(f.obj, age, dt);
      if (age >= f.life) {
        fx.remove(f.obj);
        activeFX.splice(i, 1);
      }
    }
  }

  function makeBeam(start, end, color, thickness = 0.03, opacity = 0.9) {
    const dir = end.clone().sub(start);
    const len = dir.length();
    const mid = start.clone().addScaledVector(dir, 0.5);

    const geo = new THREE.CylinderGeometry(thickness, thickness, len, 10, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(mid);

    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    m.renderOrder = 20;
    return m;
  }

  function makeProjectile(color, radius = 0.07) {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 18, 18),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const glow = makeGlowSprite(new THREE.Color(color), 1.0);
    glow.scale.setScalar(radius * 10);
    const g = new THREE.Group();
    g.add(core);
    g.add(glow);
    g.renderOrder = 20;
    return g;
  }

  function makeSparkBurst(pos, color = 0xb6f7ff, count = 40, spread = 0.22, life = 0.35) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
        .normalize()
        .multiplyScalar(spread * (0.25 + Math.random()));
      positions[i * 3 + 0] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      velocities[i * 3 + 0] = v.x;
      velocities[i * 3 + 1] = v.y;
      velocities[i * 3 + 2] = v.z;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size: 0.03,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.renderOrder = 25;

    spawnFX(pts, life, (o, age, dt) => {
      const p = o.geometry.attributes.position.array;
      const v = o.geometry.attributes.velocity.array;
      const fade = 1.0 - age / life;
      o.material.opacity = 0.9 * fade;
      for (let i = 0; i < count; i++) {
        p[i * 3 + 0] += v[i * 3 + 0] * dt * 3.5;
        p[i * 3 + 1] += v[i * 3 + 1] * dt * 3.5;
        p[i * 3 + 2] += v[i * 3 + 2] * dt * 3.5;
        v[i * 3 + 0] *= 0.92;
        v[i * 3 + 1] *= 0.92;
        v[i * 3 + 2] *= 0.92;
      }
      o.geometry.attributes.position.needsUpdate = true;
    });
  }

  function spawnEMP(origin, maxR, color = 0xb6f7ff) {
    const geo = new THREE.SphereGeometry(0.2, 28, 18);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(origin);
    m.renderOrder = 19;

    spawnFX(m, 0.9, (o, age) => {
      const t = age / 0.9;
      const r = lerp(0.2, maxR, smoothstep(0.0, 1.0, t));
      o.scale.setScalar(r / 0.2);
      o.material.opacity = 0.35 * (1.0 - t);
    });
  }

  function spawnIonArcs(impactPoint, color = 0x66ffcc) {
    const shipEmitters = getShipEmitters();
    if (!shipEmitters.length) return;

    const candidates = shipEmitters
      .map((e) => ({ e, d: e.getWorldPosition(new THREE.Vector3()).distanceTo(impactPoint) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);

    candidates.forEach((c, idx) => {
      const a = impactPoint.clone();
      const b = c.e.getWorldPosition(new THREE.Vector3()).clone();

      const segs = 14;
      const pts = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const p = a.clone().lerp(b, t);
        const fromCenter = p.clone().sub(shield.position).normalize();
        p.copy(shield.position).addScaledVector(fromCenter, state.radius * 1.001);

        const jitter = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
          .normalize()
          .multiplyScalar(0.07 * (1.0 - Math.abs(0.5 - t) * 1.7));
        p.add(jitter);
        pts.push(p);
      }

      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.renderOrder = 30;

      const life = 0.25 + idx * 0.05;
      spawnFX(line, life, (o, age) => {
        const p = o.geometry.attributes.position.array;
        const fade = 1.0 - age / life;
        o.material.opacity = 0.95 * fade;

        for (let i = 0; i <= segs; i++) {
          const t = i / segs;
          const wob = Math.sin(age * 30.0 + i * 2.2) * (0.012 + 0.025 * (1.0 - Math.abs(0.5 - t) * 1.6));
          p[i * 3 + 0] += wob * (Math.random() * 2 - 1) * 0.2;
          p[i * 3 + 1] += wob * (Math.random() * 2 - 1) * 0.2;
          p[i * 3 + 2] += wob * (Math.random() * 2 - 1) * 0.2;
        }
        o.geometry.attributes.position.needsUpdate = true;
      });
    });
  }

  return {
    fx,
    spawnFX,
    updateFX,
    killAllFX,
    makeBeam,
    makeProjectile,
    makeSparkBurst,
    spawnEMP,
    spawnIonArcs,
  };
}

