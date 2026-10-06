---
title: 한 뇌, 여러 몸
emoji: 🐕
colorFrom: yellow
colorTo: gray
sdk: static
app_file: index.html
pinned: false
license: apache-2.0
short_description: 두뇌를 갈아 끼워 로봇 5종과 회사를 5개 환경에서 채점
---
# 한 뇌, 여러 몸 — CONNECT AI LAB Physical AI 실험실
2026년 9월 공개된 수컷 초파리 뇌 배선(MaleCNS v1.0, Berg 외, Cell 2026, CC-BY 4.0)을 브라우저에서 물통(LIF) 모델로 돌리고, 그 출력(전진·회전)으로 브라우저 MuJoCo 속 로봇 다섯 종을 조종합니다. 탭으로 몸과 환경을 바꿔도 뇌는 그대로입니다.
- 🐕 유니트리 Go1 로봇 개(관절 12) · 🦆 마이크로덕(14) · 🤖 유니트리 G1(29) · 🤖 부스터 T1(23) · 🤖 버클리 휴머노이드(12) · 🏢 AI 네이티브 회사(시뮬레이터, 가격·광고·발주 → 현금)
- 환경: 평지 · 장애물 상자 · 벽 통로 · 경사 10° · 계단 (회사는 시장 시나리오 5개)
- 두뇌 갈아 끼우기: 초파리 뇌(복사) · 규칙 두뇌(5줄) · 무작위 · 내 두뇌(자바스크립트, 브라우저 안에서만 실행) · 두뇌 성적표(환경 5개 × N초)
걸음과 균형은 각 로봇의 공개 강화학습 정책(MuJoCo Playground go1/g1/bh/t1_policy.onnx, Pollen BEST_alpha_walking.onnx)이 만들고, 두뇌는 방향(또는 회사의 결정)만 정합니다. 초파리 뇌는 학습하지 않습니다.
- 로봇 모델: MuJoCo Menagerie unitree_go1·unitree_g1 (BSD-3), berkeley_humanoid (BSD-3), booster_t1 (Apache-2.0), MicroDuck (Pollen, Apache-2.0) · 물리: MuJoCo (Apache-2.0) · 물통 모델·뇌 뷰어·번역식: microfly(Apache-2.0) 바탕 · 여러 몸 구조·환경·두뇌 인터페이스·회사 시뮬레이터·수컷 뇌 변환·한국어 설계: CONNECT AI LAB (Apache-2.0)
- 소스 코드(멤버십): https://wonseokjayjung-fly-source.static.hf.space/ · 2D 초파리: https://huggingface.co/spaces/WonseokJayJung/fly-walk · 마이크로덕 단독: https://huggingface.co/spaces/WonseokJayJung/fly-duck
