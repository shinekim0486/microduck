// MJCF(XML) → 시각 리그 정보. 몸체 트리와 class="visual" 메시 지오메트리만 뽑는다.
export function parseMjcf(xmlText){
  const doc=new DOMParser().parseFromString(xmlText,'text/xml');
  const meshes=[...doc.querySelectorAll('asset > mesh')].map(m=>{const file=m.getAttribute('file');return {name:m.getAttribute('name')||file.replace(/\.[^.]+$/,''),file,scale:(m.getAttribute('scale')||'1 1 1').split(/\s+/).map(Number)};});
  const bodies=[];
  const num=(s,d)=>s?s.trim().split(/\s+/).map(Number):d;
  const walk=(el,depth)=>{for(const b of [...el.children].filter(c=>c.tagName==='body')){
    const geoms=[...b.children].filter(c=>c.tagName==='geom'&&(c.getAttribute('class')==='visual'||c.getAttribute('mesh'))&&c.getAttribute('mesh'));
    bodies.push({name:b.getAttribute('name'),depth,geoms:geoms.map(g=>({mesh:g.getAttribute('mesh'),pos:num(g.getAttribute('pos'),[0,0,0]),quat:num(g.getAttribute('quat'),[1,0,0,0])}))});
    walk(b,depth+1);}};
  walk(doc.querySelector('worldbody'),0);
  return {doc,meshes,bodies};
}
