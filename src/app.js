import { THREE, OrbitControls } from './vendor/three.js';
import { clamp, lerp, smoothstep, fmt } from './utils.js';
import { makeGlowSprite } from './gfx/glowSprite.js';
import { createEnvCube } from './lab/envCube.js';
import { createLabEnvironment } from './lab/environment.js';
import { createShipSystem } from './lab/ships.js';
import { createTurret } from './lab/turret.js';
import { createShieldSystem } from './lab/shield.js';
import { createFxSystem } from './lab/fx.js';

export function startApp() {
  // -----------------------------
  // Utilities
  // -----------------------------
  const hexToColor = (hex) => new THREE.Color(hex);

  // -----------------------------
  // Renderer / Scene / Camera
  // -----------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.physicallyCorrectLights = true;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.5, 3500);
  camera.position.set(20, 9, 20);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 12.0;
  controls.maxDistance = 260.0;
  controls.target.set(0, 1.2, 0);

  const clock = new THREE.Clock();

  // -----------------------------
  // State
  // -----------------------------
  const state = {
    ship: 'fighter',
    preset: 0,
    weapon: 'laser',
    slow: 1.0,
    impactCam: true,
    tightBubble: false,

    baseColor: '#2b8cff',
    rimColor: '#b6f7ff',
    opacity: 0.28,
    thickness: 0.75,
    fresPow: 3.4,
    fresInt: 1.25,
    noiseScale: 2.25,
    noiseSpeed: 0.65,
    noiseInt: 0.75,
    hexDensity: 14.0,
    radius: 8.5,

    rippleStr: 1.15,
    rippleSpd: 2.8,
    rippleDec: 2.15,

    overThr: 1.25,
    recRate: 0.28,

    dmg: 1.0,
    fireRate: 6.0,
  };

  // -----------------------------
  // Environment
  // -----------------------------
  const envCube = createEnvCube();
  scene.environment = envCube;
  scene.background = envCube;
  const env = createLabEnvironment({ scene, renderer });

  // -----------------------------
  // Ship / Turret / Shield / FX
  // -----------------------------
  const ships = createShipSystem(scene);
  const turretSys = createTurret(scene);

  const fxState = { flashKick: 0.0 };

  let camKick = 0.0;
  const camKickTarget = new THREE.Vector3();
  const camBasePos = camera.position.clone();
  const camBaseTarget = controls.target.clone();

  function triggerImpactCam(worldPoint) {
    camKick = 1.0;
    camKickTarget.copy(worldPoint);
    camBasePos.copy(camera.position);
    camBaseTarget.copy(controls.target);
  }

  const shieldSys = createShieldSystem({
    scene,
    shipRoot: ships.shipRoot,
    envCube,
    clamp,
    state,
    clock,
    triggerImpactCam,
    fxState,
  });

  const fxSys = createFxSystem({
    scene,
    clock,
    shield: shieldSys.shield,
    state,
    getShipEmitters: ships.getEmitters,
  });

  // -----------------------------
  // Weapons
  // -----------------------------
  const WEAPON = {
    laser: { type: 0, travel: 0.0, ringMul: 0.55, hotMul: 0.75, spark: 0.18, beam: true },
    plasma: { type: 1, travel: 0.55, ringMul: 0.9, hotMul: 1.35, spark: 0.25, beam: false },
    kinetic: { type: 2, travel: 0.22, ringMul: 1.3, hotMul: 0.65, spark: 0.55, beam: false },
    railgun: { type: 3, travel: 0.0, ringMul: 1.55, hotMul: 0.85, spark: 0.65, beam: true },
    emp: { type: 4, travel: 0.0, ringMul: 0.45, hotMul: 0.25, spark: 0.1, beam: false },
    ion: { type: 5, travel: 0.0, ringMul: 0.8, hotMul: 1.0, spark: 0.35, beam: true },
  };

  // -----------------------------
  // Aim / Raycast
  // -----------------------------
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2(0, 0);
  let lastAimPoint = null;

  function updateTurretAim(targetWorld) {
    const headWorld = turretSys.turret.localToWorld(new THREE.Vector3(0, 0.8, 0));
    const dir = targetWorld.clone().sub(headWorld).normalize();
    const yaw = Math.atan2(dir.x, dir.z);
    const pitch = Math.asin(clamp(dir.y, -0.85, 0.85));
    turretSys.turret.rotation.y = yaw;
    turretSys.turretHead.rotation.x = -pitch * 0.55;
    turretSys.muzzle.rotation.x = Math.PI / 2 - pitch * 0.55;
  }

  function setAimAt(pointWorld) {
    lastAimPoint = pointWorld.clone();
    shieldSys.aim.visible = true;
    shieldSys.aim.position.copy(pointWorld);
    updateTurretAim(pointWorld);
  }

  function raycastShield(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const hit = raycaster.intersectObject(shieldSys.shield, false);
    if (hit.length) return hit[0].point.clone();
    return null;
  }

  renderer.domElement.addEventListener('pointerdown', (e) => {
    const p = raycastShield(e.clientX, e.clientY);
    if (p) setAimAt(p);
  });

  // -----------------------------
  // Shield energy + overload model
  // -----------------------------
  let shieldEnergy = 1.0;
  let overheat = 0.0;
  let empAmount = 0.0;
  let lastImpactEnergy = 0.0;

  function resetShield() {
    shieldEnergy = 1.0;
    overheat = 0.0;
    empAmount = 0.0;
    shieldSys.impacts.length = 0;
    shieldSys.shieldUniforms.uImpactCount.value = 0;
    fxSys.killAllFX();
  }

  // -----------------------------
  // Firing logic
  // -----------------------------
  function getMuzzleWorld() {
    return turretSys.turret.localToWorld(new THREE.Vector3(0, 0.8, 1.15));
  }

  function ensureAim() {
    if (!lastAimPoint) {
      const p = shieldSys.shield.position
        .clone()
        .add(new THREE.Vector3(0.9, 0.45, 0.9).normalize().multiplyScalar(state.radius));
      setAimAt(p);
    }
  }

  function fireOnce(customWeapon = null, customPoint = null) {
    ensureAim();
    const wName = customWeapon || state.weapon;
    const w = WEAPON[wName];

    const aimPoint = (customPoint || lastAimPoint).clone();
    updateTurretAim(aimPoint);

    const muzzleW = getMuzzleWorld();

    const baseDmg = state.dmg;
    const weaponMult =
      wName === 'laser'
        ? 0.55
        : wName === 'plasma'
          ? 0.9
          : wName === 'kinetic'
            ? 1.05
            : wName === 'railgun'
              ? 1.55
              : wName === 'emp'
                ? 0.65
                : 0.95;

    const dmg = baseDmg * weaponMult;
    lastImpactEnergy = dmg;

    shieldEnergy = clamp(shieldEnergy - dmg * 0.035, 0.0, 1.0);
    overheat += dmg * (wName === 'laser' ? 0.12 : wName === 'emp' ? 0.22 : 0.18);
    if (wName === 'railgun') overheat += dmg * 0.25;
    if (wName === 'plasma') overheat += dmg * 0.18;

    if (wName === 'emp') empAmount = clamp(empAmount + 0.85, 0.0, 1.2);

    const doImpact = (point) => {
      const strength = clamp(dmg * 0.55, 0.15, 1.6);
      shieldSys.addImpact(point, w.type, strength);

      const sparkCount = Math.floor(18 + 30 * w.spark * (0.6 + Math.random() * 0.6));
      fxSys.makeSparkBurst(point, 0xb6f7ff, sparkCount, 0.22 + 0.1 * w.spark, 0.28 + 0.1 * w.spark);

      if (wName === 'emp') {
        fxSys.spawnEMP(shieldSys.shield.position.clone(), state.radius * 1.45, 0xb6f7ff);
      }
      if (wName === 'ion') {
        fxSys.spawnIonArcs(point, 0x66ffcc);
      }
    };

    if (w.beam) {
      const beamColor =
        wName === 'laser' ? 0x66d9ff : wName === 'railgun' ? 0xb6f7ff : wName === 'ion' ? 0x66ffcc : 0x66d9ff;

      const thick = wName === 'railgun' ? 0.055 : wName === 'ion' ? 0.045 : 0.035;

      const beam = fxSys.makeBeam(muzzleW, aimPoint, beamColor, thick, 0.9);
      fxSys.spawnFX(
        beam,
        wName === 'laser' || wName === 'ion' ? 0.09 : 0.14,
        (o, age) => {
          o.material.opacity =
            (wName === 'railgun' ? 0.95 : 0.85) * (1.0 - age / (o.userData.life || 0.12));
        }
      );
      doImpact(aimPoint);
    } else {
      const color =
        wName === 'plasma' ? 0xff7a3c : wName === 'kinetic' ? 0xffffff : wName === 'emp' ? 0xb6f7ff : 0xffffff;

      const proj = fxSys.makeProjectile(color, wName === 'plasma' ? 0.095 : 0.06);
      proj.position.copy(muzzleW);
      proj.userData.start = muzzleW.clone();
      proj.userData.end = aimPoint.clone();
      proj.userData.travel = w.travel;

      fxSys.spawnFX(proj, Math.max(0.2, w.travel + 0.15), (o, age) => {
        const T = o.userData.travel;
        const t = T <= 0 ? 1.0 : clamp(age / T, 0.0, 1.0);
        const p = o.userData.start.clone().lerp(o.userData.end, smoothstep(0.0, 1.0, t));
        o.position.copy(p);

        if (wName === 'kinetic') {
          const trail = fxSys.makeBeam(o.userData.start, p, 0xffffff, 0.015, 0.35);
          fxSys.spawnFX(trail, 0.06);
        }

        if (t >= 1.0 && !o.userData.hit) {
          o.userData.hit = true;
          doImpact(o.userData.end);

          if (wName === 'plasma') {
            const splash = makeGlowSprite(new THREE.Color(0xff7a3c), 1.15);
            splash.position.copy(o.userData.end);
            splash.scale.setScalar(1.25);
            fxSys.spawnFX(splash, 0.45, (sp, a) => {
              sp.material.opacity = 0.95 * (1.0 - a / 0.45);
              sp.scale.setScalar(lerp(1.2, 2.0, a / 0.45));
            });
          }
        }
      });
    }
  }

  // -----------------------------
  // Test runners
  // -----------------------------
  const runners = new Set();
  function clearRunners() {
    for (const r of runners) r.stop();
    runners.clear();
  }
  function makeRunner(stopFn) {
    const r = { stop: stopFn };
    runners.add(r);
    return r;
  }

  function burstTest() {
    clearRunners();
    ensureAim();
    const shots = 20;
    const duration = 3.0;
    const interval = duration / shots;
    let i = 0;
    const id = setInterval(() => {
      fireOnce();
      i++;
      if (i >= shots) {
        clearInterval(id);
        runners.delete(runner);
      }
    }, interval * 1000);
    const runner = makeRunner(() => clearInterval(id));
  }

  function sustainedTest() {
    clearRunners();
    ensureAim();
    const seconds = 10.0;
    const dt = 1.0 / Math.max(0.1, state.fireRate);
    let t = 0;
    const id = setInterval(() => {
      fireOnce();
      t += dt;
      if (t >= seconds) {
        clearInterval(id);
        runners.delete(runner);
      }
    }, dt * 1000);
    const runner = makeRunner(() => clearInterval(id));
  }

  function precisionScenario() {
    clearRunners();
    ensureAim();
    const seconds = 6.0;
    const dt = 1.0 / Math.max(0.1, state.fireRate);
    let t = 0;
    const aimP = lastAimPoint.clone();
    const id = setInterval(() => {
      fireOnce(null, aimP);
      t += dt;
      if (t >= seconds) {
        clearInterval(id);
        runners.delete(runner);
      }
    }, dt * 1000);
    const runner = makeRunner(() => clearInterval(id));
  }

  function scatterScenario() {
    clearRunners();
    const seconds = 6.0;
    const dt = 1.0 / Math.max(0.1, state.fireRate);
    let t = 0;
    const id = setInterval(() => {
      const v = new THREE.Vector3(Math.random() * 2 - 1, (Math.random() * 2 - 1) * 0.6 + 0.2, Math.random() * 2 - 1).normalize();
      if (v.z < 0) v.z *= -1;
      const p = shieldSys.shield.position.clone().addScaledVector(v, state.radius);
      setAimAt(p);
      fireOnce(null, p);
      t += dt;
      if (t >= seconds) {
        clearInterval(id);
        runners.delete(runner);
      }
    }, dt * 1000);
    const runner = makeRunner(() => clearInterval(id));
  }

  function sweepScenario() {
    clearRunners();
    const seconds = 7.0;
    const dt = 1.0 / Math.max(0.1, state.fireRate);
    let t = 0;
    const t0 = clock.getElapsedTime();
    const id = setInterval(() => {
      const a = (clock.getElapsedTime() - t0) * 0.9;
      const v = new THREE.Vector3(Math.cos(a) * 0.9, 0.25 + 0.55 * Math.sin(a * 1.35), Math.sin(a) * 0.9).normalize();
      const p = shieldSys.shield.position.clone().addScaledVector(v, state.radius);
      setAimAt(p);
      fireOnce(null, p);
      t += dt;
      if (t >= seconds) {
        clearInterval(id);
        runners.delete(runner);
      }
    }, dt * 1000);
    const runner = makeRunner(() => clearInterval(id));
  }

  function stressScenario() {
    clearRunners();
    const order = ['laser', 'plasma', 'kinetic', 'railgun', 'emp', 'ion'];
    let idx = 0;
    const seconds = 8.5;
    const dt = 0.18;
    let t = 0;
    const id = setInterval(() => {
      const w = order[idx % order.length];
      const a = clock.getElapsedTime() * 1.2;
      const v = new THREE.Vector3(Math.cos(a * 0.9), 0.25 + 0.55 * Math.sin(a * 1.1), Math.sin(a * 0.75)).normalize();
      const p = shieldSys.shield.position.clone().addScaledVector(v, state.radius);
      setAimAt(p);
      fireOnce(w, p);
      idx++;
      t += dt;
      if (t >= seconds) {
        clearInterval(id);
        runners.delete(runner);
      }
    }, dt * 1000);
    const runner = makeRunner(() => clearInterval(id));
  }

  // -----------------------------
  // Auto sweep
  // -----------------------------
  let autoSweep = false;
  function toggleAutoSweep() {
    autoSweep = !autoSweep;
    document.getElementById('autoSweepBtn').textContent = autoSweep ? 'Auto Sweep (ON)' : 'Auto Impact Sweep';
  }

  let autoFireAcc = 0.0;
  function updateAutoSweep(t, dt) {
    if (!autoSweep) return;
    const a = t * 0.9;
    const v = new THREE.Vector3(Math.cos(a * 1.05) * 0.9, 0.2 + 0.55 * Math.sin(a * 1.33), Math.sin(a * 0.78) * 0.9).normalize();

    const p = shieldSys.shield.position.clone().addScaledVector(v, state.radius);
    setAimAt(p);

    autoFireAcc += dt;
    const step = 1.0 / Math.max(0.1, state.fireRate);
    if (autoFireAcc >= step) {
      autoFireAcc = 0.0;
      fireOnce(null, p);
    }
  }

  // -----------------------------
  // Impact Camera
  // -----------------------------
  function updateImpactCam(dt) {
    if (camKick <= 0.0) return;
    camKick = Math.max(0.0, camKick - dt * 2.8);
    const k = smoothstep(0.0, 1.0, camKick);

    const toCam = camBasePos.clone().sub(camBaseTarget);
    const dist = toCam.length();
    const dir = toCam.normalize();

    const desiredDist = lerp(dist, Math.max(2.4, dist * 0.72), k);
    const desiredTarget = camBaseTarget.clone().lerp(camKickTarget, 0.22 * k);

    controls.target.copy(desiredTarget);
    camera.position.copy(desiredTarget.clone().addScaledVector(dir, desiredDist));
    camera.lookAt(controls.target);
  }

  // -----------------------------
  // UI wiring
  // -----------------------------
  const ui = {
    shipSel: document.getElementById('shipSel'),
    presetSel: document.getElementById('presetSel'),
    weaponSel: document.getElementById('weaponSel'),
    slowSel: document.getElementById('slowSel'),
    impactCam: document.getElementById('impactCam'),
    tightBubble: document.getElementById('tightBubble'),

    baseColor: document.getElementById('baseColor'),
    rimColor: document.getElementById('rimColor'),

    opacity: document.getElementById('opacity'),
    thickness: document.getElementById('thickness'),
    fresnelPow: document.getElementById('fresnelPow'),
    fresnelInt: document.getElementById('fresnelInt'),
    noiseScale: document.getElementById('noiseScale'),
    noiseSpeed: document.getElementById('noiseSpeed'),
    noiseInt: document.getElementById('noiseInt'),
    hexDensity: document.getElementById('hexDensity'),
    radius: document.getElementById('radius'),

    rippleStr: document.getElementById('rippleStr'),
    rippleSpd: document.getElementById('rippleSpd'),
    rippleDec: document.getElementById('rippleDec'),
    overThr: document.getElementById('overThr'),
    recRate: document.getElementById('recRate'),
    dmg: document.getElementById('dmg'),
    firerate: document.getElementById('firerate'),

    fireBtn: document.getElementById('fireBtn'),
    burstBtn: document.getElementById('burstBtn'),
    sustainBtn: document.getElementById('sustainBtn'),
    resetBtn: document.getElementById('resetBtn'),

    precisionBtn: document.getElementById('precisionBtn'),
    scatterBtn: document.getElementById('scatterBtn'),
    sweepBtn: document.getElementById('sweepBtn'),
    stressBtn: document.getElementById('stressBtn'),
    autoSweepBtn: document.getElementById('autoSweepBtn'),
  };

  const shieldUniforms = shieldSys.shieldUniforms;

  function bindSlider(slider, valueEl, key, fmtFn = (v) => fmt(v, 2), suffix = '') {
    const update = () => {
      state[key] = parseFloat(slider.value);
      valueEl.textContent = fmtFn(state[key]) + suffix;
    };
    slider.addEventListener('input', update);
    update();
  }

  bindSlider(ui.opacity, document.getElementById('opacityV'), 'opacity', (v) => fmt(v, 2));
  bindSlider(ui.thickness, document.getElementById('thicknessV'), 'thickness', (v) => fmt(v, 2));
  bindSlider(ui.fresnelPow, document.getElementById('fresnelPowV'), 'fresPow', (v) => fmt(v, 2));
  bindSlider(ui.fresnelInt, document.getElementById('fresnelIntV'), 'fresInt', (v) => fmt(v, 2));
  bindSlider(ui.noiseScale, document.getElementById('noiseScaleV'), 'noiseScale', (v) => fmt(v, 2));
  bindSlider(ui.noiseSpeed, document.getElementById('noiseSpeedV'), 'noiseSpeed', (v) => fmt(v, 2));
  bindSlider(ui.noiseInt, document.getElementById('noiseIntV'), 'noiseInt', (v) => fmt(v, 2));
  bindSlider(ui.hexDensity, document.getElementById('hexDensityV'), 'hexDensity', (v) => fmt(v, 1));
  bindSlider(ui.radius, document.getElementById('radiusV'), 'radius', (v) => fmt(v, 2));

  bindSlider(ui.rippleStr, document.getElementById('rippleStrV'), 'rippleStr', (v) => fmt(v, 2));
  bindSlider(ui.rippleSpd, document.getElementById('rippleSpdV'), 'rippleSpd', (v) => fmt(v, 2));
  bindSlider(ui.rippleDec, document.getElementById('rippleDecV'), 'rippleDec', (v) => fmt(v, 2));

  bindSlider(ui.overThr, document.getElementById('overThrV'), 'overThr', (v) => fmt(v, 2));
  bindSlider(ui.recRate, document.getElementById('recRateV'), 'recRate', (v) => fmt(v, 2));
  bindSlider(ui.dmg, document.getElementById('dmgV'), 'dmg', (v) => fmt(v, 2));
  bindSlider(ui.firerate, document.getElementById('firerateV'), 'fireRate', (v) => fmt(v, 1), '/s');

  ui.baseColor.addEventListener('input', () => (state.baseColor = ui.baseColor.value));
  ui.rimColor.addEventListener('input', () => (state.rimColor = ui.rimColor.value));

  ui.shipSel.addEventListener('change', () => {
    state.ship = ui.shipSel.value;
    ships.setShip(state.ship);
  });

  ui.presetSel.addEventListener('change', () => {
    state.preset = parseInt(ui.presetSel.value, 10);
    shieldUniforms.uPreset.value = state.preset;
  });

  ui.weaponSel.addEventListener('change', () => (state.weapon = ui.weaponSel.value));
  ui.slowSel.addEventListener('change', () => (state.slow = parseFloat(ui.slowSel.value)));
  ui.impactCam.addEventListener('change', () => (state.impactCam = ui.impactCam.checked));
  ui.tightBubble.addEventListener('change', () => (state.tightBubble = ui.tightBubble.checked));

  ui.fireBtn.addEventListener('click', () => {
    clearRunners();
    fireOnce();
  });
  ui.burstBtn.addEventListener('click', burstTest);
  ui.sustainBtn.addEventListener('click', sustainedTest);
  ui.resetBtn.addEventListener('click', () => {
    clearRunners();
    resetShield();
  });

  ui.precisionBtn.addEventListener('click', precisionScenario);
  ui.scatterBtn.addEventListener('click', scatterScenario);
  ui.sweepBtn.addEventListener('click', sweepScenario);
  ui.stressBtn.addEventListener('click', stressScenario);
  ui.autoSweepBtn.addEventListener('click', toggleAutoSweep);

  // -----------------------------
  // Keyboard shortcuts
  // -----------------------------
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Space') {
      e.preventDefault();
      clearRunners();
      fireOnce();
    }
    if (e.key.toLowerCase() === 'r') {
      clearRunners();
      resetShield();
    }
    if (e.key.toLowerCase() === 'c') {
      state.impactCam = !state.impactCam;
      ui.impactCam.checked = state.impactCam;
    }
    if (e.key.toLowerCase() === 'o') toggleAutoSweep();
    if (e.key >= '1' && e.key <= '6') {
      const order = ['laser', 'plasma', 'kinetic', 'railgun', 'emp', 'ion'];
      state.weapon = order[parseInt(e.key, 10) - 1];
      ui.weaponSel.value = state.weapon;
    }
  });

  // -----------------------------
  // HUD
  // -----------------------------
  let fpsAcc = 0,
    fpsFrames = 0;
  const fpsEl = document.getElementById('fps');
  const energyEl = document.getElementById('energy');
  const overloadEl = document.getElementById('overload');
  const overPill = document.getElementById('overPill');
  const energyPill = document.getElementById('energyPill');

  function syncUniforms(t) {
    shieldUniforms.uTime.value = t;
    shieldUniforms.uBaseColor.value.copy(hexToColor(state.baseColor));
    shieldUniforms.uRimColor.value.copy(hexToColor(state.rimColor));
    shieldUniforms.uOpacity.value = state.opacity;
    shieldUniforms.uThickness.value = state.thickness;
    shieldUniforms.uFresnelPower.value = state.fresPow;
    shieldUniforms.uFresnelIntensity.value = state.fresInt;
    shieldUniforms.uNoiseScale.value = state.noiseScale;
    shieldUniforms.uNoiseSpeed.value = state.noiseSpeed;
    shieldUniforms.uNoiseIntensity.value = state.noiseInt;
    shieldUniforms.uHexDensity.value = state.hexDensity;
    shieldUniforms.uRippleStrength.value = state.rippleStr;
    shieldUniforms.uRippleSpeed.value = state.rippleSpd;
    shieldUniforms.uRippleDecay.value = state.rippleDec;

    shieldUniforms.uEnergy.value = shieldEnergy;
    shieldUniforms.uOverload.value = clamp((overheat - state.overThr) / 1.0, 0.0, 1.0);
    shieldUniforms.uEmp.value = clamp(empAmount, 0.0, 1.0);

    shieldSys.shield.scale.setScalar(state.radius / 1.75);
    shieldSys.shieldGlow.scale.setScalar((state.radius * 1.018) / 1.78);
    shieldSys.aim.scale.setScalar(state.radius / 1.75);

    if (state.tightBubble) {
      shieldSys.shield.scale.setScalar((state.radius * 0.93) / 1.75);
      shieldSys.shieldGlow.scale.setScalar((state.radius * 0.96) / 1.78);
      shieldUniforms.uOpacity.value = clamp(state.opacity + 0.03, 0.02, 0.9);
    }

    shieldSys.glowMat.color.copy(hexToColor(state.rimColor)).multiplyScalar(0.9);
    shieldSys.glowMat.opacity = 0.028 + 0.028 * state.fresInt + 0.04 * clamp(1.0 - shieldEnergy, 0, 1);
  }

  function updateEnergy(dt) {
    shieldEnergy = clamp(shieldEnergy + state.recRate * dt * 0.08, 0.0, 1.0);

    const cool = (0.45 + 0.55 * shieldEnergy) * state.recRate;
    overheat = Math.max(0.0, overheat - cool * dt * 0.55);

    empAmount = Math.max(0.0, empAmount - dt * 0.85);

    const overload = clamp((overheat - state.overThr) / 1.0, 0.0, 1.0);
    if (overload > 0.0) {
      shieldEnergy = clamp(shieldEnergy - overload * dt * 0.04, 0.0, 1.0);
    }
  }

  function updateHUD() {
    const pct = Math.round(shieldEnergy * 100);
    energyEl.textContent = pct;

    const overloaded = overheat > state.overThr + 0.02;
    overloadEl.textContent = overloaded ? 'YES' : 'NO';
    overPill.classList.toggle('warn', overloaded);
    overPill.classList.toggle('ok', !overloaded);
    energyPill.classList.toggle('warn', pct < 25);
    energyPill.classList.toggle('ok', pct >= 25);
  }

  // -----------------------------
  // Resize
  // -----------------------------
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  ensureAim();

  // -----------------------------
  // Main loop
  // -----------------------------
  function tick() {
    const rawDt = clock.getDelta();
    const dt = rawDt * state.slow;
    const t = clock.getElapsedTime();

    const currentShip = ships.getCurrentShip();
    if (currentShip) {
      currentShip.rotation.y += dt * 0.12;
      shieldSys.shield.position.copy(ships.shipRoot.position);
      shieldSys.shieldGlow.position.copy(ships.shipRoot.position);
    }

    if (lastAimPoint) updateTurretAim(lastAimPoint);

    fxState.flashKick = Math.max(0.0, fxState.flashKick - dt * 5.0);

    updateEnergy(dt);
    fxSys.updateFX(dt);
    env.animatePracticals(t, fxState.flashKick);
    updateAutoSweep(t, dt);

    syncUniforms(t);
    updateHUD();

    if (state.impactCam) updateImpactCam(dt);

    controls.update();
    renderer.render(scene, camera);

    fpsAcc += rawDt;
    fpsFrames++;
    if (fpsAcc >= 0.5) {
      const fps = Math.round(fpsFrames / fpsAcc);
      fpsEl.textContent = fps;
      fpsAcc = 0;
      fpsFrames = 0;
    }

    requestAnimationFrame(tick);
  }

  tick();

  return { renderer, scene, camera, controls, state };
}
