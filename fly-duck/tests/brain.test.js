import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {FlyBrain,decode,NeuralDecoder} from '../src/brain-core.js';
import {encodeStimulus} from '../src/sensors.js';
import {directTargets} from '../src/motor-control.js';
import {DEFAULT_POSE} from '../src/vendor/constants.js';
const bytes=zlib.gunzipSync(fs.readFileSync(new URL('../public/brain/connectome.bin.gz',import.meta.url)));
const graph=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const metadata=JSON.parse(fs.readFileSync(new URL('../public/brain/channels.json',import.meta.url)));
const pose={x:0,y:0,yaw:0};
const inputs=side=>encodeStimulus(pose,side===0?null:{x:.29,y:side*.58},.45);

test('actual scent encoding reverses neural steering; clearing scent removes drive',()=>{
  const brain=new FlyBrain(graph,metadata);
  assert.equal(brain.n,139255);assert.equal(brain.edges,2698236);
  for(const side of [1,-1,0]){
    brain.advance(inputs(side),200);const a=brain.advance(inputs(side),100),c=decode(a);
    if(side){assert.ok(c.turn*side>.3,JSON.stringify(c));assert.ok(c.forward>.04);}
    else {assert.deepEqual(c,{forward:0,turn:0});assert.equal(a.scentLeft+a.scentRight,0);}
  }
});
test('cutting the empirical graph silences both output paths while sensory neurons still fire',()=>{
  const brain=new FlyBrain(graph,metadata);const a=brain.advance(inputs(1),100,{cutSynapses:true});
  assert.ok(a.spikes>0);assert.equal(a.left+a.right+a.scentLeft+a.scentRight,0);
  const result=new NeuralDecoder().update(a);assert.deepEqual(result.command,{forward:0,turn:0});assert.ok(result.motors.every(v=>v===0));
  assert.equal(a.fireState.length,139255);assert.ok(a.fireState.some(v=>v>0));
});
test('descending activity changes direct targets within joint limits',()=>{
  const brain=new FlyBrain(graph,metadata),decoder=new NeuralDecoder();const ranges=Array(14).fill([-1,1]);
  let changed=0,last;
  for(let k=0;k<25;k++){
    const output=decoder.update(brain.advance(inputs(1),10));
    const targets=directTargets(output.motors,.55,ranges);
    assert.ok(targets.every(v=>Number.isFinite(v)&&v>=-1&&v<=1));
    if(last&&targets.some((v,i)=>Math.abs(v-last[i])>.001))changed++;
    last=targets;
  }
  assert.ok(changed>10);assert.ok(last.some((v,i)=>Math.abs(v-DEFAULT_POSE[i])>.01));
  assert.deepEqual(directTargets(Array(14).fill(.5),0,ranges),Array.from(DEFAULT_POSE));
  assert.throws(()=>directTargets([NaN],.5,ranges),/Invalid/);
});
test('silence, fixed-seed reset, disconnect, and malformed data',()=>{
  const brain=new FlyBrain(graph,metadata,{seed:17});assert.equal(brain.advance({},50).spikes,0);
  brain.reset();const first=brain.advance(inputs(1),50);brain.reset();assert.deepEqual(brain.advance(inputs(1),50),first);
  assert.deepEqual(decode(first,false),{forward:0,turn:0});
  assert.deepEqual(decode({left:NaN,right:0}),{forward:0,turn:0});
  assert.throws(()=>new FlyBrain(graph.slice(0,100),metadata),/length/);
});
