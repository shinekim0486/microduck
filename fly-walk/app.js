// 초파리 뇌 걷기 — 2D 경기장 + 실시간 발화 뇌. 뇌: MaleCNS 2026 (워커 물통 모델). 학습 없음.
import {createBrainView} from './brain-view.js';
const $ = id => document.getElementById(id);
const canvas = $('c'), ctx = canvas.getContext('2d');
const W = 4.0;
const px = m => (m + W / 2) / W * canvas.width, py = m => (W / 2 - m) / W * canvas.height;
const state = { x: 0, y: 0, yaw: Math.PI / 2, v: 0, w: 0, legPhase: [0, 0], collected: 0, banana: { x: 0.5, y: 0.9 }, respawnAt: 0, steps: [], stepAcc: 0, pulse: 0 };
const lab = { antenna: 'normal', range: 1.25, light: 0.45 };
let activity = null, ready = false, cut = false, lastT = performance.now(), brainView = null, autoRotate = true;
const particles = []; // 냄새 입자

function stimulus() {
  const s = { visual_left: lab.light * .65, visual_right: lab.light * .65, olfactory_left: 0, olfactory_right: 0, mechanosensory_left: 0, mechanosensory_right: 0 };
  const b = state.banana;
  if (b) {
    const dx = b.x - state.x, dy = b.y - state.y, bearing = Math.atan2(dy, dx) - state.yaw;
    const st = .95 * Math.exp(-Math.hypot(dx, dy) / lab.range) * (.25 + .75 * (1 + Math.cos(bearing)) / 2);
    let l = st * (.5 + .5 * Math.sin(bearing)), r = st * (.5 - .5 * Math.sin(bearing));
    if (lab.antenna === 'noLeft') l = 0; else if (lab.antenna === 'noRight') r = 0; else if (lab.antenna === 'swap') [l, r] = [r, l];
    s.olfactory_left = l; s.olfactory_right = r;
  }
  for (const [name, side] of [['mechanosensory_left', .65], ['mechanosensory_right', -.65]]) {
    const a = state.yaw + side, qx = state.x + .22 * Math.cos(a), qy = state.y + .22 * Math.sin(a);
    s[name] = Math.max(0, Math.min(1, (Math.max(Math.abs(qx), Math.abs(qy)) - 1.65) / .3));
  }
  return s;
}

// ---- 워커 + 뇌 뷰어 ----
const worker = new Worker(new URL('./brain-worker.js', import.meta.url), { type: 'module' });
let brainReady = false, viewReady = false;
function maybeStart() { if (brainReady && viewReady && !ready) { ready = true; $('loading').hidden = true; $('dot').classList.add('live'); worker.postMessage({ type: 'stimulus', value: stimulus() }); worker.postMessage({ type: 'start' }); } }
worker.onmessage = ({ data: m }) => {
  if (m.type === 'progress') { if (m.label === '뇌 배선') { const pct = m.total ? Math.round(100 * m.got / m.total) : 0; $('prog').value = pct; $('progText').textContent = `뇌 배선 ${(m.got / 1e6).toFixed(1)} / ${(m.total / 1e6).toFixed(1)} MB`; } }
  else if (m.type === 'ready') { brainReady = true; $('statusText').textContent = `작동 중 · 뉴런 ${m.neurons.toLocaleString()} · 운동뉴런 ${m.motor}`; maybeStart(); }
  else if (m.type === 'activity') { activity = m; if (brainView && m.fireState) brainView.update(m.fireState); }
  else if (m.type === 'error') { $('loading').hidden = false; $('loading').firstElementChild.textContent = '오류: ' + m.message; }
};
worker.postMessage({ type: 'init', graphUrl: new URL('./brain/connectome.bin.gz', location.href).href, metaUrl: new URL('./brain/channels.json?v=3', location.href).href });
createBrainView($('brain'), { low: matchMedia('(max-width:900px)').matches, dir: './brain', autoRotate: true, shell: false, baseAlpha: .17, pointScale: matchMedia('(max-width:900px)').matches ? 1.0 : 1.45, groupGain: { 0: 1.2, 1: 1, 2: .22, 3: .9, 4: 1.3 }, channelColors: { olfactory_left: 0xffb020, olfactory_right: 0xffb020, ALPN_left: 0xffd60a, ALPN_right: 0xffd60a, descending_left: 0xff7a3d, descending_right: 0xff7a3d, motor_left: 0xfff176, motor_right: 0xfff176 } }).then(v => { brainView = v; viewReady = true; maybeStart(); }).catch(e => { $('loading').firstElementChild.textContent = '뇌 그림 오류: ' + e.message; });
setInterval(() => { if (ready) worker.postMessage({ type: 'stimulus', value: stimulus() }); }, 100);

// ---- 조작 ----
function placeBanana(mx, my) { state.banana = { x: mx, y: my }; state.respawnAt = 0; state.pulse = 1; }
canvas.addEventListener('pointerup', e => { if (!ready) return; const r = canvas.getBoundingClientRect(); const mx = ((e.clientX - r.left) / r.width) * W - W / 2, my = W / 2 - ((e.clientY - r.top) / r.height) * W; if (Math.abs(mx) < 1.85 && Math.abs(my) < 1.85) placeBanana(mx, my); });
$('clear').onclick = () => { state.banana = null; state.respawnAt = 0; };
for (const b of document.querySelectorAll('[data-antenna]')) b.onclick = () => { for (const o of document.querySelectorAll('[data-antenna]')) o.setAttribute('aria-pressed', String(o === b)); lab.antenna = b.dataset.antenna; };
$('cut').onclick = () => { cut = !cut; $('cut').setAttribute('aria-pressed', String(cut)); $('cut').textContent = cut ? '시냅스 켜기' : '시냅스 끄기'; worker.postMessage({ type: 'cut', value: cut }); };
$('rotate').onclick = () => { autoRotate = !autoRotate; $('rotate').setAttribute('aria-pressed', String(autoRotate)); brainView?.setAutoRotate?.(autoRotate); };
$('reset').onclick = () => { Object.assign(state, { x: 0, y: 0, yaw: Math.PI / 2, v: 0, w: 0, legPhase: [0, 0], collected: 0, banana: { x: 0.5, y: 0.9 }, respawnAt: 0, steps: [], stepAcc: 0, pulse: 1 }); particles.length = 0; worker.postMessage({ type: 'reset' }); brainView?.resetView(); };

// ---- 물리(단순) ----
function step(dt) {
  if (!ready) return;
  const c = activity?.command || { forward: 0, turn: 0 };
  state.v += (c.forward * 1.6 - state.v) * Math.min(1, dt * 4); state.w += (c.turn - state.w) * Math.min(1, dt * 4);
  state.yaw += state.w * dt; state.x += Math.cos(state.yaw) * state.v * dt; state.y += Math.sin(state.yaw) * state.v * dt;
  state.x = Math.max(-1.9, Math.min(1.9, state.x)); state.y = Math.max(-1.9, Math.min(1.9, state.y));
  const mL = activity?.motorLeft || 0, mR = activity?.motorRight || 0;
  state.legPhase[0] += dt * (state.v * 14 + mL * 400); state.legPhase[1] += dt * (state.v * 14 + mR * 400);
  state.stepAcc += state.v * dt; if (state.stepAcc > .09) { state.stepAcc = 0; const side = state.steps.length % 2 ? 1 : -1; const a = state.yaw + side * Math.PI / 2; state.steps.push({ x: state.x + .06 * Math.cos(a), y: state.y + .06 * Math.sin(a), t: performance.now() }); if (state.steps.length > 160) state.steps.shift(); }
  if (state.banana && Math.hypot(state.banana.x - state.x, state.banana.y - state.y) < .18) { state.collected++; state.banana = null; state.respawnAt = performance.now() + 500; for (let i = 0; i < 30; i++) particles.push({ x: state.x, y: state.y, vx: (Math.random() - .5) * 1.2, vy: (Math.random() - .5) * 1.2, life: 1, kind: 'burst' }); }
  if (!state.banana && state.respawnAt && performance.now() > state.respawnAt) { let p; for (let i = 0; i < 40; i++) { const a = Math.random() * Math.PI * 2, d = .8 + Math.random() * .8; p = { x: state.x + d * Math.cos(a), y: state.y + d * Math.sin(a) }; if (Math.abs(p.x) < 1.6 && Math.abs(p.y) < 1.6) break; } state.banana = p; state.respawnAt = 0; state.pulse = 1; }
  // 냄새 입자: 바나나에서 퍼져 나옴
  if (state.banana) for (let i = 0; i < 1; i++) { const a = Math.random() * Math.PI * 2, sp = .08 + Math.random() * .25; particles.push({ x: state.banana.x, y: state.banana.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + .04, life: 1, kind: 'scent' }); }
  for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .995; p.vy *= .995; p.life -= dt * (p.kind === 'burst' ? 1.6 : .28); if (p.life <= 0) particles.splice(i, 1); }
  if (particles.length > 900) particles.splice(0, particles.length - 900);
  state.pulse = Math.max(0, state.pulse - dt * .9);
}

// ---- 그림 ----
function drawFly(x, y, yaw, s) {
  const k = 24, X = px(x), Y = py(y);
  // 그림자
  ctx.save(); ctx.translate(X + 6, Y + 8); ctx.rotate(-yaw + Math.PI / 2); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(0, k * .3, k * .75, k * 1.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.translate(X, Y); ctx.rotate(-yaw + Math.PI / 2);
  // 다리 6개 (삼각 걸음), 3마디
  for (let i = 0; i < 3; i++) for (const side of [-1, 1]) {
    const ph = state.legPhase[side < 0 ? 0 : 1] + (i % 2 === 0 ? 0 : Math.PI) + (side < 0 ? Math.PI : 0);
    const swing = Math.sin(ph) * .32, lift = Math.max(0, Math.cos(ph)) * .15;
    const bx = side * k * .5, by = (i - 1) * k * .5;
    const j1x = bx + side * k * .75, j1y = by + swing * k * .8 - k * .25;
    const j2x = bx + side * k * 1.25, j2y = by + swing * k * 1.5 + k * .1;
    const fx = bx + side * k * 1.45, fy = by + swing * k * 1.9 + k * .55 - lift * k;
    ctx.strokeStyle = `rgba(215,222,232,${.85 - lift * 1.2})`; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(j1x, j1y); ctx.lineTo(j2x, j2y); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.fillStyle = '#e8ecf3'; ctx.beginPath(); ctx.arc(fx, fy, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  // 날개 (반투명, 무지개빛, 시맥)
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * k * .35, k * .25); ctx.rotate(side * .32 + Math.sin(performance.now() / 900) * .02);
    const g = ctx.createLinearGradient(0, -k, 0, k * 1.6); g.addColorStop(0, 'rgba(190,215,255,.30)'); g.addColorStop(.5, 'rgba(255,230,200,.18)'); g.addColorStop(1, 'rgba(170,240,255,.22)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(side * k * .25, k * .5, k * .48, k * 1.25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(200,220,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -k * .5); ctx.lineTo(side * k * .3, k * 1.6); ctx.moveTo(0, -k * .3); ctx.lineTo(side * k * .62, k * 1.2); ctx.moveTo(0, 0); ctx.lineTo(side * k * .7, k * .55); ctx.stroke();
    ctx.restore();
  }
  // 배: 줄무늬
  let g = ctx.createRadialGradient(-k * .15, k * .5, 2, 0, k * .75, k * 1.1); g.addColorStop(0, '#6c778c'); g.addColorStop(1, '#232a38');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, k * .8, k * .46, k * .95, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(15,18,26,.6)'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { const yy = k * .45 + i * k * .28; ctx.beginPath(); ctx.ellipse(0, yy, k * .44 * Math.sqrt(1 - ((yy - k * .8) / (k * .95)) ** 2), k * .1, 0, Math.PI, 2 * Math.PI, true); ctx.stroke(); }
  // 가슴
  g = ctx.createRadialGradient(-k * .15, -k * .2, 2, 0, -k * .05, k * .7); g.addColorStop(0, '#8b97ad'); g.addColorStop(1, '#3a4356');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -k * .05, k * .5, k * .6, 0, 0, Math.PI * 2); ctx.fill();
  // 머리
  g = ctx.createRadialGradient(-k * .1, -k * .95, 1, 0, -k * .85, k * .5); g.addColorStop(0, '#9aa6bb'); g.addColorStop(1, '#4a5468');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -k * .85, k * .4, 0, Math.PI * 2); ctx.fill();
  // 눈 (붉은 복안 + 하이라이트)
  for (const side of [-1, 1]) { g = ctx.createRadialGradient(side * k * .22, -k * 1.0, 1, side * k * .27, -k * .95, k * .2); g.addColorStop(0, '#ff7a6b'); g.addColorStop(1, '#8c1d18'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(side * k * .27, -k * .95, k * .19, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(side * k * .22, -k * 1.02, k * .05, 0, Math.PI * 2); ctx.fill(); }
  // 더듬이: 냄새 입력 세기로 빛남
  for (const [side, val] of [[-1, s.olfactory_left], [1, s.olfactory_right]]) {
    const v = Math.min(1, val); ctx.strokeStyle = `rgba(255,214,10,${.3 + v * .7})`; ctx.lineWidth = 2 + v * 3; ctx.shadowColor = '#ffd60a'; ctx.shadowBlur = 14 * v;
    ctx.beginPath(); ctx.moveTo(side * k * .12, -k * 1.15); ctx.quadraticCurveTo(side * k * .35, -k * 1.5, side * k * .55, -k * 1.75); ctx.stroke(); ctx.shadowBlur = 0;
    if (v > .05) { ctx.fillStyle = `rgba(255,214,10,${v})`; ctx.beginPath(); ctx.arc(side * k * .55, -k * 1.75, 2.5 + v * 3, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}
function draw() {
  const now = performance.now(), dt = Math.min(.05, (now - lastT) / 1000); lastT = now; step(dt);
  const s = stimulus();
  // 바닥
  const bg = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 50, canvas.width / 2, canvas.height / 2, canvas.width * .75); bg.addColorStop(0, '#141a26'); bg.addColorStop(1, '#090c12');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(80,92,115,.22)'; ctx.lineWidth = 1; for (let i = 0; i <= 8; i++) { const t = i / 8 * canvas.width; ctx.beginPath(); ctx.moveTo(t, 0); ctx.lineTo(t, canvas.height); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, t); ctx.lineTo(canvas.width, t); ctx.stroke(); }
  ctx.strokeStyle = '#3a4356'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
  // 냄새 입자
  for (const p of particles) { const X = px(p.x), Y = py(p.y); if (p.kind === 'burst') { ctx.fillStyle = `rgba(255,230,120,${p.life})`; ctx.beginPath(); ctx.arc(X, Y, 2 + (1 - p.life) * 3, 0, Math.PI * 2); ctx.fill(); } else { ctx.fillStyle = `rgba(255,214,10,${.11 * p.life})`; ctx.beginPath(); ctx.arc(X, Y, 3 + (1 - p.life) * 11, 0, Math.PI * 2); ctx.fill(); } }
  // 바나나
  if (state.banana) { const bx = px(state.banana.x), by = py(state.banana.y); const g = ctx.createRadialGradient(bx, by, 0, bx, by, 170); g.addColorStop(0, 'rgba(255,214,10,.28)'); g.addColorStop(1, 'rgba(255,214,10,0)'); ctx.fillStyle = g; ctx.fillRect(bx - 170, by - 170, 340, 340);
    if (state.pulse > 0) { ctx.strokeStyle = `rgba(255,214,10,${state.pulse * .8})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, by, 20 + (1 - state.pulse) * 120, 0, Math.PI * 2); ctx.stroke(); }
    ctx.font = '38px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = '#ffd60a'; ctx.shadowBlur = 18; ctx.fillText('🍌', bx, by); ctx.shadowBlur = 0; }
  // 발자국
  for (const f of state.steps) { const age = (now - f.t) / 9000; if (age > 1) continue; ctx.fillStyle = `rgba(255,214,10,${.55 * (1 - age)})`; ctx.beginPath(); ctx.arc(px(f.x), py(f.y), 2.2, 0, Math.PI * 2); ctx.fill(); }
  drawFly(state.x, state.y, state.yaw, s);
  // 수치 + 신호 흐름 막대
  const a = activity || {}; const pct = v => (100 * (v || 0)).toFixed(v > .001 ? 1 : 2), lvl = (id, v) => $(id).style.setProperty('--lvl', Math.max(0, Math.min(1, v)));
  $('fInL').textContent = s.olfactory_left.toFixed(2); $('fInR').textContent = s.olfactory_right.toFixed(2); lvl('n0', Math.max(s.olfactory_left, s.olfactory_right));
  $('fOL').textContent = pct(a.olfL); $('fOR').textContent = pct(a.olfR); lvl('n1', Math.max(a.olfL || 0, a.olfR || 0) * 2.5);
  $('fAL').textContent = pct(a.scentLeft); $('fAR').textContent = pct(a.scentRight); lvl('n2', Math.max(a.scentLeft || 0, a.scentRight || 0) * 6);
  const dn = ((a.left || 0) + (a.right || 0)) / 2; $('fDN').textContent = (100 * dn).toFixed(2); lvl('n3', dn * 120);
  $('fML').textContent = (100 * (a.motorLeft || 0)).toFixed(2); $('fMR').textContent = (100 * (a.motorRight || 0)).toFixed(2); lvl('n4', Math.max(a.motorLeft || 0, a.motorRight || 0) * 400);
  $('fFwd').textContent = (a.command?.forward || 0).toFixed(2); $('fTurn').textContent = (a.command?.turn || 0).toFixed(2) + ' rad/s'; $('fSpk').textContent = (a.spikes || 0).toLocaleString(); lvl('n5', (a.command?.forward || 0) / .24);
  $('count').textContent = state.collected ? `🍌 ${state.collected}` : '';
  if (brainView) brainView.render();
  window.flywalk = { ready, state, activity, stimulus: s, lab, cut, brain: brainView?.state?.() };
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
