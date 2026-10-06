// Sizes of the pinned assets (decoded HTTP bodies, except the gzip graph).
// Weight progress by bytes so small JSON files do not dominate the bar.
const assets={
  graph:{bytes:12443952,label:'Fly brain'},
  channels:{bytes:413501,label:'Neuron annotations'},
  positions:{bytes:1671060,label:'Brain coordinates'},
  tissue:{bytes:1867385,label:'Brain tissue'},
  kinematics:{bytes:26666,label:'Robot joints'},
  geometry:{bytes:1279444,label:'Robot model'},
  policy:{bytes:793705,label:'Walking policy'},
  collisions:{bytes:32898,label:'Robot physics'},
  physics:{bytes:10117577,label:'Physics engine'},
  inference:{bytes:13479978,label:'Policy engine'},
};

export function createDownloadProgress(onChange){
  const fractions=new Map(Object.keys(assets).map(id=>[id,0])),completed=new Set();
  const totalWeight=Object.values(assets).reduce((sum,a)=>sum+a.bytes,0);
  return event=>{
    if(event&&assets[event.id]){
      const fraction=event.done?1:Math.min(.999,event.loaded/event.total);
      fractions.set(event.id,Math.max(fractions.get(event.id),fraction));
      if(event.done)completed.add(event.id);
    }
    const complete=completed.size===fractions.size;
    const weighted=[...fractions].reduce((sum,[id,f])=>sum+assets[id].bytes*f,0);
    onChange({percent:complete?100:Math.min(99,Math.floor(100*weighted/totalWeight)),
      completed:completed.size,total:fractions.size,complete});
  };
}

export async function download(url,id,onProgress=()=>{}){
  const asset=assets[id];
  const response=await fetch(url);
  if(!response.ok)throw Error(`${asset.label} download: ${response.status}`);
  let total=asset.bytes,loaded=0;
  // A host can send the .gz file with HTTP Content-Encoding:gzip. In that
  // case fetch exposes an expanded body; recognize it before counting bytes.
  const report=(bytes,done=false)=>{
    if(id==='graph'&&loaded===0&&bytes.length>=2&&!(bytes[0]===31&&bytes[1]===139))total=32796605;
    loaded+=bytes.length;onProgress({id,loaded,total,done});
  };
  if(!response.body){const data=await response.arrayBuffer();report(new Uint8Array(data),true);return data;}
  const reader=response.body.getReader(),chunks=[];
  try{
    while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);report(value);}
  }finally{reader.releaseLock();}
  const result=new Uint8Array(loaded);let offset=0;
  for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}
  onProgress({id,loaded,total,done:true});return result.buffer;
}
