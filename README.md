# 초파리 뇌로 로봇을 조종하기 — CONNECT AI LAB 오픈소스

2026년 9월 공개된 수컷 초파리 뇌 배선(MaleCNS, 뉴런 166,700개)을 브라우저에서 물통(LIF) 모델로 돌리고, 그 출력으로 로봇 개·오리·휴머노이드·2D 초파리를 움직이는 실험실입니다. 전부 여러분 기기 안에서 돌아가고, 서버도 계정도 없습니다. **이 뇌는 학습하지 않습니다.** 걸음은 각 로봇이 강화학습으로 배운 공개 정책이 만들고, 초파리 뇌는 방향만 정합니다.

| 폴더 | 무엇 | 바로 보기 |
|---|---|---|
| `fly-bodies/` | 한 뇌, 여러 몸 — 유니트리 Go1 로봇 개 · 마이크로덕 · 유니트리 G1 휴머노이드 (브라우저 MuJoCo + ONNX 정책) | https://wonseokjayjung-fly-bodies.static.hf.space/ |
| `fly-walk/` | 초파리 뇌 걷기 — 2D 초파리 + 실시간 발화 3D 뇌 (물리 없음, 가벼움) | https://wonseokjayjung-fly-walk.static.hf.space/ |
| `fly-duck/` | 마이크로덕 실험실 — 더듬이·절제·시냅스 실험, 두 뇌(2024 암컷 vs 2026 수컷) 비교 | https://wonseokjayjung-fly-duck.static.hf.space/ |
| `notebook/` | 코랩 실습 노트북 — 뇌 지도 표 열기 → 뇌 그리기 → 냄새 경로 3단계 → 물통 모델 → 이득 실험 | 코랩에서 열기 |
| `scripts/build_male.py` | MaleCNS 원본 표 3개 → 브라우저용 12MB 그래프 변환 (42초) | |
| `docs/` | 논문 설명, 실습 사다리, 강의 논리 구조 (한국어) | |

## 실행하기

### fly-walk (빌드 없음)
```
cd fly-walk
python3 -m http.server 8000
```
브라우저에서 http://localhost:8000 를 엽니다. 파일을 직접 더블클릭하면(file://) 워커가 막혀 안 됩니다.

### fly-bodies, fly-duck (Node 22 이상)
```
cd fly-bodies      # 또는 fly-duck
npm ci
npm run dev        # 개발 서버
npm run build      # dist/ 생성 → 정적 호스팅(허깅페이스 Static Space 등)에 그대로 업로드
```

### 노트북
`notebook/초파리_뇌지도_실습.ipynb`를 구글 코랩에 올려 위에서부터 실행합니다. 데이터는 셀이 직접 내려받습니다(뉴런 표 13MB, 연결 표 1.1GB).

### 수컷 뇌 그래프 다시 만들기
```
python3 -m venv env && env/bin/pip install pyarrow numpy scipy
# https://male-cns.janelia.org/download/ 에서 body-annotations, body-neurotransmitters, connectome-weights feather 3개를 받아 같은 폴더에 두고
env/bin/python scripts/build_male.py
```

## 안티그래비티(코딩 에이전트)에게 통째로 붙여넣기
```
이 저장소를 내려받아 fly-walk 폴더를 로컬 서버로 열어줘. python3 -m http.server 8000 을 쓰고 브라우저에서 localhost:8000 을 열어줘.
```

## 정직하게
- 뇌 배선은 진짜(CC-BY)이고 시냅스 10개 이상 연결만 넣었습니다. 시냅스 세기는 개수로 대신했고 억제성(GABA)만 음수입니다.
- 물통 모델은 단순화된 계산이며 학습하지 않습니다. 냄새를 어느 뉴런에 넣고 어느 뉴런을 읽어 방향으로 바꿀지는 사람이 정했습니다.
- 로봇의 걸음과 균형은 공개 강화학습 정책이 만듭니다. 초파리 척수 운동뉴런은 표시만 하고 로봇 관절에는 연결하지 않았습니다.
- 두 뇌 비교는 암수 행동 차이의 증명이 아닙니다.

## 라이선스
CONNECT AI LAB이 쓴 코드는 Apache-2.0입니다(`LICENSE`). 바탕이 된 microfly(Apache-2.0), Pollen Robotics MicroDuck(Apache-2.0), MuJoCo Menagerie 로봇 모델(BSD-3), MuJoCo Playground 정책(Apache-2.0), 뇌 데이터(CC-BY 4.0) 등 제3자 저작물과 라이선스 전문은 `THIRD_PARTY_NOTICES.md`와 `LICENSES/`를 보세요. 이 저장소를 재배포할 때 그 두 가지는 함께 옮겨야 합니다.

## 만든 사람
AI 멘토 제이 · CONNECT AI LAB — https://www.youtube.com/@CONNECT-AI-LAB · 무료 지식 아카이브 https://www.aicitybuilders.com/guide
AI가 만드는 기회를 소수가 독점하지 않도록.
