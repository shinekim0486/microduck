# Validation — FlyDuck version 2, 2026-09-11

Production build tested in headless Chromium with MuJoCo WASM and ONNX Runtime Web.

- Actual graph tests: 4/4 passed, covering scent reversal/clearing, both output paths under synaptic ablation, direct target bounds/variation, silence and seeded reset.
- Left/right scent buttons produced neural turn commands of 0.539 and -0.416 rad/s; clearing scent produced zero forward and turn commands.
- Physical walk: 114 control steps (2.28 simulated seconds), 0.225 m path length, 0.130 m net displacement; upright.
- Direct mode: 63 direct control steps, 0 ONNX policy calls, changing neural targets and finite physical joint positions. The body fell during this run: this mode has no learned balance or gait.
- Disconnect, pause/resume, body/brain reset, synaptic ablation and mode switching: passed.
- Anatomy: 139,255 real coordinate points, 48,995 tissue-mesh vertices, active spike updates, slice control, expanded view, shell toggle and view reset: passed.
- Mobile: both 3D canvases remain more than 300 pixels tall; no horizontal overflow.
- No browser page errors.
- Pinned assets and reconstructed index mappings: all 10 SHA-256 hashes matched. Full asset re-download/reconstruction succeeded.

Evidence: `browser-check.json`, `desktop.png`, `mobile.png`, `brain-slice.png` in the workspace deliverables. The browser test produces these in `test-results/`.

The renderer was tested with `?low` on this CPU-only machine. Normal graphics use a higher render rate and shadows. Simulation time can run more slowly than wall time. These checks establish software behavior, not biological validity or reliable goal-directed navigation. No hardware was connected.

## Download progress update

A fresh Chromium session with cache disabled and a throttled 1.5 MB/s connection showed progress advancing during streaming (1% → 2% → 100%). All ten assets completed; the loading overlay closed and both walking and direct motor modes started without page errors. `download-check.json` and `download-progress.png` preserve this check in the workspace.

## Head inset, food and neutral palette

- Full browser checks passed after the visual update: scent reversal/removal, walk, direct motors, pause/reset/disconnect, ablation, brain slicing/expansion and responsive layout.
- The latest physical walk covered 0.253 m over 122 steps, with 0.150 m net displacement and the body upright.
- The head inset reuses seven actual MicroDuck head meshes, contains a six-legged fly and four electrodes, and supports expansion and rotation. Disconnecting quiets its signal.
- Moving/removing the banana updates the visible food object and the existing scent input.
- The page background is neutral RGB (250, 250, 250); mobile layout has no horizontal overflow.
- No browser page errors; all ten downloaded assets still complete. The new models need no extra asset downloads.

## Banana collection and animated cutaway

- All seven automated tests passed, including pickup/respawn timing, manual removal/placement during respawn, fallen-duck behavior and placement at arena boundaries.
- A browser-driven floor click placed a banana 25 cm ahead. The duck physically walked into pickup range while upright; the banana disappeared, its scent input became zero, and the collection count advanced once.
- Pausing held the banana absent. Resuming produced a different fruit location inside the arena, with fresh olfactory input. Respawn waits 0.4 seconds of simulation time.
- All four electrode leads terminate at raycast intersections with the inside of the actual head roof mesh. The fly and head model scales are unchanged.
- Default rotation, wing/leg motion, manual dragging while paused, and reduced-motion preferences passed browser checks. Pause held the camera and appendage angles fixed.
- The full existing browser checks also passed: scent reversal/clearing, upright walking (0.256 m path), direct target changes with zero ONNX calls, disconnect, reset, synaptic ablation, anatomical slicing and mobile layout. No page errors.

Evidence: `food-head-check.json`, `food-respawn.png`, and the refreshed `browser-check.json` in the workspace deliverables. Run `node scripts/food-head-check.mjs` against a production preview to reproduce the new interaction checks.

## Interface cleanup

- Removed the top navigation/header and supporting title copy. The title stays on one line at viewport widths 320, 390, 730, 768 and 1440 pixels, without horizontal overflow.
- The mode selector is hidden and the default remains walking mode. Direct-motor code is retained; its existing browser check now invokes the hidden button programmatically.
- Removed duplicate route, anatomy-count, head-link and motor captions; shortened the remaining labels. The arena’s banana-placement instruction is larger and has a clear background.
- Desktop/mobile visual checks passed, including food controls, head expansion/disconnection and the relocated How it works dialog.
- Physical banana placement, pickup, scent clearing/respawning, cutaway rotation, wing/leg movement, pause and reduced-motion checks passed after the cleanup. No browser page errors.
- Production build passed. Browser rendering checks used the lightweight graphics setting on this CPU-only workspace.


## Rear-follow camera

- The arena camera stays directly behind the duck's heading, at the previous default distance and elevation. It follows ground position and yaw without inheriting body pitch, roll or vertical bobbing.
- All nine automated tests passed, including heading changes across the ±π boundary and fixed-angle zoom at the available distance limits.
- Browser checks followed a real 23.7° body turn while maintaining rear alignment. Wheel zoom, two-finger pinch zoom and body reset passed.
- Dragging cannot orbit or pan the arena. Dragging and pinching did not move the banana; a floor click still placed it correctly, followed by physical collection and respawning.
- Desktop/mobile visual checks, head animation/rotation and pause/reduced-motion behavior passed with no browser page errors. Browser rendering used the lightweight graphics setting on this CPU-only workspace.

Camera position, target, distance, heading and projection values are exposed under `window.flyduck.camera`. The expanded `scripts/food-head-check.mjs` reproduces the camera and gesture checks; its evidence is in `food-head-check.json`.
