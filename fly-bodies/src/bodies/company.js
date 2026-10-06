// 여섯 번째 몸: AI 네이티브 회사. 물리 엔진 대신 회사 시뮬레이터. 두뇌가 매일 가격·광고·발주를 정하고, 보상은 현금(결산).
// 로봇과 같은 구조: 몸(회사 시뮬) + 실무(자동 판매·배송) + 두뇌(결정) + 환경(시장 시나리오) + 채점(현금).
export const COMPANY_ENVS={
  flat:{name:'평온한 시장',note:'수요 안정. 기준 시나리오.',base:120,elastic:1.6,cost:4,shock:null},
  boxes:{name:'경쟁사 등장',note:'30일째부터 경쟁사가 들어와 가격 민감도가 커집니다.',base:120,elastic:1.6,cost:4,shock:{day:30,elastic:2.6}},
  corridor:{name:'원가 급등',note:'45일째부터 원가가 4→7로 뜁니다. 가격을 안 올리면 팔수록 손해.',base:120,elastic:1.6,cost:4,shock:{day:45,cost:7}},
  slope:{name:'수요 급증',note:'20~50일에 수요가 2.5배. 재고가 없으면 기회를 놓치고 평판이 떨어집니다.',base:120,elastic:1.6,cost:4,shock:{from:20,to:50,demand:2.5}},
  stairs:{name:'불황',note:'수요가 절반. 광고 효율도 떨어집니다. 현금을 지키는 두뇌가 이깁니다.',base:60,elastic:1.9,cost:4,shock:{adEff:.5}},
};
export const COMPANY_TEMPLATE=`// 내 회사 두뇌: 매일 호출. 입력 s → 출력 {price(5~20), ad(0~300), order(0~500)}
// s.day, s.cash, s.inventory, s.lastDemand, s.lastSales, s.price, s.ad, s.reputation(0.5~1.2), s.cost(원가)
function brain(s){
  let price = Math.max(s.cost * 2.2, 12);            // 원가의 2.2배 이상, 기본 12
  if (s.lastDemand > s.lastSales) price += 1;        // 품절이었으면 가격 올림
  const ad = s.cash > 3000 ? 120 : 40;               // 여유 있을 때만 광고
  const target = Math.round(s.lastDemand * 3);       // 3일치 재고 유지
  const order = Math.max(0, Math.min(500, target - s.inventory));
  return { price, ad, order };
}`;
export function companyRule(s){let price=Math.max(s.cost*2.2,12);if(s.lastDemand>s.lastSales)price+=1;const ad=s.cash>3000?120:40;const order=Math.max(0,Math.min(500,Math.round(s.lastDemand*3)-s.inventory));return {price,ad,order};}
export function companyRandom(s){return {price:5+Math.random()*15,ad:Math.random()*300,order:Math.random()*300};}
export function createCompany(host,envKey='flat',scene=null){
  const env=COMPANY_ENVS[envKey]||COMPANY_ENVS.flat; const canvas=document.createElement('canvas'); canvas.className='company-canvas'; host.appendChild(canvas); const ctx=canvas.getContext('2d');
  let three=null;
  let st, hist, policy=null, fallback={price:12,ad:60,order:0};
  function reset(){st={day:0,cash:5000,inventory:300,price:12,ad:60,reputation:1,lastDemand:100,lastSales:100,cost:env.cost,bankrupt:false,totalSales:0,totalProfit:0};hist=[];}
  function params(){let base=env.base,elastic=env.elastic,cost=env.cost,adEff=1;const s=env.shock;if(s){if(s.day!=null&&st.day>=s.day){if(s.elastic)elastic=s.elastic;if(s.cost)cost=s.cost;}if(s.from!=null&&st.day>=s.from&&st.day<=s.to)base*=s.demand;if(s.adEff)adEff=s.adEff;}return {base,elastic,cost,adEff};}
  async function controlStep(){ if(st.bankrupt)return;
    const inp={day:st.day,cash:st.cash,inventory:st.inventory,lastDemand:st.lastDemand,lastSales:st.lastSales,price:st.price,ad:st.ad,reputation:st.reputation,cost:st.cost};
    let d=fallback; try{if(policy)d=policy(inp)||fallback;}catch(e){d=fallback;}
    const price=Math.max(5,Math.min(20,+d.price||12)), ad=Math.max(0,Math.min(300,+d.ad||0)), order=Math.max(0,Math.min(500,Math.round(+d.order||0)));
    const p=params(); st.cost=p.cost;
    const season=1+.25*Math.sin(2*Math.PI*st.day/90), noise=.85+Math.random()*.3;
    const demand=p.base*season*Math.pow(price/10,-p.elastic)*(1+.6*Math.log1p(ad/50)*p.adEff)*st.reputation*noise;
    const canBuy=Math.min(order,Math.floor(Math.max(0,st.cash)/p.cost)); st.inventory+=canBuy; st.cash-=canBuy*p.cost;
    const sales=Math.min(st.inventory,Math.round(demand)); st.inventory-=sales; const revenue=sales*price, fixed=300; st.cash+=revenue-ad-fixed;
    st.reputation=Math.max(.5,Math.min(1.2,st.reputation+(demand>sales+5?-.02:.005)+(price>16?-.008:0)));
    st.price=price;st.ad=ad;st.lastDemand=demand;st.lastSales=sales;st.totalSales+=sales;st.totalProfit+=revenue-ad-fixed-canBuy*p.cost;st.day++;
    if(st.cash<0){st.bankrupt=true;} hist.push({day:st.day,cash:st.cash,sales,demand,price,ad,inventory:st.inventory});}
  function draw(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;if(canvas.width!==w*2||canvas.height!==h*2){canvas.width=w*2;canvas.height=h*2;}ctx.setTransform(2,0,0,2,0,0);
    ctx.fillStyle='#0e121a';ctx.fillRect(0,0,w,h);const L=56,R=20,T=92,B=64,pw=w-L-R,ph=h-T-B;
    ctx.strokeStyle='#252c3a';ctx.lineWidth=1;for(let i=0;i<=4;i++){const y=T+ph*i/4;ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(w-R,y);ctx.stroke();}
    const days=Math.max(90,hist.length); const maxCash=Math.max(8000,...hist.map(x=>x.cash)),minCash=Math.min(0,...hist.map(x=>x.cash)); const X=d=>L+pw*d/days, Y=c=>T+ph*(1-(c-minCash)/(maxCash-minCash||1));
    // 판매량 막대
    const maxS=Math.max(50,...hist.map(x=>x.sales));for(const x of hist){ctx.fillStyle='rgba(107,162,161,.45)';const bh=ph*.35*x.sales/maxS;ctx.fillRect(X(x.day-1),T+ph-bh,Math.max(1,pw/days-1),bh);}
    // 현금 선
    ctx.strokeStyle='#ffd60a';ctx.lineWidth=2.5;ctx.beginPath();hist.forEach((x,i)=>{i?ctx.lineTo(X(x.day),Y(x.cash)):ctx.moveTo(X(x.day),Y(x.cash));});ctx.stroke();
    ctx.strokeStyle='rgba(255,122,61,.9)';ctx.lineWidth=1.2;ctx.beginPath();hist.forEach((x,i)=>{const y=T+ph*(1-(x.price-5)/15);i?ctx.lineTo(X(x.day),y):ctx.moveTo(X(x.day),y);});ctx.stroke();
    ctx.fillStyle='#98a2b3';ctx.font='11px system-ui';ctx.textAlign='right';for(let i=0;i<=4;i++){const c=maxCash-(maxCash-minCash)*i/4;ctx.fillText(Math.round(c).toLocaleString(),L-6,T+ph*i/4+4);}ctx.textAlign='left';ctx.fillText('0일',L,h-B+16);ctx.textAlign='right';ctx.fillText(days+'일',w-R,h-B+16);
    ctx.textAlign='left';ctx.fillStyle='#f2f4f7';ctx.font='700 13px system-ui';ctx.fillText(`${env.name} · ${st.day}일째 · 현금 ${Math.round(st.cash).toLocaleString()}${st.bankrupt?' · 파산':''}`,L,64);
    ctx.font='11px system-ui';ctx.fillStyle='#98a2b3';ctx.fillText(`가격 ${st.price.toFixed(1)} · 광고 ${Math.round(st.ad)} · 재고 ${st.inventory} · 어제 수요 ${Math.round(st.lastDemand)} / 판매 ${st.lastSales} · 평판 ${st.reputation.toFixed(2)} · 원가 ${st.cost}`,L,80);
    ctx.fillStyle='#ffd60a';ctx.fillText('— 현금',L,h-B+34);ctx.fillStyle='rgba(255,122,61,.9)';ctx.fillText('— 가격',L+60,h-B+34);ctx.fillStyle='rgba(107,162,161,.9)';ctx.fillText('▮ 판매량',L+120,h-B+34);
    if(env.shock&&env.shock.day!=null){ctx.strokeStyle='#ff7a3d';ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(X(env.shock.day),T);ctx.lineTo(X(env.shock.day),T+ph);ctx.stroke();ctx.setLineDash([]);}}
  reset(); if(scene)three=buildCompany3D(scene,()=>st,()=>hist);
  return {key:'company',reset,controlStep,draw,update3D:dt=>three?.update(dt),setPolicy:fn=>{policy=fn;},setCommand:(forward,turn)=>{fallback={price:Math.max(5,Math.min(20,12+turn*4)),ad:forward/0.24*150,order:Math.round(Math.max(0,st.lastDemand*3-st.inventory))};},
    pose:()=>({x:0,y:0,z:1,yaw:0}),root:null,dispose:()=>{canvas.remove();three?.dispose();},ctrlDt:.2,camDist:6,camHeight:.8,
    state:()=>({steps:st.day,policyCalls:st.day,fallen:st.bankrupt,distance:st.totalSales,cmd:[st.price,st.ad,0],joints:[],day:st.day,cash:st.cash,bankrupt:st.bankrupt,totalSales:st.totalSales,x:0,y:0,z:1,yaw:0}),
    info:{name:'AI 네이티브 회사 (시뮬레이션)',joints:0,policy:'자동 판매·배송 (규칙)',model:'회사 시뮬레이터 v0: 수요·가격 탄력·광고·재고·평판·원가',obs:9},env};
}

// ---- 3D 시각화: 시뮬레이터 상태를 작은 회사 마을로 그린다 (그림일 뿐, 물리 없음) ----
import * as THREE from 'three';
export function buildCompany3D(scene,getState,getHist){
  const g=new THREE.Group(); scene.add(g);
  const mat=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.7,metalness:.1,...o});
  const base=new THREE.Mesh(new THREE.BoxGeometry(9.5,.08,7.5),mat(0x1c2230)); base.position.set(0.6,-.04,.6); base.receiveShadow=true; g.add(base);
  const road=new THREE.Mesh(new THREE.PlaneGeometry(4.6,1.5),mat(0x2a3040)); road.rotation.x=-Math.PI/2; road.position.set(3.2,.005,1.45); road.receiveShadow=true; g.add(road);
  for(let i=0;i<6;i++){const d=new THREE.Mesh(new THREE.PlaneGeometry(.35,.06),mat(0xffd60a));d.rotation.x=-Math.PI/2;d.position.set(1.2+i*.75,.01,1.45);g.add(d);}
  const walk=new THREE.Mesh(new THREE.PlaneGeometry(3,2.6),mat(0x242b3a)); walk.rotation.x=-Math.PI/2; walk.position.set(0,.005,2.1); walk.receiveShadow=true; g.add(walk);
  const bots=[];for(let i=0;i<3;i++){const b=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(.22,.16,.22),mat(0xffd60a));body.position.y=.12;b.add(body);const eye=new THREE.Mesh(new THREE.BoxGeometry(.16,.05,.02),new THREE.MeshStandardMaterial({color:0x0b0d12,emissive:0x6ba2a1,emissiveIntensity:1}));eye.position.set(0,.15,.12);b.add(eye);const box=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.2),mat(0xb8893a));box.position.y=.3;b.add(box);b.userData.box=box;b.visible=false;g.add(b);bots.push({m:b,t:i/3});}
  // 바닥 구역: 가게·창고·전광판·동전탑
  const shop=new THREE.Group(); shop.position.set(0,0,0); g.add(shop);
  const shopBody=new THREE.Mesh(new THREE.BoxGeometry(1.6,1.0,1.2),mat(0x2b3140)); shopBody.position.y=.5; shopBody.castShadow=shopBody.receiveShadow=true; shop.add(shopBody);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(1.25,.5,4),mat(0xffd60a)); roof.rotation.y=Math.PI/4; roof.position.y=1.25; roof.castShadow=true; shop.add(roof);
  const door=new THREE.Mesh(new THREE.BoxGeometry(.4,.5,.05),mat(0x9aa6bb)); door.position.set(0,.25,.62); shop.add(door);
  const signCanvas=document.createElement('canvas'); signCanvas.width=256; signCanvas.height=96; const signTex=new THREE.CanvasTexture(signCanvas);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.45),new THREE.MeshBasicMaterial({map:signTex,transparent:true})); sign.position.set(0,.72,.63); shop.add(sign);
  const stars=[];for(let i=0;i<5;i++){const s=new THREE.Mesh(new THREE.OctahedronGeometry(.07),new THREE.MeshStandardMaterial({color:0xffd60a,emissive:0xffb800,emissiveIntensity:.8}));s.position.set(-.5+i*.25,1.7,0);shop.add(s);stars.push(s);}
  // 창고 + 상자 더미
  const wh=new THREE.Group(); wh.position.set(-2.6,0,-.4); g.add(wh);
  const whBody=new THREE.Mesh(new THREE.BoxGeometry(2.0,.9,1.6),mat(0x3a4356)); whBody.position.y=.45; whBody.castShadow=whBody.receiveShadow=true; wh.add(whBody);
  const crates=[];for(let i=0;i<40;i++){const c=new THREE.Mesh(new THREE.BoxGeometry(.22,.22,.22),mat(0xb8893a));const col=i%8,row=Math.floor(i/8);c.position.set(-.9+col*.25,.11+row*.24,1.05);c.castShadow=true;c.visible=false;wh.add(c);crates.push(c);}
  // 전광판(광고)
  const bb=new THREE.Group(); bb.position.set(2.4,0,-1.2); g.add(bb);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,1.6,8),mat(0x6e7a8f)); pole.position.y=.8; bb.add(pole);
  const board=new THREE.Mesh(new THREE.BoxGeometry(1.6,.8,.08),new THREE.MeshStandardMaterial({color:0x111827,emissive:0xffd60a,emissiveIntensity:0})); board.position.y=1.9; board.castShadow=true; bb.add(board);
  const adCanvas=document.createElement('canvas'); adCanvas.width=256; adCanvas.height=128; const adTex=new THREE.CanvasTexture(adCanvas); const adFace=new THREE.Mesh(new THREE.PlaneGeometry(1.5,.72),new THREE.MeshBasicMaterial({map:adTex,transparent:true})); adFace.position.set(0,1.9,.05); bb.add(adFace);
  // 동전 탑(현금)
  const coins=[];for(let i=0;i<60;i++){const c=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.035,20),new THREE.MeshStandardMaterial({color:0xffd60a,metalness:.7,roughness:.3}));c.position.set(2.3,.02+i*.04,1.2);c.visible=false;c.castShadow=true;g.add(c);coins.push(c);}
  // 손님(수요)과 배송차(판매)
  const custMat=mat(0x6ba2a1), custs=[];for(let i=0;i<24;i++){const p=new THREE.Mesh(new THREE.CapsuleGeometry(.07,.18,4,8),custMat);p.visible=false;p.castShadow=true;g.add(p);custs.push({m:p,t:Math.random(),lane:(Math.random()-.5)*2.4,speed:.5+Math.random()*.4});}
  const vans=[];for(let i=0;i<4;i++){const v=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(.5,.28,.28),mat(0xe5e9f0));body.position.y=.24;v.add(body);const cab=new THREE.Mesh(new THREE.BoxGeometry(.18,.2,.26),mat(0xffd60a));cab.position.set(.3,.2,0);v.add(cab);for(const [x,z] of [[-.15,.14],[.15,.14],[-.15,-.14],[.15,-.14]]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,.05,12),mat(0x222));w.rotation.x=Math.PI/2;w.position.set(x,.08,z);v.add(w);}v.visible=false;g.add(v);vans.push({m:v,t:Math.random()});}
  let lastDay=-1, custRate=0, vanRate=0;
  function update(dt){const st=getState(); if(!st)return; const hist=getHist();
    // 재고 → 상자, 현금 → 동전, 광고 → 전광판, 평판 → 별
    const nC=Math.min(40,Math.round(st.inventory/12)); crates.forEach((c,i)=>c.visible=i<nC);
    const nCoin=Math.max(0,Math.min(60,Math.round(st.cash/1500))); coins.forEach((c,i)=>c.visible=i<nCoin);
    board.material.emissiveIntensity=.05+Math.min(1,st.ad/300)*1.4;
    const rep=Math.round((st.reputation-.5)/.7*5); stars.forEach((s,i)=>{s.material.emissiveIntensity=i<rep?.9:.05;s.material.color.set(i<rep?0xffd60a:0x3a4356);});
    if(st.day!==lastDay){lastDay=st.day;custRate=Math.min(1,st.lastDemand/200);vanRate=Math.min(1,st.lastSales/200);
      const ctx=signCanvas.getContext('2d');ctx.clearRect(0,0,256,96);ctx.fillStyle='#ffd60a';ctx.fillRect(0,0,256,96);ctx.fillStyle='#141200';ctx.font='800 46px system-ui';ctx.textAlign='center';ctx.fillText(`₩${st.price.toFixed(1)}`,128,48);ctx.font='700 22px system-ui';ctx.fillText(st.bankrupt?'폐업':`${st.day}일째`,128,78);signTex.needsUpdate=true;
      const a=adCanvas.getContext('2d');a.clearRect(0,0,256,128);const k=Math.min(1,st.ad/300);a.fillStyle=`rgba(255,214,10,${.15+k*.85})`;a.fillRect(0,0,256,128);a.fillStyle='#141200';a.font='800 30px system-ui';a.textAlign='center';a.fillText('광고',128,52);a.font='700 34px system-ui';a.fillText(`${Math.round(st.ad)}`,128,98);adTex.needsUpdate=true;}
    // 손님: 앞쪽(z=+3)에서 가게로 걸어옴, 수요에 비례해 보이는 수
    const nCust=Math.round(4+custRate*20); custs.forEach((c,i)=>{if(i>=nCust||st.bankrupt){c.m.visible=false;return;}c.m.visible=true;c.t+=dt*c.speed*.25;if(c.t>1)c.t=0;const z=3.2-c.t*2.6;c.m.position.set(c.lane*(1-c.t*.6),.2+Math.abs(Math.sin(c.t*40))*.03,z);});
    // 배송차: 가게에서 오른쪽 길로 나감, 판매에 비례
    const nVan=Math.round(vanRate*4); vans.forEach((v,i)=>{if(i>=nVan||st.bankrupt){v.m.visible=false;return;}v.m.visible=true;v.t+=dt*.35;if(v.t>1)v.t=0;v.m.position.set(.9+v.t*4.5,0,.9+i*.35);});
    // 실무 에이전트: 재고가 있으면 창고→가게로 상자를 나른다 (실무는 에이전트, 결정은 두뇌)
    const nBot=st.bankrupt?0:(st.inventory>0?Math.min(3,1+Math.floor(st.lastSales/80)):0); bots.forEach((b,i)=>{if(i>=nBot){b.m.visible=false;return;}b.m.visible=true;b.t+=dt*.3;if(b.t>1)b.t=0;const f=b.t<.5?b.t*2:(1-b.t)*2;b.m.position.set(-1.7+f*1.7,0,.75+i*.28);b.m.userData.box.visible=b.t<.5;b.m.rotation.y=b.t<.5?Math.PI/2:-Math.PI/2;});
    roof.material.color.set(st.bankrupt?0x7a1f1f:0xffd60a);
  }
  return {group:g,update,dispose:()=>scene.remove(g)};
}
