import {FlyBrain,NeuralDecoder} from './brain-core.js';
import {download} from './download.js';
let brain, stimulus={}, running=false, timer, cutSynapses=false;
const decoder=new NeuralDecoder();let generation=0;
function run() {
  if(!running)return;
  const t=performance.now();
  const activity=brain.advance(stimulus,10,{cutSynapses});
  const output=decoder.update(activity);
  self.postMessage({type:'activity',...activity,...output,generation,elapsed:performance.now()-t},[activity.fireState.buffer]);
  timer=setTimeout(run,Math.max(0,100-(performance.now()-t)));
}
self.onmessage=async({data:m})=>{
  try {
    if(m.type==='init') {
      const progress=value=>self.postMessage({type:'download',...value});
      const [payload,metadata]=await Promise.all([download(m.graphUrl,'graph',progress),download(m.metaUrl,'channels',progress)]);
      // Some hosts set Content-Encoding:gzip for .gz; fetch then decodes it.
      const magic=new Uint8Array(payload,0,2);
      const raw=magic[0]===31&&magic[1]===139
        ? await new Response(new Blob([payload]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
        : payload;
      brain=new FlyBrain(raw,JSON.parse(new TextDecoder().decode(metadata)));
      self.postMessage({type:'ready',neurons:brain.n,edges:brain.edges});
    } else if(m.type==='start'&&!running) {running=true;run();}
    else if(m.type==='stop') {running=false;clearTimeout(timer);}
    else if(m.type==='stimulus') stimulus=m.value;
    else if(m.type==='reset') {brain.reset();decoder.reset();generation=m.generation;}
    else if(m.type==='cut') {cutSynapses=m.value;brain.reset();decoder.reset();generation=m.generation;}
    else if(m.type==='gain') {brain.setGain(m.value);self.postMessage({type:'lab',gain:brain.gain});}
    else if(m.type==='lesion') {const n=brain.setLesion(m.names);self.postMessage({type:'lab',lesioned:n,names:m.names});}
  } catch(e){running=false;clearTimeout(timer);self.postMessage({type:'error',message:e.message});}
};
