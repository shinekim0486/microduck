import test from 'node:test';
import assert from 'node:assert/strict';
import {followCameraPose,FOLLOW_DISTANCE} from '../src/follow-camera.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('camera remains directly behind the duck across headings and the yaw seam',()=>{
  for(const yaw of [-Math.PI-.01,-Math.PI,-Math.PI+.01,-Math.PI/2,0,Math.PI/2,Math.PI]){
    const pose={x:.8,y:-.5,yaw},view=followCameraPose(pose);
    assert.deepEqual(view.target,[.8,.12,.5]);
    const offset=view.position.map((v,i)=>v-view.target[i]),horizontal=Math.hypot(offset[0],offset[2]);
    close((offset[0]*Math.cos(yaw)-offset[2]*Math.sin(yaw))/horizontal,-1);
    close(offset[0]*Math.sin(yaw)+offset[2]*Math.cos(yaw),0);
    close(Math.hypot(...offset),Math.hypot(1.2,.83,1.3));
  }
});

test('zoom changes distance while preserving the rear angle and keeping the horizon level',()=>{
  const pose={x:-1.6,y:1.3,yaw:1.1},base=followCameraPose(pose);
  for(const distance of [.55,1,4,8]){
    const view=followCameraPose({...pose,height:.04},distance);
    assert.deepEqual(view.target,base.target);
    view.position.forEach((v,i)=>close((v-view.target[i])/distance,(base.position[i]-base.target[i])/FOLLOW_DISTANCE));
    assert.ok(view.position[1]>view.target[1]);
  }
});
