# Shield FX Lab - Master Task List (Personal)

This is the master checklist for evolving this project from a single-ship FX lab into an arena combat sim where fleets fight each other, with the primary goal being **shield impact / readability VFX**.

Conventions:
- Mark completed items with `[X]` (uppercase X).
- Keep tasks small enough to finish in a focused session where possible.
- If a task becomes unclear, add a sub-task to clarify requirements before implementing.

---

## 0) Current baseline (already done)

- [X] Split the prototype into a multi-file ES module project (`src/`, `styles.css`)
- [X] Preserve the original all-in-one file as `index.single.html`
- [X] Fix ESM module resolution with an import map in `index.html`
- [X] Add a favicon to stop `favicon.ico` 404 noise
- [X] Replace hangar test bay with a deep-space environment module
- [X] Make the ship + shield larger and adjust camera framing for the new scale
- [X] Document current structure in `README.md` and `project.MD`

---

## 1) High-level product decisions (lock these early)

- [ ] Decide target scope for v1 arena mode (ship count, weapon types, victory conditions)
  - [ ] Pick default battle size (example: 2 fleets x 8 ships)
  - [ ] Pick stress battle size (example: 2 fleets x 30 ships)
  - [ ] Decide if ships can be destroyed in v1 or only "shield breaks"
  - [ ] Decide if there is hull damage or only shield/overheat effects for v1
  - [ ] Decide arena shape (sphere, cube, cylinder, "box with soft boundaries")
  - [ ] Decide win condition (time limit, last ship, score threshold)
- [ ] Define the "VFX-first" success criteria (what you want to see)
  - [ ] Impacts remain readable at distance (silhouette + rim + hotspot)
  - [ ] Multiple simultaneous impacts remain distinguishable (clustering vs spread)
  - [ ] Weapon types have distinct signatures (laser/plasma/kinetic/rail/EMP/ion)
  - [ ] Overload + recovery states are visually obvious
  - [ ] Performance target (example: 60 FPS at 1920x1080 with v1 fleet size)
- [ ] Define simulation determinism requirements
  - [ ] Decide if replays must be bit-for-bit deterministic across refreshes
  - [ ] Decide how RNG seeds are stored (scenario seed + per-ship seed)
  - [ ] Decide fixed simulation tick rate (example: 60 Hz or 30 Hz)

---

## 2) Repo structure for "Lab mode" + "Arena mode"

- [ ] Add a `src/modes/` folder for mode bootstrapping
  - [ ] Create `src/modes/labMode.js` (wrap the current lab startup)
  - [ ] Create `src/modes/arenaMode.js` (arena startup)
- [ ] Add a simple mode router
  - [ ] Create `src/modeRouter.js` (switch modes, clean up event listeners)
  - [ ] Ensure each mode exposes `start()` and `dispose()` contracts
- [ ] Add a top-level mode selector in UI
  - [ ] Add UI control (dropdown or buttons) to switch `Lab` / `Arena`
  - [ ] Persist last selected mode in `localStorage`
  - [ ] Make "Reload in same mode" work reliably

---

## 3) Arena simulation core (deterministic, VFX-driven)

### 3.1 Simulation time + determinism scaffolding

- [ ] Add a fixed-timestep simulation loop
  - [ ] Create `src/sim/clock.js` (accumulator, step count, fixed dt)
  - [ ] Support pause / single-step / time-scale (for debugging)
  - [ ] Ensure render delta can differ from sim delta (decoupled loops)
- [ ] Add a seeded RNG utility
  - [ ] Create `src/sim/rng.js` (seeded PRNG, e.g., mulberry32)
  - [ ] Add helpers `randFloat()`, `randInt()`, `randUnitVec3()`
  - [ ] Ensure RNG usage is explicit (no `Math.random()` inside sim systems)
- [ ] Add a replay-friendly event journal
  - [ ] Create `src/sim/journal.js` (append-only events, ring buffer option)
  - [ ] Define event categories: `impact`, `weapon_fire`, `shield_state`, `ship_state`
  - [ ] Add a "record on/off" toggle for performance

### 3.2 World + entities

- [ ] Define core entity model (data-only) for sim
  - [ ] Create `src/sim/world.js` (arrays/maps of entities, system execution order)
  - [ ] Define an `EntityId` strategy (incrementing integer)
  - [ ] Define components as plain objects or typed arrays (pick one)
- [ ] Add components (minimum viable)
  - [ ] Transform: `pos`, `vel`, `rot`, `angVel`
  - [ ] Team/faction: `teamId`
  - [ ] Targeting: `targetId`, `desiredRange`
  - [ ] Weapons: cooldowns, fire rate, weapon type
  - [ ] Shield model: energy, overheat, EMP amount, radius, recharge params
  - [ ] Hull model (optional v1): hitpoints or "disabled" flag
- [ ] Add arena boundaries
  - [ ] Implement a boundary system (soft pushback + max speed clamp)
  - [ ] Add debug visualization toggles for the boundary volume

### 3.3 System pipeline (sim)

- [ ] Decide system execution order and document it
  - [ ] AI (intent) -> steering -> movement integration -> weapons -> damage/shields -> cleanup
- [ ] Implement movement integration system
  - [ ] Euler integrate velocity and position (good enough for v1)
  - [ ] Clamp max speed and max turn rate per ship archetype
- [ ] Implement steering/flight model system
  - [ ] Seek/arrive target position
  - [ ] Maintain desired range band
  - [ ] Simple separation/avoidance for friendly ships
- [ ] Implement weapons system (sim-side, no rendering)
  - [ ] Decide weapon delivery types: hitscan beams vs projectile travel
  - [ ] Add "fire event" generation (`weapon_fire`)
  - [ ] Apply per-weapon damage + heat contributions
- [ ] Implement shield system (sim-side)
  - [ ] Energy regen per dt
  - [ ] Overheat decay per dt
  - [ ] EMP decay per dt
  - [ ] Overload state when `overheat > threshold`
  - [ ] Shield "down" state when energy <= 0 (decide behavior)
- [ ] Implement impact resolution system
  - [ ] For hitscan: compute impact point on shield sphere along ray
  - [ ] For projectile: impact when projectile reaches target (or intersects shield volume)
  - [ ] Emit `impact` events with: shipId, localDir, strength, weaponType, simTime

---

## 4) Arena rendering architecture (multi-ship + shield FX)

### 4.1 Scene + camera

- [ ] Create an arena renderer entry
  - [ ] Create `src/render/arenaScene.js` (scene graph, lights, background)
  - [ ] Reuse your deep-space environment or create an arena-specific variant
- [ ] Add camera modes
  - [ ] Free orbit camera (default)
  - [ ] Follow camera (track selected ship)
  - [ ] Tactical camera (top-down / wide framing)
  - [ ] Cinematic camera (smooth pans to high-impact moments)
- [ ] Add ship selection
  - [ ] Raycast pick ships
  - [ ] Show selection outline or marker sprite
  - [ ] UI panel shows selected ship stats (energy/overheat/weapon)

### 4.2 View layer: ShipView + ShieldView

- [ ] Define the model->view sync contract
  - [ ] Render reads sim snapshots (do not mutate sim state)
  - [ ] Interpolate transforms between sim ticks (optional v1)
- [ ] Implement `ShipView`
  - [ ] Map ship archetype to a mesh prefab (reuse your procedural ship factory initially)
  - [ ] Support per-team color accents (small emissive strips or decals)
  - [ ] Add basic thruster glow that scales with acceleration
- [ ] Implement `ShieldView` for many ships
  - [ ] Share shield geometry across ships (avoid per-ship geometry allocations)
  - [ ] Ensure each shield has its own uniforms (or a pooled uniform structure)
  - [ ] Create a shield LOD strategy
    - [ ] Near: higher segment sphere
    - [ ] Far: lower segment sphere and/or cheaper shader path
  - [ ] Implement per-ship impact buffers
    - [ ] Maintain `MAX_IMPACTS` ring buffer per ship
    - [ ] Push events from sim `impact` journal into the per-ship buffer
    - [ ] Convert impact world point to local dir if needed

### 4.3 Weapon VFX (arena)

- [ ] Create a weapon VFX dispatcher (render-only)
  - [ ] Consume `weapon_fire` events and spawn visuals
  - [ ] Pool beam/projectile objects for performance
- [ ] Implement beams (laser/rail/ion) in arena mode
  - [ ] Beam thickness + opacity by weapon
  - [ ] Optional bloom-ish sprites near muzzle/impact
- [ ] Implement projectiles (plasma/kinetic) in arena mode
  - [ ] Projectile travel based on sim event start/end + travel time
  - [ ] Trails (cheap cylinder or sprite ribbon)
- [ ] Implement EMP visuals in arena mode
  - [ ] Expanding shell at shield center
  - [ ] Global flicker on the impacted shield (already in shader path)
- [ ] Implement "impact cam moments" (optional)
  - [ ] Trigger when a big hit happens or shield breaks
  - [ ] Smooth camera to moment, then return to prior camera mode

---

## 5) AI for fleets (simple but expressive)

### 5.1 AI primitives (per ship)

- [ ] Implement target selection
  - [ ] Nearest enemy
  - [ ] Lowest shield energy enemy (focus fire)
  - [ ] Highest threat enemy (DPS weighting)
  - [ ] Random within constraints (seeded)
- [ ] Implement behavior states (finite state machine)
  - [ ] `Approach` (close to optimal range)
  - [ ] `Strafe` (orbit target at range)
  - [ ] `Retreat` (if shield low / overloaded)
  - [ ] `Regroup` (return to formation anchor)
  - [ ] `Pursue` (if target fleeing)
- [ ] Add per-ship personality knobs (data-driven)
  - [ ] Aggression (how close to press)
  - [ ] Caution (retreat threshold)
  - [ ] Aim jitter (impact clustering vs spread)
  - [ ] Weapon preference (switch weapon types)

### 5.2 Fleet-level behavior

- [ ] Implement formation anchors per fleet
  - [ ] Line / wedge / sphere / "screen" formation options
  - [ ] Maintain separation within formation
- [ ] Implement fleet tactics toggles
  - [ ] Focus fire
  - [ ] Split targets
  - [ ] Flank (offset approach vectors)
  - [ ] Retreat and regroup when average shield low
- [ ] Add "scenario director" (optional but great for VFX)
  - [ ] Scripted phases: approach -> volley -> EMP wave -> retreat
  - [ ] Spawn reinforcements mid-fight (impact density stress test)

---

## 6) Content system (data-driven ships, weapons, shields, scenarios)

- [ ] Create a `src/content/` folder
  - [ ] `ships.json` (archetypes: fighter/interceptor/corvette/freighter)
  - [ ] `weapons.json` (damage, fire rate, travel, VFX params)
  - [ ] `shields.json` (preset defaults + shader tuning ranges)
  - [ ] `scenarios.json` (fleet compositions, initial positions, seed)
- [ ] Implement content loading
  - [ ] Load JSON with `fetch()` at startup
  - [ ] Validate shapes at runtime (lightweight checks, helpful errors)
  - [ ] Provide fallback defaults if content fails to load
- [ ] Add an "override" system for quick iteration
  - [ ] Allow querystring overrides (e.g., `?seed=123&ships=10`)
  - [ ] Allow UI overrides that do not touch JSON files

---

## 7) UI/UX for arena mode (VFX tuning + debugging)

- [ ] Add an Arena UI panel (separate from Lab UI)
  - [ ] Start / Pause / Reset
  - [ ] Step one tick
  - [ ] Seed display + "new seed" button
  - [ ] Fleet size controls
  - [ ] Weapon mix controls (per team)
  - [ ] Shield preset controls (per team or per ship type)
- [ ] Add debug overlays
  - [ ] Toggle ship names/IDs
  - [ ] Toggle formation anchors and desired positions
  - [ ] Toggle target lines (who is aiming at who)
  - [ ] Toggle boundary visualization
- [ ] Add performance overlay
  - [ ] FPS
  - [ ] Active shield count
  - [ ] Active FX count
  - [ ] Event rates (impacts/sec)
- [ ] Add a "Shield FX focus" overlay
  - [ ] Show selected ship shield timeline (energy/overheat/EMP)
  - [ ] Show last N impacts (type + strength) for selected ship
  - [ ] "Freeze impacts" toggle to inspect patterns visually

---

## 8) Shield FX upgrades specifically for multi-ship combat

- [ ] Make shield visuals scale well across many ships
  - [ ] Add distance-based opacity clamp (avoid distant clutter)
  - [ ] Add distance-based thickness/rim intensity adjustment
  - [ ] Add a "shield readability mode" toggle for tuning
- [ ] Improve impact clustering readability
  - [ ] Add optional impact "cooldown merging" (merge near-same impacts)
  - [ ] Add impact "priority" so big hits don't get pushed out too quickly
- [ ] Add shield break visuals (if you choose to support shield-down)
  - [ ] Distinct shader pulse + crack burst
  - [ ] Brief "stutter" or chromatic flicker for EMP-like glitch
  - [ ] Regeneration sequence effect (ramping field lines back in)
- [ ] Add shield presets per ship class (data-driven)
  - [ ] Fighters: thin + bright rim
  - [ ] Corvettes: thicker + hex density higher
  - [ ] Freighters: strong field lines + slower recharge

---

## 9) Tooling you will actually use (personal workflow)

- [ ] Add "save shield preset" to `localStorage`
  - [ ] Save current shader params to named preset
  - [ ] Load preset into UI
  - [ ] Export preset JSON to clipboard
  - [ ] Import preset JSON from clipboard
- [ ] Add deterministic "scenario replay"
  - [ ] Record sim events to a compact JSON log
  - [ ] Reload and replay the exact impact timeline
  - [ ] Add scrubber (time slider) for inspection
- [ ] Add screenshot helpers
  - [ ] Hide UI toggle
  - [ ] Render scale multiplier (2x/3x) for clean shots
  - [ ] Save camera bookmarks

---

## 10) Performance + stability (so it stays fun to use)

- [ ] Add object pooling for all transient VFX objects
  - [ ] Beams
  - [ ] Projectiles
  - [ ] Spark bursts
  - [ ] EMP shells
  - [ ] Ion arc lines
- [ ] Avoid allocations inside per-frame loops
  - [ ] Audit hot paths and replace temporary `new Vector3()` with reused vectors
  - [ ] Ensure per-ship impact buffers don't allocate after init
- [ ] Add LOD rules for large battles
  - [ ] Reduce shield sphere segments for far ships
  - [ ] Reduce FX spawn rates at distance
  - [ ] Optional: cap impacts per second per ship (with priority)
- [ ] Add a "perf safe mode" toggle
  - [ ] Lower post effects (if any)
  - [ ] Lower shield shader complexity (optional shader define)
  - [ ] Lower starfield density

---

## 11) Testing + sanity checks (lightweight, personal)

- [ ] Add a deterministic sim test harness (node or browser)
  - [ ] Seeded run for N seconds produces the same event counts
  - [ ] Basic assertions: no NaNs, no runaway velocities
  - [ ] Boundary constraints always respected
- [ ] Add "smoke scenarios"
  - [ ] 1v1 duel
  - [ ] 5v5 skirmish
  - [ ] 20v20 stress (perf)

---

## 12) Nice-to-haves (only after arena feels good)

- [ ] Audio cues (subtle): shield hit, overload, EMP
- [ ] More ship silhouettes + faction styles
- [ ] Simple debris / wrecks when ships die
- [ ] Postprocessing (bloom) with a quality slider
- [ ] "Director mode" that tries to frame the coolest impacts automatically

