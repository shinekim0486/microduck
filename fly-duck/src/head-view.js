import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

// An enlarged, illustrative fly inside a cutaway of the real MicroDuck mesh.
export function createHeadView(host,rig,{low=false}={}){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#131822');
  const camera=new THREE.PerspectiveCamera(34,1,.01,30);camera.position.set(3.1,2.0,4.0);camera.zoom=1.2;camera.updateProjectionMatrix();
  const renderer=new THREE.WebGLRenderer({antialias:!low});renderer.setPixelRatio(low?1:Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.minDistance=2.5;controls.maxDistance=7;
  controls.autoRotate=true;controls.autoRotateSpeed=.65;controls.target.set(0,.02,0);controls.update();
  scene.add(new THREE.HemisphereLight(0xffffff,0x7c828b,2.4));
  const light=new THREE.DirectionalLight(0xffffff,2.2);light.position.set(2,4,3);scene.add(light);
  rig.placer.updateMatrixWorld(true);
  const source=rig.bodies.get('jaw_soft'),shell=new THREE.Group(),roofMeshes=[];
  source.traverse(mesh=>{
    if(!mesh.isMesh||!/top_head_shell|bottom_head_shell|face_part|^jaw\.stl|soft_mouth_top|^lens\.stl|noenoeil/.test(mesh.userData.meshName??''))return;
    const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    const beak=/jaw|mouth/.test(mesh.userData.meshName);
    const material=new THREE.MeshPhongMaterial({color:beak?0xa18b64:0x78838d,transparent:true,opacity:beak?.18:.09,depthWrite:false,side:THREE.DoubleSide});
    const surface=new THREE.Mesh(geometry,material);shell.add(surface);if(mesh.userData.meshName==='top_head_shell.stl')roofMeshes.push(surface);
    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,42),new THREE.LineBasicMaterial({color:beak?0x9b8159:0x87919b,transparent:true,opacity:.25}));shell.add(edges);
  });
  const box=new THREE.Box3().setFromObject(shell),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  const scale=2.7/Math.max(size.x,size.y,size.z);
  shell.children.forEach(m=>{m.geometry.translate(-center.x,-center.y,-center.z);m.geometry.scale(scale,scale,scale);});scene.add(shell);
  const fly=new THREE.Group();fly.position.set(-.18,.03,0);scene.add(fly);
  const material=color=>new THREE.MeshStandardMaterial({color,roughness:.7,metalness:.05});
  const ochre=material(0x99713c),thorax=material(0x554438),dark=material(0x302c29),red=material(0xa83a35),silver=material(0x9ba7ad);
  function ellipsoid(parent,mat,pos,radius,geometry=new THREE.SphereGeometry(1,20,14)){
    const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(...pos);mesh.scale.set(...radius);parent.add(mesh);return mesh;
  }
  function line(parent,points,mat=dark,radius=.009){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,20,radius,6,false),mat);parent.add(mesh);return mesh;
  }
  const wings=[],legs=[];
  ellipsoid(fly,ochre,[-.38,-.01,0],[.37,.16,.18]);
  for(const x of [-.59,-.46,-.33,-.20]){
    const radius=Math.sqrt(1-((x+.38)/.37)**2),points=[];
    for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;points.push([x,-.01+.163*radius*Math.sin(a),.183*radius*Math.cos(a)]);}
    line(fly,points,dark,.014);
  }
  ellipsoid(fly,thorax,[-.02,.05,0],[.24,.19,.18]);
  ellipsoid(fly,ochre,[.29,.11,0],[.18,.17,.18]);
  for(const side of [-1,1]){
    ellipsoid(fly,red,[.32,.115,side*.15],[.13,.155,.095],new THREE.IcosahedronGeometry(1,2));
    line(fly,[[.42,.13,side*.05],[.54,.15,side*.07],[.59,.22,side*.09]],dark,.007);
    for(let i=0;i<3;i++)line(fly,[[.54,.15,side*.07],[.55+i*.025,.20+i*.015,side*.12]],dark,.003);
    for(let i=0;i<3;i++){
      const x=.09-i*.16;
      const pivot=new THREE.Group();pivot.position.set(x,0,side*.13);fly.add(pivot);
      const points=[[x,0,side*.13],[x+.1,-.15,side*.32],[x+(i===2?-.22:.18),-.31,side*.42],[x+(i===2?-.28:.24),-.34,side*.5]];
      line(pivot,points.map(p=>[p[0]-x,p[1],p[2]-side*.13]),dark,.009);legs.push({pivot,side,phase:i+side});
    }
    const wingGroup=new THREE.Group();fly.add(wingGroup);
    const outline=[[-.01,.18,side*.08],[-.21,.20,side*.37],[-.65,.14,side*.58],[-.84,.11,side*.48],[-.65,.12,side*.22],[-.01,.18,side*.08]];
    const shape=new THREE.Shape();shape.moveTo(outline[0][0],outline[0][2]);
    outline.slice(1).forEach(p=>shape.lineTo(p[0],p[2]));
    const wing=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshPhongMaterial({color:0xc5d2dc,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}));
    wing.rotation.x=Math.PI/2;wing.position.y=.17;wingGroup.add(wing);
    line(wingGroup,outline,silver,.005);
    for(let i=1;i<=3;i++)line(wingGroup,[[-.03,.185,side*.10],[-.30,.18,side*(.15+i*.065)],[-.70,.13,side*(.25+i*.07)]],silver,.003);
    wingGroup.position.set(-.01,.18,side*.08);wingGroup.children.forEach(child=>child.position.sub(wingGroup.position));wings.push({pivot:wingGroup,side});
  }
  for(let i=0;i<10;i++){
    const x=-.15+(i%5)*.05,z=(i<5?-1:1)*.09;
    line(fly,[[x,.20,z],[x-.02,.28,z*1.3]],dark,.003);
  }
  const brainMaterial=new THREE.MeshStandardMaterial({color:0x6d9c79,emissive:0x366b48,emissiveIntensity:.3,roughness:.45});
  for(const side of [-1,1])ellipsoid(fly,brainMaterial,[.28,.265,side*.065],[.082,.06,.068]);
  ellipsoid(fly,brainMaterial,[.29,.25,0],[.08,.04,.08]);
  const wireMaterials=[],ceilingAnchors=[];
  scene.updateMatrixWorld(true);
  for(let i=0;i<4;i++){
    const side=i<2?-1:1,x=.23+(i%2)*.10,z=side*.065;
    const anchorX=(i%2===0?-.10:.50),anchorZ=side*.32;
    const origin=new THREE.Vector3(anchorX,.30,anchorZ).add(fly.position);
    const ray=new THREE.Raycaster(origin,new THREE.Vector3(0,1,0));
    const hit=ray.intersectObjects(roofMeshes,false)[0];
    if(!hit)throw Error('Cannot locate head ceiling for an electrode');
    const anchor=hit.point.clone().sub(fly.position),normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
    if(normal.y<0)normal.negate();
    ceilingAnchors.push(anchor.toArray());
    const topY=Math.min(.44,anchor.y-.08);
    line(fly,[[x,.295,z],[x+.025,topY,z*1.4]],silver,.008);
    const wire=material(i%2?0x718d77:0xaa8157);wire.emissive=new THREE.Color(0x365a3e);wireMaterials.push(wire);
    line(fly,[[x+.025,topY,z*1.4],[(x+anchor.x)/2-.06,(topY+anchor.y)/2,(z+anchor.z)/2],anchor.toArray()],wire,.013);
    const mount=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.025,16),silver);
    mount.position.copy(anchor);mount.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);fly.add(mount);
    const socket=ellipsoid(fly,wire,anchor.toArray(),[.022,.03,.022]);socket.quaternion.copy(mount.quaternion);
  }
  let frames=0,signal=0,animationTime=0,lastTime=null;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
  new ResizeObserver(resize).observe(host);resize();
  return {render(activity,connected,{paused=false,now=performance.now()}={}){
    const dt=lastTime===null?0:Math.min(.5,(now-lastTime)/1000);lastTime=now;
    if(!paused&&!reducedMotion.matches)animationTime+=dt;
    const t=animationTime,flutter=Math.pow(Math.max(0,Math.sin(t*1.1)),8)*Math.sin(t*24);
    wings.forEach(({pivot,side})=>pivot.rotation.x=-side*(.04*Math.sin(t*3.3)+.09*flutter));
    legs.forEach(({pivot,side,phase})=>{pivot.rotation.z=.07*Math.sin(t*4.2+phase);pivot.rotation.x=side*.05*Math.sin(t*3.1+phase);});
    signal=connected?Math.min(1,((activity?.left??0)+(activity?.right??0))*100):0;
    brainMaterial.emissiveIntensity=.15+signal*.8;wireMaterials.forEach(m=>m.emissiveIntensity=signal*.7);
    controls.autoRotate=!paused&&!reducedMotion.matches;controls.update(dt);renderer.render(scene,camera);frames++;
  },state:()=>({frames,signal,electrodes:4,legs:6,shellMeshes:shell.children.length/2,ceilingAnchors,animationTime,autoRotate:controls.autoRotate,cameraPosition:camera.position.toArray(),wingAngles:wings.map(w=>w.pivot.rotation.x),legAngles:legs.map(l=>l.pivot.rotation.z)})};
}
