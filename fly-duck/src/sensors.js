export function encodeStimulus(pose,scent,light,air=false){
  const input={visual_left:light*.65,visual_right:light*.65,olfactory_left:0,olfactory_right:0,mechanosensory_left:0,mechanosensory_right:0};
  if(scent){
    const dx=scent.x-pose.x,dy=scent.y-pose.y,bearing=Math.atan2(dy,dx)-pose.yaw;
    const lab=globalThis.flyduckLab||{},range=Number(lab.scentRange)||1.25;
    const strength=.95*Math.exp(-Math.hypot(dx,dy)/range)*(.25+.75*(1+Math.cos(bearing))/2);
    let l=strength*(.5+.5*Math.sin(bearing)),r=strength*(.5-.5*Math.sin(bearing));
    // CONNECT AI LAB 더듬이 실험: 기본값 'normal'은 원작과 동일.
    if(lab.antenna==='noLeft')l=0;else if(lab.antenna==='noRight')r=0;else if(lab.antenna==='swap')[l,r]=[r,l];
    input.olfactory_left=l;input.olfactory_right=r;
  }
  // CONNECT AI LAB 물건 팔레트: 추가 냄새 원천(사과·식초)은 같은 공식으로 더한다. 장애물은 근접 시 기계감각 자극.
  const lab2=globalThis.flyduckLab||{};
  for(const s of lab2.sources||[]){const dx=s.x-pose.x,dy=s.y-pose.y,b=Math.atan2(dy,dx)-pose.yaw;const st=(s.strength||1)*.95*Math.exp(-Math.hypot(dx,dy)/(s.range||1.25))*(.25+.75*(1+Math.cos(b))/2);input.olfactory_left+=st*(.5+.5*Math.sin(b));input.olfactory_right+=st*(.5-.5*Math.sin(b));}
  for(const o of lab2.obstacles||[]){const d=Math.hypot(o.x-pose.x,o.y-pose.y);if(d<.34){const b=Math.atan2(o.y-pose.y,o.x-pose.x)-pose.yaw,k=Math.min(1,(.34-d)/.12);input.mechanosensory_left=Math.max(input.mechanosensory_left,k*(.5+.5*Math.sin(b)));input.mechanosensory_right=Math.max(input.mechanosensory_right,k*(.5-.5*Math.sin(b)));}}
  if(air){input.mechanosensory_left=.95;input.mechanosensory_right=.75;}
  for(const [name,side]of [['mechanosensory_left',.65],['mechanosensory_right',-.65]]){
    const angle=pose.yaw+side,px=pose.x+.22*Math.cos(angle),py=pose.y+.22*Math.sin(angle);
    input[name]=Math.max(input[name],Math.max(0,Math.min(1,(Math.max(Math.abs(px),Math.abs(py))-1.65)/.3)));
  }
  return input;
}
