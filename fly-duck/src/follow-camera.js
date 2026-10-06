// Preserve the original camera's distance and elevation, looking from the rear.
export const FOLLOW_DISTANCE=Math.hypot(1.2,.95-.12,1.3);
const rise=(.95-.12)/FOLLOW_DISTANCE;
const run=Math.hypot(1.2,1.3)/FOLLOW_DISTANCE;

export function followCameraPose({x,y,yaw},distance=FOLLOW_DISTANCE){
  const target=[x,.12,-y],behind=distance*run;
  // MuJoCo is Z-up; the renderer maps (x,y,z) to (x,z,-y).
  return {target,position:[x-behind*Math.cos(yaw),.12+distance*rise,-y+behind*Math.sin(yaw)]};
}
