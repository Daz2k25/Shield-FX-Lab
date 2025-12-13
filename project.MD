# Shield FX Lab

Interactive Three.js "shield bubble" VFX testing lab. The goal is fast iteration on shield readability (rim/Fresnel, noise flow, hex/cellular patterns) plus impact response (ripples, hotspots, cracks) under different weapon types.

## Repository layout

- `index.html` - UI markup + loads the ES module entrypoint
- `styles.css` - UI styling
- `src/` - JavaScript modules (app + lab subsystems)
- `src/modes/` - mode bootstrappers for the lab and arena routers
- `index.single.html` - original single-file prototype kept for reference
- `README.md` / `project.MD` - docs

## Quick start

This project is designed to run directly in a browser.

1. Start a local web server (recommended):
   - `python -m http.server 8000`
   - or on Windows: `py -m http.server 8000`
2. Open `http://localhost:8000/` and load `index.html`.

Notes:
- Internet access is required by default because the app imports Three.js/OrbitControls from a CDN (ES modules):
  - `three@0.128.0/build/three.module.js`
  - `three@0.128.0/examples/jsm/controls/OrbitControls.js`
- You can run it via `file://` in some browsers, but a local server avoids quirks and is the most reliable approach.

## Controls

- Orbit camera: click-drag to rotate, scroll to zoom (OrbitControls)
- Aim point: click the shield surface to set the impact location (raycast)
- Keyboard shortcuts:
  - `Space` - fire once
  - `R` - reset shield (energy/overheat/EMP + clear FX)
  - `C` - toggle Impact Camera
  - `O` - toggle Auto Impact Sweep
  - `1`-`6` - select weapon (laser/plasma/kinetic/railgun/emp/ion)

HUD (top-left) shows FPS, shield energy %, and overload state.

## Arena v1 direction

- Scope and rules:
  - Default battle size: 2 fleets × 8 ships (fighters/interceptors/corvettes) tuned for VFX readability.
  - Stress battle size: 2 fleets × 30 ships to validate performance and visual clarity under load.
  - Destruction model: v1 focuses on shield breaks; ships are disabled when shields collapse, with hull damage deferred.
  - Arena shape: soft spherical boundary (pushback + speed clamp) sized for mid-range engagements.
  - Win condition: last fleet with active ships; 5-minute timeout falls back to a score based on shield uptime/impacts.
- VFX-first success criteria:
  - Impacts readable at default camera distances via rim/hotspot silhouettes and per-weapon color signatures.
  - Dense impact sequences remain distinguishable through positional spread and capped clustering per shield.
  - Overload/recovery states visibly obvious (heat shimmer, opacity/pulse cues), distinct from EMP/ion looks.
  - Target performance: 60 FPS at 1080p for default battles; graceful degradation strategies for stress tests.
- Determinism plan:
  - Replays must be reproducible across refreshes from a scenario seed.
  - Per-ship seeds derive from the scenario seed + deterministic entity IDs; no `Math.random()` in sim paths.
  - Fixed simulation tick: 60 Hz; rendering remains decoupled from simulation timing.

## What the lab simulates

- Shield energy (`shieldEnergy`): drains on hits and regenerates over time via Recovery Rate.
- Overheat/overload (`overheat` + threshold): when above threshold, the shield becomes visually unstable (overload pulse).
- EMP (`empAmount`): adds global flicker/scanline distortion and tints the shield toward a "glassy" look.
- Ion: spawns arc-like visuals that crawl toward ship "emitter nodes".

## Shield presets (UI: "Shield Preset")

Implemented in the fragment shader (`shieldFrag`) with `uPreset`:

0. Classic Energy Bubble
1. Hex / Cellular
2. Magnetic Field Lines
3. Hard-light Glass

## Weapons (UI: "Weapon")

Weapons are defined in `WEAPON` and are used to drive both visuals and the "impact type" injected into the shader:

- Laser (beam)
- Plasma (projectile)
- Kinetic (projectile)
- Railgun (beam)
- EMP (pulse effect + global flicker)
- Ion (beam + arcs)

Each weapon influences impact strength, spark amount, ring/hot multipliers, and energy/overheat changes.

## How `src/` is organized (high level)

- `src/main.js` is the entrypoint (calls `startApp()`).
- `src/app.js` orchestrates setup, input/UI wiring, gameplay logic, and the render loop.
- `src/lab/*` contains the main subsystems (environment, ships, turret, shield, FX).

- Renderer/scene/camera: WebGLRenderer with sRGB output + ACES tone mapping; OrbitControls.
- Procedural environment:
  - procedural cube texture used for fake refraction/reflection in the shield shader (`uEnv`)
  - deep space set dressing (layered starfields, nebula sprites, distant planet) + cinematic sun/rim lighting
  - glow sprites (canvas-generated) for "fake bloom"
- Ship factory:
  - procedural ship silhouettes (`buildFighter`, `buildInterceptor`, `buildCorvette`, `buildFreighter`)
  - ships also define "emitter nodes" used by ion/arc visuals
- Turret:
  - a simple geometry "turret" that aims at the active impact point and emits shots
- Shield:
  - main shield mesh: sphere + custom `THREE.ShaderMaterial` (additive + transparent)
  - secondary outer glow layer: a back-side sphere for cheap bloom/thickness cues
  - impacts: up to `MAX_IMPACTS = 8` are passed to the shader via uniform arrays (`uImpactPos`, `uImpactTime`, `uImpactStrength`, `uImpactType`)
- FX system:
  - transient effect objects are tracked in `activeFX` with lifetimes and optional per-frame update functions
- Test harness:
  - "Burst", "Sustained", "Precision/Scatter/Sweep", "Stress Test", and "Auto Impact Sweep"
  - interval runners are tracked in `runners` so scenarios can be cancelled/overridden cleanly
- UI wiring:
  - input elements update a central `state` object
  - `syncUniforms()` pushes state into shader uniforms every frame
- Main loop:
  - updates energy/overheat/EMP, active FX, lights, auto sweep, uniforms, HUD, and renders each frame

## Extending the lab

- Add a new shield preset:
  - Add an option to `#presetSel` in the HTML UI.
  - Add a new `if (uPreset == N)` branch in `src/lab/shieldShaders.js` (`shieldFrag`) and (if needed) new uniforms.
- Add a new weapon:
  - Add an option to `#weaponSel`.
  - Add an entry in `WEAPON` in `src/app.js` and update the keybinding order (1-6) if you want it selectable via keys.
  - Implement any special-case behavior in `fireOnce()` / `doImpact()` (e.g., EMP/Ion effects) in `src/app.js`.

## Notes / known rough edges

- Some UI strings include garbled characters (mojibake), which usually indicates a text encoding mismatch; converting `index.html` to UTF-8 and replacing those strings will clean up the UI text.
- There's no build system or package manager config yet; if you want offline use, vendor the CDN modules locally and update the import URLs in `src/vendor/three.js` (or use a bundler like Vite).
