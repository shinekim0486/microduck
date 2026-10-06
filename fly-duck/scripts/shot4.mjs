import {chromium} from '@playwright/test';
const base=process.env.FLYDUCK_BASE;const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1100}});const errs=[];page.on('pageerror',e=>errs.push(e.message));
await page.goto(base+'/compare.html');await page.waitForTimeout(4000);
await page.screenshot({path:'shots/compare-top.png',clip:{x:0,y:0,width:1600,height:760}});
await page.evaluate(()=>document.querySelector('.maker').scrollIntoView());await page.waitForTimeout(500);
await page.locator('.maker').screenshot({path:'shots/compare-maker.png'});
await page.setViewportSize({width:390,height:844});await page.waitForTimeout(600);await page.screenshot({path:'shots/compare-mobile-top.png',clip:{x:0,y:0,width:390,height:900}});
console.log('overflow',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'errors',errs);await browser.close();
