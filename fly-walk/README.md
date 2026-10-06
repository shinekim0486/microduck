---
title: 초파리 뇌 걷기
emoji: 🪰
colorFrom: yellow
colorTo: gray
sdk: static
app_file: index.html
pinned: false
license: apache-2.0
short_description: 2026 수컷 초파리 뇌 배선으로 2D 초파리를 걷게 합니다
---
# 초파리 뇌 걷기 — CONNECT AI LAB
2026년 9월 공개된 수컷 초파리 중추신경계 배선도(MaleCNS v1.0, Berg 외, Cell 2026, CC-BY 4.0)를 뉴런 166,700개·시냅스 10개 이상 연결 2,753,975개로 압축해, 브라우저 안에서 물통(LIF) 모델로 돌리고 2D 초파리를 조종합니다. 설치 없음, 13MB, 서버 없음. 학습하지 않습니다.
- 뇌 데이터: https://male-cns.janelia.org/ (CC-BY 4.0). 변환 스크립트와 3D 마이크로덕 판: https://huggingface.co/spaces/WonseokJayJung/fly-duck
- 물통 모델과 번역식(디코더)은 microfly(Apache-2.0, lvwerra)를 바탕으로 했고, 2D 몸·여섯 다리 애니메이션·한국어 설계는 CONNECT AI LAB이 만들었습니다.
- 다리 움직임은 척수 운동뉴런 좌우 발화율로 걸음 속도를 정한 애니메이션이며 근육 시뮬레이션이 아닙니다.
