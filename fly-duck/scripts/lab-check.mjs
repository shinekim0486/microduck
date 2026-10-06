import {chromium} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.FLYDUCK_URL);await page.waitForFunction(()=>window.flyduck?.ready,null,{timeout:120000});
const turn=()=>page.evaluate(()=>window.flyduck.activity?.command.turn??0);
const wait=(fn,t=20000)=>page.waitForFunction(fn,null,{timeout:t});
// 1) 정상: 왼쪽 바나나 → 왼쪽 회전(+)
await page.locator('#scent-left').click();await wait(()=>window.flyduck.activity?.command.turn>.3);console.log('normal left turn',(await turn()).toFixed(2));
// 2) 좌우 바꿔 끼우기 → 같은 바나나인데 오른쪽 회전(-)
await page.locator('[data-antenna="swap"]').click();await wait(()=>window.flyduck.activity?.command.turn<-.3);console.log('PASS swap reverses turn',(await turn()).toFixed(2));
// 3) 왼쪽 더듬이 제거 → 왼쪽 입력 0
await page.locator('[data-antenna="noLeft"]').click();await wait(()=>window.flyduck.sensory?.olfactory_left===0&&window.flyduck.sensory?.olfactory_right>0);console.log('PASS noLeft zeroes left input');
await page.locator('[data-antenna="normal"]').click();
// 4) 촉각엽 절제 → ALPN 발화 0, 전진 0
await page.locator('[data-lesion="ALPN_left,ALPN_right"]').check();await wait(()=>window.flyduck.lab?.lesioned>600&&window.flyduck.activity?.scentLeft+window.flyduck.activity?.scentRight===0&&window.flyduck.activity.command.forward===0);
console.log('PASS ALPN lesion silences smell & forward; lesioned=',await page.evaluate(()=>window.flyduck.lab.lesioned));
await page.locator('[data-lesion="ALPN_left,ALPN_right"]').uncheck();await wait(()=>window.flyduck.lab?.lesioned===0&&window.flyduck.activity?.scentLeft+window.flyduck.activity?.scentRight>0);console.log('PASS lesion undo restores smell');
// 5) 시냅스 세기 0.5 → 하강뉴런 침묵 → 전진 0
await page.locator('#lab-gain').fill('0.5');await page.locator('#lab-gain').dispatchEvent('input');await wait(()=>window.flyduck.lab?.gain===0.5&&window.flyduck.activity?.left+window.flyduck.activity?.right===0);console.log('PASS gain 0.5 silences descending');
await page.locator('#lab-gain').fill('3');await page.locator('#lab-gain').dispatchEvent('input');await wait(()=>window.flyduck.activity?.left+window.flyduck.activity?.right>0,40000);console.log('PASS gain 3 restores');
// 6) 초기화
await page.locator('#lab-reset').click();await wait(()=>window.flyduck.state?.steps<20);
assert.deepEqual(errors,[]);console.log('ALL LAB CHECKS PASS');await page.screenshot({path:'shots/lab.png',fullPage:true});await browser.close();
