// Walking-policy and direct-servo runtime adapted from Pollen Robotics' simulator.
// Original source and asset versions are recorded in provenance.json.
import * as THREE from 'three';
import loadMujoco from '@mujoco/mujoco';
import * as ort from 'onnxruntime-web/wasm';
import mjWasm from '@mujoco/mujoco/mujoco.wasm?url';
import ortWasm from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import {buildRig,loadKinematics,loadGlbGeometries,geometryToBinaryStl,setJoint} from './vendor/duck.js';
import {JOINT_NAMES,DEFAULT_POSE} from './vendor/constants.js';
import {signed} from './vendor/signed.js';
import {directTargets} from './motor-control.js';
import {download} from './download.js';

export async function createDuckSim(onStatus,onProgress) {
  ort.env.wasm.wasmPaths={wasm:ortWasm};ort.env.wasm.numThreads=1;
  onStatus('Loading MicroDuck’s body and walking policy…');
  const [mj,kin,geoms,session,xmlBuffer]=await Promise.all([
    download(signed(mjWasm),'physics',onProgress).then(wasmBinary=>loadMujoco({wasmBinary,locateFile:p=>p.endsWith('.wasm')?mjWasm:p})),
    loadKinematics('./robot/mjlab/kinematics.json',onProgress), loadGlbGeometries(onProgress),
    Promise.all([download(signed(ortWasm),'inference',onProgress),download(signed('./policies/BEST_alpha_walking.onnx'),'policy',onProgress)])
      .then(([runtime,model])=>{ort.env.wasm.wasmBinary=runtime;return ort.InferenceSession.create(new Uint8Array(model),{executionProviders:['wasm']});}),
    download(signed('./robot/mjlab/robot_allcollisions.xml'),'collisions',onProgress)
  ]);
  const doc=new DOMParser().parseFromString(new TextDecoder().decode(xmlBuffer),'text/xml');
  for(const g of doc.querySelectorAll('geom[class="visual"]'))g.remove();
  const used=new Set([...doc.querySelectorAll('geom[mesh]')].map(g=>g.getAttribute('mesh')));
  const vfs=new mj.MjVFS();
  for(const mesh of [...doc.querySelectorAll('asset > mesh')]) {
    const f=mesh.getAttribute('file'),name=mesh.getAttribute('name')??f.replace(/\.stl$/i,'');
    if(!used.has(name)){mesh.remove();continue;}
    const geometry=geoms.get(f);if(!geometry)throw Error(`Missing collision mesh ${f}`);
    vfs.addBuffer(`assets/${f}`,new Uint8Array(geometryToBinaryStl(geometry.welded)));
  }
  const add=(parent,tag,attrs)=>{const e=doc.createElement(tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));parent.appendChild(e);return e;};
  add(doc.documentElement,'option',{timestep:.005});
  add(doc.querySelector('worldbody'),'geom',{type:'plane',name:'floor',size:'0 0 .05',friction:'.8 .005 .0001'});
  // Physical boundary matches the rendered arena. No hidden steering override.
  for(const [name,pos,size] of [['east','2.04 0 .09','.04 2.08 .09'],['west','-2.04 0 .09','.04 2.08 .09'],['north','0 2.04 .09','2.08 .04 .09'],['south','0 -2.04 .09','2.08 .04 .09']])add(doc.querySelector('worldbody'),'geom',{name,type:'box',pos,size});
  for(let k=0;k<4;k++)add(doc.querySelector('worldbody'),'geom',{name:'obs'+k,type:'box',pos:'0 0 -1',size:'.12 .12 .1',rgba:'.4 .45 .55 1'});
  const poses=new Map(JOINT_NAMES.map((n,i)=>[n,DEFAULT_POSE[i]]));
  const joints=[...doc.querySelectorAll('body > joint')].map(j=>poses.get(j.getAttribute('name'))??0);
  add(add(doc.documentElement,'keyframe',{}),'key',{name:'STAND',qpos:`0 0 .12 1 0 0 0 ${joints.join(' ')}`,ctrl:[...DEFAULT_POSE].join(' ')});
  const model=mj.MjModel.from_xml_string(new XMLSerializer().serializeToString(doc),vfs),data=new mj.MjData(model);
  const rig=await buildRig(kin,{materialForMesh:(name,body,rgba)=>{
    if(/shell|face_part/.test(name))return {color:[.82,.83,.85],roughness:.7};
    if(/jaw|mouth|foot|sole/.test(name))return {color:[.9,.5,.12],roughness:.7};
    return {color:rgba.slice(0,3),roughness:.6};
  }});
  rig.placer.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  const trunk=rig.bodies.get('trunk_base'),qadr=JOINT_NAMES.map(n=>Number(model.jnt(n).qposadr)),vadr=JOINT_NAMES.map(n=>Number(model.jnt(n).dofadr));
  const gyro=Number(model.sensor('imu_ang_vel').adr),trunkId=mj.mj_name2id(model,mj.mjtObj.mjOBJ_BODY.value,'trunk_base');
  const key=mj.mj_name2id(model,mj.mjtObj.mjOBJ_KEY.value,'STAND');
  const obs=new Float32Array(61),last=new Float32Array(14),q=new THREE.Quaternion(),g=new THREE.Vector3();
  let distance=0,steps=0,previous=[0,0],generation=0,appliedCommand={forward:0,turn:0},mode='walk',policyCalls=0,directSteps=0;
  const ranges=JOINT_NAMES.map(name=>rig.joints.get(name).range??[-Math.PI,Math.PI]);
  let targets=Array.from(DEFAULT_POSE),appliedMotors=Array(14).fill(0);
  function reset(){generation++;mj.mj_resetDataKeyframe(model,data,key);mj.mj_forward(model,data);last.fill(0);distance=0;steps=0;policyCalls=0;directSteps=0;previous=[0,0];targets=Array.from(DEFAULT_POSE);appliedMotors.fill(0);appliedCommand={forward:0,turn:0};sync();}
  function sync(){const p=data.qpos;trunk.position.set(p[0],p[1],p[2]);trunk.quaternion.set(p[4],p[5],p[6],p[3]);for(let i=0;i<14;i++)setJoint(rig,JOINT_NAMES[i],p[qadr[i]]);}
  function state(){const p=data.qpos,v=data.qvel;return {mode,policyCalls,directSteps,targets:[...targets],joints:qadr.map(i=>p[i]),appliedMotors:[...appliedMotors],appliedCommand,actionMax:Math.max(...last.map(Math.abs)),x:p[0],y:p[1],height:p[2],yaw:Math.atan2(2*(p[3]*p[6]+p[4]*p[5]),1-2*(p[5]**2+p[6]**2)),distance,steps,speed:Math.hypot(v[0],v[1]),fallen:p[2]<.065||Math.abs(p[4])+Math.abs(p[5])>.8};}
  async function step(command){
    appliedCommand={...command};
    const version=generation,p=data.qpos,v=data.qvel,s=data.sensordata,xq=data.body(trunkId).xquat;
    if(mode==='direct'){
      appliedMotors=command.enabled?Array.from(command.motors):Array(14).fill(0);
      // On disconnection, hold current measured positions. This does not invoke a policy.
      const desired=command.enabled?directTargets(appliedMotors,command.gain,ranges):qadr.map(i=>p[i]);
      for(let i=0;i<14;i++)targets[i]+=Math.max(-.035,Math.min(.035,desired[i]-targets[i]));
      last.fill(0);directSteps++;
    }else{
    q.set(xq[1],xq[2],xq[3],xq[0]).conjugate();g.set(0,0,-1).applyQuaternion(q);
    obs.set([s[gyro],s[gyro+1],s[gyro+2],g.x,g.y,g.z]);
    for(let i=0;i<14;i++){obs[6+i]=p[qadr[i]]-DEFAULT_POSE[i];obs[20+i]=v[vadr[i]];obs[34+i]=last[i];}
    obs.fill(0,48);obs[48]=command.forward;obs[50]=command.turn;
    policyCalls++;
    const output=await session.run({[session.inputNames[0]]:new ort.Tensor('float32',obs,[1,61])});
    if(version!==generation)return;
    const action=output[session.outputNames[0]].data;
    if(action.length!==14||!Array.from(action).every(Number.isFinite))throw Error('Invalid walking policy output');
    last.set(action);targets=Array.from(action,(a,i)=>DEFAULT_POSE[i]+a);appliedMotors.fill(0);
    }
    if(version!==generation)return;
    const ctrl=data.ctrl;for(let i=0;i<14;i++)ctrl[i]=targets[i];
    for(let i=0;i<4;i++)mj.mj_step(model,data);
    const pos=data.qpos;if(!Array.from(pos).every(Number.isFinite))throw Error('Physics became non-finite');
    distance+=Math.hypot(pos[0]-previous[0],pos[1]-previous[1]);previous=[pos[0],pos[1]];steps++;sync();
  }
  function setObstacle(k,x,y,on){try{const gid=mj.mj_name2id(model,mj.mjtObj.mjOBJ_GEOM.value,'obs'+k);if(gid<0)return false;const gp=model.geom_pos;gp[3*gid]=x;gp[3*gid+1]=y;gp[3*gid+2]=on?.1:-1;return true;}catch(e){console.warn('obstacle',e);return false;}}
  function setMode(value){if(!['walk','direct'].includes(value))throw Error('Unknown control mode');mode=value;reset();}
  reset();return {rig,step,reset,state,setMode,setObstacle};
}
