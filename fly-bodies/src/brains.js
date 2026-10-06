// 두뇌 갈아 끼우기. 모든 두뇌는 같은 입력(냄새 좌우, 촉각 좌우, 시간)을 받아 같은 출력(전진 0~0.24 m/s, 회전 ±0.7 rad/s)을 낸다.
// 이 인터페이스가 "두뇌 판매"의 최소 단위다. 몸과 걷기 정책은 로봇 회사가, 두뇌는 여러분이.
export const BRAIN_DEFS={
  fly:{name:'🪰 초파리 뇌 (복사)',note:'2026 수컷 초파리 배선 166,700개를 물통 모델로. 학습 없음. 번역식은 사람이 정함.'},
  rule:{name:'📏 규칙 두뇌 (사람이 짠 5줄)',note:'냄새 좌우 차이로 회전, 냄새 합으로 전진, 촉각이 세면 반대로 튼다. 5줄짜리 코드가 초파리 뇌와 얼마나 다른지 성적표로 비교하세요.'},
  random:{name:'🎲 무작위 두뇌',note:'매 0.1초 무작위 회전. 비교 기준선(baseline).'},
  custom:{name:'✍️ 내 두뇌 (코드)',note:'아래 상자에 자바스크립트 함수를 써서 끼웁니다. 입력 s = {smellL, smellR, touchL, touchR, t}. 출력 {forward, turn}. 여러분 브라우저 안에서만 실행됩니다.'},
};
export const CUSTOM_TEMPLATE=`// 내 두뇌: 입력 s → 출력 {forward(0~0.24 m/s), turn(-0.7~0.7 rad/s)}
// s.smellL, s.smellR : 좌우 더듬이 냄새 (0~1)
// s.touchL, s.touchR : 좌우 더듬이 촉각 (0~1, 벽·상자 가까우면 큼)
// s.t : 시간(초)
function brain(s){
  const sum = s.smellL + s.smellR;
  let turn = 0.7 * (s.smellL - s.smellR) / Math.max(0.02, sum);   // 냄새가 센 쪽으로
  if (s.touchL > 0.3) turn -= 0.5;                                 // 왼쪽에 벽 → 오른쪽으로
  if (s.touchR > 0.3) turn += 0.5;
  const forward = sum > 0.02 ? 0.24 : 0.08;                        // 냄새 나면 전진, 아니면 천천히 탐색
  return { forward, turn };
}`;
export function ruleBrain(s){const sum=s.smellL+s.smellR;let turn=.7*(s.smellL-s.smellR)/Math.max(.02,sum);if(s.touchL>.3)turn-=.5;if(s.touchR>.3)turn+=.5;return {forward:sum>.02?.24:.08,turn};}
let rnd={turn:0,t:0};
export function randomBrain(s){if(s.t-rnd.t>.5){rnd={turn:(Math.random()-.5)*1.4,t:s.t};}return {forward:.18,turn:rnd.turn};}
export function compileCustom(code){ // 회원 코드: 자기 브라우저에서만 실행. 예외는 잡아서 0 명령.
  const fn=new Function(code+'\n;return typeof brain==="function"?brain:null;')(); if(!fn)throw Error('brain(s) 함수가 없습니다.');
  return s=>{try{const o=fn(s)||{};const f=Math.max(0,Math.min(.24,+o.forward||0)),t=Math.max(-.7,Math.min(.7,+o.turn||0));return {forward:f,turn:t};}catch(e){return {forward:0,turn:0,error:e.message};}};
}
