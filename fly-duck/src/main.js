import './style.css';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createDuckSim} from './duck-sim.js';
import {createBrainView} from './brain-view.js';
import {encodeStimulus} from './sensors.js';
import {DEFAULT_POSE,JOINT_NAMES} from './vendor/constants.js';
import {signed} from './vendor/signed.js';
import {createDownloadProgress} from './download.js';
import {createHeadView} from './head-view.js';
import {createBanana} from './food.js';
const Q=new URLSearchParams(location.search);const BRAIN_KEY=Q.get('brain')==='male'?'male':'female';const BRAIN_DIR=BRAIN_KEY==='male'?'./brain-male':'./brain';window.flyduckBrain={key:BRAIN_KEY,dir:BRAIN_DIR};if(Q.has('embed'))document.documentElement.classList.add('embed');
import {FoodCycle} from './food-cycle.js';
import {followCameraPose,FOLLOW_DISTANCE} from './follow-camera.js';
const $=id=>document.getElementById(id),low=new URLSearchParams(location.search).has('low');
const telemetry=window.flyduck={ready:false,paused:false,connected:true,cut:false,mode:'walk',activity:null,command:{forward:0,turn:0},state:null,anatomy:null,error:null};
const downloadProgress=createDownloadProgress(progress=>{
  if(telemetry.error)return;
  telemetry.download=progress;$('download-progress').value=progress.percent;$('load-percent').textContent=progress.percent+'%';
  $('load-detail').textContent=progress.complete?'내려받기 완료':`파일 ${progress.total}개 중 ${progress.completed}개 완료`;
  $('load-text').textContent=progress.complete?'시뮬레이션 시작 중…':'뇌와 로봇을 내려받는 중…';
});
let sim,worker,brainView,headView,paused=false,activity=null,lastBrain=0,airUntil=0,generation=0;
const food=new FoodCycle();
let scent=food.position,trail=[],lastTrail=-1,scene,camera,renderer,controls,marker,trailLine;
const neuralHistory=[];
const bars=JOINT_NAMES.map((name,i)=>{const div=document.createElement('div');div.className='motor-bar';div.innerHTML='<i></i>';div.title=name;$('motors').appendChild(div);return div;});
function status(text,live=false){$('status').textContent=text;$('status-dot').classList.toggle('live',live);}
function fail(e){telemetry.error=e.message??String(e);telemetry.ready=false;paused=true;worker?.postMessage({type:'stop'});status('시뮬레이션 중지됨');$('load-text').textContent=telemetry.error;$('loading').style.display='flex';$('loading').querySelector('.loader').style.display='none';$('toggle').disabled=true;console.error(e);}
function createScene(){
  const host=$('world');scene=new THREE.Scene();window.flyduckScene=scene;scene.background=new THREE.Color('#0e121a');scene.fog=new THREE.Fog('#0e121a',7,16);
  camera=new THREE.PerspectiveCamera(38,host.clientWidth/host.clientHeight,.01,50);camera.position.set(...followCameraPose({x:0,y:0,yaw:0}).position);
  renderer=new THREE.WebGLRenderer({antialias:true});const lowQuality=new URLSearchParams(location.search).has('low');renderer.setPixelRatio(lowQuality?.5:Math.min(devicePixelRatio,1.5));renderer.setSize(host.clientWidth,host.clientHeight);renderer.shadowMap.enabled=!lowQuality;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
  controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.12,0);controls.enableRotate=false;controls.enablePan=false;controls.minDistance=.55;controls.maxDistance=8;controls.update();followDuck({x:0,y:0,yaw:0});
  scene.add(new THREE.HemisphereLight(0xffffff,0x2a3140,1.9));const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.position.set(-2,5,2);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-3;sun.shadow.camera.right=3;sun.shadow.camera.top=3;sun.shadow.camera.bottom=-3;sun.shadow.normalBias=.008;scene.add(sun);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:0x161b25,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const grid=new THREE.GridHelper(4,8,0x3a4356,0x252c3a);grid.position.y=.002;scene.add(grid);
  const railMat=new THREE.MeshStandardMaterial({color:0x3b4455,roughness:.9});
  for(const[x,z,w,d]of [[2.04,0,.08,4.16],[-2.04,0,.08,4.16],[0,2.04,4.16,.08],[0,-2.04,4.16,.08]]){const rail=new THREE.Mesh(new THREE.BoxGeometry(w,.18,d),railMat);rail.position.set(x,.09,z);rail.receiveShadow=true;rail.castShadow=true;scene.add(rail);}
  marker=createBanana();scene.add(marker);updateMarker();
  trailLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffd60a,transparent:true,opacity:.8}));scene.add(trailLine);
  let down;const pointers=new Set();
  renderer.domElement.addEventListener('pointerdown',e=>{pointers.add(e.pointerId);down=pointers.size===1&&e.button===0?{id:e.pointerId,x:e.clientX,y:e.clientY,dragged:false}:null;});
  renderer.domElement.addEventListener('pointermove',e=>{if(down?.id===e.pointerId&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)down.dragged=true;});
  renderer.domElement.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);down=null;});
  renderer.domElement.addEventListener('pointerup',e=>{const press=down;down=null;pointers.delete(e.pointerId);if(!press||press.id!==e.pointerId||press.dragged||pointers.size||e.button!==0||!telemetry.ready)return;const rect=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const p=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),new THREE.Vector3());if(p&&Math.abs(p.x)<1.85&&Math.abs(p.z)<1.85){if(window.flyduckLab?.placeMode&&window.flyduckLab.placeMode!=='banana'){window.flyduckLab.onPlace?.({x:p.x,y:-p.z});return;}placeFood({x:p.x,y:-p.z});$('stimulus-label').textContent='바나나를 옮겼습니다.';}});
  new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}).observe(host);
}
function followDuck(pose,distance=controls.getDistance()){
  const view=followCameraPose(pose,distance);
  controls.target.set(...view.target);camera.position.set(...view.position);camera.lookAt(controls.target);camera.updateMatrixWorld();
  telemetry.camera={...view,distance,yaw:pose.yaw,fov:camera.fov,aspect:camera.aspect};
}
function updateMarker(){if(marker){marker.visible=!!scent;if(scent)marker.position.set(scent.x,0,-scent.y);telemetry.food=food.state();}}
function placeFood(position){food.place(position);scent=food.position;updateMarker();worker?.postMessage({type:'stimulus',value:stimulus()});}
function advanceFood(){
  const event=food.update(sim.state(),.02);
  if(!event)return;
  scent=food.position;updateMarker();worker.postMessage({type:'stimulus',value:stimulus()});
  $('stimulus-label').textContent=event==='collected'?`바나나 ${food.collected}개 획득. 곧 새 바나나가 나옵니다…`:'새 바나나가 나왔습니다.';
}
function stimulus(){
  const input=encodeStimulus(sim?.state()??{x:0,y:0,yaw:0},scent,+$('light').value,performance.now()<airUntil);
  telemetry.sensory=input;telemetry.scent=scent;
  for(const side of ['left','right'])$('input-'+side).value=input['olfactory_'+side];
  return input;
}
function command(){
  const enabled=telemetry.connected&&!paused&&performance.now()-lastBrain<1000&&!!activity;
  if(telemetry.mode==='direct')return {enabled,motors:activity?.motors??Array(14).fill(0),gain:+$('motor-gain').value,forward:0,turn:0};
  if(!enabled||sim?.state().fallen)return {forward:0,turn:0};
  return activity.command;
}
function drawNeural(){const c=$('neural'),w=c.clientWidth,h=c.clientHeight;c.width=w*2;c.height=h*2;const ctx=c.getContext('2d');ctx.scale(2,2);ctx.fillStyle='#f2f3f5';ctx.fillRect(0,0,w,h);const colors=['#8b984b','#779875','#506f62','#2e4839'];for(let row=0;row<4;row++){ctx.strokeStyle='#dfe2e6';ctx.beginPath();ctx.moveTo(0,(row+1)*h/4);ctx.lineTo(w,(row+1)*h/4);ctx.stroke();}neuralHistory.slice(-100).forEach((values,i,all)=>{const x=w-(all.length-i)*w/100;for(let row=0;row<4;row++){const max=[6000,18000,15000,330][row],height=Math.min(1,values[row+1]/max)*(h/4-3);ctx.fillStyle=colors[row];ctx.fillRect(x,(row+1)*h/4-2-height,w/100-1,height);}});}
function renderStats(){const s=sim.state(),c=command();telemetry.state=s;telemetry.command=c;telemetry.paused=paused;
  $('distance').textContent=s.distance.toFixed(2);$('speed').textContent=(telemetry.mode==='direct'?s.speed:c.forward).toFixed(2);
  $('turn').textContent=telemetry.mode==='direct'?'관절 목표만':c.turn.toFixed(2)+' rad/s';
  const secs=Math.floor(s.steps/50);$('elapsed').textContent=String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0');
  for(let i=0;i<14;i++){const offset=s.targets[i]-DEFAULT_POSE[i],bar=bars[i].firstElementChild;bar.style.height=Math.min(50,Math.abs(offset)*50)+'%';bar.style.bottom=(offset>=0?50:50-Math.min(50,Math.abs(offset)*50))+'%';bars[i].title=JOINT_NAMES[i]+': '+s.targets[i].toFixed(3)+' rad';}
  followDuck(s);
  if(paused)status('일시정지');else if(!telemetry.connected)status('뇌 연결 끊김');else if(s.fallen)status('오리 넘어짐 · 리셋으로 세우기');else if(telemetry.cut)status('시냅스 꺼짐');else if(performance.now()-lastBrain>1000)status('뇌 기다리는 중');else status(telemetry.mode==='direct'?'뇌가 관절 직접 구동':'작동 중',true);
  if(s.steps-lastTrail>=10){lastTrail=s.steps;trail.push(new THREE.Vector3(s.x,.006,-s.y));if(trail.length>3000)trail.shift();trailLine.geometry.dispose();trailLine.geometry=new THREE.BufferGeometry().setFromPoints(trail);}
}
let lastRender=0;
function animate(now){requestAnimationFrame(animate);if(now-lastRender<(low?500:25))return;lastRender=now;controls?.update();if(sim&&telemetry.ready)renderStats();if(renderer)renderer.render(scene,camera);if(brainView){brainView.render();telemetry.anatomy=brainView.state();}if(headView){headView.render(activity,telemetry.connected,{paused,now});telemetry.head=headView.state();}}
async function physicsLoop(){
  if(!telemetry.ready)return;
  const start=performance.now();
  try{if(!paused){await sim.step(command());if(!paused)advanceFood();}}catch(e){fail(e);return;}
  setTimeout(physicsLoop,Math.max(0,20-(performance.now()-start)));
}
function pause(value){paused=value;telemetry.paused=value;$('toggle').textContent=value?'재개':'일시정지';worker?.postMessage({type:value?'stop':'start'});}
function resetTrail(){trail=[];lastTrail=-1;trailLine.geometry.dispose();trailLine.geometry=new THREE.BufferGeometry();followDuck(sim.state(),FOLLOW_DISTANCE);controls.update();}
function clearActivity(type,value){generation++;activity=null;telemetry.activity=null;lastBrain=0;neuralHistory.length=0;drawNeural();brainView?.update(new Uint8Array(139255));worker.postMessage({type,value,generation});}
function changeMode(mode){
  if(!sim||mode===telemetry.mode)return;telemetry.mode=mode;sim.setMode(mode);resetTrail();const direct=mode==='direct';
  $('mode-walk').setAttribute('aria-pressed',String(!direct));$('mode-direct').setAttribute('aria-pressed',String(direct));
  $('mode-note').textContent=direct?'Neural activity sets servo targets. No learned gait or balance.':'신경 신호가 방향을 정하고, 걷기 정책이 균형을 잡습니다.';
  $('control-route').textContent=direct?'뇌 → 서보 목표 14개':'뇌 → 걷기 정책 → 관절';
  $('body-note').textContent=direct?'하강뉴런이 관절 위치를 직접 정합니다. 떨림과 넘어짐이 정상입니다.':'학습된 걷기 정책이 낸 관절 목표 14개.';
  $('speed-label').textContent=direct?'속도 · m/s':'목표 속도 · m/s';$('motor-gain-control').hidden=!direct;$('motors').classList.toggle('direct',direct);renderStats();
}
function setScent(side){if(!sim)return;const s=sim.state(),angle=s.yaw+side*1.1;placeFood({x:Math.max(-1.65,Math.min(1.65,s.x+.65*Math.cos(angle))),y:Math.max(-1.65,Math.min(1.65,s.y+.65*Math.sin(angle)))});$('stimulus-label').textContent=side>0?'바나나를 왼쪽에 놓았습니다.':'바나나를 오른쪽에 놓았습니다.';}
$('toggle').onclick=()=>pause(!paused);
$('reset').onclick=()=>{sim.reset();resetTrail();clearActivity('reset');worker.postMessage({type:'stimulus',value:stimulus()});};
$('mode-walk').onclick=()=>changeMode('walk');$('mode-direct').onclick=()=>changeMode('direct');
$('connected').onchange=e=>{telemetry.connected=e.target.checked;};$('cut').onchange=e=>{telemetry.cut=e.target.checked;clearActivity('cut',e.target.checked);};
$('scent-left').onclick=()=>setScent(1);$('scent-right').onclick=()=>setScent(-1);
$('clear-scent').onclick=()=>{placeFood(null);$('stimulus-label').textContent='바나나를 치웠습니다.';};
$('startle').onclick=()=>{airUntil=performance.now()+1200;$('stimulus-label').textContent='짧은 인공 기계감각 자극.';};
$('light').oninput=e=>{$('light-value').value=Math.round(e.target.value*100)+'%';};
$('motor-gain').oninput=e=>{$('motor-gain-value').value=Number(e.target.value).toFixed(2)+' rad';};
$('slice').oninput=e=>{brainView?.slice(+e.target.value);$('slice-value').value=e.target.value==='100'?'뇌 전체':e.target.value+'% 깊이';};
$('shell').onchange=e=>brainView?.setShell(e.target.checked);$('brain-reset').onclick=()=>brainView?.resetView();
$('brain-expand').onclick=()=>{$('brain-large').append($('brain-world'),document.querySelector('.brain-controls'));$('brain-dialog').showModal();};
$('brain-close').onclick=()=>$('brain-dialog').close();
$('brain-dialog').addEventListener('close',()=>{const panel=document.querySelector('.brain-panel'),key=document.querySelector('.brain-key');panel.insertBefore($('brain-world'),key);panel.insertBefore(document.querySelector('.brain-controls'),key);});
$('head-expand').onclick=()=>{const expanded=$('head-inset').classList.toggle('expanded');$('head-expand').setAttribute('aria-expanded',String(expanded));$('head-expand').setAttribute('aria-label',expanded?'머리 단면 작게 보기':'머리 단면 크게 보기');$('head-expand').textContent=expanded?'↙':'↗';};
$('about').onclick=()=>$('methods').showModal();$('close-about').onclick=()=>$('methods').close();
document.addEventListener('visibilitychange',()=>{if(document.hidden&&telemetry.ready&&!paused)pause(true);});
async function boot(){downloadProgress();createScene();requestAnimationFrame(animate);worker=new Worker(new URL('./brain-worker.js',import.meta.url),{type:'module'});window.flyduckWorker=worker;
  const brainReady=new Promise((resolve,reject)=>{worker.onerror=e=>{reject(Error(e.message));fail(Error(e.message));};worker.onmessage=({data:m})=>{
    if(m.type==='download')downloadProgress(m);
    if(m.type==='lab'){telemetry.lab={...(telemetry.lab||{}),...m};return;}if(m.type==='ready')resolve(m);if(m.type==='error'){reject(Error(m.message));fail(Error(m.message));}
    if(m.type==='activity'&&m.generation===generation){
      const {fireState,...summary}=m;activity=summary;lastBrain=performance.now();telemetry.activity=summary;brainView?.update(fireState);
      $('spikes').textContent=m.spikes.toLocaleString();for(const side of ['left','right']){const v=m.filtered[side==='left'?'scentLeft':'scentRight'];$(side).value=v;$(side+'-value').textContent=(v*100).toFixed(1)+'%';}
      neuralHistory.push(m.groupSpikes);if(neuralHistory.length>100)neuralHistory.shift();drawNeural();
    }
  };});
  worker.postMessage({type:'init',graphUrl:new URL(signed(BRAIN_DIR+'/connectome.bin.gz'),location.href).href,metaUrl:new URL(signed(BRAIN_DIR+'/channels.json?v=3'),location.href).href});
  const results=await Promise.all([createDuckSim(()=>{},downloadProgress),brainReady,createBrainView($('brain-world'),{low,onProgress:downloadProgress,dir:BRAIN_DIR})]);
  sim=results[0];window.flyduckSim=sim;brainView=results[2];headView=createHeadView($('head-view'),sim.rig,{low});$('head-inset').hidden=false;
  scene.add(sim.rig.placer);telemetry.ready=true;physicsLoop();$('loading').style.display='none';for(const id of ['toggle','reset','mode-walk','mode-direct'])$(id).disabled=false;
  worker.postMessage({type:'stimulus',value:stimulus()});worker.postMessage({type:'start'});
  setInterval(()=>{if(telemetry.ready&&!paused)worker.postMessage({type:'stimulus',value:stimulus()});},100);
}
boot().catch(fail);
