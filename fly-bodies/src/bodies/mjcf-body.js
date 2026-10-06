// MJCF 로봇 + Playground ONNX 관절 정책을 브라우저 MuJoCo로 돌리는 일반 모듈. 로봇 개(Go1)와 휴머노이드(G1)가 설정만 다르게 공유한다.
import * as THREE from 'three';
import {parseMjcf} from '../mjcf.js';
import {getMujoco,createSession,fetchBuf,ort} from '../engine.js';

export async function createMjcfBody(cfg,scene,onStatus=()=>{},envXml=''){
  onStatus(`${cfg.name} 모델과 걷기 정책 내려받는 중…`);
  const [mj,xmlText,session]=await Promise.all([getMujoco(),fetch(cfg.xml).then(r=>r.text()),createSession(cfg.policy)]);
  const rig=parseMjcf(xmlText); const vfs=new mj.MjVFS(); let got=0;
  await Promise.all(rig.meshes.map(async m=>{const buf=await fetchBuf(cfg.assetsDir+m.file);vfs.addBuffer('assets/'+m.file,new Uint8Array(buf));onStatus(`${cfg.name} 부품 ${++got}/${rig.meshes.length}`);}));
  const doc=rig.doc; let opt=doc.querySelector('option'); if(!opt){opt=doc.createElement('option');doc.documentElement.insertBefore(opt,doc.documentElement.firstElementChild);} opt.setAttribute('timestep',String(cfg.simDt));
  // 충돌: 발 지오메트리에 contype 1을 켜고(일부 모델은 바닥과 접촉쌍으로만 닿음), 몸통에 질량 0 껍질을 붙여 환경 상자·벽과 부딪히게 한다. 정책 입력·질량은 그대로.
  for(const n of cfg.collideGeoms||[]){const g=doc.querySelector(`geom[name="${n}"]`);if(g){g.setAttribute('contype','1');if(!g.hasAttribute('conaffinity'))g.setAttribute('conaffinity','0');}}
  if(cfg.shell){const b=doc.querySelector(`body[name="${cfg.shell.body}"]`);if(b){const g=doc.createElement('geom');g.setAttribute('name','env_shell');for(const [k,v] of Object.entries(cfg.shell))if(k!=='body')g.setAttribute(k,v);g.setAttribute('density','0');g.setAttribute('contype','2');g.setAttribute('conaffinity','0');g.setAttribute('group','3');b.appendChild(g);}}
  if(envXml){const wb=doc.querySelector('worldbody');const frag=new DOMParser().parseFromString('<r>'+envXml+'</r>','text/xml');for(const g of [...frag.documentElement.children])wb.appendChild(doc.importNode(g,true));}
  const model=mj.MjModel.from_xml_string(new XMLSerializer().serializeToString(doc),vfs), data=new mj.MjData(model);
  const OBJ=mj.mjtObj, id=(t,n)=>mj.mj_name2id(model,t.value,n);
  const key=id(OBJ.mjOBJ_KEY,cfg.keyframe), rootId=id(OBJ.mjOBJ_BODY,cfg.rootBody), imu=id(OBJ.mjOBJ_SITE,cfg.imuSite);
  if(key<0||rootId<0||imu<0)throw Error(`${cfg.name}: 키프레임/몸통/IMU 이름 확인 필요`);
  const adrLin=Number(model.sensor(cfg.linvelSensor).adr), adrGyro=Number(model.sensor(cfg.gyroSensor).adr);
  const nu=model.nu; const defaults=Float32Array.from(Array.from({length:nu},(_,i)=>model.key_qpos[key*model.nq+7+i]));
  const nObs=(cfg.obs==='g1'?16:12)+3*nu; const obs=new Float32Array(nObs), last=new Float32Array(nu);
  let cmd=[0,0,0], steps=0, policyCalls=0, fallen=false, distance=0, prev=null, phase=[0,Math.PI];
  const nSub=Math.round(cfg.ctrlDt/cfg.simDt), phaseDt=2*Math.PI*(cfg.gaitFreq||0)*cfg.ctrlDt;
  // three 리그: MuJoCo가 컴파일한 메시(무게중심 정렬 반영)와 지오메트리 배치로 그린다. STL 좌표계가 달라도 물리와 정확히 일치.
  const root=new THREE.Group(); root.rotation.x=-Math.PI/2; scene.add(root);
  const mat=new THREE.MeshStandardMaterial({color:cfg.color??0x8a94a8,metalness:.6,roughness:.35}), accent=new THREE.MeshStandardMaterial({color:0xffd60a,metalness:.3,roughness:.5});
  const gt=model.geom_type,gd=model.geom_dataid,gb=model.geom_bodyid,gg=model.geom_group,gp=model.geom_pos,gq=model.geom_quat;
  const mv=model.mesh_vert,mva=model.mesh_vertadr,mvn=model.mesh_vertnum,mf=model.mesh_face,mfa=model.mesh_faceadr,mfn=model.mesh_facenum;
  const groups=new Map(); let drawn=0;
  for(let g=0;g<model.ngeom;g++){ if(gt[g]!==7||gg[g]===3)continue; const mid=gd[g]; const va=mva[mid],vn=mvn[mid],fa=mfa[mid],fn=mfn[mid];
    const pos=new Float32Array(vn*3); for(let i=0;i<vn*3;i++)pos[i]=mv[va*3+i]; const idx=new Uint32Array(fn*3); for(let i=0;i<fn*3;i++)idx[i]=mf[fa*3+i];
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3)); geo.setIndex(new THREE.BufferAttribute(idx,1)); geo.computeVertexNormals();
    const mname=mj.mj_id2name(model,OBJ.mjOBJ_MESH.value,mid)||''; const mesh=new THREE.Mesh(geo,(cfg.accent||[]).some(a=>mname.toLowerCase().includes(a.toLowerCase()))?accent:mat);
    mesh.castShadow=true; mesh.receiveShadow=true; mesh.position.set(gp[3*g],gp[3*g+1],gp[3*g+2]); mesh.quaternion.set(gq[4*g+1],gq[4*g+2],gq[4*g+3],gq[4*g]);
    const b=gb[g]; if(!groups.has(b)){const grp=new THREE.Group(); root.add(grp); groups.set(b,grp);} groups.get(b).add(mesh); drawn++; }
  const bodyGroups=[...groups.entries()].map(([id,group])=>({id,group}));
  onStatus(`${cfg.name}: 부품 ${drawn}개 그림 준비`);
  function pose(){const p=data.xpos,q=data.xquat,i=rootId;const w=q[4*i],x=q[4*i+1],y=q[4*i+2],z=q[4*i+3];return {x:p[3*i],y:p[3*i+1],z:p[3*i+2],yaw:Math.atan2(2*(w*z+x*y),1-2*(y*y+z*z))};}
  function sync(){const p=data.xpos,q=data.xquat;for(const {group,id:i} of bodyGroups){if(i<0)continue;group.position.set(p[3*i],p[3*i+1],p[3*i+2]);group.quaternion.set(q[4*i+1],q[4*i+2],q[4*i+3],q[4*i]);}}
  function reset(){mj.mj_resetDataKeyframe(model,data,key);mj.mj_forward(model,data);last.fill(0);steps=0;policyCalls=0;fallen=false;distance=0;prev=null;phase=[0,Math.PI];sync();}
  function buildObs(){const s=data.sensordata,xm=data.site_xmat,qp=data.qpos,qv=data.qvel;let k=0;
    obs[k++]=s[adrLin];obs[k++]=s[adrLin+1];obs[k++]=s[adrLin+2];obs[k++]=s[adrGyro];obs[k++]=s[adrGyro+1];obs[k++]=s[adrGyro+2];
    obs[k++]=-xm[9*imu+6];obs[k++]=-xm[9*imu+7];obs[k++]=-xm[9*imu+8];
    if(cfg.obs==='g1'){obs[k++]=cmd[0];obs[k++]=cmd[1];obs[k++]=cmd[2];}
    for(let i=0;i<nu;i++)obs[k++]=qp[7+i]-defaults[i]; for(let i=0;i<nu;i++)obs[k++]=qv[6+i]; for(let i=0;i<nu;i++)obs[k++]=last[i];
    if(cfg.obs==='g1'){const ph=(cfg.standPhase&&Math.hypot(cmd[0],cmd[1],cmd[2])<0.01)?[Math.PI,Math.PI]:phase;obs[k++]=Math.cos(ph[0]);obs[k++]=Math.cos(ph[1]);obs[k++]=Math.sin(ph[0]);obs[k++]=Math.sin(ph[1]);}
    else{obs[k++]=cmd[0];obs[k++]=cmd[1];obs[k++]=cmd[2];}}
  async function controlStep(){buildObs();policyCalls++;
    const out=await session.run({[session.inputNames[0]]:new ort.Tensor('float32',obs,[1,nObs])});
    const act=out[session.outputNames[0]].data; if(act.length!==nu)throw Error(`${cfg.name}: 정책 출력 ${act.length} ≠ 관절 ${nu}`);
    last.set(act); const ctrl=data.ctrl; for(let i=0;i<nu;i++)ctrl[i]=act[i]*cfg.actionScale+defaults[i];
    for(let k=0;k<nSub;k++)mj.mj_step(model,data); steps+=nSub;
    if(cfg.obs==='g1'){phase=phase.map(p=>{const v=p+phaseDt;return ((v+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;});}
    const p=pose(); if(prev)distance+=Math.hypot(p.x-prev.x,p.y-prev.y); prev=p;
    const upz=data.site_xmat[9*imu+8]; fallen=p.z<cfg.minZ||upz<cfg.minUp; sync();}
  function setCommand(forward,turn){const vx=Math.max(0,Math.min(1,forward/0.24))*cfg.cmdScale.vx, wz=Math.max(-1,Math.min(1,turn/0.7))*cfg.cmdScale.wz; cmd=[vx,0,wz];}
  function dispose(){scene.remove(root);try{data.delete();model.delete();vfs.delete();}catch(e){}session.release?.().catch?.(()=>{});}
  reset();
  return {key:cfg.key,reset,controlStep,setCommand,pose,root,dispose,ctrlDt:cfg.ctrlDt,camDist:cfg.camDist,camHeight:cfg.camHeight,
    state:()=>({steps,policyCalls,fallen,distance,cmd:[...cmd],joints:Array.from({length:nu},(_,i)=>data.qpos[7+i]-defaults[i]),...pose()}),
    info:{name:cfg.name,joints:nu,policy:cfg.policyLabel,model:cfg.modelLabel,obs:nObs}};
}
export const GO1_CFG={key:'go1',shell:{body:'trunk',type:'box',size:'0.2 0.07 0.06'},name:'유니트리 Go1 로봇 개',xml:'./robots/go1/go1.xml',assetsDir:'./robots/go1/assets/',policy:'./policies/go1_policy.onnx',
  simDt:.004,ctrlDt:.02,actionScale:.5,keyframe:'home',rootBody:'trunk',imuSite:'imu',linvelSensor:'local_linvel',gyroSensor:'gyro',obs:'go1',
  cmdScale:{vx:.7,wz:1.5},minZ:.12,minUp:.45,accent:['hip'],color:0x8a94a8,camDist:2.6,camHeight:.25,
  policyLabel:'MuJoCo Playground go1_policy.onnx (Google DeepMind, Apache-2.0)',modelLabel:'MuJoCo Menagerie unitree_go1 (Unitree, BSD-3)'};
export const G1_CFG={key:'g1',collideGeoms:['left_foot','right_foot'],shell:{body:'pelvis',type:'capsule',size:'0.13',fromto:'0 0 -0.12 0 0 0.42'},name:'유니트리 G1 휴머노이드',xml:'./robots/g1/g1.xml',assetsDir:'./robots/g1/assets/',policy:'./policies/g1_policy.onnx',
  simDt:.002,ctrlDt:.02,actionScale:.5,keyframe:'knees_bent',rootBody:'pelvis',imuSite:'imu_in_pelvis',linvelSensor:'local_linvel_pelvis',gyroSensor:'gyro_pelvis',obs:'g1',gaitFreq:1.5,
  cmdScale:{vx:.6,wz:1.0},minZ:.45,minUp:.5,accent:['logo','rubber_hand'],color:0xb9c0cc,camDist:3.4,camHeight:.7,
  policyLabel:'MuJoCo Playground g1_policy.onnx (Google DeepMind, Apache-2.0)',modelLabel:'MuJoCo Menagerie unitree_g1 (Unitree, BSD-3)'};

export const BH_CFG={key:'bh',shell:{body:'torso',type:'capsule',size:'0.1',fromto:'0 0 -0.12 0 0 0.25'},name:'버클리 휴머노이드',xml:'./robots/bh/bh.xml',assetsDir:'./robots/bh/assets/',policy:'./policies/bh_policy.onnx',
  simDt:.002,ctrlDt:.02,actionScale:.5,keyframe:'home',rootBody:'torso',imuSite:'imu',linvelSensor:'local_linvel',gyroSensor:'gyro',obs:'g1',gaitFreq:1.5,
  cmdScale:{vx:.6,wz:1.0},minZ:.28,minUp:.5,accent:['foot'],color:0xa7b0bf,camDist:2.4,camHeight:.45,
  policyLabel:'MuJoCo Playground bh_policy.onnx (Google DeepMind, Apache-2.0)',modelLabel:'MuJoCo Menagerie berkeley_humanoid (Hybrid Robotics, BSD-3)'};
export const T1_CFG={key:'t1',shell:{body:'Trunk',type:'capsule',size:'0.12',fromto:'0 0 -0.2 0 0 0.3'},name:'부스터 T1 휴머노이드',xml:'./robots/t1/t1.xml',assetsDir:'./robots/t1/assets/',policy:'./policies/t1_policy.onnx',
  simDt:.002,ctrlDt:.02,actionScale:1.0,keyframe:'home',rootBody:'Trunk',imuSite:'imu',linvelSensor:'local_linvel',gyroSensor:'gyro',obs:'g1',gaitFreq:1.5,standPhase:true,
  cmdScale:{vx:.6,wz:1.0},minZ:.36,minUp:.5,accent:['hand','Head','head'],color:0xd6dbe4,camDist:3.0,camHeight:.6,
  policyLabel:'MuJoCo Playground t1_policy.onnx (Google DeepMind, Apache-2.0)',modelLabel:'MuJoCo Menagerie booster_t1 (Booster Robotics, Apache-2.0)'};
