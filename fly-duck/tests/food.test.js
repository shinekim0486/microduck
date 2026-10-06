import test from 'node:test';
import assert from 'node:assert/strict';
import {FoodCycle,nextBananaPosition} from '../src/food-cycle.js';

test('reaching fruit removes it once, then spawns a distant banana after simulation advances',()=>{
  const pose={x:.1,y:0,yaw:0,fallen:false},food=new FoodCycle({x:.25,y:0},()=>.5);
  assert.equal(food.update({...pose,x:0},.02),null);
  assert.equal(food.update(pose,.02),'collected');
  assert.equal(food.position,null);
  assert.equal(food.state().collected,1);
  assert.equal(food.state().respawning,true);
  for(let i=0;i<19;i++)assert.equal(food.update(pose,.02),null);
  assert.equal(food.position,null);
  assert.equal(food.update(pose,.02),'spawned');
  assert.ok(Math.hypot(food.position.x-pose.x,food.position.y-pose.y)>=.65);
  assert.equal(food.state().respawning,false);
  assert.equal(food.update(pose,.02),null);
  assert.equal(food.state().collected,1);
});

test('manual removal or placement cancels respawning, and fallen ducks cannot collect',()=>{
  const pose={x:0,y:0,yaw:0,fallen:false},food=new FoodCycle({x:0,y:0});
  assert.equal(food.update({...pose,fallen:true},.02),null);
  assert.equal(food.update(pose,.02),'collected');
  food.place(null);
  assert.equal(food.update(pose,1),null);
  assert.equal(food.state().visible,false);
  food.place({x:0,y:0});
  assert.equal(food.update(pose,.02),'collected');
  food.place({x:1,y:1});
  assert.equal(food.update(pose,1),null);
  assert.deepEqual(food.position,{x:1,y:1});
  assert.equal(food.state().collected,2);
});

test('new fruit remains inside the arena and clear of the duck even at walls and corners',()=>{
  let seed=123;
  const random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
  for(const x of [-1.9,0,1.9])for(const y of [-1.9,0,1.9])for(let yaw=0;yaw<7;yaw++){
    const pose={x,y,yaw};
    for(const rng of [random,()=>.5]){
      const p=nextBananaPosition(pose,pose,rng);
      assert.ok(Math.abs(p.x)<=1.65&&Math.abs(p.y)<=1.65);
      assert.ok(Math.hypot(p.x-x,p.y-y)>=.65-1e-8);
    }
  }
});
