import './style.css';
const $=id=>document.getElementById(id);
const frames=()=>[$('frame-female'),$('frame-male')];
for(const b of document.querySelectorAll('[data-cmd]'))b.onclick=()=>{for(const f of frames())f.contentWindow?.postMessage({flyduckCmd:b.dataset.cmd},'*');};
$('hq').onchange=e=>{for(const f of frames()){const u=new URL(f.src,location.href);if(e.target.checked)u.searchParams.delete('low');else u.searchParams.set('low','');f.src=u.href;}};
const fmt=(v,d=2)=>Number.isFinite(v)?v.toFixed(d):'—';
window.addEventListener('message',e=>{const s=e.data?.flyduckStats;if(!s)return;const dl=$('live-'+s.brain);if(!dl)return;
  const set=(k,v)=>{const el=dl.querySelector(`[data-k="${k}"]`);if(el)el.textContent=v;};
  set('forward',fmt(s.forward)+' m/s');set('turn',fmt(s.turn)+' rad/s');set('distance',fmt(s.distance)+' m');set('alpn',(100*s.alpnL).toFixed(1)+'·'+(100*s.alpnR).toFixed(1)+'%');set('dn',(100*s.dn).toFixed(2)+'%');set('spikes',String(s.spikes??0));set('collected',String(s.collected??0));if(s.motor!=null)set('motor',(100*s.motor).toFixed(2)+'%');
  const col=$('col-'+s.brain);col.classList.toggle('ready',!!s.ready);});

const last={};window.addEventListener('message',e=>{const s=e.data?.flyduckStats;if(s)last[s.brain]=s;});
document.getElementById('share-compare').onclick=async()=>{
  const f=last.female,m=last.male,n=(v,d=2)=>Number.isFinite(v)?v.toFixed(d):'-';
  const text=`두 뇌, 한 오리 (CONNECT AI LAB 비교 실험실)\n같은 로봇 오리, 같은 바나나, 다른 초파리 뇌.\n· 2024 FlyWire 암컷 뇌: 전진 ${n(f?.forward)} m/s · 회전 ${n(f?.turn)} rad/s · 이동 ${n(f?.distance)} m · 바나나 ${f?.collected??0}개\n· 2026 구글 MaleCNS 수컷 뇌: 전진 ${n(m?.forward)} m/s · 회전 ${n(m?.turn)} rad/s · 이동 ${n(m?.distance)} m · 바나나 ${m?.collected??0}개\n두 뇌 모두 학습하지 않습니다. 직접 해보기 → ${location.href.split('?')[0]}`;
  const msg=document.getElementById('share-msg');
  try{if(navigator.share){await navigator.share({text});msg.textContent='공유했습니다.';}else{await navigator.clipboard.writeText(text);msg.textContent='비교 결과를 복사했습니다. 댓글이나 커뮤니티에 붙여 넣어 보세요.';}}catch{msg.textContent=text;}
};
