// Simplified discrete LIF dynamics. Empirical wiring, engineered dynamics.
// The entire supplied graph is retained. Every neuron is updated each tick.
export class FlyBrain {
  constructor(buffer, metadata, {gain=3, seed=23}={}) {
    const d=new DataView(buffer); this.n=d.getUint32(0,true); this.edges=d.getUint32(4,true);
    if(buffer.byteLength!==8+12*this.edges+3*this.n) throw Error('Invalid connectome length');
    this.row=new Uint32Array(this.n+1); this.col=new Uint32Array(this.edges); this.w=new Float32Array(this.edges);
    const incoming=new Float32Array(this.n);
    let prev=-1;
    for(let e=0;e<this.edges;e++) {
      const p=8+e*12, a=d.getUint32(p,true), b=d.getUint32(p+4,true), w=d.getFloat32(p+8,true);
      if(a>=this.n||b>=this.n||a<prev||!Number.isFinite(w)) throw Error('Invalid connectome edge');
      prev=a; this.row[a+1]++; this.col[e]=b; this.w[e]=w; incoming[b]+=Math.abs(w);
    }
    for(let i=1;i<=this.n;i++) this.row[i]+=this.row[i-1];
    // Normalize total absolute incoming weight; preserve edges and their signs.
    for(let e=0;e<this.edges;e++) this.w[e]*=gain/Math.max(1,incoming[this.col[e]]);
    // CONNECT AI LAB 실험실: 기준 가중치(이득 1)와 절제 마스크. 기본값에서는 원작과 동일하게 동작한다.
    this.gain=gain; this.w0=Float32Array.from(this.w,x=>x/gain); this.lesion=new Uint8Array(this.n);
    this.channels=metadata.channels; this.groups=metadata.displayGroups;
    this.v=new Float32Array(this.n); this.refractory=new Uint8Array(this.n);
    this.spikes=[]; this.tick=0; this.initialSeed=seed; this.seed=seed;
    // Fixed engineering assignments, not claims about natural joint semantics.
    this.motorPools=Array.from({length:28},()=>[]);
    const descending=[...this.channels.descending_left,...this.channels.descending_right].sort((a,b)=>a-b);
    descending.forEach((id,i)=>this.motorPools[i%28].push(id));
  }
  random() {let t=this.seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
  reset() {this.v.fill(0);this.refractory.fill(0);this.spikes=[];this.tick=0;this.seed=this.initialSeed;}
  setGain(g){g=Math.max(0,Number(g)||0);this.gain=g;for(let e=0;e<this.edges;e++)this.w[e]=this.w0[e]*g;}
  setLesion(names){this.lesion.fill(0);let n=0;for(const name of names||[])for(const i of (this.channels[name]||[])){if(!this.lesion[i]){this.lesion[i]=1;n++;}}return n;}
  step(stimulus={}, {cutSynapses=false}={}) {
    const v=this.v,r=this.refractory;
    const L=this.lesion;
    for(let i=0;i<this.n;i++) {if(L[i]) {v[i]=0;r[i]=0;} else if(r[i]) {r[i]--;v[i]=0;}else v[i]*=.94;}
    if(!cutSynapses) for(const i of this.spikes) for(let e=this.row[i];e<this.row[i+1];e++) {
      const j=this.col[e]; if(!r[j]) v[j]+=this.w[e];
    }
    // Stimulate only annotated sensory neurons. No direct descending drive.
    for(const name of ['visual_left','visual_right','olfactory_left','olfactory_right','mechanosensory_left','mechanosensory_right']) {
      const strength=Math.max(0,Math.min(1,Number(stimulus[name])||0));
      for(const i of this.channels[name]) if(!r[i]&&this.random()<strength*.6&&!L[i]) v[i]+=1.1;
    }
    this.spikes=[]; const groupSpikes=[0,0,0,0,0];
    for(let i=0;i<this.n;i++) {
      if(!r[i]&&v[i]>=1&&!L[i]) {this.spikes.push(i);groupSpikes[this.groups[i]]++;v[i]=0;r[i]=3;}
      else if(v[i]<-3) v[i]=-3;
    }
    // Only spikes on this tick count; r==3 is assigned exclusively above.
    const rate=name=>this.channels[name].reduce((s,i)=>s+(r[i]===3?1:0),0)/this.channels[name].length;
    this.tick++;
    const motorRates=this.motorPools.map(pool=>pool.reduce((s,i)=>s+(r[i]===3?1:0),0)/pool.length);
    return {left:rate('descending_left'),right:rate('descending_right'),
      scentLeft:rate('ALPN_left'),scentRight:rate('ALPN_right'),motorRates,
      motor:this.channels.motor_left?(rate('motor_left')+rate('motor_right'))/2:null,
      spikes:this.spikes.length,groupSpikes,tick:this.tick};
  }
  advance(stimulus,steps=10,options={}) {
    let left=0,right=0,scentLeft=0,scentRight=0,spikes=0,motor=0,result;
    const motorRates=new Float32Array(28), fireState=new Uint8Array(this.n);
    for(let k=0;k<steps;k++){
      result=this.step(stimulus,options);left+=result.left;right+=result.right;
      scentLeft+=result.scentLeft;scentRight+=result.scentRight;spikes+=result.spikes;motor+=result.motor||0;
      result.motorRates.forEach((v,i)=>motorRates[i]+=v/steps);
      for(const i of this.spikes)fireState[i]++;
    }
    return {...result,left:left/steps,right:right/steps,scentLeft:scentLeft/steps,scentRight:scentRight/steps,motor:result.motor==null?null:motor/steps,
      motorRates,fireState,spikes:Math.round(spikes/steps)};
  }
}

export function decode(activity, connected=true) {
  const {left,right,scentLeft,scentRight}=activity;
  if(!connected || ![left,right,scentLeft,scentRight].every(Number.isFinite))return {forward:0,turn:0};
  const odor=scentLeft+scentRight;
  if(odor<.008||left+right<=0)return {forward:0,turn:0};
  const contrast=(scentLeft-scentRight)/Math.max(.02,odor);
  const drive=Math.min(1,(left+right)/.0006)*Math.min(1,(odor-.008)/.04);
  return {forward:.24*drive*(1-Math.min(.15,Math.abs(contrast)*.5)),turn:.7*Math.tanh(contrast*5)};
}

export class NeuralDecoder {
  constructor(){this.reset();}
  reset(){this.filtered={left:0,right:0,scentLeft:0,scentRight:0};this.motorRates=new Float32Array(28);}
  update(activity){
    for(const name of Object.keys(this.filtered))this.filtered[name]+=.3*(activity[name]-this.filtered[name]);
    activity.motorRates.forEach((v,i)=>this.motorRates[i]+=.3*(v-this.motorRates[i]));
    const motors=Array.from({length:14},(_,i)=>Math.tanh(80*(this.motorRates[2*i]-this.motorRates[2*i+1])));
    return {command:decode(this.filtered),motors,filtered:{...this.filtered}};
  }
}
