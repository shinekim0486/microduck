const LIMIT=1.65;
export const PICKUP_RADIUS=.18;

export function nextBananaPosition(pose,previous,random=Math.random){
  for(let i=0;i<60;i++){
    const angle=pose.yaw+(random()-.5)*(i<30?2.4:2*Math.PI),distance=.65+random()*.4;
    const p={x:pose.x+distance*Math.cos(angle),y:pose.y+distance*Math.sin(angle)};
    if(Math.abs(p.x)<=LIMIT&&Math.abs(p.y)<=LIMIT&&Math.hypot(p.x-previous.x,p.y-previous.y)>.45)return p;
  }
  // Deterministic fallback keeps the entire banana clear of the arena walls.
  return [{x:-1.2,y:-1.2},{x:1.2,y:-1.2},{x:-1.2,y:1.2},{x:1.2,y:1.2}]
    .filter(p=>Math.hypot(p.x-pose.x,p.y-pose.y)>.65&&Math.hypot(p.x-previous.x,p.y-previous.y)>.45)
    .sort((a,b)=>Math.hypot(a.x-pose.x,a.y-pose.y)-Math.hypot(b.x-pose.x,b.y-pose.y))[0];
}

export class FoodCycle{
  constructor(position={x:.5,y:.25},random=Math.random){this.position=position;this.random=random;this.collected=0;this.remaining=0;this.previous=null;}
  place(position){this.position=position;this.remaining=0;}
  update(pose,dt){
    if(this.remaining>0){
      this.remaining=Math.max(0,this.remaining-dt);
      if(this.remaining<1e-8){this.remaining=0;this.position=nextBananaPosition(pose,this.previous,this.random);return 'spawned';}
    }else if(this.position&&!pose.fallen&&Math.hypot(pose.x-this.position.x,pose.y-this.position.y)<=PICKUP_RADIUS){
      this.previous={...this.position};this.position=null;this.collected++;this.remaining=.4;return 'collected';
    }
    return null;
  }
  state(){return {type:'overripe banana',visible:!!this.position,x:this.position?.x??null,y:this.position?.y??null,collected:this.collected,respawning:this.remaining>0};}
}
