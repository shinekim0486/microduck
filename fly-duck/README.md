---
title: 초파리 뇌 오리
emoji: 🪰
colorFrom: yellow
colorTo: gray
sdk: static
app_file: index.html
pinned: false
license: apache-2.0
short_description: 진짜 초파리 뇌 배선이 브라우저에서 로봇 오리를 조종합니다 (CONNECT AI LAB 한국어판)
---

# 초파리 뇌 오리 — CONNECT AI LAB 가상 신경과학 실험실

진짜 초파리 뇌 배선(FlyWire 기반, 뉴런 139,255개 · 연결 2,698,236개)이 여러분의 브라우저 안에서 발화하며 로봇 오리 **마이크로덕**을 조종합니다. 서버도 GPU도 설치도 없습니다.

## 이 실험실에서 할 수 있는 것 (CONNECT AI LAB 제작)
- **실험 3단계 안내:** 바나나 놓기 → 시냅스 끄기 → 뇌 떼기. 클릭만으로 "뇌가 진짜 회로 안에 있다"를 확인합니다.
- **신호 흐름 띠:** 냄새 입력 → 촉각엽 투사뉴런 → 하강뉴런 → 명령 → 이동 거리가 실시간 숫자로 보입니다.
- **더듬이 실험:** 왼쪽·오른쪽 더듬이 제거, 좌우 바꿔 끼우기, 냄새 도달 거리 조절. 실제 곤충 실험과 같은 결과가 나오는지 봅니다.
- **뇌 절제 실험:** 촉각엽 투사뉴런, 중심복합체, 하강뉴런 좌/우, 시각·기계감각 입력을 부위별로 끄고 어떤 행동이 사라지는지 봅니다.
- **시냅스 세기 실험:** 마취(0.5)부터 발작(6)까지. 원작자가 이득을 4에서 3으로 낮춘 이유를 직접 확인합니다.
- **60초 바나나 챌린지**와 결과 공유.

## 두 뇌 비교 (compare.html) — CONNECT AI LAB 제작
- **왼쪽 FlyWire v783 (암컷, 2024)**: 원작과 같은 그래프. 뉴런 139,255 · 연결 2,698,236.
- **오른쪽 MaleCNS v1.0 (수컷, 2026년 9월, 구글 리서치 + 자넬리아, Cell)**: 이 저장소에서 직접 변환. 뉴런 166,700(글리아 제외, superclass 있는 전부) · 연결 2,753,975(시냅스 10개 이상만, 전체 시냅스의 54%) · 다리 운동뉴런 815개 포함(뇌 + 배쪽 신경삭).
  - 좌우 판정: somaSide → rootSide → entryNerve → 세포체 x좌표 중앙선 기준(추정). 부호: consensus_nt가 gaba면 음수, 나머지 양수(FlyWire 그래프와 같은 규칙). 세포체 없는 27,038개는 시냅스 파트너 세포체 평균 위치로 표시(3,882개는 전체 평균).
  - 껍질 메시는 실제 해부 경계가 아니라 세포체 위치의 볼록 껍질(뇌 + 척수 두 조각). 표시용.
  - 변환 스크립트: `scripts/build_male.py` (pyarrow·numpy·scipy). 원본: https://male-cns.janelia.org/download/ (CC-BY 4.0), 논문 doi:10.1016/j.cell.2026.08.015
- 두 쪽의 몸·걷기 정책·센서·디코더는 동일. 반응 차이는 배선 데이터 차이에서만 옵니다. 암수 행동 차이의 증거가 아닙니다.
- 물건 팔레트: 사과(냄새 세기 0.55, 도달 0.8m), 식초(1.6, 2.2m)는 바나나와 같은 인공 냄새 공식을 더한 것. 장애물은 MuJoCo 물리 상자(최대 4개)이며 근접 시 인공 기계감각 자극을 줍니다.

## 정직하게
이 뇌는 학습하지 않습니다. 배선은 고정이고, 냄새를 어느 뉴런에 넣고 어느 뉴런을 읽을지는 사람이 정한 공학적 선택입니다. 균형과 걸음은 마이크로덕이 강화학습으로 배운 정책이 맡습니다. 절제·더듬이·시냅스 실험은 이 모델 안에서의 실험이지 살아 있는 초파리의 증거가 아닙니다.

## 출처와 라이선스
- 뇌-오리 연결 시뮬레이션의 바탕: [microfly](https://huggingface.co/spaces/lvwerra/microfly) (Apache-2.0). 실험실 기능·한국어 설계·디자인은 CONNECT AI LAB이 추가했습니다. 뇌 시뮬레이션의 기본 규칙과 디코더 상수는 기본값에서 바탕 코드와 동일합니다.
- 뇌 데이터 [snedea/flybrain](https://github.com/snedea/flybrain) (MIT, FlyWire v783 기반) · 로봇 [Pollen Robotics MicroDuck](https://huggingface.co/spaces/pollen-robotics/microduck-simulator) (Apache-2.0) · 뇌 메시 [navis-flybrains](https://github.com/navis-org/navis-flybrains) (GPL-3.0, `licenses/`에 별도 보관). 자산 해시는 `provenance.json`.
- 채널: [CONNECT AI LAB](https://www.youtube.com/@CONNECT-AI-LAB) · 무료 지식 아카이브 [aicitybuilders.com/guide](https://www.aicitybuilders.com/guide)

아래는 바탕이 된 원본 기술 문서(영어)입니다.

---
# microfly

A fly-connectome model steers a simulated MicroDuck through the official walking policy. A second path that maps neural activity directly to fourteen servo-position targets remains in the code, with its controls temporarily hidden. All computation runs locally in the visitor's browser; no server, GPU account or physical robot is needed.

## Run and build

Node.js 22.12 or newer:

```sh
npm ci
npm run dev
```

Open the address printed by Vite. Production build: `npm run build`; preview: `npm run preview`. Serve `dist/` with an HTTP server. Opening `index.html` as a local file will not work. The source archive includes all necessary model and connectome assets. Production files have no external CDN dependencies.

## Use it

- **Walking policy** uses neural speed/turn commands with the official trained gait and is the default interface. The temporarily hidden **Direct motors** path bypasses ONNX: descending neurons drive servo positions. Switching modes resets the body. Direct mode has no gait or balance controller; twitching and falls are expected.
- Loading requires roughly 46 MB before HTTP transport compression. A download bar shows streamed progress across the ten brain, robot and runtime assets, followed by “Starting simulation” while setup finishes. The live brain view uses genuine anatomical coordinates, a translucent tissue mesh, rotation, zoom, slicing and an expanded view. Brightness shows simulated spikes.
- In direct mode, **Motor gain** adjusts the maximum target offset (0–1 radian) before joint-limit clamping.
- Click the floor or press **Banana left/right** to move a 3D overripe banana, which marks the virtual odor source. **Remove banana** removes odor input: neural forward drive and steering settle to zero. Small balance motions can remain in walking mode. Input meters show antennal stimulation; response meters show downstream smell-processing activity. The arena camera stays above and directly behind the duck as it turns. Scroll or pinch to zoom while keeping that angle. The camera follows position and heading without copying the body’s pitch, roll or vertical bobbing. Drag the brain views to rotate them.
- **A puff of air** supplies 1.2 seconds of artificial mechanosensory stimulation. **Ambient light** changes visual-neuron input probability.
- **Pause** freezes physics, neural updates, banana respawning and the cutaway’s automatic movement. **Reset** resets the body, neural state, random seed, trail and distance counter; it retains the current sensory controls and connect/disconnect setting.
- Uncheck **Brain connected**: the walking policy receives zero forward and turn commands while the neural model keeps running. It may still make small balance corrections. In direct mode, servo targets follow the measured joint positions; no policy is invoked.
- Under **How it works**, **Disable all synaptic transmission** removes all recurrent transmission and resets neural state. Sensory spikes persist but descending spikes and movement commands vanish.
- A fallen duck needs **Reset**. No scripted get-up or hidden movement is substituted. A background tab pauses automatically; press Resume on return.

## Head cutaway and food

The small inset in the upper right of the arena shows the real MicroDuck head mesh as a translucent cutaway, containing an illustrative enlarged fly with six legs, two veined wings, red eyes and four brain electrodes. Four leads run from its brain to sockets on the inside ceiling. The cutaway rotates slowly by default, and the fly makes small wing and leg movements. Drag to rotate it manually; the arrow enlarges it. Pause freezes this automatic movement, and reduced-motion preferences disable it. The fly movement is illustrative animation, independent of motor commands. The green electrode signal reflects modeled descending-neuron activity and goes quiet when disconnected. It is a conceptual illustration, not a real implant or an anatomical reconstruction of a complete fly.

The arena's scent source is a mottled 3D overripe banana. The left/right buttons and floor clicks move it; removing it also removes odor input. Fermenting fruit is an appropriate cue for this species: [research on Drosophila attraction identifies yeast fermentation odors as an attractant](https://besjournals.onlinelibrary.wiley.com/doi/10.1111/j.1365-2435.2012.02006.x). When an upright duck comes within 18 cm of the banana’s center, the fruit and its scent disappear. After 0.4 seconds of simulation time, a new banana appears at a different location inside the arena, at least 65 cm from the duck. This continues as fruit is collected. Manually removing the banana cancels any pending respawn. The existing artificial odor encoder is unchanged, and fruit collection does not train or reward the neural model. The banana has no physical collision body.

The interface opens directly with a single-line title and the two scenes. A prominent arena hint explains how to place a banana; supporting details are available under **How it works** in the footer. Duplicate technical captions and the mode selector are hidden. The page, robot shell and arena use neutral white/gray surfaces, with green retained for active controls and the brain anatomy view. The fly and banana are built from local geometry and reuse the loaded head mesh, so they add no asset downloads.

## What the model does

The graph is the pinned `connectome.bin.gz` from [snedea/flybrain](https://github.com/snedea/flybrain/tree/9191824d17871b7851645782d53d23f213ddb938), which reports FlyWire FAFB v783 as its source. Its binary contains **139,255 neurons and 2,698,236 directed weighted edges**. All those neurons and edges are retained here. This is the supplied, aggregated graph; it is not a claim to reproduce every synapse in the original FlyWire release, nor the MaleCNS dataset used by DOOMFLY.

Sensory/descending indices are selected from the upstream classification table by exact root-ID joins to its neurons table, preserving the binary's original neuron order. No empty synthetic `DN_WALK` or leg-motor groups are used. There are 647 left and 650 right descending neurons.

Every neural tick:

1. Membrane values decay by 0.94, with a discrete refractory counter.
2. Previous spikes propagate over a sparse adjacency table; incoming absolute connection weights are normalized to a total gain of 3 per postsynaptic neuron.
3. Only annotated visual, olfactory and mechanosensory neurons receive probabilistic external input (seeded RNG, amplitude 1.1, probability `0.6 × stimulus`).
4. Values at or above 1 fire and reset, with refractory counter 3. All neurons are evaluated on every tick.

Ten neural ticks are run per worker update, targeting ten updates per wall-clock second. These are toy discrete dynamics, not calibrated biological time. Group traces show the last tick's actual spike counts; the total spike counter and descending rates average the ten-tick update.

Version 2 reduces recurrent gain from 4 to 3: previously, background activity saturated forward speed, and averaging the entire descending populations erased odor laterality. Steering now reads the annotated left/right antennal-lobe projection neurons (ALPN, 341/344 neurons), downstream of the stimulated sensory cells. Descending firing supplies forward drive. Both use an exponential moving average with update coefficient 0.3.

Let `L,R` be filtered descending firing fractions, `A,B` the filtered ALPN firing fractions. The walking decoder is:

```text
odor = A + B
contrast = (A − B) / max(0.02, odor)
drive = min(1, (L + R) / 0.0006) × min(1, (odor − 0.008) / 0.04)
forward = 0.24 × drive × (1 − min(0.15, |contrast| × 0.5))  [m/s]
turn = 0.7 × tanh(5 × contrast)                           [rad/s]
```

If `odor < 0.008` or descending firing is zero, both commands are zero. Clearing scent therefore stops neural drive even with ambient light. The gains are engineered and untrained. No target position enters this decoder.

In **direct mode**, all 1,297 descending neurons are sorted by their original graph index and assigned round-robin into 28 fixed pools. For joint `i`, two opposing pools give `motor[i] = tanh(80 × (rate[2i] − rate[2i+1]))`, using the same 0.3 filtering. The target is `standingPose[i] + gain × motor[i]`, clamped to the joint's actual limits and limited to a 0.035-radian target change per control step. These arbitrary pool assignments do not claim natural fly joint semantics. There is no oscillator, scripted gait, learned balance, inverse kinematics, or ONNX call in this path. “Direct” means position targets for the model's servo actuators, not raw electrical currents or torques. All fourteen targets and resulting physical joint positions are observable in telemetry.

Disconnect, stale neural telemetry (>1 second), or pause removes active neural control. A detected fall additionally zeros walking commands; direct mode keeps applying its neural targets until paused or disconnected. Reset stands the body up. The decoder is an engineered interface and does not guarantee successful navigation.

Scent strength decays exponentially with distance and is split between left/right sensory inputs using relative bearing. Proximity to arena walls also supplies an artificial mechanosensory signal. The gait policy does not receive scent coordinates, route instructions or scripted joint trajectories.

## Robot physics

[Pollen Robotics' MicroDuck simulator](https://huggingface.co/spaces/pollen-robotics/microduck-simulator/tree/023172c8a7d629b5258d90364c13bafe013abbfa) supplies the kinematic model, mesh, collision model and `BEST_alpha_walking.onnx`. Its walking loop is reduced to a standalone module here:

- MuJoCo 3.11.0; physics timestep 0.005 s, four substeps per policy action.
- ONNX Runtime Web 1.27.0, single-thread WASM inference.
- 61-dimensional observation: gyro, projected gravity, joint offsets, joint velocities, previous action and 13 command slots.
- Fourteen joint targets, in the official order, with the official default pose and action scale.
- Physics computes the floating base and joint motion. The render rig copies that state; it is not an animated imitation of walking.
- The 4 m square boundary is present in both physics and the rendering. A 0.5 m grid and physics-derived distance trail help show displacement.

Physics and rendering run on separate schedules. Slow devices can still run simulation time more slowly than wall time. Add `?low` to the URL to disable shadows and render at half resolution and cap drawing at 2 FPS. The displayed timer measures physics time. No real hardware transport is included or exercised.

## Scientific limitations and attribution

This is an interactive engineering experiment, not a validated emulation, a living brain, evidence of consciousness, or evidence of learned navigation. The neural weights never learn. MicroDuck's previously trained policy supplies balance and gait only in walking mode.

The upstream graph aggregates signed counts and treats GABA as inhibitory, with acetylcholine, glutamate and modulatory transmitter labels positive. That is a strong simplification (in particular glutamate and modulators), inherited here rather than biologically validated. Incoming normalization, neuron dynamics, sensory encoding, ALPN/descending readouts, motor pool assignments and command scaling are additional engineering choices.

FlyWire citation: Dorkenwald, S., Matsliah, A., Sterling, A.R. et al., “Neuronal wiring diagram of an adult brain,” Nature 634, 124–138 (2024), [doi:10.1038/s41586-024-07558-y](https://doi.org/10.1038/s41586-024-07558-y). See [FlyWire Codex](https://codex.flywire.ai/) for original data and current releases.

The anatomical view plots one representative coordinate per neuron, selected as the first supplied point in the pinned FlyBrain `coordinates.csv.gz` and joined by root ID in graph order. These are real locations, not synthetic layout positions, but they are **not full reconstructed arbors or verified soma positions**. Brightness comes from this model's spike counts across the latest ten ticks, not measured activity from an animal. The slice removes points and tissue past an adjustable depth plane.

The unchanged [FlyWire whole-brain tissue mesh](https://github.com/navis-org/navis-flybrains/blob/273333c8d8bf5adeebebd274e554621462e388bd/flybrains/meshes/FLYWIRE_whole_brain.ply) comes from `navis-org/navis-flybrains`. Its [provenance](https://github.com/navis-org/navis-flybrains/blob/273333c8d8bf5adeebebd274e554621462e388bd/flybrains/meshes/FLYWIRE_whole_brain.md) describes the tissue mask and coordinate transform. The repository is GPL-3.0; its license is included separately in `licenses/navis-flybrains-GPL-3.0.txt`, with the original mesh source in the archive. This third-party asset is not relicensed under the app's Apache license.

FlyBrain source is MIT licensed (see `licenses/flybrain-MIT.txt`). Pollen Robotics MicroDuck code and assets are Apache-2.0 (see `licenses/microduck-Apache-2.0.txt`). Original FlyDuck code is Apache-2.0. Original datasets retain their own terms. Upstream code and asset revisions, SHA-256 hashes and population counts are in `provenance.json`. `python3 scripts/fetch-assets.py` re-fetches the pinned data and reconstructs the index mappings, verifying every asset hash.

## Validation

```sh
npm test
npm run build
```

The food tests cover pickup, delayed respawning, manual overrides, fallen ducks and placement near arena walls. The neural tests exercise the full graph with the same scent encoder used by the browser: left/right scent reverses neural steering; clearing scent removes drive; disabling synapses leaves sensory spikes but zero ALPN, descending and direct motor output; direct targets vary and respect joint limits; reset reproduces a supplied seed. These tests establish software behavior, not biological validity.

`scripts/browser-check.mjs` exercises both control paths (triggering the hidden direct-mode button programmatically), physically measured walking, direct target changes with **zero ONNX invocations**, scent reversal/clearing, pause/reset/disconnect, ablation, anatomical slicing/expansion and mobile layout. Run against a local production preview with `FLYDUCK_URL=http://localhost:4173/?low node scripts/browser-check.mjs`. `CHROMIUM_PATH` selects an installed Chromium executable. The evidence JSON and screenshots go to `test-results/` (override with `FLYDUCK_EVIDENCE`).

`scripts/food-head-check.mjs` checks rear camera following through a turn, fixed-angle wheel/pinch zoom, a physical approach and pickup, the scent disappearing and returning, respawn pausing, ceiling mounts, wing/leg movement, automatic and manual rotation, and reduced-motion behavior. It uses the same preview URL and evidence settings as the browser check.

The source is available in the [source branch](https://huggingface.co/spaces/lvwerra/microfly/tree/source) or the deployed [source archive](./flyduck-source.zip). `window.flyduck` exposes simulation state, policy invocation counts, fourteen targets and measured joint positions, sensory inputs, neural readouts and anatomical render counters for inspection.
