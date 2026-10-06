// 수컷 초파리 뇌(MaleCNS 2026)를 물통 모델로 돌리는 워커. 학습 없음.
import {FlyBrain, NeuralDecoder} from './brain-core.js';
let brain, stimulus = {}, running = false, timer, cut = false;
const decoder = new NeuralDecoder();
async function fetchBuf(url, label) {
  const r = await fetch(url); if (!r.ok) throw Error(label + ' 내려받기 실패 ' + r.status);
  const total = +r.headers.get('content-length') || 0; const reader = r.body.getReader(); const chunks = []; let got = 0;
  for (;;) { const {done, value} = await reader.read(); if (done) break; chunks.push(value); got += value.length; self.postMessage({type: 'progress', label, got, total}); }
  const out = new Uint8Array(got); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; } return out.buffer;
}
function rates(brain, fire, steps, names) { const out = {}; for (const n of names) { const idx = brain.channels[n]; if (!idx) continue; let s = 0; for (const i of idx) s += fire[i]; out[n] = s / (idx.length * steps); } return out; }
function loop() {
  if (!running) return; const t = performance.now();
  const a = brain.advance(stimulus, 10, {cutSynapses: cut});
  const d = decoder.update(a);
  const side = rates(brain, a.fireState, 10, ['motor_left', 'motor_right', 'olfactory_left', 'olfactory_right']);
  self.postMessage({type: 'activity', left: a.left, right: a.right, scentLeft: a.scentLeft, scentRight: a.scentRight, motor: a.motor, motorLeft: side.motor_left || 0, motorRight: side.motor_right || 0, olfL: side.olfactory_left || 0, olfR: side.olfactory_right || 0, spikes: a.spikes, tick: a.tick, command: d.command, fireState: a.fireState}, [a.fireState.buffer]);
  timer = setTimeout(loop, Math.max(0, 100 - (performance.now() - t)));
}
self.onmessage = async ({data: m}) => {
  try {
    if (m.type === 'init') {
      const [raw, meta] = await Promise.all([fetchBuf(m.graphUrl, '뇌 배선'), fetchBuf(m.metaUrl, '뉴런 종류표')]);
      const u8 = new Uint8Array(raw, 0, 2);
      const buf = (u8[0] === 31 && u8[1] === 139) ? await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer() : raw;
      brain = new FlyBrain(buf, JSON.parse(new TextDecoder().decode(meta)));
      self.postMessage({type: 'ready', neurons: brain.n, edges: brain.edges, motor: (brain.channels.motor_left?.length || 0) + (brain.channels.motor_right?.length || 0)});
    } else if (m.type === 'start' && !running) { running = true; loop(); }
    else if (m.type === 'stop') { running = false; clearTimeout(timer); }
    else if (m.type === 'stimulus') stimulus = m.value;
    else if (m.type === 'reset') { brain.reset(); decoder.reset(); }
    else if (m.type === 'cut') { cut = m.value; brain.reset(); decoder.reset(); }
    else if (m.type === 'gain') brain.setGain(m.value);
    else if (m.type === 'lesion') self.postMessage({type: 'lesion', n: brain.setLesion(m.names)});
  } catch (e) { running = false; self.postMessage({type: 'error', message: e.message}); }
};
