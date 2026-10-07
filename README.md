# 초파리 뇌로 로봇을 조종하기 — 인공지능 공부하기

2026년 9월 공개된 수컷 초파리 뇌 배선(MaleCNS, 뉴런 166,700개)을 브라우저에서 물통(LIF) 모델로 구동하고, 그 출력으로 로봇 개·오리·휴머노이드·2D 초파리를 움직이는 신경망 시뮬레이션 프로젝트입니다. 전부 사용자의 기기 안에서 구동되며 별도의 외부 서버나 계정 로그인이 필요 없습니다. **이 뇌는 학습하지 않습니다.** 걸음은 각 로봇이 강화학습으로 배운 공개 정책이 만들고, 초파리 뇌는 방향 감각을 제어합니다.

## 프로젝트 구성

| 폴더 | 설명 | 로컬 실행 주소 |
|---|---|---|
| `fly-bodies/` | 한 뇌, 여러 몸 — 유니트리 Go1 로봇 개 · 마이크로덕 · 유니트리 G1 휴머노이드 (브라우저 MuJoCo + ONNX 정책) | http://localhost:5173/ |
| `fly-duck/` | 마이크로덕 실험실 — 더듬이·절제·시냅스 실험, 두 뇌(2024 암컷 vs 2026 수컷) 비교 | http://localhost:5174/ (비교: /compare.html) |
| `fly-walk/` | 초파리 뇌 걷기 — 2D 초파리 + 실시간 발화 3D 뇌 (물리 엔진 없음, 초경량 13MB) | http://localhost:8000/ |
| `notebook/` | [구글 코랩 실습 노트북](https://colab.research.google.com/drive/11rNvjT1fJAw4eCybShEfT7Eb6hb6qTGb) — 뇌 지도 표 열기 → 뇌 그리기 → 냄새 경로 3단계 → 물통 모델 → 이득 실험 | [Colab 바로가기](https://colab.research.google.com/drive/11rNvjT1fJAw4eCybShEfT7Eb6hb6qTGb) |
| `models/` | 학습 및 추출된 두뇌 신경망 가중치 모델 (`내두뇌.json`, `brain.json`) | |
| `scripts/build_male.py` | MaleCNS 원본 표 3개 → 브라우저용 12MB 그래프 변환 스크립트 | |
| `docs/` | 논문 설명, 실습 사다리, 신경망 해석 가이드 (한국어) | |

## 실행 방법

### 1. fly-walk (2D 초경량 시뮬레이터)
```bash
cd fly-walk
python3 -m http.server 8000
```
브라우저에서 `http://localhost:8000` 접속

### 2. fly-bodies 및 fly-duck (3D 시뮬레이터 & 뇌 비교)
```bash
# fly-bodies 실행 (포트 5173)
cd fly-bodies
npm install
npm run dev

# fly-duck 실행 (포트 5174)
cd fly-duck
npm install
npm run dev
```

### 3. 코랩 실습 노트북
구글 코랩에서 직접 실행하거나 아래 링크에서 실습할 수 있습니다.
- 👉 [Google Colab 실습 노트북 열기](https://colab.research.google.com/drive/11rNvjT1fJAw4eCybShEfT7Eb6hb6qTGb)

## 안내 사항
- **실제 커넥톰 데이터**: 수컷 초파리 MaleCNS(CC-BY 4.0) 실제 배선 데이터에서 시냅스 10개 이상 연결을 활용하며, 억제성 뉴런(GABA)은 음수로 동작합니다.
- **LIF 물통 모델**: 복잡한 비선형 신경망 대신 단순화된 Leaky Integrate-and-Fire 모델을 사용합니다.
- **로봇 제어**: 로봇의 보행 안정성은 강화학습 정책(ONNX)이 유지하며, 초파리 뇌 모델은 방향성 제어(Forward/Turn) 신호를 공급합니다.

## 라이선스
본 프로젝트 코드는 Apache-2.0 라이선스를 따릅니다 (`LICENSE`).
기반이 된 microfly(Apache-2.0), Pollen Robotics MicroDuck(Apache-2.0), MuJoCo Menagerie 모델(BSD-3), MuJoCo Playground 정책(Apache-2.0), 뇌 데이터(CC-BY 4.0) 등 제3자 저작물 및 라이선스는 `THIRD_PARTY_NOTICES.md`를 참고해 주세요.

## GitHub 저장소
- GitHub: [https://github.com/shinekim0486/microduck](https://github.com/shinekim0486/microduck)
- 프로젝트: **인공지능 공부하기**
