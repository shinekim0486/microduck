import {DEFAULT_POSE} from './vendor/constants.js';

// Direct servo-position interface. No oscillator, gait template or policy call.
export function directTargets(motors, gain, ranges) {
  if(!motors||motors.length!==14||!Array.from(motors).every(Number.isFinite))throw Error('Invalid direct neural motor output');
  if(!Number.isFinite(gain))throw Error('Invalid motor gain');
  const amplitude=Math.max(0,Math.min(1,gain));
  return Array.from(motors,(value,i)=>{
    const target=DEFAULT_POSE[i]+amplitude*Math.max(-1,Math.min(1,value));
    return Math.max(ranges[i][0],Math.min(ranges[i][1],target));
  });
}
