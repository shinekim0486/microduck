// MuJoCo WASM과 ONNX Runtime을 몸 세 개가 공유한다. 한 번만 내려받고 한 번만 초기화.
import loadMujoco from '@mujoco/mujoco';
import * as ort from 'onnxruntime-web/wasm';
import mjWasm from '@mujoco/mujoco/mujoco.wasm?url';
import ortWasm from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
let mjPromise=null, ortReady=null;
export const fetchBuf=async u=>{const r=await fetch(u);if(!r.ok)throw Error(u+' → '+r.status);return r.arrayBuffer();};
export function getMujoco(){if(!mjPromise)mjPromise=fetchBuf(mjWasm).then(wasmBinary=>loadMujoco({wasmBinary,locateFile:p=>p.endsWith('.wasm')?mjWasm:p}));return mjPromise;}
export async function createSession(url){
  if(!ortReady){ort.env.wasm.wasmPaths={wasm:ortWasm};ort.env.wasm.numThreads=1;ortReady=fetchBuf(ortWasm).then(b=>{ort.env.wasm.wasmBinary=b;});}
  await ortReady; const model=await fetchBuf(url);
  return ort.InferenceSession.create(new Uint8Array(model),{executionProviders:['wasm']});
}
export {ort};
