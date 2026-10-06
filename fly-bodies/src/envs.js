// 간단한 환경들: MuJoCo worldbody에 넣을 정적 지오메트리 + three.js 그림. 세 몸이 같은 환경을 공유한다.
import * as THREE from 'three';
const box=(name,x,y,z,sx,sy,sz,quat=[1,0,0,0],color=0x3a4356)=>({name,type:'box',pos:[x,y,z],size:[sx,sy,sz],quat,color});
const q=(deg)=>{const t=deg*Math.PI/360;return [Math.cos(t),0,Math.sin(t),0];}; // y축 회전
export const ENVS={
  flat:{name:'평지',note:'기본. 정책이 학습된 조건과 같습니다.',geoms:[]},
  boxes:{name:'장애물 상자',note:'초파리 뇌는 눈으로 장애물을 보지 않습니다. 더듬이(기계감각 뉴런)로만 느낍니다. 부딪히거나 돌아가는지 보세요.',geoms:[box('b1',1.2,.8,.15,.2,.2,.15),box('b2',1.7,-.7,.15,.2,.2,.15),box('b3',2.5,.3,.15,.25,.25,.15),box('b4',.4,-1.4,.15,.2,.2,.15),box('b5',-1.1,1.1,.15,.2,.2,.15),box('b6',2.2,1.7,.15,.2,.2,.15)]},
  corridor:{name:'벽 통로',note:'벽 사이 폭 1.2m 통로. 벽에 가까워지면 더듬이 뉴런이 켜집니다. 바나나를 통로 끝에 놓아 보세요.',geoms:[box('wl',2.0,.6,.15,1.6,.05,.15),box('wr',2.0,-.6,.15,1.6,.05,.15),box('wl2',-1.6,.6,.15,1.0,.05,.15),box('wr2',-1.6,-.6,.15,1.0,.05,.15)],banana:[3.3,0]},
  slope:{name:'경사 10°',note:'평지에서 배운 정책이 경사를 견디는지 보는 실험입니다. 정책마다 다릅니다.',geoms:[box('ramp',2.4,0,.21,1.5,1.2,.05,q(-10),0x4a5468),box('top',4.2,0,.47,.35,1.2,.05,[1,0,0,0],0x4a5468)],banana:[2.6,0]},
  stairs:{name:'계단 5cm×3',note:'평지 정책의 한계 실험. 로봇 개는 오르고 휴머노이드·오리는 넘어질 수 있습니다. 넘어지면 1.5초 뒤 자동 리셋.',geoms:[box('s1',1.6,0,.025,.18,1.2,.025,[1,0,0,0],0x4a5468),box('s2',1.96,0,.05,.18,1.2,.05,[1,0,0,0],0x4a5468),box('s3',2.32,0,.075,.18,1.2,.075,[1,0,0,0],0x4a5468),box('s4',3.0,0,.075,.5,1.2,.075,[1,0,0,0],0x4a5468)],banana:[3.0,0]},
};
export function envXml(env){return env.geoms.map(g=>`<geom name="env_${g.name}" type="box" pos="${g.pos.join(' ')}" size="${g.size.join(' ')}" quat="${g.quat.join(' ')}" contype="1" conaffinity="7" priority="1" friction="0.8" condim="3" rgba="0.3 0.33 0.4 1"/>`).join('\n');}
export function envMeshes(env){const root=new THREE.Group();root.rotation.x=-Math.PI/2;
  for(const g of env.geoms){const m=new THREE.Mesh(new THREE.BoxGeometry(2*g.size[0],2*g.size[1],2*g.size[2]),new THREE.MeshStandardMaterial({color:g.color,roughness:.85,metalness:.1}));m.position.set(...g.pos);m.quaternion.set(g.quat[1],g.quat[2],g.quat[3],g.quat[0]);m.castShadow=true;m.receiveShadow=true;root.add(m);}
  return root;}
// 더듬이(몸 앞 좌우) 위치에서 가장 가까운 상자까지의 2D 거리 → 기계감각 자극 0~1
export function touchStimulus(env,pose,reach){const out={left:0,right:0};if(!env.geoms.length)return out;
  for(const [side,key] of [[1,'left'],[-1,'right']]){const a=pose.yaw+side*.6,px=pose.x+reach*Math.cos(a),py=pose.y+reach*Math.sin(a);let best=Infinity;
    for(const g of env.geoms){const dx=Math.max(Math.abs(px-g.pos[0])-g.size[0]-.15,0),dy=Math.max(Math.abs(py-g.pos[1])-g.size[1]-.15,0);best=Math.min(best,Math.hypot(dx,dy));}
    out[key]=Math.max(0,Math.min(1,(.35-best)/.3));}
  return out;}
