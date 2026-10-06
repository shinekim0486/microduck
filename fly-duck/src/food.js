import * as THREE from 'three';

// A curved, mottled banana. It marks the odor source; sensing stays unchanged.
export function createBanana(){
  const group=new THREE.Group();group.name='overripe-banana';
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.16,.045,0),new THREE.Vector3(-.08,.027,0),new THREE.Vector3(.04,.045,0),new THREE.Vector3(.14,.105,0)]);
  const segments=40,sides=12,frames=curve.computeFrenetFrames(segments,false),positions=[],colors=[],indices=[];
  const pale=new THREE.Color(0xe7bf50),gold=new THREE.Color(0xba8935);
  for(let i=0;i<=segments;i++){
    const t=i/segments,c=curve.getPointAt(t),radius=.031*(.25+.75*Math.pow(Math.sin(Math.PI*t),.35));
    for(let j=0;j<=sides;j++){
      const a=j/sides*Math.PI*2,point=c.clone().addScaledVector(frames.normals[i],Math.cos(a)*radius).addScaledVector(frames.binormals[i],Math.sin(a)*radius);
      positions.push(point.x,point.y,point.z);const color=pale.clone().lerp(gold,.18+.25*Math.cos(a*5));colors.push(color.r,color.g,color.b);
      if(i<segments&&j<sides){const p=i*(sides+1)+j;indices.push(p,p+sides+1,p+1,p+1,p+sides+1,p+sides+2);}
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const peel=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8,side:THREE.DoubleSide}));peel.castShadow=true;peel.receiveShadow=true;group.add(peel);
  const brown=new THREE.MeshStandardMaterial({color:0x6a4930,roughness:.95});
  for(const [start,end]of [[[-.16,.045,0],[-.18,.052,0]],[[.14,.105,0],[.165,.128,0]]]){
    const path=new THREE.LineCurve3(new THREE.Vector3(...start),new THREE.Vector3(...end));group.add(new THREE.Mesh(new THREE.TubeGeometry(path,1,.007,8,false),brown));
  }
  for(let i=0;i<26;i++){
    const t=.08+(i*.61803398875%1)*.84,a=(i*2.39996)%(Math.PI*2),j=Math.round(t*segments),center=curve.getPointAt(t);
    const normal=frames.normals[j].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[j],Math.sin(a));
    const radius=.031*(.25+.75*Math.pow(Math.sin(Math.PI*t),.35));
    const spot=new THREE.Mesh(new THREE.CircleGeometry(.0018+(i%4)*.0007,7),brown);spot.position.copy(center).addScaledVector(normal,radius+.0004);spot.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);spot.scale.y=.65;group.add(spot);
  }
  // Quiet wisps make the source of the smell readable without a target ring.
  for(let i=0;i<3;i++){
    const points=Array.from({length:18},(_,j)=>new THREE.Vector3((i-1)*.04+Math.sin(j*.35+i)*.008,.10+j*.006,.015*Math.sin(i+j*.2)));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x99845d,transparent:true,opacity:.27})));
  }
  group.rotation.y=-.3;return group;
}
