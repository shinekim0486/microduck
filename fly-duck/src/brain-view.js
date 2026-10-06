import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {PLYLoader} from 'three/addons/loaders/PLYLoader.js';
import {signed} from './vendor/signed.js';
import {download} from './download.js';

export async function createBrainView(host,{low=false,onProgress,dir='./brain'}={}){
  const urls=[dir+'/anatomy/positions.bin',dir+'/anatomy/tissue.ply',dir+'/channels.json?v=3'];
  const [positionsBuffer,tissueBuffer,metadataBuffer]=await Promise.all(urls.map((url,i)=>download(signed(url),['positions','tissue','channels'][i],onProgress)));
  const metadata=JSON.parse(new TextDecoder().decode(metadataBuffer));
  const raw=new Float32Array(positionsBuffer),count=raw.length/3;
  if(count<1000||metadata.displayGroups.length!==count)throw Error('Anatomy and connectome neuron counts differ');
  const tissue=new PLYLoader().parse(tissueBuffer);tissue.computeBoundingBox();
  const center=tissue.boundingBox.getCenter(new THREE.Vector3()),size=tissue.boundingBox.getSize(new THREE.Vector3()),scale=Math.min(2.4/size.x,2.25/size.y);
  tissue.translate(-center.x,-center.y,-center.z);tissue.scale(scale,-scale,-scale);tissue.computeVertexNormals();tissue.computeBoundingBox();
  const positions=new Float32Array(raw.length);
  for(let i=0;i<count;i++){positions[3*i]=(raw[3*i]-center.x)*scale;positions[3*i+1]=-(raw[3*i+1]-center.y)*scale;positions[3*i+2]=-(raw[3*i+2]-center.z)*scale;}
  const scene=new THREE.Scene();scene.background=new THREE.Color('#0f1520');
  const camera=new THREE.PerspectiveCamera(38,1,.01,30);camera.position.set(0,.05,3.8);
  const renderer=new THREE.WebGLRenderer({antialias:!low});renderer.setPixelRatio(low?.7:Math.min(devicePixelRatio,1.5));renderer.localClippingEnabled=true;renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=1.4;controls.maxDistance=7;controls.enablePan=false;controls.update();
  const clip=new THREE.Plane(new THREE.Vector3(0,0,-1),2);
  scene.add(new THREE.HemisphereLight(0xe6ecdc,0x1f3834,2));
  const tissueMaterial=new THREE.MeshPhongMaterial({color:0xadc4b6,transparent:true,opacity:.10,depthWrite:false,side:THREE.DoubleSide,clippingPlanes:[clip]});
  const tissueMesh=new THREE.Mesh(tissue,tissueMaterial);scene.add(tissueMesh);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const firing=new Float32Array(count),colors=new Float32Array(count*3);
  const palette=[0x658376,0xd3b965,0x6ba2a1,0x8eae87,0xe9a170].map(hex=>new THREE.Color(hex));
  for(let i=0;i<count;i++){const c=palette[metadata.displayGroups[i]];colors.set([c.r,c.g,c.b],3*i);}
  geometry.setAttribute('firing',new THREE.BufferAttribute(firing,1));geometry.setAttribute('cellColor',new THREE.BufferAttribute(colors,3));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{cut:{value:2},pointScale:{value:low?.75:1.1}},
    vertexShader:`attribute float firing;attribute vec3 cellColor;varying vec3 color;varying float activity;varying float depth;uniform float pointScale;
      void main(){color=cellColor;activity=firing;depth=position.z;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=pointScale*(1.1+2.4*sqrt(firing))/max(.65,-p.z*.5);}`,
    fragmentShader:`uniform float cut;varying vec3 color;varying float activity;varying float depth;
      void main(){if(depth>cut)discard;float r=length(gl_PointCoord-.5);if(r>.5)discard;float alpha=(.055+.7*activity)*(1.-smoothstep(.1,.5,r));gl_FragColor=vec4(mix(color,vec3(.94,1.,.85),activity*.6),alpha);}`});
  const points=new THREE.Points(geometry,material);scene.add(points);
  let frames=0,active=0,sequence=0;
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
  new ResizeObserver(resize).observe(host);resize();
  function update(spikes){if(spikes.length!==count)throw Error('Anatomy spike indices do not match graph');active=0;for(let i=0;i<count;i++){firing[i]=Math.min(1,spikes[i]/2);if(spikes[i])active++;}geometry.attributes.firing.needsUpdate=true;sequence++;}
  function render(){if(!host.clientWidth||!host.clientHeight)return;controls.update();renderer.render(scene,camera);frames++;}
  function slice(percent){const min=tissue.boundingBox.min.z-.01,max=tissue.boundingBox.max.z+.01;const depth=min+(max-min)*percent/100;material.uniforms.cut.value=depth;clip.constant=depth;}
  function resetView(){camera.position.set(0,.05,3.8);controls.target.set(0,0,0);controls.update();}
  return {update,render,slice,resetView,setShell:enabled=>tissueMesh.visible=enabled,
    state:()=>({neurons:count,active,frames,sequence,cut:material.uniforms.cut.value,meshVertices:tissue.attributes.position.count})};
}
