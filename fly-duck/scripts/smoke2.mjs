import {chromium} from '@playwright/test';
const base=process.env.FLYDUCK_BASE;const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const errs=[];
// 1) 수컷 뇌 단독 페이지
let page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errs.push('male:'+e.message));
await page.goto(base+'/?brain=male&low');await page.waitForFunction(()=>window.flyduck?.ready||window.flyduck?.error,null,{timeout:180000});
console.log('male ready; error=',await page.evaluate(()=>window.flyduck.error),'neurons=',await page.evaluate(()=>window.flyduck.anatomy?.neurons));
await page.locator('#scent-left').click();await page.waitForFunction(()=>window.flyduck.activity?.command.turn>.2,null,{timeout:40000}).catch(()=>console.log('male: turn>.2 not reached'));
await page.waitForTimeout(3000);
console.log('male flow:',await page.evaluate(()=>['f-in-l','f-alpn-l','f-alpn-r','f-dn','f-fwd','f-turn','f-motor','bs-neurons','bs-edges','bs-extra'].map(i=>i+'='+document.getElementById(i).textContent).join(' ')),'motorNodeVisible=',await page.evaluate(()=>!document.getElementById('f-motor-node').hidden));
// 물건 팔레트: 사과·식초·장애물 프로그램으로 놓기
await page.locator('[data-place="apple"]').click();await page.evaluate(()=>window.flyduckLab.onPlace({x:.4,y:.3}));
await page.locator('[data-place="vinegar"]').click();await page.evaluate(()=>window.flyduckLab.onPlace({x:-.6,y:-.4}));
await page.locator('[data-place="obstacle"]').click();await page.evaluate(()=>window.flyduckLab.onPlace({x:.3,y:-.2}));await page.waitForTimeout(1500);
console.log('objects:',await page.evaluate(()=>JSON.stringify({sources:window.flyduckLab.sources.length,obstacles:window.flyduckLab.obstacles.length,msg:document.getElementById('lab-msg').textContent.slice(0,60)})));
await page.screenshot({path:'shots/male.png',fullPage:true});await page.close();
// 2) 비교 페이지
page=await browser.newPage({viewport:{width:1600,height:1100}});page.on('pageerror',e=>errs.push('compare:'+e.message));
await page.goto(base+'/compare.html');
await page.waitForFunction(()=>document.getElementById('col-female').classList.contains('ready')&&document.getElementById('col-male').classList.contains('ready'),null,{timeout:240000});
console.log('compare: both frames ready');
await page.locator('[data-cmd="left"]').click();await page.waitForTimeout(8000);
console.log('compare live:',await page.evaluate(()=>['female','male'].map(b=>b+' '+[...document.querySelectorAll('#live-'+b+' dd')].map(d=>d.textContent).join('|')).join(' || ')));
await page.screenshot({path:'shots/compare.png',fullPage:true});await page.close();
console.log('page errors:',errs);await browser.close();
