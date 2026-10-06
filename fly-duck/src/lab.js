// CONNECT AI LAB 추가 기능: 실험 안내 버튼, 실시간 신호 흐름, 60초 바나나 챌린지, 공유.
// 원작의 시뮬레이션 코드는 건드리지 않고 window.flyduck 텔레메트리와 기존 버튼만 사용한다.
const $=id=>document.getElementById(id);
const fd=()=>window.flyduck;
const pct=v=>(100*(Number(v)||0)).toFixed(1);
const num=(v,d=2)=>(Number(v)||0).toFixed(d);
function syncGuide(){
  const cut=$('cut').checked, con=$('connected').checked;
  $('guide-cut').setAttribute('aria-pressed',String(cut));$('guide-cut').textContent=cut?'시냅스 다시 켜기':'시냅스 끄기';
  $('guide-disconnect').setAttribute('aria-pressed',String(!con));$('guide-disconnect').textContent=con?'뇌 연결 끊기':'뇌 다시 연결';
}
$('guide-banana').onclick=()=>{$('scent-left').click();$('experiment-anchor')?.scrollIntoView?.({behavior:'smooth',block:'center'});};
$('guide-cut').onclick=()=>{const c=$('cut');c.checked=!c.checked;c.dispatchEvent(new Event('change'));syncGuide();};
$('guide-disconnect').onclick=()=>{const c=$('connected');c.checked=!c.checked;c.dispatchEvent(new Event('change'));syncGuide();};
$('cut').addEventListener('change',syncGuide);$('connected').addEventListener('change',syncGuide);
// 챌린지
const BEST_KEY='flyduck-best';let best=0;try{best=Number(localStorage.getItem(BEST_KEY))||0;}catch{}
$('ch-best').textContent=best;
let ch=null; // {startSteps, baseCollected, done}
$('ch-start').onclick=()=>{
  const f=fd();if(!f?.ready||!f.state)return;
  if(f.paused)$('toggle').click();
  ch={startSteps:f.state.steps,baseCollected:f.food?.collected??0,done:false};
  $('ch-time').textContent='60';$('ch-score').textContent='0';$('ch-msg').textContent='시작! 바닥을 클릭해 오리 앞에 바나나를 놓으세요.';$('ch-start').textContent='다시 시작';
};
$('ch-share').onclick=async()=>{
  const score=$('ch-score').textContent,text=`초파리 뇌 오리 60초 챌린지: 바나나 ${score}개 🍌 진짜 초파리 뇌 배선이 로봇 오리를 조종합니다. ${location.href.split('?')[0]} — CONNECT AI LAB`;
  try{if(navigator.share){await navigator.share({text});$('ch-msg').textContent='공유했습니다.';}else{await navigator.clipboard.writeText(text);$('ch-msg').textContent='결과 문장을 복사했습니다. 댓글이나 커뮤니티에 붙여 넣어 보세요.';}}
  catch{$('ch-msg').textContent=text;}
};
let last=0;
function tick(t){
  requestAnimationFrame(tick);
  const f=fd();if(!f)return;
  const ready=!!f.ready;for(const id of ['guide-banana','guide-cut','guide-disconnect','ch-start'])$(id).disabled=!ready;
  if(t-last<100)return;last=t;
  const s=f.sensory||{},a=f.activity||{},c=f.command||a.command||{},st=f.state||{};
  $('f-in-l').textContent=num(s.olfactory_left,2);$('f-in-r').textContent=num(s.olfactory_right,2);
  $('f-alpn-l').textContent=pct(a.scentLeft);$('f-alpn-r').textContent=pct(a.scentRight);
  $('f-dn').textContent=pct(((a.left||0)+(a.right||0))/2);
  $('f-fwd').textContent=num(c.forward,2);$('f-turn').textContent=num(c.turn,2);$('f-dist').textContent=num(st.distance,2);
  if(ch&&!ch.done&&st.steps!=null){
    const elapsed=(st.steps-ch.startSteps)/50,left=Math.max(0,60-elapsed),score=Math.max(0,(f.food?.collected??0)-ch.baseCollected);
    $('ch-time').textContent=Math.ceil(left);$('ch-score').textContent=score;
    if(left<=0){ch.done=true;if(score>best){best=score;try{localStorage.setItem(BEST_KEY,String(best));}catch{}$('ch-best').textContent=best;$('ch-msg').textContent=`끝! 바나나 ${score}개, 새 기록입니다. 결과를 공유해 보세요.`;}else $('ch-msg').textContent=`끝! 바나나 ${score}개. 최고 기록은 ${best}개입니다.`;}
  }
}
requestAnimationFrame(tick);syncGuide();

// ===== 가상 신경과학 실험실 =====
globalThis.flyduckLab={antenna:'normal',scentRange:1.25};
const W=()=>window.flyduckWorker;
const msg=t=>{$('lab-msg').textContent=t;};
function pokeStimulus(){ // 센서 설정 변경을 즉시 반영: 바나나 버튼이 아닌, 현재 자극을 다시 계산하게 주변 밝기 입력 이벤트를 흉내낸다
  $('light').dispatchEvent(new Event('input'));
}
for(const b of document.querySelectorAll('[data-antenna]'))b.onclick=()=>{
  for(const o of document.querySelectorAll('[data-antenna]'))o.setAttribute('aria-pressed',String(o===b));
  globalThis.flyduckLab.antenna=b.dataset.antenna;
  msg({normal:'더듬이 정상. 바나나를 왼쪽에 놓으면 왼쪽으로 돕니다.',noLeft:'왼쪽 더듬이 제거. 왼쪽 냄새 입력이 0이 됩니다. 오리가 어느 쪽으로 도는지 보세요.',noRight:'오른쪽 더듬이 제거. 오른쪽 냄새 입력이 0이 됩니다.',swap:'좌우 바꿔 끼움. 왼쪽 냄새가 오른쪽 더듬이로 들어갑니다. 바나나 반대쪽으로 도나요?'}[b.dataset.antenna]);
};
$('lab-range').oninput=e=>{globalThis.flyduckLab.scentRange=Number(e.target.value);$('lab-range-value').value=Number(e.target.value).toFixed(2)+' m';};
// 절제
const BRAIN=window.flyduckBrain||{key:'female',dir:'./brain'};
let channelSizes=null;fetch(BRAIN.dir+'/channels.json?v=3').then(r=>r.json()).then(d=>{channelSizes=Object.fromEntries(Object.entries(d.channels).map(([k,v])=>[k,v.length]));
  for(const el of document.querySelectorAll('[data-count]')){const n=el.dataset.count.split(',').reduce((s,k)=>s+(channelSizes[k]||0),0);el.textContent=n.toLocaleString();}}).catch(()=>{});
function applyLesion(){
  const names=[...new Set([...document.querySelectorAll('[data-lesion]:checked')].flatMap(i=>i.dataset.lesion.split(',')))];
  W()?.postMessage({type:'lesion',names});
  const n=channelSizes?names.reduce((s,k)=>s+(channelSizes[k]||0),0):null;
  if(n!=null)$('lab-lesion-count').textContent=n.toLocaleString();
  msg(names.length?`뉴런 ${n?.toLocaleString()??''}개를 껐습니다. 신호 흐름 띠에서 어느 값이 0이 되는지, 오리가 멈추는지 보세요.`:'절제를 모두 되돌렸습니다.');
}
for(const c of document.querySelectorAll('[data-lesion]'))c.onchange=applyLesion;
// 시냅스 세기
const gainLabel=g=>g<2?'마취':g<2.75?'약함':g<=3.25?'정상':g<4.5?'과흥분':'발작';
$('lab-gain').oninput=e=>{const g=Number(e.target.value);$('lab-gain-value').value=g.toFixed(2)+' ('+gainLabel(g)+')';W()?.postMessage({type:'gain',value:g});msg(`시냅스 세기 ${g.toFixed(2)}. 틱당 발화 수와 하강뉴런 발화율이 어떻게 변하는지 보세요.`);};
$('lab-reset').onclick=()=>{
  document.querySelector('[data-antenna="normal"]').click();
  $('lab-range').value='1.25';$('lab-range').dispatchEvent(new Event('input'));
  for(const c of document.querySelectorAll('[data-lesion]'))c.checked=false;applyLesion();
  $('lab-gain').value='3';$('lab-gain').dispatchEvent(new Event('input'));
  $('reset').click();msg('실험을 기본값으로 되돌리고 뇌와 오리를 리셋했습니다.');
};
window.flyduckLabApi={applyLesion};

// ===== 뇌 선택 · 통계 =====
for(const b of document.querySelectorAll('[data-brain]')){b.setAttribute('aria-pressed',String(b.dataset.brain===BRAIN.key));b.onclick=()=>{if(b.dataset.brain===BRAIN.key)return;const u=new URL(location.href);u.searchParams.set('brain',b.dataset.brain);location.href=u.href;};}
fetch(BRAIN.dir+'/channels.json?v=3').then(r=>r.json()).then(d=>{
  const meta=d.meta||{name:'FlyWire v783',sex:'female',neurons:139255,edges:2698236};
  $('bs-neurons').textContent=meta.neurons.toLocaleString();$('bs-edges').textContent=meta.edges.toLocaleString();
  if(BRAIN.key==='male'){const motor=(d.channels.motor_left?.length||0)+(d.channels.motor_right?.length||0);$('bs-extra').textContent=motor.toLocaleString()+'개';$('bs-extra-label').textContent='다리 운동뉴런 (척수 포함)';}
  else{$('bs-extra').textContent='뇌만';$('bs-extra-label').textContent='척수 없음 · 2024년 공개';}
}).catch(()=>{});
// ===== 물건 팔레트 =====
const KINDS={banana:{},apple:{strength:.55,range:.8,label:'사과'},vinegar:{strength:1.6,range:2.2,label:'식초'},obstacle:{label:'장애물'}};
globalThis.flyduckLab.placeMode='banana';globalThis.flyduckLab.sources=[];globalThis.flyduckLab.obstacles=[];
const placed=[];let obstacleSlot=0;
function makeMesh(kind){const T=window.THREE_REF;return null;}
async function addObject(kind,p){
  const THREE=await import('three');const scene=window.flyduckScene;if(!scene)return;
  let mesh;
  if(kind==='apple'){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.SphereGeometry(.055,20,16),new THREE.MeshStandardMaterial({color:0xd8342f,roughness:.5}));body.position.y=.055;body.scale.y=.9;body.castShadow=true;g.add(body);const stem=new THREE.Mesh(new THREE.CylinderGeometry(.005,.005,.03,6),new THREE.MeshStandardMaterial({color:0x5a3a1e}));stem.position.y=.115;g.add(stem);mesh=g;}
  else if(kind==='vinegar'){const g=new THREE.Group();const glass=new THREE.MeshStandardMaterial({color:0xe6c56a,transparent:true,opacity:.75,roughness:.2});const b=new THREE.Mesh(new THREE.CylinderGeometry(.035,.04,.14,16),glass);b.position.y=.07;b.castShadow=true;g.add(b);const neck=new THREE.Mesh(new THREE.CylinderGeometry(.014,.02,.05,12),glass);neck.position.y=.165;g.add(neck);const cap=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.018,12),new THREE.MeshStandardMaterial({color:0x222831}));cap.position.y=.198;g.add(cap);mesh=g;}
  else if(kind==='obstacle'){mesh=new THREE.Mesh(new THREE.BoxGeometry(.24,.2,.24),new THREE.MeshStandardMaterial({color:0x5c6678,roughness:.8}));mesh.position.y=.1;mesh.castShadow=true;mesh.receiveShadow=true;}
  if(!mesh)return;mesh.position.x=p.x;mesh.position.z=-p.y;scene.add(mesh);
  const entry={kind,x:p.x,y:p.y,mesh};placed.push(entry);
  if(kind==='obstacle'){const slot=obstacleSlot++%4;entry.slot=slot;const old=placed.find(e=>e!==entry&&e.kind==='obstacle'&&e.slot===slot);if(old){scene.remove(old.mesh);placed.splice(placed.indexOf(old),1);}
    const ok=window.flyduckSim?.setObstacle?.(slot,p.x,p.y,true);entry.physics=!!ok;}
  syncObjects();
  msg(kind==='obstacle'?(entry.physics?'장애물을 놓았습니다. 오리가 부딪히면 넘어질 수 있습니다(물리 충돌 켜짐). 최대 4개.':'장애물을 화면에만 놓았습니다(물리 충돌은 이 브라우저에서 지원되지 않음).'):`${KINDS[kind].label}를 놓았습니다. 냄새 세기 ${KINDS[kind].strength}, 도달 거리 ${KINDS[kind].range}m.`);
}
function syncObjects(){globalThis.flyduckLab.sources=placed.filter(e=>KINDS[e.kind].strength).map(e=>({x:e.x,y:e.y,strength:KINDS[e.kind].strength,range:KINDS[e.kind].range}));globalThis.flyduckLab.obstacles=placed.filter(e=>e.kind==='obstacle').map(e=>({x:e.x,y:e.y}));}
globalThis.flyduckLab.onPlace=p=>addObject(globalThis.flyduckLab.placeMode,p);
for(const b of document.querySelectorAll('[data-place]'))b.onclick=()=>{for(const o of document.querySelectorAll('[data-place]'))o.setAttribute('aria-pressed',String(o===b));globalThis.flyduckLab.placeMode=b.dataset.place;msg(b.dataset.place==='banana'?'바닥을 클릭하면 바나나가 놓입니다.':`바닥을 클릭하면 ${KINDS[b.dataset.place].label}이(가) 놓입니다.`);};
$('palette-clear').onclick=()=>{const scene=window.flyduckScene;for(const e of placed){scene?.remove(e.mesh);if(e.kind==='obstacle'&&e.physics)window.flyduckSim?.setObstacle?.(e.slot,0,0,false);}placed.length=0;syncObjects();msg('놓은 물건을 모두 지웠습니다. 바나나는 그대로입니다.');};
// ===== 다리 운동뉴런(수컷) 표시 + iframe 브리지 =====
const inFrame=window!==window.parent;
setInterval(()=>{const f=fd();if(!f)return;const a=f.activity||{};if(a.motor!=null){$('f-motor-node').hidden=false;$('f-motor-arrow').hidden=false;$('f-motor').textContent=(100*a.motor).toFixed(2);}
  if(inFrame)window.parent.postMessage({flyduckStats:{brain:BRAIN.key,ready:!!f.ready,forward:f.command?.forward,turn:f.command?.turn,distance:f.state?.distance,alpnL:a.scentLeft||0,alpnR:a.scentRight||0,dn:((a.left||0)+(a.right||0))/2,motor:a.motor,spikes:a.spikes,collected:f.food?.collected}},'*');},200);
window.addEventListener('message',e=>{const c=e.data?.flyduckCmd;if(!c)return;({left:()=>$('scent-left').click(),right:()=>$('scent-right').click(),clear:()=>$('clear-scent').click(),reset:()=>$('reset').click(),pause:()=>$('toggle').click(),cut:()=>$('guide-cut').click(),disconnect:()=>$('guide-disconnect').click(),swap:()=>document.querySelector('[data-antenna="swap"]').click(),normal:()=>document.querySelector('[data-antenna="normal"]').click()})[c]?.();});
