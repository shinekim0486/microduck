import './style.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createBrainView} from './brain-view.js';
import {createMjcfBody,GO1_CFG,G1_CFG,BH_CFG,T1_CFG} from './bodies/mjcf-body.js';
import {createDuck} from './bodies/duck.js';
import {ENVS,envXml,envMeshes,touchStimulus} from './envs.js';
import {BRAIN_DEFS,CUSTOM_TEMPLATE,ruleBrain,randomBrain,compileCustom} from './brains.js';
import {createCompany,COMPANY_ENVS,COMPANY_TEMPLATE,companyRule,companyRandom} from './bodies/company.js';
const $=id=>document.getElementById(id);
const telemetry={ready:false,brainReady:false,bodyReady:false,activity:null,command:{forward:0,turn:0},body:null,banana:{x:1.2,y:0.6},collected:0,cut:false,antenna:'normal',error:null};
window.bodies=telemetry;
// ---- 3D 무대 ----
const host=$('world'); const scene=new THREE.Scene(); scene.background=new THREE.Color('#0b0e14'); scene.fog=new THREE.Fog('#0b0e14',8,22);
const camera=new THREE.PerspectiveCamera(42,1,.02,60); camera.position.set(1.9,1.1,2.0);
const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.5)); renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.1; host.appendChild(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.minDistance=1; controls.maxDistance=9; controls.maxPolarAngle=Math.PI/2-.03; controls.enablePan=false;
scene.add(new THREE.HemisphereLight(0xdfe7ff,0x1a2030,1.6)); const sun=new THREE.DirectionalLight(0xfff2cc,2.4); sun.position.set(-3,6,2); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-5;sun.shadow.camera.right=5;sun.shadow.camera.top=5;sun.shadow.camera.bottom=-5; sun.shadow.normalBias=.02; scene.add(sun);
const rim=new THREE.PointLight(0xffd60a,6,6); rim.position.set(0,1.5,-2); scene.add(rim);
const floor=new THREE.Mesh(new THREE.CircleGeometry(12,64),new THREE.MeshStandardMaterial({color:0x121722,roughness:.95,metalness:.05})); floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
const grid=new THREE.GridHelper(24,48,0x3a4356,0x232a38); grid.position.y=.002; scene.add(grid);
// 바나나 (z-up 좌표를 y-up으로): three (x, 0, -y)
const banana=new THREE.Group(); const bMat=new THREE.MeshStandardMaterial({color:0xffd60a,emissive:0xffb800,emissiveIntensity:.6,roughness:.4});
const bCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.16,.05,0),new THREE.Vector3(-.06,.03,0),new THREE.Vector3(.06,.05,0),new THREE.Vector3(.15,.12,0)]); const bMesh=new THREE.Mesh(new THREE.TubeGeometry(bCurve,24,.028,10,false),bMat); bMesh.castShadow=true; banana.add(bMesh);
const glow=new THREE.Mesh(new THREE.CircleGeometry(.9,48),new THREE.MeshBasicMaterial({color:0xffd60a,transparent:true,opacity:.12,depthWrite:false})); glow.rotation.x=-Math.PI/2; glow.position.y=.004; banana.add(glow); scene.add(banana);
const trailGeo=new THREE.BufferGeometry(); const trail=new THREE.Line(trailGeo,new THREE.LineDashedMaterial({color:0xffd60a,dashSize:.06,gapSize:.06,transparent:true,opacity:.8})); scene.add(trail); const trailPts=[];
function placeBanana(x,y){telemetry.banana={x,y}; banana.position.set(x,0,-y); pulse=1;}
let pulse=0; placeBanana(1.2,0.6);
const ray=new THREE.Raycaster(); let down=null;
renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>6||!telemetry.ready){down=null;return;}down=null;const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const p=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());if(p&&Math.hypot(p.x,p.z)<9)placeBanana(p.x,-p.z);});
new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}).observe(host);
// ---- 냄새 센서 (microfly 공식) ----
function stimulus(){const pz=telemetry.body?.pose()||{x:0,y:0,yaw:0};const s={visual_left:.45*.65,visual_right:.45*.65,olfactory_left:0,olfactory_right:0,mechanosensory_left:0,mechanosensory_right:0};
  const b=banana.visible?telemetry.banana:null;if(b){const dx=b.x-pz.x,dy=b.y-pz.y,bearing=Math.atan2(dy,dx)-pz.yaw;const st=.95*Math.exp(-Math.hypot(dx,dy)/1.6)*(.25+.75*(1+Math.cos(bearing))/2);let l=st*(.5+.5*Math.sin(bearing)),r=st*(.5-.5*Math.sin(bearing));if(telemetry.antenna==='noLeft')l=0;else if(telemetry.antenna==='swap')[l,r]=[r,l];s.olfactory_left=l;s.olfactory_right=r;}
  const t=touchStimulus(ENVS[currentEnv],pz,telemetry.body?.key==='duck'?.18:.35);s.mechanosensory_left=Math.max(s.mechanosensory_left,t.left);s.mechanosensory_right=Math.max(s.mechanosensory_right,t.right);
  telemetry.stimulus=s;return s;}
// ---- 뇌 워커 ----
const worker=new Worker(new URL('./brain-worker.js',import.meta.url),{type:'module'}); let brainView=null;
worker.onmessage=({data:m})=>{
  if(m.type==='progress'&&m.label==='뇌 배선'){$('prog').value=m.total?Math.round(100*m.got/m.total):0;$('progText').textContent=`뇌 배선 ${(m.got/1e6).toFixed(1)} / ${(m.total/1e6).toFixed(1)} MB`;}
  else if(m.type==='ready'){telemetry.brainReady=true;$('brainStat').textContent=`뉴런 ${m.neurons.toLocaleString()} · 운동뉴런 ${m.motor}`;maybeStart();}
  else if(m.type==='activity'){telemetry.activity=m;if(brainView&&m.fireState)brainView.update(m.fireState);if(telemetry.brain==='fly'){telemetry.command=m.command;telemetry.body?.setCommand(telemetry.cut?0:m.command.forward,telemetry.cut?0:m.command.turn);}}
  else if(m.type==='error'){fail(m.message);}};
function fail(msg){telemetry.error=msg;$('loading').hidden=false;$('loading').firstElementChild.textContent='오류: '+msg;}
worker.postMessage({type:'init',graphUrl:new URL('./brain/connectome.bin.gz',location.href).href,metaUrl:new URL('./brain/channels.json?v=3',location.href).href});
createBrainView($('brain'),{low:matchMedia('(max-width:900px)').matches,dir:'./brain',autoRotate:true,shell:false,baseAlpha:.16,pointScale:matchMedia('(max-width:900px)').matches?1:1.35,groupGain:{0:1.2,1:1,2:.22,3:.9,4:1.3},channelColors:{olfactory_left:0xffb020,olfactory_right:0xffb020,ALPN_left:0xffd60a,ALPN_right:0xffd60a,descending_left:0xff7a3d,descending_right:0xff7a3d,motor_left:0xfff176,motor_right:0xfff176}}).then(v=>{brainView=v;}).catch(e=>fail('뇌 그림: '+e.message));
// ---- 몸 (전환 가능) ----
const FACTORY={go1:(s,x)=>createMjcfBody(GO1_CFG,scene,s,x),duck:(s,x)=>createDuck(scene,s,x),g1:(s,x)=>createMjcfBody(G1_CFG,scene,s,x),bh:(s,x)=>createMjcfBody(BH_CFG,scene,s,x),t1:(s,x)=>createMjcfBody(T1_CFG,scene,s,x),company:(s,x,envKey)=>createCompany($('chartHost'),envKey,scene)};
let currentBody='go1', currentEnv='flat', envGroup=null;
telemetry.env='flat';
let generation=0, paused=false;
function setJointBars(n){const box=$('joints');box.innerHTML='';for(let i=0;i<n;i++)box.appendChild(document.createElement('i'));box.style.gridTemplateColumns=`repeat(${n},1fr)`;$('jointLabel').textContent=`로봇 관절 ${n}개 (강화학습 정책이 매 0.02초 정하는 목표)`;}
async function switchBody(key,envKey=currentEnv){
  if(telemetry.switching)return; telemetry.switching=true; const gen=++generation; currentBody=key; currentEnv=envKey; telemetry.env=envKey;
  for(const b of document.querySelectorAll('[data-env]'))b.setAttribute('aria-pressed',String(b.dataset.env===envKey)); $('envNote').textContent=ENVS[envKey].note;
  if(envGroup){scene.remove(envGroup);envGroup=null;} envGroup=envMeshes(ENVS[envKey]); scene.add(envGroup);
  for(const b of document.querySelectorAll('[data-body]'))b.setAttribute('aria-pressed',String(b.dataset.body===key));
  telemetry.bodyReady=false; $('loading').hidden=false; $('loading').firstElementChild.textContent='몸을 바꾸는 중…'; $('prog').value=0; $('progText').textContent='';
  if(telemetry.body){telemetry.body.dispose();telemetry.body=null;}
  trailPts.length=0; telemetry.collected=0;
  const isCo=key==='company'; banana.visible=!isCo; if(envGroup)envGroup.visible=!isCo; $('sceneHint').hidden=isCo; $('chartHost').hidden=!isCo; $('brain').style.visibility=isCo?'hidden':''; $('brainTitle').textContent=isCo?'회사 결산 · 실시간':'초파리 뇌 · 실시간 발화'; $('legendBox').hidden=isCo; $('coHint').hidden=!isCo;
  for(const b of document.querySelectorAll('[data-env]')){const k=b.dataset.env;b.textContent=isCo?COMPANY_ENVS[k].name:ENVS[k].name;} $('envNote').textContent=isCo?COMPANY_ENVS[envKey].note:ENVS[envKey].note;
  try{const b=await FACTORY[key](t=>{$('loading').firstElementChild.textContent=t;},envXml(ENVS[envKey]),envKey);
    if(gen!==generation){b.dispose();return;}
    telemetry.body=b; telemetry.bodyReady=true; setJointBars(b.info.joints); $('bodyStat').textContent=b.info.name; $('bodyInfo').textContent=`${b.info.model} · 정책 ${b.info.policy} · 관측 ${b.info.obs}개 → 관절 ${b.info.joints}개`;
    if(isCo){camera.position.set(6.2,4.2,7.4);controls.target.set(0,.7,.4);telemetry.body=b;telemetry.bodyReady=true;setJointBars(0);$('bodyStat').textContent=b.info.name;$('bodyInfo').textContent=`${b.info.model} · 두뇌 입력 ${b.info.obs}개 → 가격·광고·발주`;applyCompanyBrain();telemetry.switching=false;maybeStart();if(telemetry.ready)runBody(gen);return;}
    const p=b.pose(); banana.visible=true; const eb=ENVS[envKey].banana; if(eb)placeBanana(b.key==='duck'?Math.min(eb[0],1.5):eb[0],eb[1]); else placeBanana(p.x+1.4*Math.cos(p.yaw+.8),p.y+1.4*Math.sin(p.yaw+.8));
    camera.position.set(p.x+b.camDist*.75,b.camHeight+b.camDist*.55,-p.y+b.camDist*.75); controls.target.set(p.x,b.camHeight,-p.y);
    telemetry.switching=false; maybeStart(); if(telemetry.ready)runBody(gen);
  }catch(e){telemetry.switching=false;fail((FACTORY[key]?key:'')+' 로봇: '+e.message);}
}
for(const b of document.querySelectorAll('[data-body]'))b.onclick=()=>switchBody(b.dataset.body);
for(const b of document.querySelectorAll('[data-env]'))b.onclick=()=>switchBody(currentBody,b.dataset.env);
function maybeStart(){if(telemetry.brainReady&&telemetry.bodyReady&&!telemetry.ready){telemetry.ready=true;$('dot').classList.add('live');worker.postMessage({type:'stimulus',value:stimulus()});worker.postMessage({type:'start'});runBody(generation);} if(telemetry.brainReady&&telemetry.bodyReady)$('loading').hidden=true;}
telemetry.brain='fly'; let customBrain=null; const t0=performance.now();
function pageBrainTick(){if(telemetry.body?.key==='company')return;const st=telemetry.stimulus||{};const inp={smellL:st.olfactory_left||0,smellR:st.olfactory_right||0,touchL:st.mechanosensory_left||0,touchR:st.mechanosensory_right||0,t:(performance.now()-t0)/1000};
  let out={forward:0,turn:0};
  if(telemetry.brain==='rule')out=ruleBrain(inp);else if(telemetry.brain==='random')out=randomBrain(inp);else if(telemetry.brain==='custom'&&customBrain)out=customBrain(inp);
  if(out.error)$('brainMsg').textContent='내 두뇌 오류: '+out.error;
  telemetry.command=out; telemetry.body?.setCommand(telemetry.cut?0:out.forward,telemetry.cut?0:out.turn);}
setInterval(()=>{if(telemetry.ready&&telemetry.body){worker.postMessage({type:'stimulus',value:stimulus()});if(telemetry.brain!=='fly')pageBrainTick();}},100);
function applyCompanyBrain(){const b=telemetry.body;if(!b||b.key!=='company')return;if(telemetry.brain==='rule')b.setPolicy(companyRule);else if(telemetry.brain==='random')b.setPolicy(companyRandom);else if(telemetry.brain==='custom'){try{const fn=new Function($('customCode').value+'\n;return typeof brain==="function"?brain:null;')();b.setPolicy(fn);}catch(e){b.setPolicy(null);$('brainMsg').textContent='코드 오류: '+e.message;}}else{b.setPolicy(null);$('brainMsg').textContent='초파리 뇌는 냄새 입력이 필요해 회사에는 맞지 않습니다. 대신 초파리 명령(전진→광고, 회전→가격)으로 대충 운영합니다. 규칙 두뇌나 내 두뇌를 써 보세요.';}}
function setBrain(key){telemetry.brain=key;for(const b of document.querySelectorAll('[data-brain]'))b.setAttribute('aria-pressed',String(b.dataset.brain===key));$('brainNote').textContent=BRAIN_DEFS[key].note;$('customBox').hidden=key!=='custom';$('brainMsg').textContent='';
  if(key==='custom'){try{customBrain=compileCustom($('customCode').value);$('brainMsg').textContent='내 두뇌를 끼웠습니다. 바나나를 놓아 보세요.';}catch(e){customBrain=null;$('brainMsg').textContent='코드 오류: '+e.message;}}
  if(telemetry.body?.key==='company'){if(key==='custom'&&$('customCode').value===CUSTOM_TEMPLATE)$('customCode').value=COMPANY_TEMPLATE;applyCompanyBrain();}else if(key==='custom'&&$('customCode').value===COMPANY_TEMPLATE)$('customCode').value=CUSTOM_TEMPLATE;
  telemetry.collected=0;}
for(const b of document.querySelectorAll('[data-brain]'))b.onclick=()=>setBrain(b.dataset.brain);
$('customCode').value=CUSTOM_TEMPLATE; $('customApply').onclick=()=>{if(telemetry.body?.key==='company'&&$('customCode').value===CUSTOM_TEMPLATE)$('customCode').value=COMPANY_TEMPLATE;setBrain('custom');};
// ---- 성적표: 지금 몸·지금 두뇌로 환경 5개 × N초, 바나나 수와 넘어짐 수 ----
let evalRun=null;
async function runEval(){if(evalRun)return; const secs=+$('evalSecs').value||30; const rows=[]; evalRun={cancel:false}; $('evalBtn').disabled=true; $('evalStop').hidden=false; const brainName=BRAIN_DEFS[telemetry.brain].name, bodyName=telemetry.body.info.name; const tbody=$('evalRows'); tbody.innerHTML='';
  for(const envKey of Object.keys(ENVS)){ if(evalRun.cancel)break; $('evalMsg').textContent=`${ENVS[envKey].name} 채점 중… (${secs}초)`;
    await switchBody(currentBody,envKey); while(!telemetry.ready||!telemetry.bodyReady||telemetry.switching)await new Promise(r=>setTimeout(r,100));
    if(currentBody==='company'){const b=telemetry.body;while(b.state().day<120&&!b.state().bankrupt&&!evalRun.cancel)await new Promise(r=>setTimeout(r,100));const st=b.state();rows.push({env:COMPANY_ENVS[envKey].name,bananas:Math.round(st.cash),falls:st.bankrupt?1:0,dist:st.totalSales});const tr=document.createElement('tr');tr.innerHTML=`<td>${COMPANY_ENVS[envKey].name}</td><td>${Math.round(st.cash).toLocaleString()}</td><td>${st.bankrupt?'파산':'-'}</td><td>${st.totalSales.toLocaleString()}개</td>`;tbody.appendChild(tr);continue;}
    telemetry.collected=0; let falls=0, prevFallen=false; const start=performance.now();
    while(performance.now()-start<secs*1000&&!evalRun.cancel){await new Promise(r=>setTimeout(r,200));const f=telemetry.body?.state().fallen;if(f&&!prevFallen)falls++;prevFallen=!!f;}
    const st=telemetry.body.state(); rows.push({env:ENVS[envKey].name,bananas:telemetry.collected,falls,dist:st.distance});
    const tr=document.createElement('tr');tr.innerHTML=`<td>${ENVS[envKey].name}</td><td>${telemetry.collected}</td><td>${falls}</td><td>${st.distance.toFixed(1)} m</td>`;tbody.appendChild(tr);}
  const total=rows.reduce((a,r)=>a+r.bananas,0), fallsT=rows.reduce((a,r)=>a+r.falls,0); const isCo=currentBody==='company';
  $('evalMsg').textContent=evalRun.cancel?'채점을 멈췄습니다.':(isCo?`끝. ${brainName} × 회사: 120일 뒤 현금 합계 ${total.toLocaleString()} · 파산 ${fallsT}회 (시장 ${rows.length}개)`:`끝. ${brainName} × ${bodyName}: 바나나 ${total}개 · 넘어짐 ${fallsT}회 (환경 ${rows.length}개 × ${secs}초)`);
  $('evalH1').textContent=isCo?'시장':'환경';$('evalH2').textContent=isCo?'120일 뒤 현금':'바나나';$('evalH3').textContent=isCo?'파산':'넘어짐';$('evalH4').textContent=isCo?'총 판매':'이동';
  telemetry.lastEval={brain:brainName,body:bodyName,secs,rows,total,falls:fallsT}; evalRun=null; $('evalBtn').disabled=false; $('evalStop').hidden=true;}
$('evalBtn').onclick=runEval; $('evalStop').onclick=()=>{if(evalRun)evalRun.cancel=true;};
$('evalCopy').onclick=async()=>{const e=telemetry.lastEval;if(!e)return;const text=`두뇌 성적표 — ${e.brain} × ${e.body} (환경별 ${e.secs}초)\n`+e.rows.map(r=>`${r.env}: 바나나 ${r.bananas} · 넘어짐 ${r.falls} · ${r.dist.toFixed(1)}m`).join('\n')+`\n합계 바나나 ${e.total} · 넘어짐 ${e.falls}\nhttps://github.com/shinekim0486/microduck — 인공지능 공부하기`;try{await navigator.clipboard.writeText(text);$('evalMsg').textContent='성적표를 복사했습니다.';}catch{$('evalMsg').textContent=text;}};
// ---- 몸 제어 루프 (실시간 0.02초) ----
async function runBody(gen){const b=telemetry.body; if(!b)return; let acc=0,prevT=performance.now();
  while(gen===generation&&telemetry.body===b){const now=performance.now();acc+=Math.min(.1,(now-prevT)/1000);prevT=now;
    if(!paused){let n=0;while(acc>=b.ctrlDt&&n<4){await b.controlStep();acc-=b.ctrlDt;n++;} if(n===4)acc=0;} else acc=0;
    const st=b.state(); if(b.key==='company'){await new Promise(r=>setTimeout(r,4));continue;} if(st.fallen&&!telemetry.fallenAt)telemetry.fallenAt=now; if(!st.fallen)telemetry.fallenAt=0;
    if(telemetry.fallenAt&&now-telemetry.fallenAt>1500){telemetry.fallenAt=0;b.reset();trailPts.length=0;}
    const bn=telemetry.banana; const reach=b.key==='duck'?.18:.35; if(bn&&banana.visible&&Math.hypot(bn.x-st.x,bn.y-st.y)<reach){telemetry.collected++;let p;for(let i=0;i<40;i++){const a=Math.random()*Math.PI*2,d=(b.key==='duck'?.7:1.6)+Math.random()*(b.key==='duck'?.5:1.6);p={x:st.x+d*Math.cos(a),y:st.y+d*Math.sin(a)};if(Math.hypot(p.x,p.y)<7)break;}placeBanana(p.x,p.y);}
    await new Promise(r=>setTimeout(r,4));}}
switchBody('go1');
// ---- 렌더 + 수치 ----
$('reset').onclick=()=>{telemetry.body?.reset();trailPts.length=0;worker.postMessage({type:'reset'});telemetry.collected=0;};
$('clear').onclick=()=>{banana.visible=false;};
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'재개':'일시정지';worker.postMessage({type:paused?'stop':'start'});};
$('cut').onclick=()=>{telemetry.cut=!telemetry.cut;$('cut').setAttribute('aria-pressed',String(telemetry.cut));$('cut').textContent=telemetry.cut?'시냅스 켜기':'시냅스 끄기';worker.postMessage({type:'cut',value:telemetry.cut});};
for(const b of document.querySelectorAll('[data-antenna]'))b.onclick=()=>{for(const o of document.querySelectorAll('[data-antenna]'))o.setAttribute('aria-pressed',String(o===b));telemetry.antenna=b.dataset.antenna;};
for(const b of document.querySelectorAll('[data-scent]'))b.onclick=()=>{const p=telemetry.body?.pose();if(!p)return;const side=+b.dataset.scent,a=p.yaw+side*1.0;banana.visible=true;placeBanana(p.x+1.4*Math.cos(a),p.y+1.4*Math.sin(a));};
let follow=true; $('follow').onclick=()=>{follow=!follow;$('follow').setAttribute('aria-pressed',String(follow));};
const fmt=(v,d=2)=>Number.isFinite(v)?v.toFixed(d):'0.00', pct=v=>(100*(v||0)).toFixed(v>.001?1:2);
let lastRender=performance.now();
function render(){requestAnimationFrame(render);const now=performance.now(),rdt=Math.min(.05,(now-lastRender)/1000);lastRender=now;const b=telemetry.body;if(b&&b.key==='company'){b.update3D(rdt);b.draw();controls.update();renderer.render(scene,camera);const st=b.state();$('fCmd').textContent=`가격 ${st.cmd[0].toFixed(1)} · 광고 ${Math.round(st.cmd[1])}`;$('fDist').textContent=`현금 ${Math.round(st.cash).toLocaleString()}`;$('fPol').textContent=String(st.day);$('count').textContent=st.bankrupt?'파산':`${st.day}일`;$('statusText').textContent=st.bankrupt?'파산 · 리셋':'운영 중';return;}
if(b){const st=b.state();
    if(follow){const target=new THREE.Vector3(st.x,b.camHeight??.25,-st.y);const before=controls.target.clone();controls.target.lerp(target,.08);camera.position.add(controls.target.clone().sub(before));}
    if(!trailPts.length||Math.hypot(st.x-trailPts.at(-1).x,-st.y-trailPts.at(-1).z)>.03){trailPts.push(new THREE.Vector3(st.x,.01,-st.y));if(trailPts.length>800)trailPts.shift();trail.geometry.dispose();trail.geometry=new THREE.BufferGeometry().setFromPoints(trailPts);trail.computeLineDistances();}
    const a=telemetry.activity||{},s=telemetry.stimulus||{};
    $('fIn').textContent=`${fmt(s.olfactory_left)} · ${fmt(s.olfactory_right)}`;$('fTouch').textContent=`${fmt(s.mechanosensory_left)} · ${fmt(s.mechanosensory_right)}`;$('fAL').textContent=`${pct(a.scentLeft)}% · ${pct(a.scentRight)}%`;$('fDN').textContent=`${(100*(((a.left||0)+(a.right||0))/2)).toFixed(2)}%`;$('fMot').textContent=`${(100*(a.motorLeft||0)).toFixed(2)} · ${(100*(a.motorRight||0)).toFixed(2)}%`;
    $('fCmd').textContent=`${fmt(st.cmd[0])} m/s · ${fmt(st.cmd[2])} rad/s`;$('fDist').textContent=`${fmt(st.distance)} m`;$('fPol').textContent=st.policyCalls.toLocaleString();$('fSpk').textContent=(a.spikes||0).toLocaleString();
    $('count').textContent=telemetry.collected?`🍌 ${telemetry.collected}`:'';$('statusText').textContent=st.fallen?'넘어짐 · 1.5초 뒤 자동 리셋':(telemetry.cut?'시냅스 꺼짐 · 정지':'작동 중');
    const bars=$('joints');for(let i=0;i<bars.children.length&&i<st.joints.length;i++){bars.children[i].style.height=Math.min(100,4+Math.abs(st.joints[i])*70)+'%';}
    if(pulse>0){pulse=Math.max(0,pulse-.02);glow.scale.setScalar(1+(1-pulse)*.8);glow.material.opacity=.12*pulse+.05;}
  }
  controls.update();renderer.render(scene,camera);brainView?.render();}
render();
