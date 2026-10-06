# 제3자 저작물 고지 (Third-party notices)

이 저장소의 CONNECT AI LAB 코드는 Apache-2.0입니다(`LICENSE`). 아래 저작물을 포함하거나 바탕으로 했으며, 각 라이선스 전문은 `LICENSES/`에 있습니다.

| 저작물 | 어디에 | 라이선스 | 출처 |
|---|---|---|---|
| microfly (Leandro von Werra) — 물통(LIF) 모델, 번역식(디코더), 뇌 3D 뷰어, 마이크로덕 걷기 루프 | fly-duck 전체 바탕, fly-walk·fly-bodies의 brain-core.js·brain-view.js·duck-sim.js | Apache-2.0 | https://huggingface.co/spaces/lvwerra/microfly |
| MicroDuck simulator (Pollen Robotics) — 로봇 모델, 메시, 걷기 정책 BEST_alpha_walking.onnx, 리그 코드 | fly-duck/public/robot, fly-bodies/public/robots/duck, src/vendor/duck.js | Apache-2.0 | https://huggingface.co/spaces/pollen-robotics/microduck-simulator |
| MuJoCo Menagerie unitree_go1, unitree_g1 (Unitree Robotics) — 로봇 모델·메시 | fly-bodies/public/robots/go1, g1 | BSD-3-Clause | https://github.com/google-deepmind/mujoco_menagerie |
| MuJoCo Playground (Google DeepMind) — go1_policy.onnx, g1_policy.onnx, 관측 구성 | fly-bodies/public/policies | Apache-2.0 | https://github.com/google-deepmind/mujoco_playground |
| MuJoCo (Google DeepMind) — 물리 엔진 WASM(npm @mujoco/mujoco) | 빌드 시 npm에서 받음 | Apache-2.0 | https://github.com/google-deepmind/mujoco |
| three.js | 빌드 시 npm/CDN | MIT | https://github.com/mrdoob/three.js |
| ONNX Runtime Web | 빌드 시 npm | MIT | https://github.com/microsoft/onnxruntime |
| MaleCNS v1.0 (HHMI Janelia FlyEM · Univ. of Cambridge · Google Research) — 수컷 초파리 중추신경계 커넥톰. Berg 외, *Cell* (2026) doi:10.1016/j.cell.2026.08.015 | public/brain-male 또는 brain/ (우리가 변환한 그래프·좌표), scripts/build_male.py 원본 | CC-BY 4.0 | https://male-cns.janelia.org/ |
| FlyWire v783 (Dorkenwald 외, *Nature* 2024) → snedea/flybrain 그래프 | fly-duck/public/brain (암컷 뇌) | MIT (flybrain), CC-BY 4.0 (FlyWire) | https://github.com/snedea/flybrain · https://codex.flywire.ai/ |
| navis-flybrains — FlyWire 전체 뇌 메시 | fly-duck/public/brain/anatomy/tissue.ply | GPL-3.0 (별도 보관, 재라이선스 아님) | https://github.com/navis-org/navis-flybrains |
| Pretendard 글꼴 | CDN 링크 | SIL OFL 1.1 | https://github.com/orioncactus/pretendard |

수정 사항(Apache-2.0 §4b): brain-view.js에 뉴런 수 고정값 제거·세로 뇌 맞춤·그룹별 밝기·채널 색·자동 회전 옵션 추가. brain-core.js에 절제 마스크·이득 조절·운동뉴런 발화율 추가. sensors.js에 더듬이 실험·추가 냄새·장애물 추가. duck-sim.js에 장애물 상자 4개와 공유 엔진 로더 적용. main.js에 뇌 전환·임베드·물건 놓기 훅 추가.
