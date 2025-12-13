import { THREE } from '../vendor/three.js';
import { makeGlowSprite } from '../gfx/glowSprite.js';
import { emissive } from './materials.js';
import { MAX_IMPACTS, shieldFrag, shieldVert } from './shieldShaders.js';

export function createShieldSystem({ scene, shipRoot, envCube, clamp, state, clock, triggerImpactCam, fxState }) {
  const shieldUniforms = {
    uTime: { value: 0 },
    uPreset: { value: 0 },
    uBaseColor: { value: new THREE.Color(0x2b8cff) },
    uRimColor: { value: new THREE.Color(0xb6f7ff) },
    uOpacity: { value: 0.28 },
    uThickness: { value: 0.75 },
    uFresnelPower: { value: 3.4 },
    uFresnelIntensity: { value: 1.25 },
    uNoiseScale: { value: 2.25 },
    uNoiseSpeed: { value: 0.65 },
    uNoiseIntensity: { value: 0.75 },
    uHexDensity: { value: 14.0 },
    uRippleStrength: { value: 1.15 },
    uRippleSpeed: { value: 2.8 },
    uRippleDecay: { value: 2.15 },
    uOverload: { value: 0.0 },
    uEnergy: { value: 1.0 },
    uEmp: { value: 0.0 },
    uEnv: { value: envCube },
    uImpactCount: { value: 0 },
    uImpactPos: { value: Array.from({ length: MAX_IMPACTS }, () => new THREE.Vector3(0, 1, 0)) },
    uImpactTime: { value: new Float32Array(MAX_IMPACTS) },
    uImpactStrength: { value: new Float32Array(MAX_IMPACTS) },
    uImpactType: { value: new Float32Array(MAX_IMPACTS) },
  };

  const shieldMat = new THREE.ShaderMaterial({
    vertexShader: shieldVert,
    fragmentShader: shieldFrag,
    uniforms: shieldUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });

  const shieldGeo = new THREE.SphereGeometry(1.75, 96, 64);
  const shield = new THREE.Mesh(shieldGeo, shieldMat);
  shield.position.copy(shipRoot.position);
  shield.renderOrder = 2;
  scene.add(shield);

  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x66d9ff,
    transparent: true,
    opacity: 0.05,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
  });
  const shieldGlow = new THREE.Mesh(new THREE.SphereGeometry(1.78, 48, 32), glowMat);
  shieldGlow.position.copy(shield.position);
  shieldGlow.renderOrder = 1;
  scene.add(shieldGlow);

  const aim = new THREE.Group();
  scene.add(aim);
  const aimDot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 18, 18), emissive(0xb6f7ff, 2.8));
  const aimGlow = makeGlowSprite(new THREE.Color(0xb6f7ff), 0.9);
  aimGlow.scale.setScalar(0.55);
  aim.add(aimDot);
  aim.add(aimGlow);
  aim.visible = false;

  const impacts = [];

  function addImpact(worldPoint, type, strength = 1.0) {
    const local = shield.worldToLocal(worldPoint.clone());
    const dir = local.clone().normalize();

    const t = clock.getElapsedTime();
    const s = clamp(strength, 0.0, 2.0);

    impacts.push({ dir, t, s, type });
    while (impacts.length > MAX_IMPACTS) impacts.shift();

    shieldUniforms.uImpactCount.value = impacts.length;
    for (let i = 0; i < MAX_IMPACTS; i++) {
      if (i < impacts.length) {
        shieldUniforms.uImpactPos.value[i].copy(impacts[i].dir);
        shieldUniforms.uImpactTime.value[i] = impacts[i].t;
        shieldUniforms.uImpactStrength.value[i] = impacts[i].s;
        shieldUniforms.uImpactType.value[i] = impacts[i].type;
      } else {
        shieldUniforms.uImpactPos.value[i].set(0, 1, 0);
        shieldUniforms.uImpactTime.value[i] = -9999;
        shieldUniforms.uImpactStrength.value[i] = 0;
        shieldUniforms.uImpactType.value[i] = 0;
      }
    }

    fxState.flashKick = 1.0;
    if (state.impactCam) triggerImpactCam(worldPoint);
  }

  return { shield, shieldGlow, glowMat, shieldUniforms, impacts, addImpact, aim, MAX_IMPACTS };
}

