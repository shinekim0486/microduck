// 유니트리 Go1 로봇 개: 브라우저 MuJoCo 물리 + MuJoCo Playground 공개 ONNX 걷기 정책(Apache-2.0).
// 초파리 뇌는 전진·회전 명령(command)만 준다. 관측 48차원 = linvel3 + gyro3 + gravity3 + joint12 + jointvel12 + lastaction12 + command3.
import * as THREE from 'three';
import loadMujoco from '@mujoco/mujoco';
import * as ort from 'onnxruntime-web/wasm';
import mjWasm from '@mujoco/mujoco/mujoco.wasm?url';
import ortWasm from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import {STLLoader} from 'three/addons/loaders/STLLoader.js';
import {parseMjcf} from '../mjcf.js';

const SIM_DT=0.004, CTRL_DT=0.02, N_SUB=5, ACTION_SCALE=0.5;
export const GO1_INFO={name:'유니트리 Go1 로봇 개',joints:12,policy:'MuJoCo Playground go1_policy.onnx (Apache-2.0)',model:'MuJoCo Menagerie unitree_go1 (BSD-3)',cmdScale:{vx:0.7,wz:1.5}};

export async function createGo1(scene,onStatus=()=>{}){
  ort.env.wasm.wasmPaths={wasm:ortWasm};ort.env.wasm.numThreads=1;
  onStatus('로봇 개 모델과 걷기 정책 내려받는 중…');
  const fetchBuf=async u=>{const r=await fetch(u);if(!r.ok)throw Error(u+' '+r.status);return r.arrayBuffer();};
  const [mj,xmlText,onnxBuf,ortBin,wasmBinary]=await Promise.all([
    fetchBuf(mjWasm).then(wasmBinary=>loadMujoco({wasmBinary,locateFile:p=>p.endsWith('.wasm')?mjWasm:p})),
    fetch('./robots/go1/go1.xml').then(r=>r.text()),
    fetchBuf('./policies/go1_policy.onnx'),
    fetchBuf(ortWasm),null]);
  ort.env.wasm.wasmBinary=ortBin;
  const session=await ort.InferenceSession.create(new Uint8Array(onnxBuf),{executionProviders:['wasm']});
  const rig=parseMjcf(xmlText);
  // 메시 파일 → MuJoCo VFS + three 지오메트리
  const vfs=new mj.MjVFS(); const geoms=new Map(); const loader=new STLLoader();
  await Promise.all(rig.meshes.map(async m=>{const buf=await fetchBuf('./robots/go1/assets/'+m.file);vfs.addBuffer('assets/'+m.file,new Uint8Array(buf));const g=loader.parse(buf);g.computeVertexNormals();geoms.set(m.name,g);}));
  // 물리 스텝 설정
  const doc=rig.doc; let opt=doc.querySelector('option'); if(!opt){opt=doc.createElement('option');doc.documentElement.insertBefore(opt,doc.documentElement.firstElementChild);} opt.setAttribute('timestep',String(SIM_DT));
  const model=mj.MjModel.from_xml_string(new XMLSerializer().serializeToString(doc),vfs), data=new mj.MjData(model);
  const OBJ=mj.mjtObj; const id=(t,n)=>mj.mj_name2id(model,t.value,n);
  const keyHome=id(OBJ.mjOBJ_KEY,'home'), trunk=id(OBJ.mjOBJ_BODY,'trunk'), imu=id(OBJ.mjOBJ_SITE,'imu');
  const adrLin=Number(model.sensor('local_linvel').adr), adrGyro=Number(model.sensor('gyro').adr);
  const defaults=Float32Array.from(Array.from({length:12},(_,i)=>model.key_qpos[keyHome*model.nq+7+i]));
  const last=new Float32Array(12), obs=new Float32Array(48); let cmd=[0,0,0], steps=0, policyCalls=0, fallen=false, distance=0, prev=null;
  // three 리그
  const root=new THREE.Group(); root.rotation.x=-Math.PI/2; scene.add(root); // z-up → y-up
  const mat=new THREE.MeshStandardMaterial({color:0x8a94a8,metalness:.6,roughness:.35});
  const accent=new THREE.MeshStandardMaterial({color:0xffd60a,metalness:.3,roughness:.5});
  const bodyGroups=rig.bodies.map(b=>{const g=new THREE.Group();g.name=b.name;for(const gm of b.geoms){const geo=geoms.get(gm.mesh);if(!geo)continue;const mesh=new THREE.Mesh(geo,gm.mesh==='hip'?accent:mat);mesh.castShadow=true;mesh.receiveShadow=true;mesh.position.set(...gm.pos);mesh.quaternion.set(gm.quat[1],gm.quat[2],gm.quat[3],gm.quat[0]);g.add(mesh);}
    if(b.name==='trunk'){const eye=new THREE.Mesh(new THREE.SphereGeometry(.012,12,12),accent);eye.position.set(.28,.05,.03);g.add(eye);const eye2=eye.clone();eye2.position.set(.28,-.05,.03);g.add(eye2);}
    root.add(g);return {group:g,id:id(OBJ.mjOBJ_BODY,b.name)};});
  function reset(){mj.mj_resetDataKeyframe(model,data,keyHome);mj.mj_forward(model,data);last.fill(0);steps=0;policyCalls=0;fallen=false;distance=0;prev=null;sync();}
  function pose(){const p=data.xpos,q=data.xquat,i=trunk;const w=q[4*i],x=q[4*i+1],y=q[4*i+2],z=q[4*i+3];return {x:p[3*i],y:p[3*i+1],z:p[3*i+2],yaw:Math.atan2(2*(w*z+x*y),1-2*(y*y+z*z))};}
  function sync(){const p=data.xpos,q=data.xquat;for(const {group,id:i} of bodyGroups){group.position.set(p[3*i],p[3*i+1],p[3*i+2]);group.quaternion.set(q[4*i+1],q[4*i+2],q[4*i+3],q[4*i]);}}
  function buildObs(){const s=data.sensordata,xm=data.site_xmat,qp=data.qpos,qv=data.qvel;
    obs[0]=s[adrLin];obs[1]=s[adrLin+1];obs[2]=s[adrLin+2];obs[3]=s[adrGyro];obs[4]=s[adrGyro+1];obs[5]=s[adrGyro+2];
    obs[6]=-xm[9*imu+6];obs[7]=-xm[9*imu+7];obs[8]=-xm[9*imu+8];
    for(let i=0;i<12;i++){obs[9+i]=qp[7+i]-defaults[i];obs[21+i]=qv[6+i];obs[33+i]=last[i];}
    obs[45]=cmd[0];obs[46]=cmd[1];obs[47]=cmd[2];}
  async function controlStep(){ // 0.02초 = 정책 1회 + 물리 5스텝
    buildObs();policyCalls++;
    const out=await session.run({[session.inputNames[0]]:new ort.Tensor('float32',obs,[1,48])});
    const act=out[session.outputNames[0]].data; if(act.length!==12||!Array.from(act).every(Number.isFinite))throw Error('정책 출력 이상');
    last.set(act); const ctrl=data.ctrl; for(let i=0;i<12;i++)ctrl[i]=act[i]*ACTION_SCALE+defaults[i];
    for(let k=0;k<N_SUB;k++)mj.mj_step(model,data); steps+=N_SUB;
    const p=pose(); if(prev){distance+=Math.hypot(p.x-prev.x,p.y-prev.y);} prev=p;
    const xm=data.site_xmat; const upz=xm[9*imu+8]; fallen=p.z<0.12||upz<0.45; sync();}
  function setCommand(forward,turn){ // 뇌 명령(오리 단위 0~0.24 m/s, ±0.7 rad/s) → Go1 정책 명령
    const vx=Math.max(0,Math.min(1,forward/0.24))*GO1_INFO.cmdScale.vx, wz=Math.max(-1,Math.min(1,turn/0.7))*GO1_INFO.cmdScale.wz; cmd=[vx,0,wz];}
  reset();
  return {reset,controlStep,setCommand,pose,root,ctrlDt:CTRL_DT,state:()=>({steps,policyCalls,fallen,distance,cmd:[...cmd],joints:Array.from({length:12},(_,i)=>data.qpos[7+i]),...pose()}),info:GO1_INFO};
}
